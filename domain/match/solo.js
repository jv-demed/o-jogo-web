import { sample, shuffle } from './rng.js';
import { createMatch } from './state.js';
import { BOT_NAMES } from './bot.js';

/**
 * Partida solo: voce mais os bots, montada inteira em memoria.
 *
 * Nao passa pelo banco de proposito. A partida no servidor ainda nao existe
 * (ver PENDENCIAS.md) e esperar por ela para poder *jogar* seria inverter a
 * ordem: o modo solo e justamente o que permite descobrir se as regras
 * escritas em domain/match/ dao uma partida boa antes de gastar migration com
 * elas.
 *
 * Puro como o resto da pasta: recebe o pool de ids de carta de fora, e nao
 * importa assets/cards.js. Quem tem o catalogo e a camada de cima.
 */

// Tamanho do baralho no solo. E o relogio da partida, ja que o fim vem quando
// um baralho acaba: 20 cartas dao ~20 turnos por jogador, que na mesa e uma
// partida inteira sem virar maratona.
export const SOLO_DECK_SIZE = 20;

/**
 * Baralho aleatorio a partir do catalogo. Sem repetir carta: repeticao existe
 * na colecao (voce pode ter duas), mas um baralho sorteado com duas copias da
 * mesma carta e so menos variedade para testar.
 */
export function randomDeck(seed, pool, size = SOLO_DECK_SIZE){
    return sample(seed, pool, Math.min(size, pool.length));
}

/**
 * @param {number} params.seed
 * @param {{id: number, name: string, deck?: number[]}} params.you
 *        seu baralho; sem ele, sorteia um do mesmo jeito que o dos bots.
 * @param {number} params.botCount
 * @param {number[]} params.pool  ids de carta disponiveis (o catalogo).
 * @returns {{ state: object, botIds: number[] }}
 */
export function createSoloMatch({ seed, you, botCount, pool, deckSize = SOLO_DECK_SIZE }){
    let rng = seed | 0;

    const meuDeck = you.deck?.length ? you.deck : null;
    if(!meuDeck){
        const sorteado = randomDeck(rng, pool, deckSize);
        rng = sorteado.seed;
        you = { ...you, deck: sorteado.items };
    }else{
        // Mesmo com deck proprio, embaralha: a ordem em que o deck foi montado
        // nao pode ser a ordem em que ele e comprado.
        const embaralhado = shuffle(rng, meuDeck);
        rng = embaralhado.seed;
        you = { ...you, deck: embaralhado.items };
    }

    // Ids negativos para os bots (ver `isBot`, em bot.js).
    const bots = [];
    for(let i = 0; i < botCount; i++){
        const sorteado = randomDeck(rng, pool, deckSize);
        rng = sorteado.seed;
        bots.push({
            id: -(i + 1),
            name: BOT_NAMES[i % BOT_NAMES.length],
            deck: sorteado.items,
        });
    }

    return {
        state: createMatch({ seed: rng, players: [you, ...bots] }),
        botIds: bots.map(bot => bot.id),
    };
}
