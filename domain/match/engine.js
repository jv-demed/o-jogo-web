import { Action, Negatable } from '../cards/vocabulary.js';
import { getCardEffects } from '../cards/effects/index.js';
import { evaluateMissions } from './missions.js';
import { OngoingKind } from './marks.js';
import { cancelOf, fitsAgainst, isReaction, isShotShield, publicTargets } from './reactions.js';
import {
    drink, endOngoing, journalOf, runEffects, settleTableCards, triggerEffects, turnStartEffects,
} from './resolve.js';
import { nextRandom } from './rng.js';
import {
    MatchStatus, Phase, PLAYS_PER_TURN, REACTION_WINDOW_MS,
    cloneState, currentPlayer, isSimultaneous, optInRound, playerById, toDiscard,
} from './state.js';

export { isReaction };

/**
 * O motor da partida: turno, mao, compra, pilha e janela de interferencia.
 *
 * Funcao pura na fronteira — `apply(state, command)` devolve estado novo e
 * nunca mexe no recebido. Isso nao e estilo: e o que permite a mesma regra
 * rodar no servidor (dentro da RPC, que e quem manda) e no cliente (para
 * prever a jogada antes da resposta chegar) sem duas implementacoes.
 *
 * O turno, decidido em 2026-08-26:
 *
 *   draw   -> o jogador da vez compra 1 e fica com 6 cartas
 *   play   -> joga 1
 *   declare-> a carta pergunta os alvos dela *antes* da janela; enquanto isso a
 *             mesa fica em `pending` e nada aconteceu ainda
 *   window -> a carta fica na pilha por REACTION_WINDOW_MS; quem tiver carta de
 *             reacao (qualquer efeito com timing `reaction`) pode entrar. Todo
 *             mundo passando fecha a janela antes do tempo.
 *   resolve-> a pilha resolve do topo para a base. A reacao entra *por cima* da
 *             carta que ela responde e por isso resolve antes — e assim que
 *             cancelar chega a tempo de cancelar.
 *   end    -> passa a vez
 *
 * Atravessado em tudo isso: a fila de shots. Todo shot que alguem tem que beber
 * entra em `state.drinks` e a partida *para* ate a pessoa confirmar (`drank`) —
 * beber acontece na mesa de verdade, e o jogo nao pode seguir sem que tenha
 * acontecido. Nenhum outro comando passa enquanto a fila tiver alguem.
 * Confirmar marca a entrada (`confirmed`) em vez de tira-la: a fila so esvazia
 * quando o ultimo bebe, e ate la todo mundo ve quem ja deu o ok e quem falta.
 * Na frente dela vem a fila dos rituais (`state.rituals`, comando `performed`):
 * a musiquinha e cantada *antes* de o shot descer, entao enquanto houver ritual
 * pendente nem o `drank` passa.
 *
 * Escolhas (alvo, opcao, "quer beber?") param a resolucao: viram `pending`, e o
 * comando `answer` retoma. A retomada refaz a resolucao desde o inicio a partir
 * de um snapshot, em vez de continuar de onde parou — com a semente guardada no
 * estado, refazer da exatamente o mesmo resultado, e nao ha meio-efeito
 * aplicado para desfazer.
 */

export const Command = Object.freeze({
    draw:    'draw',
    drank:   'drank',
    performed: 'performed',
    play:    'play',
    react:   'react',
    pass:    'pass',
    tick:    'tick',
    answer:  'answer',
    guess:   'guess',
    endTurn: 'endTurn',
});

export class RuleError extends Error {}

const fail = message => { throw new RuleError(message); };

const log = (draft, entry) => draft.log.push({ turn: draft.turnCount, ...entry });

// As seis Gladsxodia. Ter as seis na mao, venha a carta de onde vier, encerra
// a partida na hora, com vitoria so de quem as reuniu.
const GLADSXODIA = [111, 112, 113, 114, 115, 116];

/**
 * Esta carta pode entrar agora, fora da vez?
 *
 * Na janela, contra o topo da pilha, e so contra o que ela combate
 * (`fitsAgainst`, em reactions.js). A 69 e a excecao: entra *antes* de a
 * jogada existir — depois de o jogador da vez comprar e antes de ele jogar,
 * com a pilha vazia, por qualquer outro jogador.
 */
export function canAnswer(state, playerId, idCard){
    const player = playerById(state, playerId);
    if(!player || player.out || !player.hand.includes(idCard)) return false;
    if(!isReaction(idCard)) return false;
    if(idCard === 69){
        return state.phase === Phase.play
            && state.stack.length === 0
            && !state.resolution
            && !state.drinks?.length && !state.rituals?.length
            && (state.playsLeft ?? 0) > 0
            && currentPlayer(state)?.id !== playerId;
    }
    if(state.phase !== Phase.window) return false;
    const top = state.stack[state.stack.length - 1];
    if(!top || top.byId === playerId) return false;
    if(state.window?.passed.includes(playerId)) return false;
    return fitsAgainst(state, playerId, idCard, top);
}

/**
 * A mao so tem carta de reacao. Jogar uma carta por vez e obrigatorio, e sem
 * esta saida a partida travaria numa mao que nao tem o que jogar.
 */
export const isHandLocked = player =>
    player.hand.length > 0 && player.hand.every(isReaction);

/**
 * Esta carta pode ser jogada na propria vez? Carta de reacao nao, salvo a mao
 * travada — ai a carta e queimada (descartada sem efeito) so para liberar a vez.
 */
export function canPlay(state, playerId, idCard){
    if(state.phase !== Phase.play) return false;
    const player = currentPlayer(state);
    if(player?.id !== playerId || !player.hand.includes(idCard)) return false;
    if(state.playsLeft <= 0) return false;
    return !isReaction(idCard) || isHandLocked(player);
}

// ------------------------------------------------------------------- janela

/**
 * Quem ainda pode interferir: todo mundo que esta na mesa, menos quem acabou de
 * por a carta na pilha (nao se reage a propria jogada) e menos quem ja passou.
 */
function pendingResponders(state){
    const top = state.stack[state.stack.length - 1];
    return state.players
        .filter(player => !player.out
            && player.id !== top?.byId
            && !state.window?.passed.includes(player.id))
        .map(player => player.id);
}

function openWindow(draft, now){
    draft.phase = Phase.window;
    draft.window = { closesAt: now + REACTION_WINDOW_MS, passed: [] };
}

// ---------------------------------------------------------------- declaracao

/**
 * O que a carta pergunta *antes* da janela: o que aponta jogador, e o que a
 * propria carta manda declarar (`declare`: as missoes da 74, a carta que a 33
 * copia, o equipamento da 80). O resto (`optIn`, `option`, voto, a escolha
 * secreta da 99) e decisao de quem sofre o efeito, ou segredo, e espera a
 * resolucao.
 */
const DECLARABLE = new Set(['choose', 'manual']);
const isDeclarable = needs => needs.declare ?? DECLARABLE.has(needs.kind);

const entryOf = item => (item.effects ? { effects: item.effects } : getCardEffects(item.idCard));

const effectContext = (item, choices, seedRef, drinksMark = 0, extra = {}) => ({
    sourceId: item.byId,
    playedById: item.respondsToPlayerId ?? null,
    idCard: item.idCard,
    uid: item.uid,
    choices,
    previous: [],
    slot: '',
    seedRef,
    // Onde a fila de shots estava quando esta carta comecou: e por essa marca
    // que a rodada de voluntarios sabe quem a *propria* carta ja obrigou.
    drinksMark,
    shields: [],
    reversed: { total: 0 },
    playTargets: item.playTargets ?? [],
    ...extra,
});

/**
 * Declarar a jogada: escolher os alvos antes de a mesa poder interferir.
 *
 * O ensaio roda numa copia descartavel: a pergunta seguinte de uma carta pode
 * depender do efeito da anterior, entao nao da para descobrir o que ela
 * pergunta sem deixar ela rodar. Nada disso vale — o estado de verdade so muda
 * quando a janela fechar.
 */
function beginDeclaration(draft, now){
    const item = draft.stack[draft.stack.length - 1];
    if(!item) return;
    draft.resolution = { item, choices: item.choices ?? {}, declaring: true };
    runDeclaration(draft, now);
}

function runDeclaration(draft, now){
    const { item, choices } = draft.resolution;
    const scratch = cloneState({ ...draft, resolution: null });
    const result = runEffects(scratch, entryOf(item),
        effectContext(item, choices, scratch, (scratch.drinks ?? []).length, { rehearsal: true }));

    if(result.needs && isDeclarable(result.needs)){
        draft.phase = Phase.pending;
        draft.pending = [{ ...result.needs, idCard: item.idCard, uid: item.uid, declaring: true }];
        return;
    }

    const top = draft.stack[draft.stack.length - 1];
    if(top){
        top.choices = choices;
        top.targets = declaredTargets(choices);
    }
    draft.resolution = null;
    draft.pending = [];
    openWindow(draft, now);
}

/**
 * Os alvos que a jogada declarou, para a mesa ver de quem se trata enquanto a
 * janela corre. Chave com `:` e resposta de outro tipo e nao aponta ninguem.
 */
function declaredTargets(choices){
    const ids = [];
    for(const [key, value] of Object.entries(choices ?? {})){
        if(key.includes(':')) continue;
        for(const id of (Array.isArray(value) ? value : [value])){
            if(typeof id === 'number' && !ids.includes(id)) ids.push(id);
        }
    }
    return ids;
}

// ---------------------------------------------------------------- resolucao

/**
 * O escudo que uma defesa de shot pendura na jogada de baixo. A 11 tira 1 dos
 * seus, a 59 ate 2 seus, a 60 1 de quem foi escolhido, a 23 passa 1 seu para
 * outro, e a 90 devolve tudo para quem jogou.
 */
function shieldOf(item){
    const cancels = cancelOf(item.idCard);
    const chosen = [item.choices?.['0'] ?? []].flat()[0];
    if(cancels.action === Action.redirect){
        if(cancels.target?.kind === 'played') return { kind: 'reverse', by: item.byId };
        return { kind: 'redirect', playerId: item.byId, to: chosen, left: cancels.amount ?? 1, by: item.byId };
    }
    const playerId = cancels.target?.kind === 'choose' ? chosen : item.byId;
    return { kind: 'negate', playerId, left: cancels.amount ?? 1, by: item.byId };
}

/**
 * Comeca a resolver o topo da pilha. O snapshot tirado aqui e o que permite
 * retomar depois de uma escolha: a resolucao inteira e refeita sobre ele.
 */
function beginResolution(draft, now){
    const item = draft.stack.pop();
    if(!item) return finishTurnStep(draft, now);

    const cancels = cancelOf(item.idCard);
    const belowIndex = item.respondsTo !== undefined
        ? draft.stack.findIndex(other => other.uid === item.respondsTo)
        : -1;
    const below = belowIndex !== -1 ? draft.stack[belowIndex] : null;

    if(below){
        // A 101 soma nos alvos que a mesa ve agora, na jogada de baixo.
        item.playTargets = publicTargets(draft, below);
    }

    if(cancels && below && fitsAgainst(draft, item.byId, item.idCard, below)){
        if(isShotShield(item.idCard)){
            // Negar ou desviar shot mexe so no shot: a carta de baixo resolve,
            // com o escudo pendurado.
            below.shields = [...(below.shields ?? []), shieldOf(item)];
            log(draft, { type: 'shield', idCard: item.idCard, by: item.byId, against: below.idCard });
        }else{
            draft.stack.splice(belowIndex, 1);
            // A carta cancelada vai para o descarte de quem a jogou — inclusive
            // equipamento, que nunca chegou a ser equipado.
            const owner = playerById(draft, below.byId);
            if(owner) toDiscard(draft, owner, below.idCard);
            log(draft, { type: 'cancelled', idCard: below.idCard, by: item.byId });
            if(below.turnPlay){
                draft.lastPlays = { ...(draft.lastPlays ?? {}),
                    [below.byId]: { uid: below.uid, idCard: below.idCard, turn: draft.turnCount, cancelled: true } };
            }
            // 49 fora da vez: o jogo segue pelo jogador seguinte a quem a jogou.
            if(cancels.what === Negatable.play && currentPlayer(draft)?.id !== item.byId){
                draft.nextFrom = item.byId;
            }
        }
    }

    draft.resolution = {
        item,
        choices: item.choices ?? {},
        snapshot: cloneState({ ...draft, resolution: null }),
    };
    runResolution(draft, now);
}

function runResolution(draft, now){
    const { item, choices, snapshot } = draft.resolution;
    const ctx = effectContext(item, choices, draft, (snapshot?.drinks ?? []).length, {
        // O escudo se gasta a cada passagem: cada uma comeca dele inteiro.
        shields: structuredClone(item.shields ?? []),
        selfRelease: item.trigger === 'prison',
    });
    const result = runEffects(draft, entryOf(item), ctx, { ritual: !item.trigger });

    if(result.needs){
        draft.phase = Phase.pending;
        draft.pending = [{ ...result.needs, idCard: item.idCard, uid: item.uid }];
        // A passagem que para numa escolha e um ensaio: a resposta seguinte
        // refaz tudo desde o snapshot. A fila de shots so abre na passagem que
        // termina; ate la, volta a ser a de antes da carta.
        draft.drinks = snapshot?.drinks ?? [];
        return;
    }

    // 90: tudo o que a carta mandaria beber, somado, desce em quem a jogou.
    if(ctx.reversed.total > 0){
        drink(draft, item.byId, ctx.reversed.total, { ...ctx, shields: [], sourceId: item.byId });
    }

    seatOrderDrinks(draft, snapshot);

    if(item.turnPlay && snapshot){
        draft.lastPlays = { ...(draft.lastPlays ?? {}), [item.byId]: {
            uid: item.uid, idCard: item.idCard, turn: draft.turnCount,
            journal: journalOf(snapshot, draft, item.uid),
        } };
    }

    draft.resolution = null;
    draft.pending = [];

    if(item.trigger){
        runTriggers(draft, now);
        return;
    }

    discardPlayed(draft, item);

    // 69 resolvida: o jogador da vez perde aquela jogada e fica com a carta.
    if(item.beforePlay){
        draft.playsLeft = 0;
        log(draft, { type: 'turn.lostPlay', playerId: currentPlayer(draft)?.id ?? null, by: item.byId });
    }

    // 52: a carta roubada entra na pilha na hora, como jogada do ladrao.
    const queued = draft.queuedPlays ?? [];
    draft.queuedPlays = [];
    for(const play of queued){
        if(playQueued(draft, play, now)) return;
    }
    finishTurnStep(draft, now);
}

/** Uma carta que chegou na mao e tem que ser jogada agora. Reacao e queimada. */
function playQueued(draft, { idCard, byId }, now){
    const player = playerById(draft, byId);
    const index = player?.hand.indexOf(idCard) ?? -1;
    if(index === -1) return false;
    player.hand.splice(index, 1);
    if(isReaction(idCard)){
        toDiscard(draft, player, idCard);
        log(draft, { type: 'burned', playerId: byId, idCard });
        return false;
    }
    const item = makeItem(draft, { idCard, playerId: byId });
    item.turnPlay = currentPlayer(draft)?.id === byId;
    draft.history = [...(draft.history ?? []), idCard];
    draft.stack.push(item);
    log(draft, { type: 'play.now', playerId: byId, idCard });
    beginDeclaration(draft, now);
    return true;
}

/**
 * Poe a conta desta carta na ordem da mesa, e nao na ordem em que os efeitos
 * dela rodaram: a ordem dos efeitos e mecanica, e mecanica e informacao (na
 * carta 4 o primeiro nome seria sempre o Sauzburg). Vale para a fila e para o
 * log. Mexe so no que esta carta acrescentou.
 */
function seatOrderDrinks(draft, snapshot){
    const seat = id => {
        const index = draft.order.indexOf(id);
        return index === -1 ? draft.order.length : index;
    };

    const drinksMark = (snapshot?.drinks ?? []).length;
    if((draft.drinks?.length ?? 0) > drinksMark + 1){
        draft.drinks = [
            ...draft.drinks.slice(0, drinksMark),
            ...draft.drinks.slice(drinksMark)
                .map((entry, i) => ({ entry, i }))
                .sort((a, b) => seat(a.entry.playerId) - seat(b.entry.playerId) || a.i - b.i)
                .map(({ entry }) => entry),
        ];
    }

    const logMark = snapshot?.log?.length ?? 0;
    const slots = [];
    for(let i = logMark; i < draft.log.length; i++){
        if(draft.log[i].type === 'drink') slots.push(i);
    }
    if(slots.length > 1){
        const sorted = slots
            .map((index, i) => ({ entry: draft.log[index], i }))
            .sort((a, b) => seat(a.entry.playerId) - seat(b.entry.playerId) || a.i - b.i);
        slots.forEach((index, i) => { draft.log[index] = sorted[i].entry; });
    }
}

/**
 * A carta resolvida vai para o descarte — menos a que ficou na mesa: o
 * equipamento que entrou numa cadeira, e o efeito que dura (quem a devolve e o
 * fim do efeito).
 */
function discardPlayed(draft, item){
    const owner = playerById(draft, item.byId);
    if(!owner) return;
    if(item.uid && draft.players.some(p => p.equipment.some(e => e.uid === item.uid))) return;
    if(item.uid && draft.ongoing.some(ongoing => ongoing.uid === item.uid)) return;
    toDiscard(draft, owner, item.idCard);
}

/**
 * Depois de resolver um item: se ainda ha pilha, a mesa ganha nova janela sobre
 * o novo topo. Se nao, o turno vai para `end` — ou volta para `play`, quando
 * ainda ha jogada.
 */
function finishTurnStep(draft, now){
    if(draft.status !== MatchStatus.progress) return;
    if(draft.stack.length){
        openWindow(draft, now);
        return;
    }
    draft.window = null;
    const player = currentPlayer(draft);
    if(player && player.extraPlays > 0 && player.hand.length > 0){
        player.extraPlays--;
        draft.playsLeft++;
        draft.phase = Phase.play;
        return;
    }
    draft.phase = draft.playsLeft > 0 && player?.hand.length ? Phase.play : Phase.end;
}

// -------------------------------------------------------------------- turno

/**
 * Passa a vez.
 *
 * Uma rodada e "ate voltar a vez de quem jogou a carta", contando tambem quando
 * a vez dele e pulada: e a unidade das duracoes em rodadas (`roundsLeft`). Por
 * isso a volta guarda todo mundo por quem a vez passou (`visited`), pulado ou
 * nao. Pular conta as vezes do proprio alvo (`skipTurns`, a prisao).
 */
function advanceTurn(draft, now){
    const previous = currentPlayer(draft);
    if(previous){
        // Jogada extra e da vez: nao atravessa para a proxima.
        previous.extraPlays = 0;
        // 85: acaba quando ele termina uma vez sua com 5 cartas ou menos,
        // conferido a partir da vez seguinte a da jogada.
        for(const ongoing of draft.ongoing.filter(o => o.kind === OngoingKind.greed
            && o.targets.includes(previous.id))){
            if(ongoing.since < draft.turnCount && previous.hand.length <= 5) endOngoing(draft, ongoing);
        }
    }
    settleTableCards(draft);

    const size = draft.order.length;
    let base = draft.turnIndex;
    if(draft.nextFrom !== undefined && draft.nextFrom !== null){
        const index = draft.order.indexOf(draft.nextFrom);
        if(index !== -1) base = index;
        draft.nextFrom = null;
    }

    const visited = [];
    const prisonOffers = [];
    let landed = null;
    for(let step = 1; step <= size * 4; step++){
        const index = ((base + step * draft.direction) % size + size) % size;
        const player = playerById(draft, draft.order[index]);
        if(!player || player.out) continue;
        visited.push(player.id);
        const prison = draft.ongoing.find(o => o.kind === OngoingKind.prison && o.targets.includes(player.id));
        if(prison){
            log(draft, { type: 'turn.skipped', playerId: player.id, idCard: prison.idCard });
            if(prison.skipsLeft !== null && prison.skipsLeft !== undefined){
                prison.skipsLeft--;
                if(prison.skipsLeft <= 0){
                    endOngoing(draft, prison);
                    continue;
                }
            }
            // A cada vez pulada, o preso pode beber 1 por conta propria.
            prisonOffers.push({ kind: 'prison', byId: player.id, idCard: prison.idCard });
            continue;
        }
        if(player.skipTurns > 0){
            player.skipTurns--;
            log(draft, { type: 'turn.skipped', playerId: player.id });
            continue;
        }
        landed = index;
        break;
    }
    // Todo mundo preso ou pulando por muitas voltas: a vez fica onde estava,
    // em vez de a mesa travar.
    if(landed === null) landed = draft.turnIndex;

    draft.turnIndex = landed;
    draft.turnCount++;
    const player = currentPlayer(draft);
    draft.playsLeft = PLAYS_PER_TURN + (player.nextTurnPlays ?? 0);
    player.nextTurnPlays = 0;
    draft.phase = Phase.draw;
    draft.lastTurnOf = { ...(draft.lastTurnOf ?? {}),
        [player.id]: { prev: draft.lastTurnOf?.[player.id]?.cur ?? -1, cur: draft.turnCount } };

    // 84: imune ate voltar a jogar.
    for(const ongoing of draft.ongoing.filter(o => o.kind === OngoingKind.immune && o.targets.includes(player.id))){
        endOngoing(draft, ongoing);
    }

    // Rodadas: cada passagem pela vez de quem jogou conta uma.
    const due = [];
    for(const ongoing of draft.ongoing){
        if(ongoing.roundsLeft === null || ongoing.roundsLeft === undefined) continue;
        const count = visited.filter(id => id === ongoing.sourceId).length;
        if(!count) continue;
        ongoing.roundsLeft -= count;
        if(ongoing.roundsLeft <= 0) due.push(ongoing);
    }
    // O fim marcado (51) vem antes de qualquer outro vencimento da mesma
    // virada: a 109 jogada junto ainda esta valendo quando a partida acaba.
    let ends = due.some(o => o.kind === OngoingKind.endIn);
    if(draft.endsInTurns !== null && draft.endsInTurns !== undefined){
        draft.endsInTurns--;
        if(draft.endsInTurns <= 0) ends = true;
    }
    if(ends) return endMatch(draft);

    for(const ongoing of due){
        if(ongoing.kind === OngoingKind.goalLater && !ongoing.fired){
            // 20: dispara para quem for o Stanley agora, e fica na mesa.
            for(const p of draft.players){
                if(p.mission !== ongoing.mission) continue;
                p.goal = ongoing.goal;
                p.goalChangedBy = ongoing.idCard;
            }
            ongoing.fired = true;
            ongoing.active = true;
            ongoing.roundsLeft = null;
            log(draft, { type: 'ongoing.trigger', idCard: ongoing.idCard, playerId: null, timing: 'delayed' });
            continue;
        }
        endOngoing(draft, ongoing);
    }

    draft.triggers = [...(draft.triggers ?? []), ...prisonOffers, ...turnStartEffects(draft, player)];
    checkEndConditions(draft);
    if(draft.status === MatchStatus.progress) runTriggers(draft, now);
}

/**
 * Os gatilhos do comeco da vez que pedem resposta: o equipamento da vez (70,
 * 77) e o preso que pode beber por conta propria. Cada um vira uma resolucao
 * pequena, igual a de uma carta, e a vez so chega na compra depois deles.
 */
function runTriggers(draft, now){
    while(draft.status === MatchStatus.progress && draft.triggers?.length){
        const [trigger, ...rest] = draft.triggers;
        draft.triggers = rest;
        const holder = playerById(draft, trigger.byId);
        if(!holder || holder.out) continue;
        if(trigger.kind === 'equip'
            && !holder.equipment.some(e => e.uid === trigger.equipUid && e.idCard === trigger.idCard)) continue;
        if(trigger.kind === 'prison'
            && !draft.ongoing.some(o => o.kind === OngoingKind.prison && o.targets.includes(trigger.byId))) continue;

        draft.uidSeq = (draft.uidSeq ?? 0) + 1;
        const item = {
            uid: `${draft.turnCount}:${draft.uidSeq}`,
            idCard: trigger.idCard,
            byId: trigger.byId,
            choices: {},
            trigger: trigger.kind,
            effects: triggerEffects(trigger),
        };
        draft.resolution = { item, choices: {}, snapshot: cloneState({ ...draft, resolution: null }) };
        runResolution(draft, now);
        return;
    }
    if(draft.status === MatchStatus.progress && !draft.resolution && !draft.stack.length){
        draft.phase = Phase.draw;
    }
}

function checkEndConditions(draft){
    // Partida gravada antes de a 62 virar efeito na mesa.
    for(const condition of draft.endWhen ?? []){
        const reached = draft.players.some(player => {
            if(condition.shots === undefined) return false;
            const { gte, lte } = condition.shots;
            return (gte === undefined || player.shots >= gte)
                && (lte === undefined || player.shots <= lte);
        });
        if(reached) return endMatch(draft);
    }
    const anyCards = draft.players.some(p => !p.out && (p.hand.length || p.deck.length));
    if(!anyCards) endMatch(draft);
}

/**
 * Fecho de cada comando: a Gladsxodia reunida, a Quinta Dimensao alcancada e o
 * baralho que acabou encerram a partida.
 */
function settle(draft){
    if(draft.status === MatchStatus.progress){
        const glads = draft.players.find(p => !p.out && GLADSXODIA.every(id => p.hand.includes(id)));
        if(glads){
            draft.gladsWinner = glads.id;
            log(draft, { type: 'game.glads', playerId: glads.id });
            finalize(draft);
            return draft;
        }
    }
    const resolving = draft.phase === Phase.window || draft.phase === Phase.pending;
    // 62: assim que os shots resolverem.
    if(draft.endPending && draft.status === MatchStatus.progress && !resolving
        && !draft.drinks?.length && !draft.rituals?.length){
        endMatch(draft);
    }
    if(draft.deckEmptied !== undefined
        && draft.deckEmptied !== null
        && draft.status === MatchStatus.progress
        && !resolving){
        endMatch(draft);
    }
    return draft;
}

// ------------------------------------------------------------------ fim

/**
 * Encerra. Se algum Sjehnsens ainda nao apontou quem e quem, a partida para em
 * `guessing` — menos quando a Paz Terrivel (109) ja decidiu.
 */
function endMatch(draft){
    if(draft.status !== MatchStatus.progress) return;
    const peace = draft.ongoing.filter(o => o.kind === OngoingKind.peace).at(-1);
    if(peace) draft.peaceWinner = peace.sourceId;

    const needsGuess = draft.peaceWinner === undefined && draft.players.some(player =>
        !player.out
        && player.mission === 'sjehnsens'
        && Object.keys(player.guesses ?? {}).length === 0);

    if(needsGuess){
        draft.status = MatchStatus.guessing;
        draft.phase = Phase.pending;
        return;
    }
    finalize(draft);
}

/**
 * O destino final, do mais forte ao mais fraco: Gladsxodia, Paz Terrivel,
 * derrota forcada, vitoria forcada, missao (as tres ultimas na apuracao). O
 * casamento (99) e aplicado sobre o resultado, menos quando a Gladsxodia ou a
 * 109 decidiu: o escolhido vence ou perde conforme quem jogou, mao unica.
 *
 * Exportado para os cenarios perguntarem "quem ganharia se acabasse agora".
 */
export function destiny(state){
    const { winners, byPlayer } = evaluateMissions(state);
    const peace = state.peaceWinner ?? (state.status !== MatchStatus.finished
        ? (state.ongoing ?? []).filter(o => o.kind === OngoingKind.peace).at(-1)?.sourceId
        : undefined);

    let final;
    if(state.gladsWinner !== undefined && state.gladsWinner !== null){
        final = new Set([state.gladsWinner]);
    }else if(peace !== undefined && peace !== null){
        final = new Set([peace]);
    }else{
        final = new Set(winners);
        for(const ongoing of (state.ongoing ?? []).filter(o => o.kind === OngoingKind.fate)){
            if(ongoing.partner === null || ongoing.partner === undefined) continue;
            if(final.has(ongoing.sourceId)) final.add(ongoing.partner);
            else final.delete(ongoing.partner);
        }
        for(const link of state.links ?? []){
            if(link.kind !== 'fate') continue;
            const [source, partner] = link.between;
            if(final.has(source)) final.add(partner);
            else final.delete(partner);
        }
    }
    return { final, byPlayer };
}

function finalize(draft){
    const { final, byPlayer } = destiny(draft);

    draft.status = MatchStatus.finished;
    draft.phase = Phase.end;
    draft.winners = draft.players.filter(p => final.has(p.id)).map(p => p.id);
    draft.results = draft.players.map(player => ({
        id: player.id,
        mission: player.mission,
        goal: player.goal,
        shots: player.shots,
        shotsGiven: player.shotsGiven,
        won: final.has(player.id),
        wonByMission: byPlayer[player.id] === true,
    }));
    log(draft, { type: 'match.end', winners: draft.winners });
}

// --------------------------------------------------------------- comandos

/**
 * Aplica um comando e devolve o estado novo.
 *
 * @param {object} state
 * @param {object} command  { type, playerId, idCard, choices, value, now }
 * @param {number} [command.now] instante em ms; recebe-lo em vez de chamar
 *        Date.now() e o que mantem esta camada pura e testavel.
 * @returns {object} estado novo
 */
export function apply(state, command){
    const draft = cloneState(state);
    const now = command.now ?? 0;

    if(draft.status === MatchStatus.finished
        && command.type !== Command.guess
        && command.type !== Command.drank
        && command.type !== Command.performed){
        fail('partida encerrada');
    }

    // Ritual na frente do shot: a musiquinha e o que autoriza o shot.
    if(draft.rituals?.length && command.type !== Command.performed){
        if(command.type === Command.tick) return draft;
        fail('a mesa espera o ritual da carta');
    }

    if(draft.drinks?.length
        && command.type !== Command.drank && command.type !== Command.performed){
        if(command.type === Command.tick) return draft;
        fail('a mesa espera quem tem shot para beber');
    }

    switch(command.type){
        case Command.draw: {
            if(draft.phase !== Phase.draw) fail('nao e a fase de compra');
            const player = currentPlayer(draft);
            if(command.playerId !== player.id) fail('nao e a sua vez');
            // 85: enquanto valer, a compra da vez tem 50% de falhar.
            const greedy = draft.ongoing.some(o => o.kind === OngoingKind.greed && o.targets.includes(player.id));
            let failed = false;
            if(greedy){
                const rolled = nextRandom(draft.seed);
                draft.seed = rolled.seed;
                failed = rolled.value < 0.5;
            }
            if(failed){
                log(draft, { type: 'draw.failed', playerId: player.id });
            }else{
                runEffects(draft, { effects: [{ action: Action.handDraw, target: { kind: 'self' }, amount: 1 }] },
                    { sourceId: player.id, choices: {}, slot: '', seedRef: draft });
            }
            // Compra que falhou com a mao vazia nao pode travar a vez.
            draft.phase = player.hand.length || draft.deckEmptied != null ? Phase.play : Phase.end;
            break;
        }

        case Command.play: {
            if(draft.phase !== Phase.play) fail('nao e a fase de jogada');
            const player = currentPlayer(draft);
            if(command.playerId !== player.id) fail('nao e a sua vez');
            if(!player.hand.includes(command.idCard)) fail('carta nao esta na mao');
            if(draft.playsLeft <= 0) fail('sem jogadas neste turno');

            if(isReaction(command.idCard)){
                if(!isHandLocked(player)) fail('carta de reacao so entra respondendo a uma jogada');
                player.hand.splice(player.hand.indexOf(command.idCard), 1);
                draft.playsLeft--;
                toDiscard(draft, player, command.idCard);
                log(draft, { type: 'burned', playerId: player.id, idCard: command.idCard });
                finishTurnStep(draft, now);
                break;
            }

            player.hand.splice(player.hand.indexOf(command.idCard), 1);
            draft.playsLeft--;
            const item = makeItem(draft, command);
            item.turnPlay = true;
            draft.history = [...(draft.history ?? []), command.idCard];
            draft.stack.push(item);
            beginDeclaration(draft, now);
            break;
        }

        // Fora da vez. So carta de reacao, e so enquanto a janela do topo esta
        // aberta — ou, a 69, antes da jogada do jogador da vez.
        case Command.react: {
            const beforePlay = command.idCard === 69 && draft.phase === Phase.play;
            if(draft.phase !== Phase.window && !beforePlay) fail('a janela nao esta aberta');
            const player = playerById(draft, command.playerId);
            if(!player || player.out) fail('jogador fora da mesa');
            if(!player.hand.includes(command.idCard)) fail('carta nao esta na mao');
            if(!isReaction(command.idCard)) fail('esta carta nao reage fora da vez');

            const top = draft.stack[draft.stack.length - 1];
            if(!beforePlay && top?.byId === command.playerId) fail('nao se reage a propria jogada');
            if(!canAnswer(draft, command.playerId, command.idCard)){
                fail('esta carta nao combate a jogada que esta na mesa');
            }

            player.hand.splice(player.hand.indexOf(command.idCard), 1);
            const item = makeItem(draft, command, beforePlay ? undefined : top);
            if(beforePlay) item.beforePlay = true;
            draft.stack.push(item);
            beginDeclaration(draft, now);
            break;
        }

        case Command.pass: {
            if(draft.phase !== Phase.window) fail('a janela nao esta aberta');
            if(!pendingResponders(draft).includes(command.playerId)) fail('voce nao tem o que passar');
            draft.window.passed.push(command.playerId);
            if(pendingResponders(draft).length === 0) beginResolution(draft, now);
            break;
        }

        case Command.tick: {
            if(draft.phase === Phase.window && now >= draft.window.closesAt){
                beginResolution(draft, now);
            }
            break;
        }

        case Command.performed: {
            const index = (draft.rituals ?? []).findIndex(
                entry => entry.playerId === command.playerId);
            if(index === -1) fail('o ritual nao e seu');
            const [entry] = draft.rituals.splice(index, 1);
            log(draft, { type: 'ritual.done', playerId: entry.playerId, idCard: entry.idCard });

            // Ritual que vem antes da escolha (75): a resolucao e refeita a
            // cada resposta, e precisa saber que a carta ja foi inventada.
            if(draft.resolution && entry.uid && draft.resolution.item?.uid === entry.uid){
                const snapshot = draft.resolution.snapshot;
                // A resolucao recomeca do snapshot: o ritual e o "feito" entram
                // nele tambem, senao sumiriam do log na proxima resposta.
                if(snapshot){
                    snapshot.log.push(...draft.log.slice(snapshot.log.length)
                        .filter(e => e.type === 'ritual' || e.type === 'ritual.done'));
                }
                draft.resolution = { ...draft.resolution,
                    choices: { ...draft.resolution.choices, 'ritual:done': true } };
            }

            if(draft.rituals.length === 0 && !draft.drinks?.length
                && draft.phase === Phase.window && draft.window){
                draft.window.closesAt = now + REACTION_WINDOW_MS;
            }
            break;
        }

        case Command.drank: {
            const entry = (draft.drinks ?? []).find(
                item => item.playerId === command.playerId && !item.confirmed);
            if(!entry) fail('voce nao tem shot para beber');
            entry.confirmed = true;
            log(draft, { type: 'drink.confirmed', playerId: entry.playerId, amount: entry.amount });

            if(draft.drinks.every(item => item.confirmed)){
                draft.drinks = [];
                if(draft.phase === Phase.window && draft.window){
                    draft.window.closesAt = now + REACTION_WINDOW_MS;
                }
            }
            break;
        }

        case Command.answer: {
            if(draft.phase !== Phase.pending || !draft.resolution) fail('nada esperando resposta');
            const request = draft.pending[0];
            if(isSimultaneous(request)){
                // A rodada da mesa nao tem dono: quem responde e cada um da
                // lista, na hora que quiser, e nao volta atras.
                if(!optInRound(request).waiting.includes(command.playerId)){
                    fail('a escolha nao e sua');
                }
            }else if(request.chooserId !== undefined && request.chooserId !== command.playerId){
                fail('a escolha nao e sua');
            }
            const choices = keyFor(draft.resolution.choices, request, command.playerId, command.value);

            if(draft.resolution.declaring){
                draft.resolution = { ...draft.resolution, choices };
                runDeclaration(draft, now);
                return settle(draft);
            }

            const restored = cloneState(draft.resolution.snapshot);
            restored.resolution = { ...draft.resolution, choices, snapshot: draft.resolution.snapshot };
            runResolution(restored, now);
            return settle(restored);
        }

        case Command.guess: {
            const player = playerById(draft, command.playerId);
            if(!player) fail('jogador fora da mesa');
            player.guesses = { ...player.guesses, ...command.value };
            if(draft.status === MatchStatus.guessing) finalize(draft);
            break;
        }

        case Command.endTurn: {
            if(draft.phase !== Phase.end) fail('o turno ainda nao acabou');
            advanceTurn(draft, now);
            break;
        }

        default:
            fail(`comando desconhecido: ${command.type}`);
    }
    return settle(draft);
}

/**
 * O contador dos uid vive *dentro* do estado: a mesma entrada da a mesma saida,
 * e o replay chega ao mesmo estado. `?? 0` porque partida antiga nao tem o campo.
 */
function makeItem(draft, command, respondsTo){
    draft.uidSeq = (draft.uidSeq ?? 0) + 1;
    return {
        uid: `${draft.turnCount}:${draft.uidSeq}`,
        idCard: command.idCard,
        byId: command.playerId,
        choices: command.choices ?? {},
        respondsTo: respondsTo?.uid,
        respondsToPlayerId: respondsTo?.byId,
    };
}

/**
 * Onde a resposta entra em `choices`, conforme o tipo do pedido. As rodadas da
 * mesa (optIn, voto, descarte de cada um) acumulam por jogador; a corrida
 * guarda a ordem de chegada.
 */
function keyFor(choices, request, playerId, value){
    const slot = request.slot;
    if(request.key) return { ...choices, [slot + ':' + request.key]: value };
    const merge = suffix => ({ ...choices, [slot + suffix]: { ...(choices[slot + suffix] ?? {}), [playerId]: value } });
    switch(request.kind){
        case 'optIn':    return merge(':optIn');
        case 'vote':     return { ...choices, [slot + ':vote']: { ...(choices[slot + ':vote'] ?? {}), [playerId]: value !== false } };
        case 'handPick': return merge(':handPick');
        case 'race':     return { ...choices, [slot + ':race']: [...(choices[slot + ':race'] ?? []), playerId] };
        case 'option':   return { ...choices, [slot + ':option']: value };
        case 'cards':    return { ...choices, [slot + ':cards']: value };
        case 'missions': return { ...choices, [slot + ':missions']: value };
        case 'order':    return { ...choices, [slot + ':order']: value };
        case 'ongoing':  return { ...choices, [slot + ':ongoing']: value };
        default:         return { ...choices, [slot]: value };
    }
}

/** Conveniencia para a UI: o que este jogador pode fazer agora. */
export function legalCommands(state, playerId){
    if(state.status !== MatchStatus.progress) return [];
    if(state.rituals?.length){
        return state.rituals.some(entry => entry.playerId === playerId)
            ? [Command.performed] : [];
    }
    if(state.drinks?.length){
        return state.drinks.some(entry => entry.playerId === playerId && !entry.confirmed)
            ? [Command.drank] : [];
    }
    const isTurn = currentPlayer(state)?.id === playerId;
    switch(state.phase){
        case Phase.draw:   return isTurn ? [Command.draw] : [];
        case Phase.play:
            if(isTurn) return [Command.play];
            return playerById(state, playerId)?.hand.some(idCard => canAnswer(state, playerId, idCard))
                ? [Command.react] : [];
        case Phase.window: return pendingResponders(state).includes(playerId)
            ? [Command.react, Command.pass] : [];
        case Phase.pending: {
            const request = state.pending[0];
            if(isSimultaneous(request)){
                return optInRound(request).waiting.includes(playerId) ? [Command.answer] : [];
            }
            return request?.chooserId === playerId ? [Command.answer] : [];
        }
        case Phase.end:    return isTurn ? [Command.endTurn] : [];
        default:           return [];
    }
}
