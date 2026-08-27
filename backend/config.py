import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
RESULTS_FOLDER = os.path.join(BASE_DIR, "results")
MODELS_FOLDER = os.path.join(BASE_DIR, "models")

# Percorso del modello YOLO attivo
ACTIVE_MODEL_PATH = os.path.join(MODELS_FOLDER, "best_medium.onnx") #riemtti best_medium.pt se vuoi

VIDEO_EXTENSIONS = {"mp4"}
IMAGE_EXTENSIONS = {"png", "jpg", "jpeg"}
ALLOWED_EXTENSIONS = VIDEO_EXTENSIONS | IMAGE_EXTENSIONS

DETECTION_CONFIDENCE_THRESHOLD = 0.45
CONFIDENZA_MINIMA_AUTOMATICA = 0.90
FRAME_SKIP = 10

WEBCAM_INDEX = 2  # 2 dovrebbe essere la OBS Virtual Camera
FRAMES_PER_LETTURA = 3  # Quanti fotogrammi catturare e analizzare al click

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DATABASE_URL = "sqlite:///" + os.path.join(BASE_DIR, "parcheggio.db")
 
# ---------------------------------------------------------------------------
# Tariffa
# ---------------------------------------------------------------------------
# La tariffa e' al MINUTO, non all'ora: durante una discussione di tesi una
# sosta dura tre minuti, e con una tariffa oraria l'importo sarebbe sempre
# zero o sempre lo stesso. 5 centesimi al minuto = 3 euro l'ora.
TARIFFA_CENTESIMI_AL_MINUTO = 5
IMPORTO_MINIMO_CENTESIMI = 50
MINUTI_GRATUITI = 0
 
# Oltre questa soglia una sosta ancora aperta e' quasi certamente il residuo
# di un ingresso letto male, e viene segnalata come anomala.
ORE_MASSIME_SOSTA = 24