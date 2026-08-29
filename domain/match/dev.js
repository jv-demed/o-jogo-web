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

/**
 * Os poderes com nome, para poderem viajar.
 *
 * As funcoes acima recebem estado e devolvem estado, o que basta para o solo:
 * a aba chama a funcao e guarda o resultado. Numa mesa com outra gente isso
 * nao viaja — funcao nao cabe num jsonb, e o poder de dev que so acontece na
 * tela de quem clicou dessincroniza a mesa em silencio.
 *
 * Entao o poder vira um **comando**: `{ type: 'dev.*', playerId, ... }`, o
 * mesmo formato que o motor usa, gravado no mesmo log (`match_commands`, com
 * `seq` e autor) e refeito pelo mesmo replay. Cirurgia continua sendo cirurgia
 * — o que muda e que ela fica escrita na historia da partida, e e so isso que
 * a separa de trapaca.
 *
 * O que **nao** muda, e nao pode mudar: nada disto passa pelo `apply`. O motor
 * continua sem conhecer dev, e por isso continua seguro para rodar no servidor
 * quando a partida sair do browser do host (ver PENDENCIAS.md). Quem roteia e
 * quem chama — `applyDev` de um lado, `apply` do outro.
 */
export const DevCommand = Object.freeze({
    stackDeck:   'dev.stackDeck',
    giveCard:    'dev.giveCard',
    closeWindow: 'dev.closeWindow',
});

/** Se o comando e cirurgia de dev, e nao jogada. */
export const isDevCommand = command =>
    typeof command?.type === 'string' && command.type.startsWith('dev.');

/**
 * O `apply` dos poderes de dev. Mesma fronteira do motor — recebe estado e
 * comando, devolve estado novo — para que quem despacha nao precise saber qual
 * dos dois esta chamando.
 *
 * @param {object} state
 * @param {{type: string, playerId?: number, idCard?: number}} command
 * @returns {object} estado novo, ou o mesmo quando o comando nao se aplica.
 */
export function applyDev(state, command){
    switch(command.type){
        case DevCommand.stackDeck:   return stackDeck(state, command.playerId, command.idCard);
        case DevCommand.giveCard:    return giveCard(state, command.playerId, command.idCard);
        case DevCommand.closeWindow: return closeWindowNow(state);
        default: return state;
    }
}
