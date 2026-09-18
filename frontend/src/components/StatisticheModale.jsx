import React, { useEffect } from 'react';
import { X, BarChart3, Clock, Loader } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useParcheggioStore } from '../store/parcheggioStore';

const StatisticheModale = ({ onClose }) => {
  const caricaStatisticheSoste = useParcheggioStore((s) => s.caricaStatisticheSoste);
  const statisticheGestionali = useParcheggioStore((s) => s.statisticheGestionali);

  useEffect(() => {
    caricaStatisticheSoste();
  }, [caricaStatisticheSoste]);

  const formattaTempo = (minuti) => {
    if (!minuti) return "0 min";
    if (minuti < 60) return `${minuti} min`;
    const ore = Math.floor(minuti / 60);
    const minRestanti = minuti % 60;
    return `${ore}h ${minRestanti}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-asfalto/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-quadro border border-tratteggio rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header Modale */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-tratteggio sticky top-0 bg-quadro/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-banda" />
            <h2 className="font-display font-bold text-xl text-white">Analisi Avanzata Soste</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-tratteggio text-nebbia hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Modale */}
        <div className="p-6 space-y-8">
          {!statisticheGestionali ? (
             <div className="flex justify-center p-12">
                 <Loader className="w-8 h-8 text-banda animate-spin" />
             </div>
          ) : (
            <>
              {/* Sezione KPI Numerici */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-asfalto/50 p-5 rounded-md border border-tratteggio flex items-center gap-4">
                  <div className="p-3 bg-banda/20 rounded-full border border-banda/50 text-banda">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-nebbia uppercase tracking-widest">Tempo Medio di Sosta</p>
                    <p className="text-2xl font-mono mt-1 text-white">{formattaTempo(statisticheGestionali.tempo_medio_minuti)}</p>
                    <p className="text-xs text-nebbia/70 mt-1">Calcolato su {statisticheGestionali.totale_soste_valutate} veicoli </p>
                  </div>
                </div>
              </div>

              {/* Sezione Grafico a Barre */}
              <div className="bg-asfalto/50 p-5 rounded-md border border-tratteggio">
                <h3 className="text-sm font-medium text-nebbia mb-6 uppercase tracking-wider flex items-center gap-2">
                   Orari di Maggior Affluenza
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statisticheGestionali.affluenza}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e333d" vertical={false} />
                      <XAxis 
                        dataKey="fascia" 
                        stroke="#737a8c" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#737a8c" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        allowDecimals={false} 
                      />
                      <Tooltip
                        cursor={{ fill: '#2e333d' }}
                        contentStyle={{ backgroundColor: '#1f2229', borderColor: '#2e333d', color: '#edeff2', borderRadius: '0.375rem' }}
                        itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                      />
                      <Bar 
                        dataKey="veicoli" 
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]} 
                        name="Ingressi rilevati" 
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticheModale;