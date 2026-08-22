import cv2
from ultralytics import YOLO
import config

class LicensePlateDetector:
    def __init__(self):
        # Inizializza il modello YOLO al caricamento della classe
        self.model = YOLO(config.ACTIVE_MODEL_PATH)

    def detect(self, frame):
        if frame is None:
            return []

        # Effettua la predizione tramite YOLO[cite: 1]
        results = self.model.predict(frame, conf=config.DETECTION_CONFIDENCE_THRESHOLD)
        crops = []
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0]
                x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                
                # Blocca le coordinate dentro i bordi per non generare crop vuoti[cite: 1]
                h, w = frame.shape[:2]
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w, x2), min(h, y2)
                
                crop = frame[y1:y2, x1:x2]
                if crop.size > 0:
                    crops.append(crop)

        return crops