import React from 'react';
import { NavLink } from 'react-router';
import { ScanLine, ListChecks, Car, Microscope, SquareArrowRightExit } from 'lucide-react';
import { useParcheggioStore } from '../store/parcheggioStore';
import toast from 'react-hot-toast';

const VOCI = [
  { a: '/',           etichetta: 'Varco',         Icona: ScanLine },
  { a: '/soste',      etichetta: 'Soste',         Icona: ListChecks },
  { a: '/diagnostica',etichetta: 'Diagnostica',   Icona: Microscope },
];

const Navbar = () => {
  const sosteAperte = useParcheggioStore((s) => s.sosteAperte);
  const resetSistema = useParcheggioStore((s) => s.resetSistema);

  const handleReset = async () => {
    const conferma = window.confirm("ATTENZIONE: Stai per eliminare tutti i dati della sessione attuale. Procedere?");
    if (!conferma) return;
    
    const idToast = toast.loading('Formattazione in corso...');
    try {
      await resetSistema();
      toast.success('Sessione terminata con successo!', { id: idToast });
      // Se sei in una pagina specifica, un reload forzato garantisce la pulizia totale della UI
      window.location.reload(); 
    } catch (e) {
      toast.error('Errore durante il reset', { id: idToast });
    }
  };

  return (
    <nav className="h-16 px-5 md:px-8 flex items-center justify-between border-b border-tratteggio bg-quadro">
      <div className="flex items-center gap-6 md:gap-10">
        <span className="font-display font-extrabold text-lg tracking-tight">
          VARCO<span className="text-banda">·</span>ANPR
        </span>

        <div className="flex items-center gap-1">
          {VOCI.map(({ a, etichetta, Icona }) => (
            <NavLink
              key={a}
              to={a}
              end={a === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                 ${isActive
                   ? 'bg-banda/20 text-targa'
                   : 'text-nebbia hover:text-targa hover:bg-tratteggio/60'}`
              }
            >
              <Icona className="w-4 h-4" />
              <span className="hidden sm:inline">{etichetta}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Lo stato del parcheggio resta sempre visibile: e' il contesto che
          rende leggibile ogni esito mostrato dal varco. */}
      <div className="flex items-center gap-4">    
        <div className="flex items-center gap-2 text-sm">
          <Car className="w-4 h-4 text-nebbia" />
          <span className="font-mono tabular-nums">{sosteAperte.length}</span>
          <span className="text-nebbia hidden sm:inline">
            {sosteAperte.length === 1 ? 'veicolo dentro' : 'veicoli dentro'}
          </span>
        </div>
        <button 
            onClick={handleReset}
            className="p-2 ml-2 flex items-center justify-center gap-2 text-negato text-sm hover:bg-negato/10 rounded-md transition-colors cursor-pointer"
          >
            <SquareArrowRightExit className="w-4 h-4" /> Termina Sessione
          </button>
      </div>
    </nav>
  );
};

export default Navbar;
