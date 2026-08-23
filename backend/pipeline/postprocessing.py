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
 
# Confusioni OCR piu' comuni. Da rifinire sulla matrice di confusione
# calcolata sul proprio test set.
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
 
    Sostituisce la catena di replace() del main.py originale: elimina in un
    colpo solo i punti separatori delle targhe italiane, gli spazi, i
    caratteri non codificabili e i residui non latini del dataset cinese.
    """
    return re.sub(r"[^A-Z0-9]", "", testo.upper()) if testo else ""
 
 
def correggi(testo: str) -> str:
    """Corregge le confusioni OCR sfruttando la posizione nel formato AA000AA.
 
    Sostituisce la riga `text.replace("O", "0")` del codice originale, che era
    un residuo del progetto sulle targhe cinesi: applicata alle posizioni
    0, 1, 5, 6 introduce una cifra dove il formato impone una lettera.
 
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
 
    E' la funzione che risolve il caso in cui il riconoscitore restituisce
    caratteri in eccesso perche' il ritaglio contiene, oltre alla targa, altro
    materiale grafico (loghi, testo della cornice portatarga, bande blu).
    Cercare il formato DENTRO la stringa invece di pretendere che coincida con
    essa e' molto piu' robusto che pretendere un ritaglio perfetto.
 
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
 
    vincitrice, totale = punteggio.most_common(1)[0]
    return RisultatoVoto(
        targa=vincitrice,
        confidenza=totale / occorrenze[vincitrice],
        occorrenze=occorrenze[vincitrice],
        letture_totali=len(letture),
    )