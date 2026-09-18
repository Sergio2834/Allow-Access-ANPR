import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../store/authStore';
import { UserPlus, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';

const Signup = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [ruolo, setRuolo] = useState("gestore");
  
  const signup = useAuthStore((s) => s.signup);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Compila tutti i campi");
      return;
    }

    try {
      await signup(username, password, ruolo);
      toast.success(`Utente ${username} creato con successo!`);
      navigate("/");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex items-center justify-center p-4 h-full min-h-[70vh]">
      <div className="w-full max-w-md bg-quadro border border-tratteggio rounded-lg shadow-2xl p-8">
        
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-16 h-16 bg-banda/20 rounded-full flex items-center justify-center mb-4 border border-banda/50">
            <UserPlus className="w-8 h-8 text-banda" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white tracking-wide">Nuovo Operatore</h1>
          <p className="text-nebbia mt-1">Crea un account per il personale</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-nebbia mb-2">Username (ID Dipendente)</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-asfalto border border-tratteggio text-white rounded-md px-4 py-3 focus:outline-none focus:border-banda transition-colors"
              placeholder="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nebbia mb-2">Password Iniziale</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-asfalto border border-tratteggio text-white rounded-md px-4 py-3 focus:outline-none focus:border-banda transition-colors"
              placeholder="password"
            />
          </div>

          {/* Selezione Ruolo con Radio Buttons stilizzati */}
          <div>
            <label className="block text-sm font-medium text-nebbia mb-3">Livello di Accesso</label>
            <div className="grid grid-cols-2 gap-4">
              
              <label className={`flex items-center justify-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${ruolo === 'gestore' ? 'bg-banda/20 border-banda text-white' : 'bg-asfalto border-tratteggio text-nebbia hover:border-nebbia'}`}>
                <input type="radio" name="ruolo" value="gestore" className="hidden" checked={ruolo === 'gestore'} onChange={() => setRuolo('gestore')} />
                <User className="w-4 h-4" />
                <span className="font-medium text-sm">Gestore</span>
              </label>

              <label className={`flex items-center justify-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${ruolo === 'admin' ? 'bg-banda/20 border-banda text-white' : 'bg-asfalto border-tratteggio text-nebbia hover:border-nebbia'}`}>
                <input type="radio" name="ruolo" value="admin" className="hidden" checked={ruolo === 'admin'} onChange={() => setRuolo('admin')} />
                <Shield className="w-4 h-4" />
                <span className="font-medium text-sm">Admin</span>
              </label>

            </div>
          </div>

          {error && (
            <div className="p-3 bg-negato/20 border border-negato/50 rounded-md flex items-center gap-2">
              <p className="text-sm text-negato">{error}</p>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 bg-banda hover:bg-banda/90 text-white font-medium py-3 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? "Creazione in corso..." : "Registra Utente"}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Signup;