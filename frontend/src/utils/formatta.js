
export const formattaTarga = (targa) =>
  targa ? `${targa.slice(0, 2)} ${targa.slice(2, 5)} ${targa.slice(5)}` : '—';

/* Durata leggibile a partire dai secondi: "2h 14m", "8m 30s". */
export const formattaDurata = (secondi) => {
  if (secondi == null) return '—';
  const s = Math.max(0, Math.floor(secondi));
  const ore = Math.floor(s / 3600);
  const minuti = Math.floor((s % 3600) / 60);
  if (ore > 0) return `${ore}h ${String(minuti).padStart(2, '0')}m`;
  if (minuti > 0) return `${minuti}m ${String(s % 60).padStart(2, '0')}s`;
  return `${s}s`;
};

export const formattaImporto = (centesimi) =>
  centesimi == null
    ? '—'
    : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
        .format(centesimi / 100);

export const formattaOra = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '—';

export const formattaDataOra = (iso) =>
  iso
    ? new Date(iso).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    : '—';

/* Durata trascorsa da un istante ISO, per il cronometro delle soste aperte. */
export const secondiDa = (iso) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 1000) : 0;
