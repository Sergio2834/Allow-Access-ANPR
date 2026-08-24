import { create } from 'zustand';
import { api, messaggioErrore } from '../utils/api';

/*
  Stato condiviso del parcheggio, sulla falsariga dell'authStore del progetto
  precedente. Qui non serve autenticazione: cio' che va condiviso fra le
  pagine e' l'elenco dei veicoli attualmente dentro, perche' lo usano sia il
  varco sia la barra di navigazione.

  ---------------------------------------------------------------------------
  CONTRATTO CON IL BACKEND
  Questo file definisce gli endpoint che Flask dovra' esporre. Scriverli qui
  per primi rende concreto il passo successivo lato backend.

    POST /api/varco                multipart "video" -> esito del transito
    POST /api/varco/manuale        { targa }         -> stesso esito, targa digitata
    GET  /api/soste?stato=aperta                     -> soste in corso
    POST /api/soste/:id/pagamento                    -> segna la sosta pagata
    GET  /api/soste                                  -> storico completo

  Esiti restituiti da /api/varco, che guidano il routing del frontend:
    INGRESSO_CONSENTITO   nuova sosta aperta
    PAGAMENTO_RICHIESTO   sosta trovata, importo da saldare
    USCITA_CONSENTITA     sosta pagata, transito chiuso
    TARGA_NON_RILEVATA    nessuna targa leggibile nei fotogrammi
  ---------------------------------------------------------------------------
*/

export const useParcheggioStore = create((set, get) => ({
  sosteAperte: [],
  caricamento: false,
  analisiInCorso: false,
  errore: null,

  caricaSosteAperte: async () => {
    set({ caricamento: true, errore: null });
    try {
      const { data } = await api.get('/api/soste', { params: { stato: 'aperta' } });
      set({ sosteAperte: data, caricamento: false });
      return data;
    } catch (errore) {
      const messaggio = messaggioErrore(errore, 'Impossibile leggere le soste in corso.');
      set({ errore: messaggio, caricamento: false });
      throw new Error(messaggio);
    }
  },

  /* Invia il video al varco. Il backend deduce da solo se e' un ingresso o
     un'uscita, in base al fatto che la targa letta abbia una sosta aperta. */
  inviaTransito: async (file) => {
    set({ analisiInCorso: true, errore: null });
    try {
      const modulo = new FormData();
      modulo.append('video', file);
      const { data } = await api.post('/api/varco', modulo, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set({ analisiInCorso: false });
      await get().caricaSosteAperte();
      return data;
    } catch (errore) {
      const messaggio = messaggioErrore(errore, "Analisi del video non riuscita.");
      set({ errore: messaggio, analisiInCorso: false });
      throw new Error(messaggio);
    }
  },

  /* Ripiego quando la lettura fallisce: la targa viene digitata a mano. */
  inviaTransitoManuale: async (targa) => {
    set({ analisiInCorso: true, errore: null });
    try {
      const { data } = await api.post('/api/varco/manuale', { targa });
      set({ analisiInCorso: false });
      await get().caricaSosteAperte();
      return data;
    } catch (errore) {
      const messaggio = messaggioErrore(errore, 'Targa non accettata.');
      set({ errore: messaggio, analisiInCorso: false });
      throw new Error(messaggio);
    }
  },

  pagaSosta: async (idSosta) => {
    try {
      const { data } = await api.post(`/api/soste/${idSosta}/pagamento`);
      await get().caricaSosteAperte();
      return data;
    } catch (errore) {
      throw new Error(messaggioErrore(errore, 'Pagamento non registrato.'));
    }
  },
}));
