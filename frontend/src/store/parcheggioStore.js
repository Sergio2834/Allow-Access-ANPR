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

export const useParcheggioStore = create((set) => ({
  sosteAperte: [],        // popolato in fase 2
  analisiInCorso: false,
  errore: null,
 
  /*
    Invia un file al varco e ne restituisce la lettura.
 
    Due passi: /upload salva il file e ne restituisce il nome archiviato,
    /process analizza esattamente quel file. Passare il nome e' essenziale --
    senza, il backend analizzerebbe l'ultimo file caricato, che in presenza
    di piu' schede aperte potrebbe non essere il nostro.
  */
  analizzaTransito: async (file) => {
    set({ analisiInCorso: true, errore: null });
 
    try {
      const modulo = new FormData();
      modulo.append('images', file);
      const { data: caricamento } = await api.post('/upload', modulo, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
 
      const { data } = await api.post('/process', {
        filename: caricamento.filename,
      });
      set({ analisiInCorso: false });
 
      // Nessuna targa trovata e' un esito, non un errore: il backend lo
      // segnala con 200 e status "no_plate", cosi' resta distinguibile da un
      // guasto di rete e l'interfaccia puo' presentarlo diversamente.
      if (data.status === 'no_plate') {
        return { esito: 'TARGA_NON_RILEVATA' };
      }
 
      const lettura = data.results[0];
      return {
        esito: 'TARGA_LETTA',
        targa: lettura.plate_compact,
        confidenza: lettura.confidence_avg,
        occorrenze: lettura.occurrences,
        lettureTotali: lettura.total_reads,
      };
    } catch (errore) {
      const messaggio = messaggioErrore(errore, 'Analisi non riuscita.');
      set({ errore: messaggio, analisiInCorso: false });
      throw new Error(messaggio);
    }
  },
 
  verificaServer: async () => {
    try {
      const { data } = await api.get('/status');
      return data;
    } catch {
      return null;
    }
  },
}));
