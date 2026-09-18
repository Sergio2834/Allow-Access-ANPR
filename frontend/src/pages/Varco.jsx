import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader, ScanLine } from 'lucide-react';
import SelettoreVideo from '../components/SelettoreVideo';
import LiveWebcam from '../components/LiveWebcam';
import EsitoVarco from '../components/EsitoVarco';
import TargaManuale from '../components/TargaManuale';
import TargaChip from '../components/TargaChip';
import ConfermaTarga from '../components/ConfermaTarga';
import { useParcheggioStore } from '../store/parcheggioStore';
import { formattaDurata, formattaOra, secondiDa } from '../utils/formatta';

const Varco = () => {
  const [secondi, setSecondi] = useState(0);
 
  const {
    analizzaTransito, transitoManuale, pagaSosta, caricaSosteAperte,
    impostaFile, file, decisione,
    sosteAperte, analisiInCorso, analisiIniziataAt, pagamentoInCorso,
  } = useParcheggioStore();
 
  useEffect(() => { caricaSosteAperte(); }, [caricaSosteAperte]);
  useEffect(() => {
    if (!analisiIniziataAt) {
      setSecondi(0);
      return;
    }
    const aggiorna = () =>
      setSecondi(Math.floor((Date.now() - analisiIniziataAt) / 1000));
    aggiorna();
    const intervallo = setInterval(aggiorna, 1000);
    return () => clearInterval(intervallo);
  }, [analisiIniziataAt]);
 
  const annuncia = (esito) => {
    const messaggi = {
      INGRESSO_CONSENTITO: () => toast.success('Ingresso registrato'),
      USCITA_CONSENTITA: () => toast.success('Uscita consentita'),
      PAGAMENTO_RICHIESTO: () => toast('Sosta conclusa, da saldare', { icon: '💳' }),
      TARGA_NON_RILEVATA: () => toast.error('Nessuna targa leggibile'),
      CONFERMA_RICHIESTA: () => toast('Conferma manuale richiesta', { icon: '⚠️' }),
    };
    (messaggi[esito] ?? (() => {}))();
  };
 
  const avviaAnalisi = async () => {
    try {
      annuncia((await analizzaTransito()).esito);
    } catch (errore) {
      toast.error(errore.message);
    }
  };
 
  const inviaManuale = async (dato) => {
    try {
      const payload = typeof dato === 'string' ? { targa: dato } : dato;
      annuncia((await transitoManuale(payload)).esito);
    } catch (errore) {
      toast.error(errore.message);
    }
  };
 
  const paga = async () => {
    try {
      annuncia((await pagaSosta(decisione.sosta.id)).esito);
    } catch (errore) {
      toast.error(errore.message);
    }
  };
 
  return (
    <section className="px-5 md:px-8 py-10 max-w-6xl mx-auto w-full">
      <p className="occhiello">Varco</p>
      <h1 className="text-3xl font-bold mt-2">Rilevazione transito</h1>
      <p className="text-nebbia mt-3 max-w-prose">
        La telecamera è attiva in tempo reale. Clicca su "Leggi la targa" per 
        effettuare la lettura e stabilire se il veicolo sta entrando o uscendo.
      </p>
 
      <div className="grid lg:grid-cols-[1fr_320px] gap-8 mt-8 items-start">
        <div className="space-y-6">
          <LiveWebcam />
 
          <button
            onClick={avviaAnalisi}
            disabled={analisiInCorso}
            className="w-full sm:w-auto flex items-center justify-center gap-2
                       bg-banda hover:bg-banda/85 text-white font-medium
                       px-6 py-3 rounded-md transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {analisiInCorso ? (
              <><Loader className="w-4 h-4 animate-spin" />Analisi in corso · {secondi}s</>
            ) : (
              <><ScanLine className="w-4 h-4" />Leggi la targa</>
            )}
          </button>
 
          {/* 1. Caso: Confidenza bassa, mostra i candidati */}
          {decisione && decisione.esito === 'CONFERMA_RICHIESTA' && (
            <ConfermaTarga 
              decisione={decisione} 
              onConferma={inviaManuale} 
              disabilitato={analisiInCorso} 
            />
          )}

          {/* 2. Caso: Transito elaborato normalmente dal varco */}
          {decisione && decisione.esito !== 'CONFERMA_RICHIESTA' && (
            <EsitoVarco decisione={decisione} onPaga={paga} inPagamento={pagamentoInCorso} />
          )}
 
          {/* 3. Caso: Fallimento totale dell'OCR. Invece di essere sempre visibile, compare solo qui */}
          {decisione?.esito === 'TARGA_NON_RILEVATA' && (
            <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <TargaManuale onInvia={inviaManuale} disabilitato={analisiInCorso} />
            </div>
          )}
        </div>
        
        <aside className="rounded-lg border border-tratteggio bg-quadro p-5">
          <p className="occhiello">Veicoli nel parcheggio</p>
          {sosteAperte.length === 0 ? (
            <p className="text-nebbia text-sm mt-4">Il parcheggio è vuoto.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {sosteAperte.map((sosta) => (
                <li key={sosta.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <TargaChip targa={sosta.targa} dimensione="sm" />
                    <div><span className={sosta.stato === 'DA_PAGARE' ? 'text-attesa' : 'text-nebbia'}>
                      {sosta.stato === 'DA_PAGARE' ? 'da saldare' : 'in sosta'}
                    </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-nebbia">
                      dalle {formattaOra(sosta.ingresso_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
};
 
export default Varco;