import { create } from 'zustand';
import { api, messaggioErrore } from '../utils/api';
 
/*
  Stato condiviso dell'applicazione.
 
  ---------------------------------------------------------------------------
  ENDPOINT
    POST /api/varco                 multipart "video" -> decisione sul transito
    POST /api/varco/manuale         { targa }         -> stessa decisione
    GET  /api/soste?stato=attiva                      -> transiti non conclusi
    GET  /api/soste                                   -> storico completo
    POST /api/soste/:id/pagamento                     -> decisione: uscita consentita
    GET  /api/parcheggio                              -> riepilogo
 
  Restano attivi /upload, /process e /status per le prove manuali della sola
  pipeline da Postman: non toccano le soste.
  ---------------------------------------------------------------------------
*/
 
export const useParcheggioStore = create((set, get) => ({
  sosteAperte: [],
  analisiInCorso: false,
  pagamentoInCorso: false,
  errore: null,
  file: null,
  decisione: null,
  analisiIniziataAt: null,

  impostaFile: (file) => set({ file, decisione: null }),
  azzeraVarco: () => set({ file: null, decisione: null }),
 
  caricaSosteAperte: async () => {
    try {
      const { data } = await api.get('/api/soste', { params: { stato: 'attiva' } });
      set({ sosteAperte: data });
      return data;
    } catch (errore) {
      // Non blocca l'interfaccia: il varco resta usabile anche se l'elenco
      // dei veicoli dentro non e' disponibile.
      set({ errore: messaggioErrore(errore, 'Elenco soste non disponibile.') });
      return [];
    }
  },
 
  /* Invia il file al varco. Il backend deduce da solo se e' ingresso o uscita. */
  analizzaTransito: async () => {
    set({ analisiInCorso: true, errore: null, decisione: null, analisiIniziataAt: Date.now() });
    try {
      // Nessun FormData, nessun file. È il backend che acquisisce.
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
 
  /* Ripiego quando la lettura fallisce o e' ambigua. */
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
}));