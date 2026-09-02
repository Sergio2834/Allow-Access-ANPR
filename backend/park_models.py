from __future__ import annotations 
from datetime import datetime, timedelta, timezone
from enum import Enum
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
 
db = SQLAlchemy()

def adesso() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

def _iso(momento: datetime | None) -> str | None:
    return momento.isoformat() + "Z" if momento else None
 
 
class StatoSosta(str, Enum): 
    APERTA = "APERTA"        # veicolo dentro
    DA_PAGARE = "DA_PAGARE"  # uscita rilevata, sosta chiusa, importo fissato
    PAGATA = "PAGATA"        # importo saldato, transito concluso
 
 
class EsitoVarco(str, Enum):
    """Esito di una rilevazione. Guida il comportamento del frontend."""
 
    INGRESSO_CONSENTITO = "INGRESSO_CONSENTITO"
    PAGAMENTO_RICHIESTO = "PAGAMENTO_RICHIESTO"
    TARGA_NON_RILEVATA = "TARGA_NON_RILEVATA"
    USCITA_CONSENTITA = "USCITA_CONSENTITA" # Prodotto dall'endpoint di pagamento: il transito puo' avvenire.
 
 
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

    # CAMPI PER LA DIAGNOSTICA
    frame_path = db.Column(db.String(255), nullable=True)
    bbox_path = db.Column(db.String(255), nullable=True)
    crop_path = db.Column(db.String(255), nullable=True)
    candidati_json = db.Column(db.Text, nullable=True)
 
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
            "frame_path": self.frame_path,
            "bbox_path": self.bbox_path,
            "crop_path": self.crop_path,
            "candidati_json": self.candidati_json,
        }

class Utente(db.Model):
    __tablename__ = 'utenti'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    ruolo = db.Column(db.String(20), nullable=False, default="gestore") # "gestore" o "admin"

    def set_password(self, password):
        """Genera e salva l'hash della password (equivalente a bcrypt.hash)"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verifica che la password corrisponda (equivalente a bcrypt.compareSync)"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Esclude la password dai dati inviati al frontend"""
        return {
            "id": self.id,
            "username": self.username,
            "ruolo": self.ruolo
        }