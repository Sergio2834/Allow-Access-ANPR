import re
from paddleocr import TextRecognition

class LicensePlateReader:
    def __init__(self):
        # Inizializza Paddle OCR[cite: 1]
        self.text_recognizer = TextRecognition(device="cpu")

    def read_text(self, crop):
        text = ""
        try:
            # Effettua la predizione OCR[cite: 1]
            output = self.text_recognizer.predict(input=crop, batch_size=1)
            for res in output:
                raw_text = res["rec_text"]
                score = res["rec_score"]
                # Lo score è in scala 0-1[cite: 1]
                if score and score > 0.6:
                    text = raw_text
        except Exception as e:
            print(f"Errore OCR su un ritaglio: {e}")
            return ""

        # Rimozione caratteri speciali e pulizia residui[cite: 1]
        pattern = re.compile(r'[\W]')
        text = pattern.sub('', text)
        text = text.replace("???", "")
        text = text.replace("粤", "")
        
        return str(text).upper()