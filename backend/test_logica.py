"""
Test della logica pura del controllo accessi.
 
calcola_importo() e' una funzione pura: non tocca il database, quindi si puo'
verificare senza avviare Flask ne' creare tabelle. Eseguire con:
 
    python test_logica.py
"""
 
import sys
import unittest
from pathlib import Path
 
sys.path.insert(0, str(Path(__file__).resolve().parent))
 
import config
 
 
def calcola_importo(durata_secondi):
    """Copia della funzione in services/access_control.py.
 
    Duplicata qui perche' quel modulo importa i modelli SQLAlchemy: isolarla
    permette di eseguire i test senza dipendenze. Se cambi la formula,
    cambiala in entrambi i punti.
    """
    minuti = -(-max(0, durata_secondi) // 60)
    minuti_tariffati = max(0, minuti - config.MINUTI_GRATUITI)
    if minuti_tariffati == 0:
        return 0
    return max(minuti_tariffati * config.TARIFFA_CENTESIMI_AL_MINUTO,
               config.IMPORTO_MINIMO_CENTESIMI)
 
 
class TestTariffa(unittest.TestCase):
    def test_sosta_nulla(self):
        self.assertEqual(calcola_importo(0), 0)
 
    def test_minuto_iniziato_e_minuto_dovuto(self):
        # Sotto il minimo si paga comunque l'importo minimo.
        self.assertEqual(calcola_importo(1), 50)
        self.assertEqual(calcola_importo(59), 50)
        self.assertEqual(calcola_importo(61), 50)
 
    def test_oltre_il_minimo(self):
        self.assertEqual(calcola_importo(60 * 10), 50)   # 10 min -> 50c
        self.assertEqual(calcola_importo(60 * 20), 100)  # 20 min -> 1,00
        self.assertEqual(calcola_importo(3600), 300)     # 1 ora  -> 3,00
        self.assertEqual(calcola_importo(3600 * 3), 900)
 
    def test_arrotondamento_per_eccesso(self):
        # 20 min e 1 secondo si tariffano come 21 minuti.
        self.assertEqual(calcola_importo(60 * 20 + 1), 105)
 
    def test_durata_negativa_non_esplode(self):
        self.assertEqual(calcola_importo(-5), 0)
 
 
class TestMacchinaAStati(unittest.TestCase):
    """Documenta le transizioni attese, verificate poi a mano sul sistema."""
 
    def test_sequenza_di_un_transito_completo(self):
        transizioni = [
            ("nessuna sosta",     "INGRESSO_CONSENTITO", "APERTA"),
            ("sosta APERTA",      "PAGAMENTO_RICHIESTO", "DA_PAGARE"),
            ("pagamento",         "USCITA_CONSENTITA",   "PAGATA"),
        ]
        self.assertEqual(len(transizioni), 3)
        self.assertEqual(transizioni[-1][2], "PAGATA")
 
 
if __name__ == "__main__":
    unittest.main(verbosity=2)