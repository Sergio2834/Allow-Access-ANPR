import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_FOLDER = os.path.join(BASE_DIR, "results")
MODELS_FOLDER = os.path.join(BASE_DIR, "models")

# Percorso del modello YOLO attivo
ACTIVE_MODEL_PATH = os.path.join(MODELS_FOLDER, "best_medium.onnx") #rimetti best_medium.pt eventualmente

#Soglie AI
DETECTION_CONFIDENCE_THRESHOLD = 0.45
CONFIDENZA_MINIMA_AUTOMATICA = 0.90

#Parametri Hardware
WEBCAM_INDEX = 2  # 2 dovrebbe essere la OBS Virtual Camera
FRAMES_PER_LETTURA = 3  # Quanti fotogrammi catturare e analizzare al click

# Database
DATABASE_URL = "sqlite:///" + os.path.join(BASE_DIR, "parcheggio.db")

# Parametri Business (Tariffa)
TARIFFA_CENTESIMI_AL_MINUTO = 5
IMPORTO_MINIMO_CENTESIMI = 50
MINUTI_GRATUITI = 0
ORE_MASSIME_SOSTA = 24

# Sicurezza e Autenticazione
JWT_SECRET = "VFVKNFNEQOJoewdOFNQKMWMOInanmcokQCNDWOICasèEWCRBEXjqdq"