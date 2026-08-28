import React from 'react';
import { Camera } from 'lucide-react';
import { useParcheggioStore } from '../store/parcheggioStore';

const LiveWebcam = () => {
  const analisiInCorso = useParcheggioStore((s) => s.analisiInCorso);

  return (
    <div className="rounded-lg border border-tratteggio bg-quadro overflow-hidden">
      <div className="aspect-video bg-asfalto flex items-center justify-center relative">
        {analisiInCorso ? (
          <div className="flex flex-col items-center text-nebbia animate-pulse">
            <Camera className="w-8 h-8 mb-3 opacity-50" />
            <p className="font-display font-medium text-targa">Elaborazione in corso...</p>
          </div>
        ) : (
        <img 
          src={`${import.meta.env.VITE_BACKEND_URL}/api/stream?t=${Date.now()}`} 
          alt="Webcam live varco" 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextElementSibling.style.display = 'block';
          }}
        />
        )}

        {!analisiInCorso && (
        <div className="hidden absolute text-nebbia text-sm">
          Flusso video non disponibile. Verifica il backend.
        </div>
        )}
        
        {/* Indicatore visivo di registrazione in alto a destra */}
        {!analisiInCorso && (
        <div className="absolute top-3 right-3 bg-black/60 px-2.5 py-1 rounded-md text-xs text-white font-medium flex items-center gap-2 backdrop-blur-sm shadow-sm">
          <span className="w-2 h-2 rounded-full bg-negato animate-pulse"></span>
          LIVE
        </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-tratteggio">
        <div className="flex items-center gap-2 text-sm text-nebbia">
          <Camera className="w-4 h-4" />
          {analisiInCorso ? 'La telecamera sta leggendo la targa...' : 'Telecamera varco collegata'}
        </div>
      </div>
    </div>
  );
};

export default LiveWebcam;