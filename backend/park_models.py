"""
Modello dati del parcheggio.
 
Due sole entita':
 
  Sosta    il periodo in cui un veicolo e' dentro il parcheggio. E' cio' su
           cui si basa la logica del varco a stato.
 
  Accesso  il registro di OGNI singola rilevazione, riuscita o fallita, con i
           dati della pipeline. E' separato da Sosta perche' serve a uno scopo
           diverso: e' da qui che escono i numeri del capitolo dei risultati
           della tesi, mentre Sosta serve al funzionamento del sistema.
 
Non esiste una tabella Veicolo: nel modello a varco unico non c'e' una fase di
registrazione, la targa entra nel sistema quando l'auto entra. L'elenco dei
veicoli visti si ottiene raggruppando le soste per targa.
"""
 
from __future__ import annotations
 
from datetime import datetime, timedelta, timezone
from enum import Enum
 
from flask_sqlalchemy import SQLAlchemy
 
db = SQLAlchemy()
 
 
def adesso() -> datetime:
    """Istante corrente in UTC, senza fuso.
 
    SQLite non conserva il fuso orario: memorizzare sempre UTC naive evita di
    confrontare istanti con e senza fuso, che in Python solleva TypeError.
    La conversione all'ora locale avviene nel frontend.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
 
 
def _iso(momento: datetime | None) -> str | None:
    """ISO 8601 con la Z finale, cosi' il browser lo interpreta come UTC."""
    return momento.isoformat() + "Z" if momento else None
 
 
class StatoSosta(str, Enum):
    """Ciclo di vita di una sosta.
 
    Il passaggio da APERTA a DA_PAGARE avviene alla lettura di USCITA: e' li'
    che il cronometro si ferma e l'importo viene fissato. Non esiste piu' lo
    stato intermedio "pagata ma ancora dentro" della versione precedente,
    perche' il pagamento e' l'ultimo atto e non ne precede un altro.
    """
 
    APERTA = "APERTA"        # veicolo dentro, cronometro in corso
    DA_PAGARE = "DA_PAGARE"  # uscita rilevata, sosta chiusa, importo fissato
    PAGATA = "PAGATA"        # importo saldato, transito concluso
 
 
class EsitoVarco(str, Enum):
    """Esito di una rilevazione. Guida il comportamento del frontend."""
 
    INGRESSO_CONSENTITO = "INGRESSO_CONSENTITO"
    PAGAMENTO_RICHIESTO = "PAGAMENTO_RICHIESTO"
    TARGA_NON_RILEVATA = "TARGA_NON_RILEVATA"
    # Prodotto dall'endpoint di pagamento, non dal varco: e' la conferma che
    # il transito puo' avvenire.
    USCITA_CONSENTITA = "USCITA_CONSENTITA"
 
 
class Sosta(db.Model):
    __tablename__ = "soste"
 
    id = db.Column(db.Integer, primary_key=True)
    targa = db.Column(db.String(7), nullable=False, index=True)
    stato = db.Column(db.String(12), nullable=False, default=StatoSosta.APERTA.value)
 
    ingresso_at = db.Column(db.DateTime, nullable=False, default=adesso)
    uscita_at = db.Column(db.DateTime, nullable=True)
    pagata_at = db.Column(db.DateTime, nullable=True)
 
    importo_centesimi = db.Column(db.Integer, nullable=True)
 
    accessi = db.relationship("Accesso", back_populates="sosta", lazy="select")
 
    @property
    def attiva(self) -> bool:
        """Transito non ancora concluso: il veicolo e' dentro o al varco."""
        return self.stato in (StatoSosta.APERTA.value, StatoSosta.DA_PAGARE.value)
 
    def durata_secondi(self) -> int:
        """Durata della sosta.
 
        Una volta rilevata l'uscita il valore e' definitivo; finche' la sosta
        e' aperta cresce con il tempo corrente.
        """
        fine = self.uscita_at or adesso()
        return max(0, int((fine - self.ingresso_at).total_seconds()))
 
    def anomala(self, ore_massime: int) -> bool:
        """Sosta attiva da troppo tempo: probabile residuo di una lettura errata."""
        return self.attiva and (adesso() - self.ingresso_at) > timedelta(hours=ore_massime)
 
    def to_dict(self, ore_massime: int = 24) -> dict:
        return {
            "id": self.id,
            "targa": self.targa,
            "stato": self.stato,
            "ingresso_at": _iso(self.ingresso_at),
            "uscita_at": _iso(self.uscita_at),
            "pagata_at": _iso(self.pagata_at),
            "importo_centesimi": self.importo_centesimi,
            "durata_secondi": self.durata_secondi(),
            "anomala": self.anomala(ore_massime),
        }
 
 
class Accesso(db.Model):
    """Registro di una singola rilevazione al varco."""
 
    __tablename__ = "accessi"
 
    id = db.Column(db.Integer, primary_key=True)
    creato_at = db.Column(db.DateTime, nullable=False, default=adesso, index=True)
 
    sosta_id = db.Column(db.Integer, db.ForeignKey("soste.id"), nullable=True)
    sosta = db.relationship("Sosta", back_populates="accessi")
 
    targa_letta = db.Column(db.String(7), nullable=True)
    esito = db.Column(db.String(24), nullable=False)
    sorgente = db.Column(db.String(12), nullable=False, default="file")  # file | webcam | manuale
 
    # Dati della pipeline: servono a calcolare, sul registro, il tasso di
    # riuscita del sistema in esercizio.
    confidenza = db.Column(db.Float, nullable=True)
    occorrenze = db.Column(db.Integer, nullable=True)
    letture_totali = db.Column(db.Integer, nullable=True)
 
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "creato_at": _iso(self.creato_at),
            "sosta_id": self.sosta_id,
            "targa_letta": self.targa_letta,
            "esito": self.esito,
            "sorgente": self.sorgente,
            "confidenza": self.confidenza,
            "occorrenze": self.occorrenze,
            "letture_totali": self.letture_totali,
        }