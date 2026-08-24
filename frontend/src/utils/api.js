import axios from 'axios';

/*
  Istanza axios condivisa. Il timeout e' volutamente alto: l'analisi di un
  video richiede secondi o decine di secondi, non i 5 secondi tipici di una
  chiamata REST.
*/
export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  timeout: 180000,
});

/*
  Estrae un messaggio leggibile da un errore axios.

  Serve perche' `error.response.data.message` va in eccezione quando la
  richiesta non e' mai arrivata al server (backend spento, rete assente):
  in quel caso `error.response` e' undefined e si perde l'errore vero.
*/
export const messaggioErrore = (errore, ripiego = 'Qualcosa non ha funzionato.') => {
  if (errore?.response?.data?.message) return errore.response.data.message;
  if (errore?.code === 'ECONNABORTED') return 'Il server ha impiegato troppo tempo a rispondere.';
  if (!errore?.response) return 'Server non raggiungibile. Verifica che il backend sia avviato.';
  return ripiego;
};
