import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../store/authStore';
import { ScanEye, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Inserisci username e password");
      return;
    }

    try {
      await login(username, password);
      toast.success("Accesso effettuato!");
      navigate("/");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-asfalto flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-quadro border border-tratteggio rounded-lg shadow-2xl p-8">
        
        {/* Intestazione */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-16 h-16 bg-banda/20 rounded-full flex items-center justify-center mb-4 border border-banda/50">
            <ScanEye className="w-8 h-8 text-banda" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white tracking-wide">VARCO ANPR</h1>
          <p className="text-nebbia mt-1">Autenticazione Operatore</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-nebbia mb-2">Username</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-asfalto border border-tratteggio text-white rounded-md px-4 py-3 focus:outline-none focus:border-banda transition-colors"
              placeholder="Username..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nebbia mb-2">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-asfalto border border-tratteggio text-white rounded-md px-4 py-3 focus:outline-none focus:border-banda transition-colors"
              placeholder="Password..."
            />
          </div>

          {error && (
            <div className="p-3 bg-negato/20 border border-negato/50 rounded-md flex items-center gap-2">
              <Lock className="w-4 h-4 text-negato" />
              <p className="text-sm text-negato">{error}</p>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-banda hover:bg-banda/90 text-white font-medium py-3 rounded-md transition-colors disabled:opacity-50 flex justify-center items-center cursor-pointer"
          >
            {isLoading ? "Verifica in corso..." : "Accedi al Sistema"}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;