import os
import cv2
import config
import threading
import time

class WebcamStream:
    def __init__(self):
        # Legge l'URL della telecamera RTSP (da Docker), altrimenti usa la webcam USB locale
        self.src = os.getenv("CAMERA_URL", config.WEBCAM_INDEX)
        self.cap = cv2.VideoCapture()
        self.latest_frame = None
        self.lock = threading.Lock()
        self.running = True
        self.thread = threading.Thread(target=self._update, daemon=True)
        self.thread.start()

    def _connetti(self):
        if isinstance(self.src, str) and self.src.startswith("rtsp"):
            self.cap.open(self.src, cv2.CAP_FFMPEG)
        else:
            # Fallback per l'ambiente di sviluppo locale su Windows
            self.cap.open(int(self.src), cv2.CAP_DSHOW)
            # Forza una risoluzione adatta (es. 720p) per avere targhe leggibili
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        
    def _update(self):
        """Ciclo continuo che gira in un thread separato."""
        while self.running:
            if not self.cap.isOpened():
                self._connetti()
                if not self.cap.isOpened():
                    time.sleep(1) # Se fallisce, aspetta 1 secondo e riprova
                    continue

            success, frame = self.cap.read()
            if success:
                # Usa il lock per evitare che un fotogramma venga letto a metà
                with self.lock:
                    self.latest_frame = frame.copy()
            else:
                self.cap.release()
                time.sleep(0.5)

    def get_frame(self):
        with self.lock:
            if self.latest_frame is not None:
                return self.latest_frame.copy()
            return None

    def get_jpeg(self):
        """Codifica il frame in JPEG per lo streaming verso il frontend."""
        frame = self.get_frame()
        if frame is None:
            return None
        ret, jpeg = cv2.imencode('.jpg', frame)
        return jpeg.tobytes() if ret else None

# Istanza globale: la camera viene aperta una sola volta all'avvio di Flask
stream_camera = WebcamStream()