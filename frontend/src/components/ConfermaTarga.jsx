import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import TargaChip from './TargaChip';
import TargaManuale from './TargaManuale';

const ConfermaTarga = ({ decisione, onConferma, disabilitato }) => {
  return (
    <div className="rounded-lg border border-attesa/40 bg-attesa/10 p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-3 text-attesa">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-display font-bold text-lg text-targa">Verifica necessaria</h3>
          <p className="text-sm text-nebbia mt-1">
            L'OCR ha rilevato la targa con una confidenza inferiore alla soglia di sicurezza. 
            Seleziona la lettura corretta o inseriscila manualmente.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="occhiello text-attesa">Letture candidate</p>
        <div className="grid gap-3">
          {decisione.candidati.map((cand, i) => (
            <button
              key={cand.targa}
              disabled={disabilitato}
              onClick={() => onConferma({
                targa: cand.targa,
                confidenza: cand.confidenza,
                occorrenze: cand.occorrenze,
                letture_totali: cand.letture_totali,
                frame_path: decisione.frame_path,
                bbox_path: decisione.bbox_path,
                crop_path: decisione.crop_path,
                candidati_json: decisione.candidati_json
              })}
              
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-md border border-tratteggio bg-quadro hover:border-attesa/50 transition-colors text-left disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <TargaChip targa={cand.targa} dimensione="md" />
                <div>
                  <p className="text-sm font-medium">Opzione {i + 1}</p>
                  <p className="text-xs text-nebbia mt-0.5">
                    Confidenza: {(cand.confidenza * 100).toFixed(1)}% · Concordi: {cand.occorrenze}/{cand.letture_totali}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-targa bg-tratteggio group-hover:bg-attesa group-hover:text-asfalto transition-colors px-3 py-2 rounded font-medium">
                <Check className="w-4 h-4" /> Conferma
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-tratteggio/50">
        <TargaManuale onInvia={(targa)=> onConferma({targa})} disabilitato={disabilitato} />
      </div>
    </div>
  );
};

export default ConfermaTarga;