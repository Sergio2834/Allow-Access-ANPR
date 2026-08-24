import os
import shutil
import time
 
import cv2
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename
 
import config
from pipeline.detector import LicensePlateDetector
from pipeline.reader import LicensePlateReader
from pipeline.postprocessing import aggrega, estrai_targa, formatta
 
app = Flask(__name__)
CORS(app)
 
for folder in (config.UPLOAD_FOLDER, config.RESULTS_FOLDER, config.MODELS_FOLDER):
    os.makedirs(folder, exist_ok=True)
 
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
 
    estrai_targa() restituisce solo stringhe che rispettano il formato
    AA000AA, quindi una successiva chiamata a e_valida() sarebbe ridondante.
    """
    letture = []
    for crop in detector.detect(frame):
        testo_grezzo, score = reader.read_text(crop)
        if not testo_grezzo:
            continue
        targa = estrai_targa(testo_grezzo)
        if targa:
            letture.append((targa, score))
    return letture
 
 
def letture_da_file(filepath: str) -> list[tuple[str, float]]:
    """Esegue la pipeline su UN singolo file, video o immagine."""
    estensione = filepath.rsplit(".", 1)[1].lower()
    letture: list[tuple[str, float]] = []
 
    if estensione in config.VIDEO_EXTENSIONS:
        cap = cv2.VideoCapture(filepath)
        numero_frame = 0
        while True:
            letto, frame = cap.read()
            if not letto:
                break
            numero_frame += 1
            # Un fotogramma ogni FRAME_SKIP: quelli consecutivi sono quasi
            # identici e non aggiungono informazione al voto.
            if numero_frame % config.FRAME_SKIP != 0:
                continue
            letture.extend(letture_da_frame(frame))
        cap.release()
    else:
        letture.extend(letture_da_frame(cv2.imread(filepath)))
 
    return letture
 
 
def file_piu_recente() -> str | None:
    """Nome del file caricato per ultimo, usato quando /process non ne riceve uno."""
    candidati = [f for f in os.listdir(config.UPLOAD_FOLDER) if allowed_file(f)]
    if not candidati:
        return None
    return max(
        candidati,
        key=lambda f: os.path.getmtime(os.path.join(config.UPLOAD_FOLDER, f)),
    )
 
 
# ---------------------------------------------------------------------------
# Endpoint
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
    """Salva i file ricevuti e restituisce i nomi con cui sono stati archiviati.
 
    Il prefisso temporale rende il nome univoco: due caricamenti dello stesso
    video non si sovrascrivono e l'ordine sul disco corrisponde all'ordine di
    caricamento. Il campo "filename" della risposta e' quello da passare a
    /process.
    """
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
    """Analizza UN file per volta.
 
    Con {"filename": "..."} nel corpo JSON analizza quel file; senza corpo
    analizza il file caricato piu' di recente. Il flusso Postman resta
    identico -- POST /upload, poi POST /process senza parametri -- ma le
    letture di un transito precedente non entrano piu' nel voto di quello
    corrente.
 
    Codici di risposta:
      200 status=success   targa riconosciuta
      200 status=no_plate  analisi eseguita, nessuna targa valida trovata
      400                  nessun file da analizzare
      404                  il file richiesto non esiste
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
 
    filepath = os.path.join(config.UPLOAD_FOLDER, filename)
    letture = letture_da_file(filepath)
 
    # "Nessuna targa trovata" non e' un guasto: la richiesta e' stata servita,
    # la pipeline ha prodotto un esito negativo. Restituire 404 lo
    # confonderebbe con "il file non esiste".
    if not letture:
        return jsonify({
            "status": "no_plate",
            "message": "Nessuna targa valida rilevata",
            "filename": filename,
        }), 200
 
    risultato = aggrega(letture)
    return jsonify({
        "status": "success",
        "filename": filename,
        "results": [{
            "plate_compact": risultato.targa,
            "plate_ui": formatta(risultato.targa),
            "is_valid_format": True,
            "confidence_avg": round(risultato.confidenza, 4),
            "occurrences": risultato.occorrenze,
            "total_reads": risultato.letture_totali,
        }],
    }), 200
 
 
if __name__ == "__main__":
    # use_reloader=False: con il reloader attivo Flask avvia un processo
    # figlio e i modelli verrebbero caricati due volte, raddoppiando tempo di
    # avvio e memoria occupata.
    app.run(debug=True, port=5000, use_reloader=False)