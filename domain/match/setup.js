import { sample, shuffle } from './rng.js';
import { createMatch } from './state.js';

/**
 * Montar a mesa a partir dos assentos.
 *
 * Vive fora do `solo.js` porque montar mesa nao e coisa do modo solo: o lobby
 * monta a dele do mesmo jeito, com a diferenca de que alguns assentos sao de
 * gente. O que o motor recebe e uma lista de `{ id, name, deck }` — ele nunca
 * soube o que e um bot, e e por isso que a mesa mista nao precisou de regra
 * nova.
 *
 * Puro como o resto da pasta: o pool de ids de carta vem de fora, e este
 * arquivo nao conhece o catalogo nem o Supabase.
 */

// Tamanho do baralho sorteado. E o relogio da partida, ja que o fim vem quando
// um baralho acaba: 20 cartas dao ~20 turnos por jogador, que na mesa e uma
// partida inteira sem virar maratona.
export const DECK_SIZE = 20;

/**
 * Baralho aleatorio a partir do catalogo. Sem repetir carta: repeticao existe
 * na colecao (voce pode ter duas), mas um baralho sorteado com duas copias da
 * mesma carta e so menos variedade para testar.
 */
export function randomDeck(seed, pool, size = DECK_SIZE){
    return sample(seed, pool, Math.min(size, pool.length));
}

/**
 * @param {number} params.seed
 * @param {{id: number, name: string, deck?: number[]}[]} params.seats
 *        em ordem de turno. Sem `deck`, o assento recebe um sorteado.
 * @param {number[]} params.pool  ids de carta disponiveis (o catalogo).
 * @returns {object} estado pronto para o `apply`
 */
export function createSeatedMatch({ seed, seats, pool, deckSize = DECK_SIZE }){
    let rng = seed | 0;

    const players = seats.map(seat => {
        // Mesmo com deck proprio, embaralha: a ordem em que o deck foi montado
        // nao pode ser a ordem em que ele e comprado.
        const drawn = seat.deck?.length
            ? shuffle(rng, seat.deck)
            : randomDeck(rng, pool, deckSize);
        rng = drawn.seed;
        return { id: seat.id, name: seat.name, deck: drawn.items };
    });

    return createMatch({ seed: rng, players });
}
