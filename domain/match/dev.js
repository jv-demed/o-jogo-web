import { Phase, cloneState, playerById } from './state.js';

/**
 * Poderes de dev: cirurgia no estado da partida.
 *
 * Existe para testar carta sem jogar vinte turnos esperando ela cair na mao.
 *
 * Mora fora do motor de proposito, e por isso `index.js` nao reexporta este
 * arquivo: `apply()` vai rodar no servidor quando a partida for para o banco
 * (ver PENDENCIAS.md), e um `Command.devDraw` aceito la seria trapaca de
 * verdade no multijogador. Aqui nada e comando — sao funcoes que recebem o
 * estado e devolvem outro, chamadas so pelo hook do solo, que roda em memoria
 * e nao persiste nada.
 *
 * Por isso tambem a compra escolhida nao e um draw especial: ela *empilha o
 * baralho* e deixa o `Command.draw` de sempre acontecer. A jogada de teste
 * percorre o caminho real, e continua valendo para a carta que compra duas ou
 * que compra do fundo.
 *
 * Duas regras valem para todas:
 *   - nao mexem no estado recebido (clonam, igual ao motor);
 *   - registram no log com tipo `dev.*`. Cirurgia silenciosa vira cacada a um
 *     bug que voce mesmo plantou tres turnos atras.
 */

const log = (draft, entry) => draft.log.push({ turn: draft.turnCount, ...entry });

/**
 * Poe a carta no topo do baralho: a proxima compra sera ela.
 *
 * `keepSize` existe porque o baralho e o relogio da partida — o fim vem quando
 * um acaba. Trazer carta do catalogo sem tirar nenhuma esticaria a partida sem
 * voce perceber, entao, por padrao, a carta escolhida entra no lugar do topo.
 * Carta que ja estava no baralho apenas sobe, e o tamanho nao muda de qualquer
 * jeito.
 */
export function stackDeck(state, playerId, idCard, { keepSize = true } = {}){
    const draft = cloneState(state);
    const player = playerById(draft, playerId);
    if(!player) return state;

    const index = player.deck.indexOf(idCard);
    const from = index !== -1 ? 'deck' : 'catalog';
    if(index !== -1){
        player.deck.splice(index, 1);
    }else if(keepSize && player.deck.length){
        player.deck.shift();
    }
    player.deck.unshift(idCard);

    log(draft, { type: 'dev.stackDeck', playerId, idCard, from });
    return draft;
}

/**
 * Carta direto na mao, sem passar pela compra.
 *
 * Nao tira do baralho: serve para por uma carta de reacao na mao no meio da
 * janela, quando nao ha compra nenhuma a caminho. A mao fica com uma carta a
 * mais que o normal, e isso e o esperado.
 */
export function giveCard(state, playerId, idCard){
    const draft = cloneState(state);
    const player = playerById(draft, playerId);
    if(!player) return state;

    player.hand.push(idCard);
    log(draft, { type: 'dev.giveCard', playerId, idCard });
    return draft;
}

/**
 * Vence a janela de interferencia agora.
 *
 * So adianta o relogio, em vez de resolver a pilha aqui: quem resolve continua
 * sendo o motor, no proximo tick. Uma segunda implementacao da resolucao neste
 * arquivo e exatamente o que a camada pura foi feita para evitar.
 */
export function closeWindowNow(state){
    if(state.phase !== Phase.window || !state.window) return state;
    const draft = cloneState(state);
    draft.window.closesAt = 0;
    log(draft, { type: 'dev.window.close' });
    return draft;
}
