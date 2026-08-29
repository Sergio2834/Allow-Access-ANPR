import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Varco from './pages/Varco';
import Soste from './pages/Soste';
import Diagnostica from './pages/Diagnostica';
import { useParcheggioStore } from './store/parcheggioStore';
 
const App = () => {
  const caricaSosteAperte = useParcheggioStore((s) => s.caricaSosteAperte);
 
  // Stato del parcheggio all'avvio: serve al contatore nella barra di
  // navigazione. Un errore non blocca l'interfaccia, perche' il backend
  // potrebbe non essere ancora avviato.
  useEffect(() => {
    caricaSosteAperte();
  }, [caricaSosteAperte]);
 
  return (
    <div className="min-h-screen flex flex-col">
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1f2229', color: '#edeff2', border: '1px solid #2e333d' },
        }}
      />
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Varco />} />
          <Route path="/soste" element={<Soste />} />
          <Route path="/diagnostica" element={<Diagnostica />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};
 
export default App;