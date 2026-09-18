import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  timeout: 180000,
});

export const messaggioErrore = (errore, ripiego = 'Qualcosa non ha funzionato.') => {
  if (errore?.response?.data?.message) return errore.response.data.message;
  if (errore?.code === 'ECONNABORTED') return 'Il server ha impiegato troppo tempo a rispondere.';
  if (!errore?.response) return 'Server non raggiungibile. Verifica che il backend sia avviato.';
  return ripiego;
};
