import os
import shutil
import cv2

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename

import config
from pipeline.detector import LicensePlateDetector
from pipeline.reader import LicensePlateReader
from pipeline.postprocessing import estrai_targa, e_valida, formatta

app = Flask(__name__)
CORS(app)

# Crea le cartelle necessarie al primo avvio, se non esistono già[cite: 3]
for folder in (config.UPLOAD_FOLDER, config.RESULTS_FOLDER, config.MODELS_FOLDER):
    os.makedirs(folder, exist_ok=True)

# Caricamento dei modelli ML in memoria all'avvio del server
print("Caricamento modelli YOLO e PaddleOCR in corso...")
detector = LicensePlateDetector()
reader = LicensePlateReader()
print("Modelli caricati correttamente.")

def allowed_file(filename: str) -> bool:
    """Controlla che l'estensione del file sia tra quelle ammesse in config.py[cite: 3]."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in config.ALLOWED_EXTENSIONS

@app.route("/status", methods=["GET"])
def status():
    """Verifica rapida dello stato del server[cite: 3]."""
    model_ready = os.path.isfile(config.ACTIVE_MODEL_PATH)
    return jsonify({
        "status": "ok",
        "model_loaded": model_ready,
        "active_model": os.path.basename(config.ACTIVE_MODEL_PATH),
    })

@app.route("/clean_folders", methods=["POST"])
def clean_folders():
    """Ripulisce upload e results[cite: 3]."""
    for folder in (config.UPLOAD_FOLDER, config.RESULTS_FOLDER):
        shutil.rmtree(folder, ignore_errors=True)
        os.makedirs(folder, exist_ok=True)
    return jsonify({"message": "Cartelle ripulite"}), 200

@app.route("/upload", methods=["POST"])
def upload():
    """Endpoint pre-esistente per il salvataggio dei file[cite: 3]."""
    files = request.files.getlist("images")
    if not files or files[0].filename == "":
        return jsonify({"error": "Nessuna immagine ricevuta"}), 400
 
    saved_filenames = []
    for idx, file in enumerate(files):
        if file.filename == "":
            continue
        if not allowed_file(file.filename):
            return jsonify({"error": f"Estensione non consentita: {file.filename}"}), 400
 
        filename = f"{idx:02d}_{secure_filename(file.filename)}"
        file.save(os.path.join(config.UPLOAD_FOLDER, filename))
        saved_filenames.append(filename)
 
    return jsonify({
        "message": f"{len(saved_filenames)} immagine/i ricevuta/e",
        "filenames": saved_filenames,
    }), 200

@app.route("/process", methods=["POST"])
def process_media():
    """
    Analizza i file (immagini o video) caricati nella cartella uploads.
    Restituisce un set di targhe uniche trovate.
    """
    unique_plates = set()
    results_list = []
    
    for filename in os.listdir(config.UPLOAD_FOLDER):
        filepath = os.path.join(config.UPLOAD_FOLDER, filename)
        
        if not allowed_file(filename):
            continue
            
        ext = filename.rsplit(".", 1)[1].lower()
        
        # LOGICA PER FILE VIDEO
        if ext in {"mp4", "avi"}:
            cap = cv2.VideoCapture(filepath)
            frame_count = 0
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                    
                frame_count += 1
                
                if frame_count % config.FRAME_SKIP != 0:
                    continue
                    
                # Estrazione e lettura
                crops = detector.detect(frame)
                for crop in crops:
                    raw_text = reader.read_text(crop)
                    if raw_text:
                        # Passiamo il testo grezzo al tuo algoritmo avanzato
                        targa_estratta = estrai_targa(raw_text)
                        
                        if targa_estratta and targa_estratta not in unique_plates:
                            unique_plates.add(targa_estratta)
                            
                            # Formattiamo per la UI del frontend (es. AB 123 CD)
                            targa_formattata = formatta(targa_estratta)
                            
                            results_list.append({
                                "plate_compact": targa_estratta,   # Per ricerca nel database (SPA)
                                "plate_ui": targa_formattata,      # Per mostrarla a schermo nella SPA
                                "is_valid_format": e_valida(targa_estratta), # Sarà True di default se l'ha estratta
                                "source": f"{filename} (frame {frame_count})"
                            })
            cap.release()

        # LOGICA PER IMMAGINI STATICHE
        else:
            frame = cv2.imread(filepath)
            crops = detector.detect(frame)
            for crop in crops:
                    raw_text = reader.read_text(crop)
                    
                    if raw_text:
                        # Passiamo il testo grezzo al tuo algoritmo avanzato
                        targa_estratta = estrai_targa(raw_text)
                        
                        if targa_estratta and targa_estratta not in unique_plates:
                            unique_plates.add(targa_estratta)
                            
                            # Formattiamo per la UI del frontend (es. AB 123 CD)
                            targa_formattata = formatta(targa_estratta)
                            
                            results_list.append({
                                "plate_compact": targa_estratta,   # Per ricerca nel database (SPA)
                                "plate_ui": targa_formattata,      # Per mostrarla a schermo nella SPA
                                "is_valid_format": e_valida(targa_estratta), # Sarà True di default se l'ha estratta
                                "source": filename
                            })

    if not results_list:
        return jsonify({"status": "error", "message": "Nessuna targa rilevata"}), 404

    return jsonify({
        "status": "success",
        "results": results_list
    }), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)