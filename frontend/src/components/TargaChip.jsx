import React from 'react';

/*
  Mostra una targa disegnata come una targa vera: bande blu ai lati,
  caratteri scuri su fondo chiaro. E' il componente ricorrente
  dell'interfaccia -- compare nell'esito del varco, nella tabella dei
  veicoli dentro e nel banco di prova -- quindi vale la pena che sia
  riconoscibile invece di essere una stringa qualsiasi.

  Props
    targa      stringa compatta, es. "DE657PA"; null mostra i segnaposto
    dimensione "sm" | "md" | "lg"
    incerta    true se la targa deriva da una corrispondenza approssimata
*/

const MISURE = {
  sm: { h: 'h-7',  testo: 'text-sm',  banda: 'w-3',   spazio: 'px-2' },
  md: { h: 'h-10', testo: 'text-xl',  banda: 'w-4',   spazio: 'px-3' },
  lg: { h: 'h-16', testo: 'text-4xl', banda: 'w-6',   spazio: 'px-5' },
};

// Le dodici stelle della banda comunitaria, disposte in cerchio.
const StelleUE = () => (
  <svg viewBox="0 0 24 24" className="w-full" aria-hidden="true">
    {Array.from({ length: 12 }, (_, i) => {
      const angolo = (i * Math.PI) / 6;
      return (
        <circle
          key={i}
          cx={12 + 6.5 * Math.sin(angolo)}
          cy={12 - 6.5 * Math.cos(angolo)}
          r="1.1"
          fill="#f5c518"
        />
      );
    })}
  </svg>
);

const TargaChip = ({ targa, dimensione = 'md', incerta = false }) => {
  const m = MISURE[dimensione] ?? MISURE.md;

  // La targa si conserva compatta e si formatta solo qui, in fase di resa.
  const caratteri = targa
    ? `${targa.slice(0, 2)} ${targa.slice(2, 5)} ${targa.slice(5)}`
    : '—— ——— ——';

  return (
    <span
      className={`inline-flex items-stretch ${m.h} rounded-[3px] overflow-hidden
                  bg-[#e8e9e4] border border-black/40 shadow-sm
                  ${incerta ? 'ring-2 ring-attesa' : ''}`}
      title={incerta ? 'Corrispondenza approssimata' : undefined}
    >
      {/* banda comunitaria */}
      <span className={`${m.banda} bg-banda flex flex-col items-center justify-center gap-0.5 py-1`}>
        <StelleUE />
        <span className="text-white font-display font-semibold leading-none"
              style={{ fontSize: dimensione === 'lg' ? '0.7rem' : '0.5rem' }}>
          I
        </span>
      </span>

      <span className={`flex items-center ${m.spazio} ${m.testo} font-targa font-bold
                        tracking-wider text-[#141414] tabular-nums whitespace-nowrap`}>
        {caratteri}
      </span>

      {/* banda destra, quella di provincia e anno */}
      <span className={`${m.banda} bg-banda`} />
    </span>
  );
};

export default TargaChip;
