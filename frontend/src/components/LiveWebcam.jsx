import React, {useEffect, useRef} from 'react';
import { Camera } from 'lucide-react';
import { useParcheggioStore } from '../store/parcheggioStore';
import { api } from '../utils/api';

const LiveWebcam = () => {
  const analisiInCorso = useParcheggioStore((s) => s.analisiInCorso);
  const imgRef = useRef(null);
  useEffect(() => {
    const baseUrl = api.defaults.baseURL || 'http://localhost:5000';
    const streamUrl = `${baseUrl}/api/stream?t=${Date.now()}`;
    const videoElement = imgRef.current;
    
    if (videoElement) {
      videoElement.src = streamUrl;
    }
    //Cleanup all'uscita dalla pagina
    return () => {
      if (videoElement) {
        videoElement.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      }
    };
  }, []);

  return (
    <div className="rounded-lg border border-tratteggio bg-quadro overflow-hidden">
      <div className="aspect-video bg-asfalto flex items-center justify-center relative">
        {analisiInCorso && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-asfalto z-10 text-nebbia">
            <Camera className="w-8 h-8 mb-3 opacity-50"/>
            <p className="font-display font-medium text-targa animate-pulse">Elaborazione in corso...</p>
          </div>
        )}

        <img 
          ref={imgRef} 
          alt="Webcam live varco" 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextElementSibling.style.display = 'block';
          }}
        />

        {!analisiInCorso && (
        <div className="hidden absolute text-nebbia text-sm">
          Flusso video non disponibile. Verifica il backend.
        </div>
        )}
        
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