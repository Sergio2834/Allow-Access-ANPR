import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Varco from './pages/Varco';
import Soste from './pages/Soste';
import { useParcheggioStore } from './store/parcheggioStore';

const App = () => {
  //const caricaSosteAperte = useParcheggioStore((s) => s.caricaSosteAperte);

  // Lo stato del parcheggio si carica una volta all'avvio: serve alla barra
  // di navigazione e al varco. L'errore non blocca l'interfaccia, perche' il
  // backend puo' non essere ancora avviato.
  /*useEffect(() => {
    caricaSosteAperte().catch(() => {});
  }, [caricaSosteAperte]);*/

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
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
