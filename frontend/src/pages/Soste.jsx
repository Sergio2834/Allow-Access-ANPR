import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader, AlertTriangle } from 'lucide-react';
import TargaChip from '../components/TargaChip';
import { useParcheggioStore } from '../store/parcheggioStore';
import { formattaDataOra, formattaDurata, formattaImporto, secondiDa } from '../utils/formatta';
 
const STATI = {
  APERTA:    { etichetta: 'In corso',  classe: 'text-nebbia' },
  DA_PAGARE: { etichetta: 'Da saldare', classe: 'text-attesa' },
  PAGATA:    { etichetta: 'Conclusa',  classe: 'text-consentito' },
};
 
const FILTRI = [
  { chiave: 'TUTTE', etichetta: 'Tutte' },
  { chiave: 'APERTA', etichetta: 'In corso' },
  { chiave: 'DA_PAGARE', etichetta: 'Da saldare' },
  { chiave: 'PAGATA', etichetta: 'Concluse' },
];
 
/* Registro delle soste: vista amministrativa dello storico. */
const Soste = () => {
  const [soste, setSoste] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [filtro, setFiltro] = useState('TUTTE');
  const caricaStorico = useParcheggioStore((s) => s.caricaStorico);
 
  useEffect(() => {
    const carica = async () => {
      try {
        setSoste(await caricaStorico());
      } catch (errore) {
        toast.error(errore.message);
      } finally {
        setCaricamento(false);
      }
    };
    carica();
  }, [caricaStorico]);
 
  if (caricamento) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader className="w-8 h-8 animate-spin text-nebbia" />
        <p className="text-nebbia mt-4">Caricamento registro…</p>
      </div>
    );
  }
 
  const visibili = filtro === 'TUTTE' ? soste : soste.filter((s) => s.stato === filtro);
  // Solo le soste effettivamente saldate concorrono all'incasso: quelle in
  // attesa hanno un importo fissato ma non ancora riscosso.
  const incasso = soste
    .filter((s) => s.stato === 'PAGATA')
    .reduce((somma, s) => somma + (s.importo_centesimi ?? 0), 0);
 
  return (
    <section className="px-5 md:px-8 py-10 max-w-6xl mx-auto w-full">
      <p className="occhiello">Registro</p>
      <h1 className="text-3xl font-bold mt-2">Soste</h1>
 
      <div className="flex flex-wrap gap-8 mt-6">
        <div>
          <p className="occhiello">Totale</p>
          <p className="font-mono text-2xl mt-1 tabular-nums">{soste.length}</p>
        </div>
        <div>
          <p className="occhiello">Incassato</p>
          <p className="font-mono text-2xl mt-1 tabular-nums">{formattaImporto(incasso)}</p>
        </div>
      </div>
 
      <div className="flex gap-1 mt-8">
        {FILTRI.map(({ chiave, etichetta }) => (
          <button
            key={chiave}
            onClick={() => setFiltro(chiave)}
            className={`px-3 py-2 rounded-md text-sm transition-colors ${
              filtro === chiave
                ? 'bg-banda/20 text-targa'
                : 'text-nebbia hover:text-targa hover:bg-tratteggio/60'
            }`}
          >
            {etichetta}
          </button>
        ))}
      </div>
 
      {visibili.length === 0 ? (
        <p className="text-nebbia mt-10">Nessuna sosta in questa categoria.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-tratteggio text-left">
                <th className="occhiello py-3 pr-4 font-normal">Targa</th>
                <th className="occhiello py-3 pr-4 font-normal">Ingresso</th>
                <th className="occhiello py-3 pr-4 font-normal">Durata</th>
                <th className="occhiello py-3 pr-4 font-normal">Importo</th>
                <th className="occhiello py-3 font-normal">Stato</th>
              </tr>
            </thead>
            <tbody>
              {visibili.map((sosta) => {
                const stato = STATI[sosta.stato] ?? STATI.APERTA;
                // Una sosta ancora aperta continua a crescere: la durata va
                // ricalcolata dal browser, perche' quella del backend e'
                // ferma al momento della query. Dopo l'uscita e' definitiva.
                const durata = sosta.uscita_at ? sosta.durata_secondi : null;
 
                return (
                  <tr key={sosta.id} className="border-b border-tratteggio/50">
                    <td className="py-3 pr-4">
                      <TargaChip targa={sosta.targa} dimensione="sm" />
                    </td>
                    <td className="py-3 pr-4 font-mono text-nebbia whitespace-nowrap">
                      {formattaDataOra(sosta.ingresso_at)}
                    </td>
                    <td className="py-3 pr-4 font-mono tabular-nums whitespace-nowrap">
                      {formattaDurata(durata)}
                    </td>
                    <td className="py-3 pr-4 font-mono tabular-nums whitespace-nowrap">
                      {formattaImporto(sosta.importo_centesimi)}
                    </td>
                    <td className={`py-3 whitespace-nowrap ${stato.classe}`}>
                      <span className="flex items-center gap-1.5">
                        {sosta.anomala && <AlertTriangle className="w-3.5 h-3.5 text-negato" />}
                        {stato.etichetta}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
 
      <p className="text-xs text-nebbia mt-6">
        Il triangolo segnala una sosta aperta da oltre 24 ore: quasi sempre il
        residuo di un ingresso letto male, non un veicolo davvero ancora dentro.
      </p>
    </section>
  );
};
 
export default Soste;