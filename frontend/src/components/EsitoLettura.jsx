import React from 'react';
import { CheckCircle2, ScanLine, AlertTriangle } from 'lucide-react';
import TargaChip from './TargaChip';

const Dato = ({ etichetta, valore, nota }) => (
  <div>
    <p className="occhiello">{etichetta}</p>
    <p className="font-mono text-lg mt-1 tabular-nums">{valore}</p>
    {nota && <p className="text-xs text-nebbia mt-0.5">{nota}</p>}
  </div>
);
 
const EsitoLettura = ({ risultato }) => {
  if (!risultato) return null;
 
  if (risultato.esito === 'TARGA_NON_RILEVATA') {
    return (
      <div className="rounded-lg border border-attesa/40 bg-attesa/10 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-attesa shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display font-bold text-lg">Nessuna targa leggibile</h2>
            <p className="text-nebbia text-sm mt-2 max-w-prose">
              La pipeline non ha trovato nei fotogrammi una sequenza che rispetti il
              formato delle targhe italiane. Prova con un video in cui il veicolo si
              avvicini di più, oppure inserisci la targa manualmente.
            </p>
          </div>
        </div>
      </div>
    );
  }
 
  // Quota di letture che concordano sulla targa vincente
  const supporto = risultato.lettureTotali
    ? Math.round((risultato.occorrenze / risultato.lettureTotali) * 100)
    : 0;
 
  return (
    <div className="rounded-lg border border-consentito/40 bg-consentito/10 p-6">
      <div className="flex items-center gap-2 text-consentito">
        <CheckCircle2 className="w-5 h-5" />
        <span className="occhiello text-consentito">Targa letta</span>
      </div>
 
      <div className="mt-5">
        <TargaChip targa={risultato.targa} dimensione="lg" />
      </div>
 
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-8 pt-6 border-t border-tratteggio">
        <Dato
          etichetta="Confidenza OCR"
          valore={`${(risultato.confidenza * 100).toFixed(1)}%`}
          nota="media sulle letture vincenti"
        />
        <Dato
          etichetta="Letture concordi"
          valore={`${risultato.occorrenze}/${risultato.lettureTotali}`}
          nota={`${supporto}% del totale`}
        />
        <Dato
          etichetta="Formato"
          valore="AA 000 AA"
          nota="verificato"
        />
      </div>
 
      <p className="flex items-center gap-2 text-xs text-nebbia mt-6">
        <ScanLine className="w-3.5 h-3.5" />
        La decisione sul transito arriverà con la gestione delle soste.
      </p>
    </div>
  );
};
 
export default EsitoLettura;