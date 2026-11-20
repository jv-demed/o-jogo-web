// Os cenarios de carta, por pack.
//
// Import estatico, e nao leitura de pasta: o validate-cards.mjs roda em Node,
// mas o laboratorio de carta le as mesas daqui no browser, onde nao ha `fs`.
// Pack novo vira um arquivo irmao e entra aqui.

import pack1 from './pack1.mjs';
import pack2 from './pack2.mjs';
import pack3 from './pack3.mjs';

export const PACKS = Object.freeze({ pack1, pack2, pack3 });

/** Todos os cenarios, cada um sabendo de que pack veio. */
export const SCENARIOS = Object.entries(PACKS)
    .flatMap(([pack, lista]) => lista.map(cenario => ({ ...cenario, pack })));
