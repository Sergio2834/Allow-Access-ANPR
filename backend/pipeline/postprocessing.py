import re
from collections import Counter
from dataclasses import dataclass
 
# ---------------------------------------------------------------------------
# Grammatica della targa italiana (dal 1994): AA 000 AA
# L'alfabeto ammesso esclude I, O, Q, U per evitare ambiguita' con 1, 0, 0, V.
# ---------------------------------------------------------------------------
 
LETTERA = "[A-HJ-NPR-TV-Z]"  # 22 lettere: mancano I, O, Q, U
REGEX_TARGA = re.compile(f"{LETTERA}{{2}}[0-9]{{3}}{LETTERA}{{2}}")
 
POSIZIONI_CIFRA = (2, 3, 4)

CIFRA_VERSO_LETTERA = {"0": "D", 
                       "1": "J", 
                       "2": "Z", 
                       "4": "A",
                       "5": "S", 
                       "6": "G", 
                       "7": "T", 
                       "8": "B"}
LETTERA_VERSO_CIFRA = {"O": "0", 
                       "D": "0", 
                       "Q": "0", 
                       "I": "1", 
                       "J": "1",
                       "L": "1", 
                       "Z": "2", 
                       "A": "4", 
                       "S": "5", 
                       "G": "6",
                       "T": "7", 
                       "B": "8"}
 
 
def pulisci(testo: str) -> str:
    """Tiene solo lettere maiuscole e cifre.
    """
    return re.sub(r"[^A-Z0-9]", "", testo.upper()) if testo else ""
 
 
def correggi(testo: str) -> str:
    """Corregge le confusioni OCR sfruttando la posizione nel formato AA000AA.
        Agisce solo su stringhe di lunghezza 7: senza allineamento posizionale la
        correzione non sarebbe fondata.
    """
    if len(testo) != 7:
        return testo
    return "".join(
        LETTERA_VERSO_CIFRA.get(c, c) if i in POSIZIONI_CIFRA
        else CIFRA_VERSO_LETTERA.get(c, c)
        for i, c in enumerate(testo)
    )

def estrai_targa(testo_grezzo: str) -> str | None:
    """Estrae dalla lettura grezza la sottostringa in formato targa italiana.
        Restituisce None se nessuna sottostringa rispetta il formato.
    """
    pulito = pulisci(testo_grezzo)
    if not pulito:
        return None
 
    # 1) la targa e' gia' presente cosi' com'e' da qualche parte nella stringa
    trovata = REGEX_TARGA.search(pulito)
    if trovata:
        return trovata.group()
 
    # 2) altrimenti si tenta la correzione posizionale su finestre di 7
    #    caratteri, che copre il caso "stringa giusta ma con caratteri confusi"
    for inizio in range(max(1, len(pulito) - 6)):
        candidata = correggi(pulito[inizio:inizio + 7])
        if REGEX_TARGA.fullmatch(candidata):
            return candidata
 
    return None
 
 
def e_valida(targa: str | None) -> bool:
    return bool(targa) and bool(REGEX_TARGA.fullmatch(targa))
 
 
def formatta(targa: str) -> str:
    """Rappresentazione 'AA 000 AA' per l'interfaccia. A database si salva compatta."""
    return f"{targa[:2]} {targa[2:5]} {targa[5:]}" if e_valida(targa) else targa

# ---------------------------------------------------------------------------
# Voto multi-frame
# ---------------------------------------------------------------------------
 
@dataclass
class RisultatoVoto:
    targa: str | None = None
    confidenza: float = 0.0
    occorrenze: int = 0
    letture_totali: int = 0
 
 
def aggrega(letture: list[tuple[str, float]]) -> RisultatoVoto:
    """Voto di maggioranza pesato sulla confidenza OCR.
 
    Ogni lettura contribuisce con la propria confidenza: due letture deboli
    non battono due letture forti. Vince la targa con punteggio cumulato piu'
    alto. Le letture sono gia' state validate a monte da estrai_targa().
    """
    if not letture:
        return RisultatoVoto()
 
    punteggio: Counter[str] = Counter()
    occorrenze: Counter[str] = Counter()
    for targa, confidenza in letture:
        punteggio[targa] += confidenza
        occorrenze[targa] += 1

    risultati = []
    for targa, totale in punteggio.most_common():
        risultati.append(
            RisultatoVoto(
                targa=targa,
                confidenza=totale / occorrenze[targa],
                occorrenze=occorrenze[targa],
                letture_totali=len(letture),
            )
        )
    return risultati