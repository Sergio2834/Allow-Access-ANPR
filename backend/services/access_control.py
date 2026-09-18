"""
Logica del varco unico a stato.
 
Il sistema non chiede se il veicolo sta entrando o uscendo: lo deduce dal
fatto che la targa letta abbia o meno una sosta attiva.
 
    nessuna sosta attiva  -> e' un ingresso: si apre una sosta
    sosta APERTA          -> e' un'uscita: si chiude, si ferma il cronometro
                             e si fissa l'importo da saldare
    sosta DA_PAGARE       -> uscita gia' rilevata, si ripresenta l'importo
 
Il pagamento avviene nella stessa interazione dell'uscita.

"""
 
from __future__ import annotations
 
from dataclasses import dataclass
 
import config
from park_models import Accesso, EsitoVarco, Sosta, StatoSosta, adesso, db
 
 
# ---------------------------------------------------------------------------
# Tariffa
# ---------------------------------------------------------------------------
 
def calcola_importo(durata_secondi: int) -> int:
    """Importo in centesimi per una sosta di data durata.
        I minuti si arrotondano per eccesso.
    """
    minuti = -(-max(0, durata_secondi) // 60)
    minuti_tariffati = max(0, minuti - config.MINUTI_GRATUITI)
 
    if minuti_tariffati == 0:
        return 0
 
    importo = minuti_tariffati * config.TARIFFA_CENTESIMI_AL_MINUTO
    return max(importo, config.IMPORTO_MINIMO_CENTESIMI)
 
 
# ---------------------------------------------------------------------------
# Decisione
# ---------------------------------------------------------------------------
 
@dataclass
class Decisione:
    """Esito di una rilevazione al varco, pronto per essere serializzato."""
 
    esito: EsitoVarco
    targa: str | None = None
    sosta: Sosta | None = None
    importo_centesimi: int | None = None
    durata_secondi: int | None = None
    messaggio: str | None = None
    # NUOVI CAMPI
    frame_path: str | None = None
    bbox_path: str | None = None
    crop_path: str | None = None
    candidati_json: str | None = None
 
    def to_dict(self) -> dict:
        return {
            "esito": self.esito.value,
            "targa": self.targa,
            "importo_centesimi": self.importo_centesimi,
            "durata_secondi": self.durata_secondi,
            "messaggio": self.messaggio,
            "sosta": self.sosta.to_dict(config.ORE_MASSIME_SOSTA) if self.sosta else None,
            "frame_path": self.frame_path,
            "bbox_path": self.bbox_path,
            "crop_path": self.crop_path,
            "candidati_json": self.candidati_json,
        }
 
 
def soste_attive() -> list[Sosta]:
    """Soste non ancora concluse: veicoli dentro o fermi al varco."""
    return (
        Sosta.query
        .filter(Sosta.stato.in_([StatoSosta.APERTA.value, StatoSosta.DA_PAGARE.value]))
        .order_by(Sosta.ingresso_at.desc())
        .all()
    )
 
 
def registra_transito(
    targa: str | None,
    sorgente: str = "file",
    confidenza: float | None = None,
    occorrenze: int | None = None,
    letture_totali: int | None = None,
    frame_path: str | None = None,
    bbox_path: str | None = None,
    crop_path: str | None = None,
    candidati_json: str | None = None,   
) -> Decisione:
    """
        Applica la macchina a stati e scrive nel registro accessi.
        Ogni chiamata produce una riga in Accesso, anche quando la lettura
        fallisce: i tentativi non riusciti servono a calcolare il tasso di 
        riuscita del sistema in esercizio.
    """
    if not targa:
        decisione = Decisione(
            esito=EsitoVarco.TARGA_NON_RILEVATA,
            messaggio="Nessuna targa leggibile nei fotogrammi.",
            frame_path=frame_path, 
            bbox_path=bbox_path,    
            crop_path=crop_path,    
            candidati_json=candidati_json,
        )
        _registra(decisione, sorgente, confidenza, occorrenze, letture_totali)
        return decisione
 
    sosta = next((s for s in soste_attive() if s.targa == targa), None)
 
    # --- Nessuna sosta attiva: e' un ingresso -------------------------------
    if sosta is None:
        sosta = Sosta(targa=targa, stato=StatoSosta.APERTA.value, ingresso_at=adesso())
        db.session.add(sosta)
        db.session.flush()
 
        decisione = Decisione(
            esito=EsitoVarco.INGRESSO_CONSENTITO,
            targa=targa,
            sosta=sosta,
            durata_secondi=0,
            messaggio="Ingresso registrato. Il conteggio della sosta è iniziato.",
            frame_path=frame_path,
            bbox_path=bbox_path,    
            crop_path=crop_path,    
            candidati_json=candidati_json,
        )
        _registra(decisione, sorgente, confidenza, occorrenze, letture_totali)
        return decisione
 
    # --- Sosta aperta: e' un'uscita, si chiude e si fissa l'importo ---------
    if sosta.stato == StatoSosta.APERTA.value:
        sosta.uscita_at = adesso()
        sosta.stato = StatoSosta.DA_PAGARE.value
        sosta.importo_centesimi = calcola_importo(sosta.durata_secondi())
        messaggio = "Uscita rilevata. Sosta conclusa, saldare per aprire la sbarra."
    else:
        # Uscita gia' rilevata in un passaggio precedente: si ripresenta lo stesso importo.
        messaggio = "Uscita già rilevata. Importo invariato."
 
    decisione = Decisione(
        esito=EsitoVarco.PAGAMENTO_RICHIESTO,
        targa=sosta.targa,
        sosta=sosta,
        importo_centesimi=sosta.importo_centesimi,
        durata_secondi=sosta.durata_secondi(),
        messaggio=messaggio,
        frame_path=frame_path,
        bbox_path=bbox_path,  
        crop_path=crop_path,
        candidati_json=candidati_json,
    )
    _registra(decisione, sorgente, confidenza, occorrenze, letture_totali)
    return decisione
 
 
def paga_sosta(id_sosta: int) -> Decisione | None:
    """
        Registra il pagamento fittizio di una sosta in attesa di saldo.
        L'importo NON viene ricalcolato: e' stato fissato alla rilevazione
        dell'uscita, quando il cronometro si e' fermato. 
    """
    sosta = db.session.get(Sosta, id_sosta)
    if sosta is None or sosta.stato != StatoSosta.DA_PAGARE.value:
        return None
 
    sosta.stato = StatoSosta.PAGATA.value
    sosta.pagata_at = adesso()
    db.session.commit()
 
    decisione = Decisione(
        esito=EsitoVarco.USCITA_CONSENTITA,
        targa=sosta.targa,
        sosta=sosta,
        importo_centesimi=sosta.importo_centesimi,
        durata_secondi=sosta.durata_secondi(),
        messaggio="Pagamento registrato. Transito consentito.",
    )
    
    return decisione
 
 
def _registra(
    decisione: Decisione,
    sorgente: str,
    confidenza: float | None,
    occorrenze: int | None,
    letture_totali: int | None,
) -> None:
    """Scrive la riga nel registro accessi e conferma la transazione."""
    db.session.add(Accesso(
        sosta_id=decisione.sosta.id if decisione.sosta else None,
        targa_letta=decisione.targa,
        esito=decisione.esito.value,
        sorgente=sorgente,
        confidenza=confidenza,
        occorrenze=occorrenze,
        letture_totali=letture_totali,
        frame_path=decisione.frame_path,
        bbox_path=decisione.bbox_path,
        crop_path=decisione.crop_path,
        candidati_json=decisione.candidati_json,
    ))
    db.session.commit()