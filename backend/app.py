import os
os.environ["OMP_NUM_THREADS"] = "8"
os.environ["OMP_WAIT_POLICY"] = "PASSIVE"

import shutil
import time
from collections.abc import Iterable, Iterator
import json 
import cv2
import numpy as np
from flask import Flask, jsonify, request, Response, send_from_directory
from flask_cors import CORS

import config
from park_models import EsitoVarco, Sosta, Accesso, StatoSosta, db
from pipeline.detector import LicensePlateDetector
from pipeline.reader import LicensePlateReader
from pipeline.postprocessing import aggrega, e_valida, estrai_targa, formatta, pulisci
from services.access_control import paga_sosta, registra_transito, soste_attive
from services.webcam import stream_camera
 
app = Flask(__name__)
CORS(app)
 
app.config["SQLALCHEMY_DATABASE_URI"] = config.DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)
 
for folder in (config.RESULTS_FOLDER, config.MODELS_FOLDER):
    os.makedirs(folder, exist_ok=True)
 
with app.app_context():
    db.create_all()
 
print("Caricamento modelli YOLO e PaddleOCR in corso...")
detector = LicensePlateDetector()
reader = LicensePlateReader()
print("Modelli caricati correttamente.")
 

# ---------------------------------------------------------------------------
# Core Pipeline AI
# ---------------------------------------------------------------------------
 
def letture_da_frame(frame) -> list[tuple[str, float]]:
    letture = []
    crops, annotated_frame = detector.detect(frame)
    for crop in crops:
        testo_grezzo, score = reader.read_text(crop)
        if not testo_grezzo:
            continue
        targa = estrai_targa(testo_grezzo)
        if targa:
            letture.append((targa, score, frame, annotated_frame, crop))
    return letture
 
 
def letture_da_frames(frames: Iterable) -> list[tuple[str, float]]:
    letture: list[tuple[str, float]] = []
    for frame in frames:
        if frame is not None:
            letture.extend(letture_da_frame(frame))
    return letture

def genera_flusso():
    while True:
        frame = stream_camera.get_jpeg()
        if frame:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n') 
        time.sleep(0.04)

# ---------------------------------------------------------------------------
# Endpoints (Controllers)
# ---------------------------------------------------------------------------
 
@app.route("/status", methods=["GET"])
def status():
    return jsonify({
        "status": "ok",
        "model_loaded": os.path.isfile(config.ACTIVE_MODEL_PATH),
        "active_model": os.path.basename(config.ACTIVE_MODEL_PATH),
    })

@app.route("/api/stream")
def video_feed():
    """Flusso MJPEG per mostrare l'anteprima live nel frontend."""
    return Response(genera_flusso(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route("/api/images/<filename>")
def get_image(filename):
    """Serve le immagini salvate per il cruscotto diagnostico."""
    return send_from_directory(config.RESULTS_FOLDER, filename)

@app.route("/api/reset", methods=["POST"])
def reset_sistema():
    """Esporta i dati (opzionale lato backend) e formatta il sistema."""
    # 1. Svuota la cartella results contenente tutte le immagini
    cartelle_da_pulire = [config.RESULTS_FOLDER]
    for folder in cartelle_da_pulire:
        shutil.rmtree(folder, ignore_errors=True)
        os.makedirs(folder, exist_ok=True)
    
    # 2. Svuota le tabelle del database mantenendo lo schema intatto
    try:
        db.session.query(Accesso).delete()
        db.session.query(Sosta).delete()
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Errore durante il reset del DB: {str(e)}"}), 500

    return jsonify({"message": "Sistema formattato con successo"}), 200

# --- Logica Varco ---

@app.route("/api/varco", methods=["POST"])
def varco():
    frames = []
    # Cattura N fotogrammi distanziati di poco
    for _ in range(config.FRAMES_PER_LETTURA):
        frame = stream_camera.get_frame()
        if frame is not None:
            frames.append(frame)
        time.sleep(0.1)
        
    if not frames:
        return jsonify({"error": "Impossibile leggere dalla webcam"}), 500

    letture_estese = letture_da_frames(frames)
    
    if not letture_estese:
        decisione = registra_transito(None, sorgente="webcam")
        return jsonify(decisione.to_dict()), 200

    letture_per_voto = [(t, s) for t, s, f, a, c in letture_estese]
    candidati = aggrega(letture_per_voto)
    migliore = candidati[0]

    # Cerchiamo le immagini associate alla lettura che ha vinto
    frame_orig, frame_ann, crop_img = None, None, None
    for targa, score, f, a, c in letture_estese:
        if targa == migliore.targa:
            frame_orig, frame_ann, crop_img = f, a, c
            break

    # Salviamo le 3 immagini nel RESULTS_FOLDER usando un timestamp
    timestamp = int(time.time() * 1000)
    base_name = f"{timestamp}_{migliore.targa}"
    f_path = f"{base_name}_frame.jpg"
    b_path = f"{base_name}_bbox.jpg"
    c_path = f"{base_name}_crop.jpg"

    if frame_orig is not None: cv2.imwrite(os.path.join(config.RESULTS_FOLDER, f_path), frame_orig)
    if frame_ann is not None: cv2.imwrite(os.path.join(config.RESULTS_FOLDER, b_path), frame_ann)
    if crop_img is not None: cv2.imwrite(os.path.join(config.RESULTS_FOLDER, c_path), crop_img)
 
    lista_candidati_dict = [
        {
            "targa": c.targa,
            "confidenza": round(c.confidenza, 4),
            "occorrenze": c.occorrenze,
            "letture_totali": c.letture_totali
        } for c in candidati
    ]

    candidati_str = json.dumps(lista_candidati_dict)

    if migliore.confidenza < config.CONFIDENZA_MINIMA_AUTOMATICA:
        return jsonify({
            "esito": "CONFERMA_RICHIESTA",
            "candidati": lista_candidati_dict,
            "messaggio": "Il modello OCR è incerto. Conferma la targa corretta o inseriscila manualmente.",
            "frame_path": f_path,
            "bbox_path": b_path,
            "crop_path": c_path,
            "candidati_json": candidati_str
        }), 200
 
    decisione = registra_transito(
        migliore.targa,
        sorgente="webcam",
        confidenza=round(migliore.confidenza, 4),
        occorrenze=migliore.occorrenze,
        letture_totali=migliore.letture_totali,
        frame_path=f_path,
        bbox_path=b_path,
        crop_path=c_path,
        candidati_json=candidati_str
    )
    
    risposta = decisione.to_dict()
    risposta["candidati"] = lista_candidati_dict
    
    return jsonify(risposta), 200
 
 
@app.route("/api/varco/manuale", methods=["POST"])
def varco_manuale():

    dati = request.get_json(silent=True) or {}
    targa = pulisci(dati.get("targa", ""))
 
    if not e_valida(targa):
        return jsonify({"error": "Targa non valida. Formato atteso: AA000AA."}), 400
 
    decisione = registra_transito(
        targa, 
        sorgente="manuale",
        confidenza=dati.get("confidenza"),
        occorrenze=dati.get("occorrenze"),
        letture_totali=dati.get("letture_totali"),
        frame_path=dati.get("frame_path"),
        bbox_path=dati.get("bbox_path"),
        crop_path=dati.get("crop_path"),
        candidati_json=dati.get("candidati_json")
    )
    return jsonify(decisione.to_dict()), 200

# --- Logica Gestione e Diagnostica ---
 
@app.route("/api/soste", methods=["GET"])
def elenco_soste():

    stato = (request.args.get("stato") or "").upper()
 
    if stato in ("ATTIVA", "ATTIVE"):
        soste = soste_attive()
    elif stato in (s.value for s in StatoSosta):
        soste = Sosta.query.filter_by(stato=stato).order_by(Sosta.ingresso_at.desc()).all()
    else:
        soste = Sosta.query.order_by(Sosta.ingresso_at.desc()).limit(200).all()
 
    return jsonify([s.to_dict(config.ORE_MASSIME_SOSTA) for s in soste]), 200

@app.route("/api/soste/<int:id_sosta>/pagamento", methods=["POST"])
def pagamento(id_sosta: int):
    """Pagamento fittizio della sosta in attesa di saldo.
 
    Restituisce una decisione come /api/varco, cosi' il frontend puo' usare
    lo stesso componente per mostrare la conferma di transito consentito.
    """
    decisione = paga_sosta(id_sosta)
    if decisione is None:
        return jsonify({"error": "Sosta inesistente o non in attesa di pagamento."}), 404
    return jsonify(decisione.to_dict()), 200

@app.route("/api/accessi", methods=["GET"])
def elenco_accessi():
    """Registro delle rilevazioni: e' da qui che escono i numeri della tesi."""
    accessi = Accesso.query.order_by(Accesso.creato_at.desc()).limit(200).all()
    return jsonify([a.to_dict() for a in accessi]), 200
 
@app.route("/api/parcheggio", methods=["GET"])
def stato_parcheggio():
    """Riepilogo sintetico, per la barra di navigazione."""
    attive = soste_attive()
    return jsonify({
        "veicoli_dentro": len(attive),
        "in_sosta": sum(1 for s in attive if s.stato == StatoSosta.APERTA.value),
        "da_pagare": sum(1 for s in attive if s.stato == StatoSosta.DA_PAGARE.value),
        "anomale": sum(1 for s in attive if s.anomala(config.ORE_MASSIME_SOSTA)),
        "tariffa_centesimi_al_minuto": config.TARIFFA_CENTESIMI_AL_MINUTO,
    }), 200

# ---------------------------------------------------------------------------
# Avvio Applicazione
# ---------------------------------------------------------------------------

print("Riscaldamento modelli...")
letture_da_frame(np.zeros((640, 640, 3), dtype=np.uint8))
print("Modelli pronti.")

if __name__ == "__main__":
    app.run(debug=True, port=5000, use_reloader=False)