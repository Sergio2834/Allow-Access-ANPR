import React from 'react';
import TargaChip from '../components/TargaChip'

/*
  Pagina principale: varco unico a stato.
  Il video viene inviato al backend, che deduce da solo se si tratta di un
  ingresso o di un'uscita in base alla presenza di una sosta aperta per la
  targa letta.

  Da costruire nel prossimo passo:
    - selezione del video e anteprima
    - esito del transito con TargaChip in evidenza
    - elenco dei veicoli attualmente dentro
    - ripiego con targa digitata a mano
*/
const Varco = () => (
  <section className="px-5 md:px-8 py-10 max-w-6xl mx-auto w-full">
    <p className="occhiello">Varco</p>
    <h1 className="text-3xl font-bold mt-2">Rilevazione transito</h1>
    <p className="text-nebbia mt-3 max-w-prose">
      Carica il video della telecamera al varco. Il sistema legge la targa e
      decide se si tratta di un ingresso o di un'uscita.
    </p>
    <TargaChip targa="EV229JP" dimensione="lg" />
  </section>
);

export default Varco;