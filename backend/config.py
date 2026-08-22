import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
RESULTS_FOLDER = os.path.join(BASE_DIR, "results")
MODELS_FOLDER = os.path.join(BASE_DIR, "models")

# Percorso del modello YOLO attivo
ACTIVE_MODEL_PATH = os.path.join(MODELS_FOLDER, "best_medium.pt")

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "mp4"}
DETECTION_CONFIDENCE_THRESHOLD = 0.45
FRAME_SKIP = 10

# Formato standard targa italiana[cite: 2]
#ITALIAN_PLATE_REGEX = r"^[A-Z]{2}[0-9]{3}[A-Z]{2}$" 
#QUESTA LOGICA FORSE LA IMPLEMENTO DIRETTAMENTE IN postprocessing.py