import React, { useState } from 'react';
import { Keyboard } from 'lucide-react';
 
/*
  Ripiego con targa digitata a mano.
 
  Serve quando la lettura fallisce o e' ambigua. E' l'equivalente del citofono
  con l'operatore nei parcheggi reali, e mette al riparo la dimostrazione: se
  l'OCR sbaglia davanti alla commissione, il flusso non si blocca.
 
  Props
    onInvia      (targa) => Promise
    disabilitato
*/
 
const TargaManuale = ({ onInvia, disabilitato = false }) => {
  const [targa, setTarga] = useState('');
 
  // Si accettano spazi in digitazione ma si invia sempre la forma compatta:
  // e' quella con cui il backend confronta e memorizza.
  const compatta = targa.replace(/[^A-Z0-9]/g, '');
  const completa = compatta.length === 7;
 
  const invia = async (e) => {
    e.preventDefault();
    if (!completa || disabilitato) return;
    await onInvia(compatta);
    setTarga('');
  };
 
  return (
    <form onSubmit={invia} className="rounded-lg border border-tratteggio bg-quadro p-5">
      <div className="flex items-center gap-2 text-nebbia">
        <Keyboard className="w-4 h-4" />
        <span className="occhiello">Inserimento manuale</span>
      </div>
 
      <p className="text-sm text-nebbia mt-2">
        Se la lettura non è andata a buon fine, digita la targa del veicolo.
      </p>
 
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <input
          type="text"
          value={targa}
          onChange={(e) => setTarga(e.target.value.toUpperCase())}
          placeholder="AA000AA"
          maxLength={9}
          disabled={disabilitato}
          className="flex-1 h-11 px-4 rounded-md bg-asfalto border border-tratteggio
                     font-mono tracking-widest uppercase
                     placeholder:text-nebbia/50 placeholder:tracking-normal
                     disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!completa || disabilitato}
          className="h-11 px-6 rounded-md bg-tratteggio hover:bg-tratteggio/70
                     font-medium transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Registra transito
        </button>
      </div>
    </form>
  );
};
 
export default TargaManuale;