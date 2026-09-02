import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router';
import { Toaster } from 'react-hot-toast';
import { Loader } from 'lucide-react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Login from './pages/Login';
import Varco from './pages/Varco';
import Soste from './pages/Soste';
import Diagnostica from './pages/Diagnostica';
import { useParcheggioStore } from './store/parcheggioStore';
import { useAuthStore } from './store/authStore';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.ruolo)) {
    return <Navigate to="/" replace />; // Rimbalzato alla home in modo silenzioso
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
};
 
const App = () => {
  const caricaSosteAperte = useParcheggioStore((s) => s.caricaSosteAperte);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const fetchingUser = useAuthStore((s) => s.fetchingUser);

  useEffect(() => {
    caricaSosteAperte();
    fetchUser();
  }, [caricaSosteAperte, fetchUser]);

  if (fetchingUser) {
    return (
      <div className="min-h-screen bg-asfalto flex items-center justify-center">
        <Loader className="w-10 h-10 text-banda animate-spin" />
      </div>
    );
  }
 
  return (
    <>
      <Routes>
        {/* Rotta Pubblica: Nessun layout, a tutto schermo */}
        <Route path="/login" element={<Login />} />

        {/* Rotte Protette: Accessibili a TUTTI i dipendenti (gestore e admin) */}
        <Route path="/" element={
          <ProtectedRoute>
            <Varco />
          </ProtectedRoute>
        } />
        
        <Route path="/soste" element={
          <ProtectedRoute>
            <Soste />
          </ProtectedRoute>
        } />

        {/* Rotta Tecnica: Accessibile SOLO agli Admin */}
        <Route path="/diagnostica" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Diagnostica />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
};
 
export default App;