import React from 'react';
import { ArrowRightToLine, ArrowLeftToLine, Wallet, AlertTriangle } from 'lucide-react';
import TargaChip from './TargaChip';
import { formattaDurata, formattaImporto } from '../utils/formatta';
 
/*
  Esito di una rilevazione al varco.
 
  Tre esiti arrivano da /api/varco (ingresso, pagamento richiesto, targa non
  letta); il quarto, uscita consentita, arriva dalla risposta al pagamento.
 
  Le classi Tailwind sono scritte per intero e non composte a runtime:
  Tailwind analizza il sorgente staticamente, quindi una classe costruita
  come `bg-${colore}/10` non verrebbe mai generata.
 
  Props
    decisione    risposta di /api/varco o del pagamento
    onPaga       () => void
    inPagamento  disabilita il pulsante durante la richiesta
*/
 
const STILI = {
  INGRESSO_CONSENTITO: {
    Icona: ArrowRightToLine,
    titolo: 'Ingresso consentito',
    occhiello: 'Sbarra aperta',
    riquadro: 'border-consentito/40 bg-consentito/10',
    accento: 'text-consentito',
  },
  USCITA_CONSENTITA: {
    Icona: ArrowLeftToLine,
    titolo: 'Uscita consentita',
    occhiello: 'Sosta saldata',
    riquadro: 'border-consentito/40 bg-consentito/10',
    accento: 'text-consentito',
  },
  PAGAMENTO_RICHIESTO: {
    Icona: Wallet,
    titolo: 'Sosta conclusa',
    occhiello: 'Saldare per uscire',
    riquadro: 'border-attesa/40 bg-attesa/10',
    accento: 'text-attesa',
  },
  TARGA_NON_RILEVATA: {
    Icona: AlertTriangle,
    titolo: 'Nessuna targa leggibile',
    occhiello: 'Lettura fallita',
    riquadro: 'border-negato/40 bg-negato/10',
    accento: 'text-negato',
  },
};
 
const Dato = ({ etichetta, valore }) => (
  <div>
    <p className="occhiello">{etichetta}</p>
    <p className="font-mono text-lg mt-1 tabular-nums">{valore}</p>
  </div>
);
 
const EsitoVarco = ({ decisione, onPaga, inPagamento = false }) => {
  if (!decisione) return null;
 
  const stile = STILI[decisione.esito] ?? STILI.TARGA_NON_RILEVATA;
  const { Icona } = stile;
 
  return (
    <div className={`rounded-lg border p-6 ${stile.riquadro}`}>
      <div className={`flex items-center gap-2 ${stile.accento}`}>
        <Icona className="w-5 h-5" />
        <span className={`occhiello ${stile.accento}`}>{stile.occhiello}</span>
      </div>
 
      <h2 className="font-display font-bold text-2xl mt-3">{stile.titolo}</h2>
 
      {decisione.targa && (
        <div className="mt-5">
          <TargaChip targa={decisione.targa} dimensione="lg" />
        </div>
      )}
 
      {decisione.messaggio && (
        <p className="text-nebbia text-sm mt-4 max-w-prose">{decisione.messaggio}</p>
      )}
 
      {(decisione.durata_secondi != null || decisione.importo_centesimi != null) && (
        <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t border-tratteggio">
          {decisione.durata_secondi != null && (
            <Dato etichetta="Durata sosta" valore={formattaDurata(decisione.durata_secondi)} />
          )}
          {decisione.importo_centesimi != null && (
            <Dato etichetta="Importo" valore={formattaImporto(decisione.importo_centesimi)} />
          )}
        </div>
      )}
 
      {decisione.esito === 'PAGAMENTO_RICHIESTO' && (
        <button
          onClick={onPaga}
          disabled={inPagamento}
          className="mt-6 w-full sm:w-auto flex items-center justify-center gap-2
                     bg-attesa hover:bg-attesa/85 text-asfalto font-semibold
                     px-6 py-3 rounded-md transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Wallet className="w-4 h-4" />
          {inPagamento
            ? 'Pagamento in corso…'
            : `Registra pagamento di ${formattaImporto(decisione.importo_centesimi)}`}
        </button>
      )}
    </div>
  );
};
 
export default EsitoVarco;