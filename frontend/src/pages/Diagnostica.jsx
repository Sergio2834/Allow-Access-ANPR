import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader, AlertTriangle, Eye } from 'lucide-react';
import TargaChip from '../components/TargaChip';
import Riepilogo from '../components/Riepilogo';
import { useParcheggioStore } from '../store/parcheggioStore';
import { formattaDataOra } from '../utils/formatta';

const Diagnostica = () => {
  const [accessi, setAccessi] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [accessoSelezionato, setAccessoSelezionato] = useState(null);
  const caricaAccessi = useParcheggioStore((s) => s.caricaAccessi);

  useEffect(() => {
    const carica = async () => {
      try {
        setAccessi(await caricaAccessi());
      } catch (errore) {
        toast.error(errore.message);
      } finally {
        setCaricamento(false);
      }
    };
    carica();
  }, [caricaAccessi]);

  if (caricamento) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader className="w-8 h-8 animate-spin text-nebbia" />
        <p className="text-nebbia mt-4">Caricamento diagnostica…</p>
      </div>
    );
  }

  // Calcolo di una metrica rapida da mostrare in cima
  const tentativiWebcam = accessi.filter(a => a.sorgente === 'webcam');
  const successiWebcam = tentativiWebcam.filter(a => a.esito !== 'TARGA_NON_RILEVATA');
  const tassoSuccesso = tentativiWebcam.length 
    ? Math.round((successiWebcam.length / tentativiWebcam.length) * 100) 
    : 0;

  return (
    <section className="px-5 md:px-8 py-10 max-w-6xl mx-auto w-full">
      <p className="occhiello">Diagnostica</p>
      <h1 className="text-3xl font-bold mt-2">Registro Rilevazioni</h1>

      <div className="flex flex-wrap gap-8 mt-6">
        <div>
          <p className="occhiello">Totale Rilevazioni</p>
          <p className="font-mono text-2xl mt-1 tabular-nums">{accessi.length}</p>
        </div>
        <div>
          <p className="occhiello">Tasso di Successo (Webcam)</p>
          <p className="font-mono text-2xl mt-1 tabular-nums">{tassoSuccesso}%</p>
        </div>
      </div>

      {accessi.length === 0 ? (
        <p className="text-nebbia mt-10">Nessuna rilevazione registrata.</p>
      ) : (
        <div className="mt-10 overflow-x-auto rounded-lg border border-tratteggio bg-quadro">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-tratteggio text-left bg-asfalto/50">
                <th className="occhiello py-4 pl-5 pr-4 font-normal">Data e Ora</th>
                <th className="occhiello py-4 pr-4 font-normal">Targa</th>
                <th className="occhiello py-4 pr-4 font-normal">Sorgente</th>
                <th className="occhiello py-4 pr-4 font-normal">Esito</th>
                <th className="occhiello py-4 pr-5 font-normal text-right">Dettagli</th>
              </tr>
            </thead>
            <tbody>
              {accessi.map((accesso) => (
                <tr 
                  key={accesso.id} 
                  className="border-b border-tratteggio/50 hover:bg-asfalto/30 transition-colors group cursor-pointer"
                  onClick={() => setAccessoSelezionato(accesso)}
                >
                  <td className="py-3 pl-5 pr-4 font-mono text-nebbia whitespace-nowrap">
                    {formattaDataOra(accesso.creato_at)}
                  </td>
                  <td className="py-3 pr-4">
                    <TargaChip targa={accesso.targa_letta} dimensione="sm" />
                  </td>
                  <td className="py-3 pr-4 text-nebbia whitespace-nowrap">
                    {accesso.sorgente}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {accesso.esito === 'TARGA_NON_RILEVATA' ? (
                      <span className="flex items-center gap-1.5 text-negato">
                        <AlertTriangle className="w-3.5 h-3.5" /> Fallito
                      </span>
                    ) : (
                      <span className="text-consentito">Letta</span>
                    )}
                  </td>
                  <td className="py-3 pr-5 text-right">
                    <button 
                      className="inline-flex items-center gap-1.5 text-nebbia group-hover:text-targa transition-colors"
                      onClick={(e) => { e.stopPropagation(); setAccessoSelezionato(accesso); }}
                    >
                      <Eye className="w-4 h-4" /> Apri
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Render del Modale se c'è un accesso selezionato */}
      {accessoSelezionato && (
        <Riepilogo 
          accesso={accessoSelezionato} 
          onClose={() => setAccessoSelezionato(null)} 
        />
      )}
    </section>
  );
};

export default Diagnostica;