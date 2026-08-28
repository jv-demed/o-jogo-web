import { BOT_NAMES } from './bot.js';
import { DECK_SIZE, createSeatedMatch } from './setup.js';

/**
 * Partida solo: voce mais os bots, montada inteira em memoria.
 *
 * Sobrou pouco aqui, e de proposito: montar a mesa e de `setup.js`, e os bots
 * sao de `bot.js`. O que resta e o unico dado que so o solo tem — quantos
 * assentos sao de bot, ja que no lobby quem decide isso e o host, um a um.
 *
 * Puro como o resto da pasta: recebe o pool de ids de carta de fora, e nao
 * importa assets/cards.js. Quem tem o catalogo e a camada de cima.
 */

/**
 * @param {number} params.seed
 * @param {{id: number, name: string, deck?: number[]}} params.you
 *        seu baralho; sem ele, sorteia um do mesmo jeito que o dos bots.
 * @param {number} params.botCount
 * @param {number[]} params.pool  ids de carta disponiveis (o catalogo).
 * @returns {{ state: object, botIds: number[] }}
 */
export function createSoloMatch({ seed, you, botCount, pool, deckSize = DECK_SIZE }){
    // Ids negativos para os bots (ver `isBot`, em bot.js).
    const bots = [];
    for(let i = 0; i < botCount; i++){
        bots.push({ id: -(i + 1), name: BOT_NAMES[i % BOT_NAMES.length] });
    }

    return {
        state: createSeatedMatch({ seed, seats: [you, ...bots], pool, deckSize }),
        botIds: bots.map(bot => bot.id),
    };
}
