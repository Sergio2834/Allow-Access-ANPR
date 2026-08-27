import cv2
import config
import threading
import time

class WebcamStream:
    def __init__(self):
        # Su Windows, CAP_DSHOW velocizza drasticamente l'avvio della camera
        self.cap = cv2.VideoCapture(config.WEBCAM_INDEX, cv2.CAP_DSHOW)
        # Forza una risoluzione adatta (es. 720p) per avere targhe leggibili
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        self.latest_frame = None
        self.lock = threading.Lock()
        self.running = True

        self.thread = threading.Thread(target=self._update, daemon=True)
        self.thread.start()

    def _update(self):
        """Ciclo continuo che gira in un thread separato."""
        while self.running:
            success, frame = self.cap.read()
            if success:
                # Usa il lock per evitare che un fotogramma venga letto a metà
                with self.lock:
                    self.latest_frame = frame.copy()
            # Un micro-riposo per non mandare la CPU al 100%
            time.sleep(0.01)

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