import re
from paddleocr import TextRecognition

class LicensePlateReader:
    def __init__(self):
        # Inizializza Paddle OCR[cite: 1]
        self.text_recognizer = TextRecognition(device="cpu")

    def read_text(self, crop):
        text = ""
        best_score = 0.0
        try:
            # Effettua la predizione OCR
            output = self.text_recognizer.predict(input=crop, batch_size=1)
            for res in output:
                raw_text = res["rec_text"]
                score = res["rec_score"]
                # Lo score è in scala 0-1
                if score and score > best_score:
                    text = raw_text
                    best_score = score
        except Exception as e:
            print(f"Errore OCR su un ritaglio: {e}")
            return "", 0.0

        # Rimozione caratteri speciali e pulizia residui
        pattern = re.compile(r'[\W]')
        text = pattern.sub('', text)
        text = text.replace("???", "")
        text = text.replace("粤", "")
        
        return str(text).upper(), best_score