import os
os.environ["OMP_NUM_THREADS"] = "8" #si può rimettere 4
os.environ["OMP_WAIT_POLICY"] = "PASSIVE" #indica che i threads inattivi non girano inutilmente
import shutil
import tempfile
import time
from collections.abc import Iterable, Iterator
 
import cv2
import numpy as np
from flask import Flask, jsonify, request, Response, send_from_directory
from services.webcam import stream_camera
from flask_cors import CORS
from werkzeug.utils import secure_filename
 
import config
from park_models import EsitoVarco, Sosta, Accesso, StatoSosta, db
from pipeline.detector import LicensePlateDetector
from pipeline.reader import LicensePlateReader
from pipeline.postprocessing import aggrega, e_valida, estrai_targa, formatta, pulisci
from services.access_control import paga_sosta, registra_transito, soste_attive
 
app = Flask(__name__)
CORS(app)
 
app.config["SQLALCHEMY_DATABASE_URI"] = config.DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)
 
for folder in (config.UPLOAD_FOLDER, config.RESULTS_FOLDER, config.MODELS_FOLDER):
    os.makedirs(folder, exist_ok=True)
 
with app.app_context():
    db.create_all()
 
print("Caricamento modelli YOLO e PaddleOCR in corso...")
detector = LicensePlateDetector()
reader = LicensePlateReader()
print("Modelli caricati correttamente.")
 
 
def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in config.ALLOWED_EXTENSIONS
 
 
# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------
 
def letture_da_frame(frame) -> list[tuple[str, float]]:
    """Rileva le targhe in un fotogramma e ne restituisce le letture valide.
 
    estrai_targa() restituisce solo stringhe che rispettano il formato AA000AA,
    quindi una successiva chiamata a e_valida() sarebbe ridondante.
    """
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
    """Esegue la pipeline su una sequenza qualsiasi di fotogrammi.
 
    E' il punto in cui, in futuro, si innestera' la webcam del varco: bastera'
    passare i fotogrammi letti da cv2.VideoCapture(indice_dispositivo) invece
    di quelli estratti da un file. Nient'altro cambia.
    """
    letture: list[tuple[str, float]] = []
    for frame in frames:
        if frame is not None:
            letture.extend(letture_da_frame(frame))
    return letture
 
 
def frames_da_file(filepath: str) -> Iterator:
    """Fotogrammi da un file video o immagine, campionati ogni FRAME_SKIP."""
    estensione = filepath.rsplit(".", 1)[1].lower()
 
    if estensione not in config.VIDEO_EXTENSIONS:
        yield cv2.imread(filepath)
        return
 
    cap = cv2.VideoCapture(filepath)
    try:
        numero = 0
        while True:
            letto, frame = cap.read()
            if not letto:
                break
            numero += 1
            # I fotogrammi consecutivi sono quasi identici: campionarli non
            # toglie informazione al voto e riduce molto il tempo di calcolo.
            if numero % config.FRAME_SKIP == 0:
                yield frame
    finally:
        cap.release()
 
 
def file_piu_recente() -> str | None:
    candidati = [f for f in os.listdir(config.UPLOAD_FOLDER) if allowed_file(f)]
    if not candidati:
        return None
    return max(candidati, key=lambda f: os.path.getmtime(os.path.join(config.UPLOAD_FOLDER, f)))

def genera_flusso():
    while True:
        frame = stream_camera.get_jpeg()
        if frame:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n') 
        time.sleep(0.04)
# ---------------------------------------------------------------------------
# Endpoint di servizio e di prova manuale (invariati)
# ---------------------------------------------------------------------------
 
@app.route("/status", methods=["GET"])
def status():
    return jsonify({
        "status": "ok",
        "model_loaded": os.path.isfile(config.ACTIVE_MODEL_PATH),
        "active_model": os.path.basename(config.ACTIVE_MODEL_PATH),
    })
 
 
@app.route("/clean_folders", methods=["POST"])
def clean_folders():
    for folder in (config.UPLOAD_FOLDER, config.RESULTS_FOLDER):
        shutil.rmtree(folder, ignore_errors=True)
        os.makedirs(folder, exist_ok=True)
    return jsonify({"message": "Cartelle ripulite"}), 200
 
 
@app.route("/upload", methods=["POST"])
def upload():
    """Salva i file e ne restituisce i nomi archiviati. Usato nelle prove manuali."""
    files = request.files.getlist("images")
    if not files or files[0].filename == "":
        return jsonify({"error": "Nessun file ricevuto"}), 400
 
    salvati = []
    marca = int(time.time() * 1000)
    for indice, file in enumerate(files):
        if file.filename == "":
            continue
        if not allowed_file(file.filename):
            return jsonify({"error": f"Estensione non consentita: {file.filename}"}), 400
        filename = f"{marca}_{indice:02d}_{secure_filename(file.filename)}"
        file.save(os.path.join(config.UPLOAD_FOLDER, filename))
        salvati.append(filename)
 
    return jsonify({
        "message": f"{len(salvati)} file ricevuto/i",
        "filenames": salvati,
        "filename": salvati[-1] if salvati else None,
    }), 200
 
 
@app.route("/process", methods=["POST"])
def process_media():
    """Analizza UN file per volta, senza toccare le soste.
 
    Resta l'endpoint per provare la sola pipeline da Postman. Il varco vero
    e' /api/varco.
    """
    dati = request.get_json(silent=True) or {}
    richiesto = dati.get("filename") or request.form.get("filename")
 
    if richiesto:
        filename = secure_filename(richiesto)
        if not os.path.isfile(os.path.join(config.UPLOAD_FOLDER, filename)):
            return jsonify({"status": "error", "message": f"File non trovato: {filename}"}), 404
    else:
        filename = file_piu_recente()
        if filename is None:
            return jsonify({"status": "error", "message": "Nessun file da analizzare"}), 400
 
    letture_estese = letture_da_frames(frames_da_file(os.path.join(config.UPLOAD_FOLDER, filename)))
    if not letture_estese:
        return jsonify({
            "status": "no_plate",
            "message": "Nessuna targa valida rilevata",
            "filename": filename,
        }), 200
 
    # Estraiamo solo (targa, confidenza) per passarla alla funzione aggrega
    letture_per_voto = [(t, s) for t, s, f, a, c in letture_estese]
    risultati_voto = aggrega(letture_per_voto)
    
    results_list = []
    for risultato in risultati_voto:
        results_list.append({
            "plate_compact": risultato.targa,
            "plate_ui": formatta(risultato.targa),
            "is_valid_format": True,
            "confidence_avg": round(risultato.confidenza, 4),
            "occurrences": risultato.occorrenze,
            "total_reads": risultato.letture_totali,
        })
 
    return jsonify({
        "status": "success",
        "filename": filename,
        "results": results_list,
    }), 200
 
 
# ---------------------------------------------------------------------------
# Varco
# ---------------------------------------------------------------------------

@app.route("/api/stream")
def video_feed():
    """Flusso MJPEG per mostrare l'anteprima live nel frontend."""
    return Response(genera_flusso(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route("/api/varco", methods=["POST"])
def varco():
    """Transito al varco catturando fotogrammi in realtime dalla webcam."""
    frames = []
    
    # Cattura N fotogrammi distanziati di poco
    for _ in range(config.FRAMES_PER_LETTURA):
        frame = stream_camera.get_frame()
        if frame is not None:
            frames.append(frame)
        time.sleep(0.1)  # Lascia scorrere 100ms tra uno scatto e l'altro
        
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

    if migliore.confidenza < config.CONFIDENZA_MINIMA_AUTOMATICA:
        return jsonify({
            "esito": "CONFERMA_RICHIESTA",
            "candidati": lista_candidati_dict,
            "messaggio": "Il modello OCR è incerto. Conferma la targa corretta o inseriscila manualmente.",
            "frame_path": f_path, # AGGIUNTO
            "bbox_path": b_path,  # AGGIUNTO
            "crop_path": c_path   # AGGIUNTO
        }), 200
 
    decisione = registra_transito(
        migliore.targa,
        sorgente="webcam",
        confidenza=round(migliore.confidenza, 4),
        occorrenze=migliore.occorrenze,
        letture_totali=migliore.letture_totali,
        frame_path=f_path,
        bbox_path=b_path,
        crop_path=c_path
    )
    
    risposta = decisione.to_dict()
    risposta["candidati"] = lista_candidati_dict
    
    return jsonify(risposta), 200
 
 
@app.route("/api/varco/manuale", methods=["POST"])
def varco_manuale():
    """Transito con targa digitata a mano.
 
    Ripiego indispensabile: se l'OCR sbaglia durante la dimostrazione, il
    flusso non si blocca. E' anche cio' che nei parcheggi reali fa il citofono
    con l'operatore.
    """
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
        crop_path=dati.get("crop_path")
    )
    return jsonify(decisione.to_dict()), 200
 
 
# ---------------------------------------------------------------------------
# Soste e registro
# ---------------------------------------------------------------------------
 
@app.route("/api/soste", methods=["GET"])
def elenco_soste():
    """Elenco delle soste.
 
    Con ?stato=attiva restituisce i transiti non conclusi (APERTA e
    DA_PAGARE); con ?stato=APERTA|DA_PAGARE|PAGATA filtra sul singolo stato.
    """
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

@app.route("/api/images/<filename>")
def get_image(filename):
    """Serve le immagini salvate per il cruscotto diagnostico."""
    return send_from_directory(config.RESULTS_FOLDER, filename)
 
print("Riscaldamento modelli...")
letture_da_frame(np.zeros((640, 640, 3), dtype=np.uint8))
print("Modelli pronti.")

if __name__ == "__main__":
    # use_reloader=False: con il reloader Flask avvia un processo figlio e i
    # modelli verrebbero caricati due volte.
    app.run(debug=True, port=5000, use_reloader=False)