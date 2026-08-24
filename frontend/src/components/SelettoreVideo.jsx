import React, { useEffect, useRef, useState } from 'react';
import { Film, Image as ImageIcon, Upload, X } from 'lucide-react';
 
/*
  Selezione del file da inviare al varco: video o immagine singola.
  Mostra un'anteprima locale prima dell'invio, cosi' si vede subito se si e'
  scelto il file giusto -- che era il rischio principale del varco unico.
 
  Props
    file          File selezionato, oppure null
    onCambia      (file | null) => void
    disabilitato  blocca la selezione durante l'analisi
*/
 
const ESTENSIONI = ['mp4', 'png', 'jpg', 'jpeg'];
const MAX_MB = 100;
 
const SelettoreVideo = ({ file, onCambia, disabilitato = false }) => {
  const [trascinamento, setTrascinamento] = useState(false);
  const [errore, setErrore] = useState(null);
  const [anteprima, setAnteprima] = useState(null);
  const inputRef = useRef(null);
 
  const eVideo = file?.type?.startsWith('video');
 
  // L'URL locale va revocato quando il file cambia, altrimenti resta
  // allocato in memoria per tutta la vita della pagina.
  useEffect(() => {
    if (!file) {
      setAnteprima(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setAnteprima(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
 
  const validaEImposta = (nuovoFile) => {
    if (!nuovoFile) return;
 
    const estensione = nuovoFile.name.split('.').pop()?.toLowerCase();
    if (!ESTENSIONI.includes(estensione)) {
      setErrore(`Formato non ammesso. Usa ${ESTENSIONI.join(', ')}.`);
      return;
    }
    if (nuovoFile.size > MAX_MB * 1024 * 1024) {
      setErrore(`Il file supera ${MAX_MB} MB. Accorcia il video o riducine la risoluzione.`);
      return;
    }
 
    setErrore(null);
    onCambia(nuovoFile);
  };
 
  const alRilascio = (e) => {
    e.preventDefault();
    setTrascinamento(false);
    if (disabilitato) return;
    validaEImposta(e.dataTransfer.files?.[0]);
  };
 
  const svuota = () => {
    setErrore(null);
    onCambia(null);
    if (inputRef.current) inputRef.current.value = '';
  };
 
  if (file) {
    return (
      <div className="rounded-lg border border-tratteggio bg-quadro overflow-hidden">
        <div className="aspect-video bg-asfalto flex items-center justify-center">
          {eVideo ? (
            <video src={anteprima} controls className="max-h-full max-w-full" />
          ) : (
            <img src={anteprima} alt="Anteprima del fotogramma" className="max-h-full max-w-full object-contain" />
          )}
        </div>
 
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-tratteggio">
          <div className="flex items-center gap-3 min-w-0">
            {eVideo ? <Film className="w-4 h-4 text-nebbia shrink-0" />
                    : <ImageIcon className="w-4 h-4 text-nebbia shrink-0" />}
            <span className="text-sm truncate">{file.name}</span>
            <span className="font-mono text-xs text-nebbia shrink-0">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>
 
          <button
            onClick={svuota}
            disabled={disabilitato}
            className="flex items-center gap-1.5 text-sm text-nebbia hover:text-targa
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <X className="w-4 h-4" />
            Cambia
          </button>
        </div>
      </div>
    );
  }
 
  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setTrascinamento(true); }}
        onDragLeave={() => setTrascinamento(false)}
        onDrop={alRilascio}
        onClick={() => !disabilitato && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-12 text-center cursor-pointer
                    transition-colors ${
          trascinamento
            ? 'border-banda bg-banda/10'
            : 'border-tratteggio bg-quadro hover:border-nebbia'
        } ${disabilitato ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <Upload className="w-8 h-8 mx-auto text-nebbia" />
        <p className="mt-4 font-medium">Trascina qui il video del varco</p>
        <p className="text-sm text-nebbia mt-1">
          oppure fai clic per sceglierlo · mp4, png, jpg · max {MAX_MB} MB
        </p>
 
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,image/png,image/jpeg"
          className="hidden"
          onChange={(e) => validaEImposta(e.target.files?.[0])}
        />
      </div>
 
      {errore && <p className="text-negato text-sm mt-3">{errore}</p>}
    </div>
  );
};
 
export default SelettoreVideo;