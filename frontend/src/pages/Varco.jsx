import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader, ScanLine } from 'lucide-react';
import SelettoreVideo from '../components/SelettoreVideo';
import EsitoLettura from '../components/EsitoLettura';
import { useParcheggioStore } from '../store/parcheggioStore';

/*
  Pagina principale: varco unico a stato.
  Il video viene inviato al backend, che deduce da solo se si tratta di un
  ingresso o di un'uscita in base alla presenza di una sosta aperta per la
  targa letta.

  Da costruire nel prossimo passo:
    - selezione del video e anteprima
    - esito del transito con TargaChip in evidenza
    - elenco dei veicoli attualmente dentro
    - ripiego con targa digitata a mano
*/
const Varco = () => {
  const [file, setFile] = useState(null);
  const [risultato, setRisultato] = useState(null);
  const [secondi, setSecondi] = useState(0);
 
  const { analizzaTransito, analisiInCorso } = useParcheggioStore();
 
  // Cronometro dell'analisi: un video richiede decine di secondi e senza un
  // riscontro visibile sembra che l'applicazione sia bloccata.
  useEffect(() => {
    if (!analisiInCorso) return;
    setSecondi(0);
    const intervallo = setInterval(() => setSecondi((s) => s + 1), 1000);
    return () => clearInterval(intervallo);
  }, [analisiInCorso]);
 
  const avviaAnalisi = async () => {
    if (!file) return;
    setRisultato(null);
 
    try {
      const esito = await analizzaTransito(file);
      setRisultato(esito);
 
      if (esito.esito === 'TARGA_LETTA') {
        toast.success(`Targa letta: ${esito.targa}`);
      } else {
        toast('Nessuna targa leggibile nel video', { icon: '⚠️' });
      }
    } catch (errore) {
      toast.error(errore.message);
    }
  };
 
  const cambiaFile = (nuovoFile) => {
    setFile(nuovoFile);
    setRisultato(null);
  };
 
  return (
    <section className="px-5 md:px-8 py-10 max-w-3xl mx-auto w-full">
      <p className="occhiello">Varco</p>
      <h1 className="text-3xl font-bold mt-2">Rilevazione transito</h1>
      <p className="text-nebbia mt-3 max-w-prose">
        Carica il video della telecamera al varco. Il sistema individua la targa
        nei fotogrammi e consolida le letture in un unico risultato.
      </p>
 
      <div className="mt-8">
        <SelettoreVideo
          file={file}
          onCambia={cambiaFile}
          disabilitato={analisiInCorso}
        />
      </div>
 
      <button
        onClick={avviaAnalisi}
        disabled={!file || analisiInCorso}
        className="mt-6 w-full sm:w-auto flex items-center justify-center gap-2
                   bg-banda hover:bg-banda/85 text-white font-medium
                   px-6 py-3 rounded-md transition-colors
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {analisiInCorso ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Analisi in corso · {secondi}s
          </>
        ) : (
          <>
            <ScanLine className="w-4 h-4" />
            Leggi la targa
          </>
        )}
      </button>
 
      {analisiInCorso && (
        <p className="text-sm text-nebbia mt-3">
          La pipeline esamina un fotogramma ogni dieci. Su un video lungo può
          richiedere qualche decina di secondi.
        </p>
      )}
 
      {risultato && (
        <div className="mt-10">
          <EsitoLettura risultato={risultato} />
        </div>
      )}
    </section>
  );
};
 
export default Varco;