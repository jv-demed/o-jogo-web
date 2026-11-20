import { Command, apply } from './engine.js';
import { arrangeTable, giveCard, stackDeck } from './dev.js';
import { createSoloMatch } from './solo.js';

/**
 * O laboratorio de carta: uma partida solo que ja comeca no caso que se quer
 * testar — a sua vez, a carta na mao, a mesa como voce montou.
 *
 * Nao e um modo de jogo. E o `createSoloMatch` de sempre seguido de cirurgia de
 * dev (`dev.js`), e a partir dai a partida e uma partida solo como as outras:
 * toda jogada passa pelo `apply`. Por isso a carta nao e enfiada na mao —
 * ela vai para o topo do baralho e chega pelo `Command.draw` normal, igual ao
 * "escolher a proxima compra" do painel de dev.
 *
 * Fica fora do `index.js` pelo mesmo motivo do `dev.js`: nada disto pode virar
 * caminho de partida no servidor.
 *
 * @param {object} params
 * @param {number} params.seed
 * @param {{id: number, name: string, avatar?: string}} params.you
 * @param {number} params.idCard a carta testada.
 * @param {{mission: string, shots?: number, hand?: number[]}[]} params.seats
 *        a mesa inteira, na ordem da roda, voce incluido.
 * @param {number} params.yourSeat o indice do seu lugar em `seats`.
 * @param {number[]} [params.extra] cartas a mais na sua mao, depois da compra.
 * @param {number[]} params.pool ids de carta para os baralhos sorteados.
 * @returns {{ state: object, botIds: number[] }}
 */
export function createLabMatch({ seed, you, idCard, seats, yourSeat, extra = [], pool }){
    const { state: base, botIds } = createSoloMatch({
        seed, you, botCount: seats.length - 1, pool, yourSeat,
    });

    let state = arrangeTable(base, seats, { turnOf: you.id });
    state = stackDeck(state, you.id, idCard);
    state = apply(state, { type: Command.draw, playerId: you.id, now: 0 });
    for(const id of extra) state = giveCard(state, you.id, id);

    return { state, botIds };
}
