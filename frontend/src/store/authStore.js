import { create } from 'zustand';
import axios from 'axios';

// Fallback in caso la variabile d'ambiente non sia caricata
const API_URL = import.meta.env.VITE_BACKEND_URL 
  ? `${import.meta.env.VITE_BACKEND_URL}/api` 
  : 'http://localhost:5000/api';

// FONDAMENTALE: Permette l'invio dei cookie cross-origin (da porta 5173 a 5000)
axios.defaults.withCredentials = true;

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: false,
  error: null,
  fetchingUser: true,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/login`, { username, password });
      set({ user: response.data.user, isLoading: false });
      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || "Credenziali non valide o errore di rete"
      });
      throw error;
    }
  },

  fetchUser: async () => {
    set({ fetchingUser: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/fetch-user`);
      set({ user: response.data.user, fetchingUser: false });
    } catch (error) {
      // Se fallisce (es. token scaduto o assente), semplicemente l'utente non è loggato
      set({ user: null, fetchingUser: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await axios.post(`${API_URL}/logout`);
      set({ user: null, isLoading: false, error: null });
    } catch (error) {
      set({ isLoading: false, error: "Errore durante la disconnessione" });
    }
  }
}));