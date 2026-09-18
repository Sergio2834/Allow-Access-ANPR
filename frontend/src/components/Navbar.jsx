import React, {useState} from 'react';
import { NavLink, useNavigate } from 'react-router';
import { ScanLine, ListChecks, Car, Microscope, Trash2, LogOut, UserPlus} from 'lucide-react';
import { useParcheggioStore } from '../store/parcheggioStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const Navbar = () => {
  const navigate = useNavigate();
  const sosteAperte = useParcheggioStore((s) => s.sosteAperte);
  const resetSistema = useParcheggioStore((s) => s.resetSistema);
  const { user, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);

  const VOCI = [
  { a: '/',           etichetta: 'Varco',         Icona: ScanLine,    ruoli_ammessi: ['gestore', 'admin'] },
  { a: '/soste',      etichetta: 'Soste',         Icona: ListChecks,  ruoli_ammessi: ['gestore', 'admin'] },
  { a: '/diagnostica',etichetta: 'Diagnostica',   Icona: Microscope,  ruoli_ammessi: ['admin'] },
  ];

  const handleReset = async () => {
    const conferma = window.confirm("ATTENZIONE: Stai per eliminare tutti i dati della sessione attuale. Procedere?");
    if (!conferma) return;
    
    const idToast = toast.loading('Formattazione in corso...');
    try {
      await resetSistema();
      toast.success('Sessione terminata con successo!', { id: idToast });
      window.location.reload(); 
    } catch (e) {
      toast.error('Errore durante il reset', { id: idToast });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      toast.error("Errore durante la disconnessione");
    }
  };

  if (!user) return null;

  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}&backgroundColor=1f2937&textColor=ffffff`;

  return (
    <nav className="h-16 px-5 md:px-8 flex items-center justify-between border-b border-tratteggio bg-quadro">
      <div className="flex items-center gap-6 md:gap-10">
        <span className="font-display font-extrabold text-lg tracking-tight">
          VARCO<span className="text-banda">·</span>ANPR
        </span>

        <div className="flex items-center gap-1">
          {VOCI.filter(voce => voce.ruoli_ammessi.includes(user.ruolo)).map(({ a, etichetta, Icona }) => (
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

      <div className="flex items-center gap-4">    
        <div className="flex items-center gap-2 text-sm">
          <Car className="w-4 h-4 text-nebbia" />
          <span className="font-mono tabular-nums">{sosteAperte.length}</span>
          <span className="text-nebbia hidden sm:inline">
            {sosteAperte.length === 1 ? 'veicolo dentro' : 'veicoli dentro'}
          </span>
        </div>
        <div className="relative">
          <img 
            src={avatarUrl} 
            alt="Profilo"
            className="w-10 h-10 rounded-full border-2 border-banda cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
            onClick={() => setShowMenu(!showMenu)}
          />
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
              <div className="absolute right-0 mt-3 w-64 bg-asfalto border border-tratteggio rounded-lg z-50 shadow-2xl py-3 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col items-center mb-2 pb-3 border-b border-tratteggio px-4">
                    <span className="text-white font-semibold text-lg">{user.username}</span>
                    <span className="text-xs text-banda uppercase tracking-widest">{user.ruolo}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center px-4 py-2.5 mx-2 rounded-md gap-3 text-nebbia text-sm hover:bg-negato/10 hover:text-negato  transition-colors cursor-pointer"
                  title="Disconnetti"
                >
                  <LogOut className="w-4 h-4" /> Effettua il Logout
                </button>
                {user.ruolo === 'admin' && (
                  <>
                    <NavLink
                      to="/signup"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center px-4 py-2.5 mx-2 rounded-md text-nebbia text-sm hover:bg-quadro hover:text-white gap-3 cursor-pointer transition-colors"
                    >
                      <UserPlus className="w-4 h-4" /> Registra Gestore
                    </NavLink>
                    <button 
                    onClick={handleReset}
                    className="flex items-center px-4 py-2.5 mx-2 rounded-md gap-3 text-negato text-sm hover:bg-negato/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" /> Formatta Sistema
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
