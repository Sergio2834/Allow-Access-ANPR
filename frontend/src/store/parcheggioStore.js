import { create } from 'zustand';
import { api, messaggioErrore } from '../utils/api';
 
export const useParcheggioStore = create((set, get) => ({
  sosteAperte: [],
  analisiInCorso: false,
  pagamentoInCorso: false,
  errore: null,
  file: null,
  decisione: null,
  analisiIniziataAt: null,
  statisticheGestionali: null,

  impostaFile: (file) => set({ file, decisione: null }),
  azzeraVarco: () => set({ file: null, decisione: null }),
 
  caricaSosteAperte: async () => {
    try {
      const { data } = await api.get('/api/soste', { params: { stato: 'attiva' } });
      set({ sosteAperte: data });
      return data;
    } catch (errore) {
      set({ errore: messaggioErrore(errore, 'Elenco soste non disponibile.') });
      return [];
    }
  },

  caricaStatisticheSoste: async () => {
    try {
      const response = await api.get('api/statistiche/soste');
      set({ statisticheGestionali: response.data });
    } catch (error) {
      console.error("Errore nel caricamento delle statistiche:", error);
    }
  },
 
  /* Invia il file al varco. Il backend deduce da solo se e' ingresso o uscita. */
  analizzaTransito: async () => {
    set({ analisiInCorso: true, errore: null, decisione: null, analisiIniziataAt: Date.now() });
    try {
      const { data } = await api.post('/api/varco');
      set({ analisiInCorso: false, analisiIniziataAt: null, decisione: data });
      await get().caricaSosteAperte();
      return data;
    } catch (errore) {
      const messaggio = messaggioErrore(errore, 'Analisi non riuscita.');
      set({ errore: messaggio, analisiInCorso: false, analisiIniziataAt: null });
      throw new Error(messaggio);
    }
  },
 
  /* Caso in cui la lettura fallisce o e' ambigua. */
  transitoManuale: async (payload) => {
    set({ analisiInCorso: true, errore: null, analisiIniziataAt: Date.now() });
    try {
      const { data } = await api.post('/api/varco/manuale', payload );
      set({ analisiInCorso: false, analisiIniziataAt: null, decisione: data });
      await get().caricaSosteAperte();
      return data;
    } catch (errore) {
      const messaggio = messaggioErrore(errore, 'Targa non accettata.');
      set({ errore: messaggio, analisiInCorso: false,  analisiIniziataAt: null });
      throw new Error(messaggio);
    }
  },
 
  pagaSosta: async (idSosta) => {
    set({ pagamentoInCorso: true });
    try {
      const { data } = await api.post(`/api/soste/${idSosta}/pagamento`);
      set({ pagamentoInCorso: false, decisione: data });
      await get().caricaSosteAperte();
      return data;
    } catch (errore) {
      set({ pagamentoInCorso: false });
      throw new Error(messaggioErrore(errore, 'Pagamento non registrato.'));
    }
  },
 
  caricaStorico: async () => {
    try {
      const { data } = await api.get('/api/soste');
      return data;
    } catch (errore) {
      throw new Error(messaggioErrore(errore, 'Storico non disponibile.'));
    }
  },

  caricaAccessi: async () => {
    try {
      const { data } = await api.get('/api/accessi');
      return data;
    } catch (errore) {
      throw new Error(messaggioErrore(errore, 'Registro accessi non disponibile.'));
    }
  },

  resetSistema: async () => {
    try {
      await api.post('/api/reset');
      await get().caricaStorico();
      await get().caricaAccessi();
      return true;
    } catch (errore) {
      throw new Error(messaggioErrore(errore, 'Impossibile resettare il sistema.'));
    }
  },
}));