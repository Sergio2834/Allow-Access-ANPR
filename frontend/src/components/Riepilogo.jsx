import React from 'react';
import { X, Microscope, ScanLine, Calculator, ServerCrash, ScanEye } from 'lucide-react';
import TargaChip from './TargaChip';
import { formattaDataOra } from '../utils/formatta';

// Fallback in caso la variabile d'ambiente non sia caricata
const URL_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const Dato = ({ etichetta, valore }) => (
  <div>
    <p className="occhiello">{etichetta}</p>
    <p className="font-mono text-lg mt-1 tabular-nums">{valore}</p>
  </div>
);

const Riepilogo = ({ accesso, onClose }) => {
  if (!accesso) return null;

  const haImmagini = accesso.frame_path || accesso.bbox_path || accesso.crop_path;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-asfalto/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-quadro border border-tratteggio rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header Modale */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-tratteggio sticky top-0 bg-quadro/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <Microscope className="w-5 h-5 text-banda" />
            <h2 className="font-display font-bold text-xl">Dettaglio Rilevazione</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-md hover:bg-tratteggio text-nebbia hover:text-targa transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Modale */}
        <div className="p-6 space-y-8">
          
          {/* Sezione 1: Metadati */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-asfalto/50 p-5 rounded-md border border-tratteggio/50">
            <Dato etichetta="Data e Ora" valore={formattaDataOra(accesso.creato_at)} />
            <Dato etichetta="Sorgente" valore={accesso.sorgente.toUpperCase()} />
            <Dato 
              etichetta="Esito Varco" 
              valore={accesso.esito === 'TARGA_NON_RILEVATA' ? 'FALLITO' : 'SUCCESSO'} 
            />
            <div>
              <p className="occhiello">Targa Registrata</p>
              <div className="mt-1">
                <TargaChip targa={accesso.targa_letta} dimensione="sm" />
              </div>
            </div>
          </div>

          {/* Sezione 2: Statistiche OCR */}
          {accesso.confidenza !== null && (
            <div>
              <p className="flex items-center gap-2 occhiello mb-4">
                <Calculator className="w-4 h-4" /> Statistiche Pipeline
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <Dato 
                  etichetta="Confidenza Media" 
                  valore={`${(accesso.confidenza * 100).toFixed(1)}%`} 
                />
                <Dato 
                  etichetta="Voto di Maggioranza" 
                  valore={`${accesso.occorrenze} / ${accesso.letture_totali}`} 
                />
                <Dato 
                  etichetta="Modello" 
                  valore="PaddleOCR (CPU)" 
                />
              </div>
            </div>
          )}

          {accesso.candidati_json && (
            <div className="mt-6 border-t border-tratteggio pt-6">
              <p className="flex items-center gap-2 occhiello mb-4">
                <ScanEye className="w-4 h-4" /> Letture OCR
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {JSON.parse(accesso.candidati_json).map((cand, idx) => (
                  <div key={cand.targa} className="flex flex-col items-start bg-asfalto p-3 rounded border border-tratteggio">
                    <span className="text-xs text-nebbia mb-1">Opzione {idx + 1}</span>
                    <TargaChip targa={cand.targa} dimensione="sm" />
                    <span className="text-xs mt-2 text-nebbia">
                    Confidenza: {(cand.confidenza * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sezione 3: Immagini (Computer Vision) */}
          {haImmagini ? (
            <div>
              <p className="flex items-center gap-2 occhiello mb-4">
                <ScanLine className="w-4 h-4" /> Analisi Visiva YOLOv8
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                {accesso.bbox_path && (
                  <div className="space-y-2">
                    <p className="text-sm text-nebbia">Frame annotato (Bounding Box)</p>
                    <img 
                      src={`${URL_BASE}/api/images/${accesso.bbox_path}`} 
                      alt="Bounding Box"
                      className="w-full rounded border border-tratteggio bg-black object-contain aspect-video"
                    />
                  </div>
                )}
                
                {accesso.crop_path && (
                  <div className="space-y-2">
                    <p className="text-sm text-nebbia">Ritaglio passato all'OCR</p>
                    <div className="h-full flex items-center justify-center p-8 bg-asfalto rounded border border-tratteggio border-dashed">
                      <img 
                        src={`${URL_BASE}/api/images/${accesso.crop_path}`} 
                        alt="Crop Targa"
                        className="max-w-full max-h-32 rounded shadow-md object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-nebbia p-6 bg-asfalto/50 rounded-md border border-tratteggio border-dashed">
              <ServerCrash className="w-5 h-5" />
              <p className="text-sm">Nessuna immagine disponibile per questo transito (inserimento manuale).</p>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default Riepilogo;