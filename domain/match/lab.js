import { Command, apply, canAnswer, isReaction } from './engine.js';
import { arrangeTable, giveCard, stackDeck } from './dev.js';
import { cloneState, playerById } from './state.js';
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
 * @param {{seat: number, idCard: number, choices?: object}} [params.trigger]
 *        para carta de defesa: a mesa comeca na vez do bot do assento `seat`,
 *        que compra e joga `idCard` (ver `opening`), com a carta testada ja na
 *        sua mao. `choices` sao os alvos dele por slot, em ids de assento (indice
 *        em `seats`); sem, ele escolhe como qualquer bot. Carta de defesa
 *        sem gatilho ganha um sorteado (ver `autoTrigger`).
 * @param {{seat: number, choices?: object}} [params.playedBy] quem joga a
 *        carta testada, quando nao e voce: o bot desse assento a compra e joga
 *        na vez dele, e voce ve a carta chegando na mesa — "alguem joga em
 *        voce". `choices` como em `trigger`.
 * @param {boolean} [params.botsDefend] se os bots ficam com as cartas de
 *        defesa que o sorteio deu a eles. Por padrao nao ficam: com cinco
 *        maos sorteadas quase sempre alguem tem com o que bloquear, e a carta
 *        testada nunca chegava a resolver. Mao escrita no assento (`hand`) e
 *        respeitada de qualquer jeito — o cenario que quer o bloqueio diz qual.
 * @param {number} [params.now] o relogio da mesa, para a compra da sua vez.
 * @returns {{ state: object, botIds: number[], opening: object[] }} `opening`
 *        sao as jogadas do bot que abrem a mesa (compra e jogada do gatilho),
 *        ainda nao aplicadas: quem conduz a partida as solta no ritmo dos bots,
 *        para a vez do bot ser vista em vez de a mesa ja nascer na janela.
 */
/**
 * As cartas de `pool` contra as quais a defesa `idCard` pode entrar. A conta e
 * a do motor (`canAnswer`), numa pilha de mentira com uma carta so: o que a
 * defesa combate depende so da carta de baixo, e nao da mesa.
 */
export function answerableBy(idCard, pool){
    return pool.filter(other => !isReaction(other) && canAnswer({
        phase: 'window',
        players: [{ id: 1, hand: [idCard] }],
        stack: [{ idCard: other, byId: 2 }],
        window: { passed: [] },
    }, 1, idCard));
}

/**
 * Defesa testada sem gatilho escolhido: o laboratorio sorteia um. Quem joga e
 * o assento antes do seu, que e de quem a vez vem antes da sua; a carta e uma
 * das que a defesa combate. O sorteio sai da semente, e por isso o REPETIR
 * (que monta de novo com a mesma) repete o mesmo gatilho.
 */
function autoTrigger(idCard, { seed, seats, yourSeat, pool }){
    const candidates = answerableBy(idCard, pool);
    if(candidates.length === 0) throw new Error(`nenhuma carta do baralho serve de gatilho para a ${idCard}`);
    return {
        seat: (yourSeat - 1 + seats.length) % seats.length,
        idCard: candidates[Math.abs(seed) % candidates.length],
    };
}

/**
 * Troca as cartas de defesa da mao de cada bot por cartas comuns do baralho
 * dele, menos nos assentos com mao escrita. Troca, e nao tira: a mao continua
 * do tamanho que o motor espera, e a defesa so desce para o baralho.
 */
function disarmBots(state, seats, botIds){
    const draft = cloneState(state);
    draft.order.forEach((id, index) => {
        if(!botIds.includes(id) || Array.isArray(seats[index]?.hand)) return;
        const player = playerById(draft, id);
        player.hand = player.hand.map(card => {
            if(!isReaction(card)) return card;
            const swap = player.deck.findIndex(other => !isReaction(other));
            if(swap === -1) return card;
            const [common] = player.deck.splice(swap, 1, card);
            return common;
        });
    });
    return draft;
}

export function createLabMatch({ seed, you, idCard, seats, yourSeat, extra = [], pool, trigger, playedBy, botsDefend = false, now = 0 }){
    // Carta jogada por um bot e o mesmo caminho do gatilho, so que a carta que
    // ele joga e a testada — e ela nao vai para a sua mao.
    let yours = true;
    if(!trigger && playedBy && playedBy.seat !== yourSeat && !isReaction(idCard)){
        trigger = { seat: playedBy.seat, idCard, choices: playedBy.choices };
        yours = false;
    }

    // Defesa nao se joga na propria vez: sem gatilho, a mesa nao teria como
    // chegar no caso que se quer testar.
    if(!trigger && isReaction(idCard)){
        trigger = autoTrigger(idCard, { seed, seats, yourSeat, pool });
    }

    const { state: base, botIds } = createSoloMatch({
        seed, you, botCount: seats.length - 1, pool, yourSeat,
    });

    if(!trigger){
        let state = arrangeTable(base, seats, { turnOf: you.id });
        if(!botsDefend) state = disarmBots(state, seats, botIds);
        state = stackDeck(state, you.id, idCard);
        state = apply(state, { type: Command.draw, playerId: you.id, now });
        for(const id of extra) state = giveCard(state, you.id, id);
        return { state, botIds, opening: [] };
    }

    // A carta de defesa nao se joga na sua vez: ela espera a jogada que ela
    // combate. Quem joga e o bot, pelo mesmo caminho de qualquer vez (compra a
    // carta do topo, joga), e voce ja esta com a defesa na mao quando a janela
    // abrir.
    if(trigger.seat === yourSeat) throw new Error('o gatilho tem que ser de um bot');
    const botId = base.order[trigger.seat];
    let state = arrangeTable(base, seats, { turnOf: botId });
    if(!botsDefend) state = disarmBots(state, seats, botIds);
    if(yours) state = giveCard(state, you.id, idCard);
    for(const id of extra) state = giveCard(state, you.id, id);
    state = stackDeck(state, botId, trigger.idCard);

    // A compra e a jogada do bot ficam de roteiro, e nao aplicadas aqui: a mesa
    // nasce na vez dele, com o anuncio de quem joga, e as duas descem no ritmo
    // de qualquer bot. Aplicadas na montagem, a carta ja estava na mesa antes
    // de dar para ler de quem era a vez.
    const choices = Object.fromEntries(Object.entries(trigger.choices ?? {})
        .map(([slot, value]) => [slot, Array.isArray(value)
            ? value.map(index => state.order[index])
            : value]));
    const opening = [
        { type: Command.draw, playerId: botId },
        { type: Command.play, playerId: botId, idCard: trigger.idCard, choices },
    ];
    return { state, botIds, opening };
}
