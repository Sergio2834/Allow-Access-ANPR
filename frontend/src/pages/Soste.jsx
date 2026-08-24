import React from 'react';

/* Registro delle soste: in corso, da pagare, concluse. */
const Soste = () => (
  <section className="px-5 md:px-8 py-10 max-w-6xl mx-auto w-full">
    <p className="occhiello">Registro</p>
    <h1 className="text-3xl font-bold mt-2">Soste</h1>
    <p className="text-nebbia mt-3 max-w-prose">
      Elenco delle soste in corso e di quelle concluse, con durata e importo.
    </p>
  </section>
);

export default Soste;
