import { Action, Negatable, Timing } from '../cards/vocabulary.js';
import { getCardEffects } from '../cards/effects/index.js';
import { evaluateMissions } from './missions.js';
import { runEffects } from './resolve.js';
import {
    MatchStatus, Phase, PLAYS_PER_TURN, REACTION_WINDOW_MS,
    cloneState, currentPlayer, playerById, toDiscard,
} from './state.js';

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
 *   window -> a carta fica na pilha por REACTION_WINDOW_MS; quem tiver carta de
 *             reacao (qualquer efeito com timing `reaction`) pode entrar. Todo
 *             mundo passando fecha a janela antes do tempo.
 *   resolve-> a pilha resolve do topo para a base. A reacao entra *por cima* da
 *             carta que ela responde e por isso resolve antes — e assim que
 *             cancelar chega a tempo de cancelar.
 *   end    -> passa a vez
 *
 * Escolhas (alvo, opcao, "quer beber?") param a resolucao: viram `pending`, e o
 * comando `answer` retoma. A retomada refaz a resolucao desde o inicio a partir
 * de um snapshot, em vez de continuar de onde parou — com a semente guardada no
 * estado, refazer da exatamente o mesmo resultado, e nao ha meio-efeito
 * aplicado para desfazer.
 */

export const Command = Object.freeze({
    draw:    'draw',
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

/** Uma carta so entra fora da vez se algum efeito dela reage. */
export function isReaction(idCard){
    const entry = getCardEffects(idCard);
    return Boolean(entry?.effects?.some(effect => effect.timing === Timing.reaction));
}

const firstAction = (entry, action) =>
    entry?.effects?.find(effect => effect.action === action) ?? null;

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

// ---------------------------------------------------------------- resolucao

/**
 * Comeca a resolver o topo da pilha.
 *
 * O snapshot tirado aqui e o que permite retomar depois de uma escolha: a
 * resolucao inteira e refeita sobre ele. Guarda-se o estado *sem* a resolucao
 * corrente, senao o snapshot conteria a si mesmo a cada aninhamento.
 */
function beginResolution(draft, now){
    const item = draft.stack.pop();
    if(!item) return finishTurnStep(draft, now);

    // Cancelamento e desvio consomem a jogada de baixo antes de qualquer coisa
    // — e para isso que existe a janela.
    const entry = getCardEffects(item.idCard);
    const cancels = firstAction(entry, Action.negate) ?? firstAction(entry, Action.redirect);
    if(cancels && item.respondsTo !== undefined){
        const below = draft.stack.findIndex(other => other.uid === item.respondsTo);
        if(below !== -1 && canCancel(draft, cancels.what, draft.stack[below])){
            const [cancelled] = draft.stack.splice(below, 1);
            discardPlayed(draft, cancelled);
            draft.log.push({ turn: draft.turnCount, type: 'cancelled',
                idCard: cancelled.idCard, by: item.byId });
        }
    }

    draft.resolution = {
        item,
        choices: item.choices ?? {},
        snapshot: cloneState({ ...draft, resolution: null }),
    };
    runResolution(draft, now);
}

/**
 * `what` diz o que a carta cancela. Sem o tipo da carta de baixo (que vive em
 * o_jogo.cards, nao em domain/), da para conferir pelo efeito dela: quem manda
 * beber e `drink`, quem equipa e `equip`. `play` cancela qualquer coisa.
 */
function canCancel(draft, what, target){
    if(what === Negatable.play || what === undefined) return true;
    const entry = getCardEffects(target.idCard);
    const has = action => Boolean(firstAction(entry, action));
    switch(what){
        case Negatable.drink:       return has(Action.drink);
        case Negatable.equipment:   return has(Action.equip);
        case Negatable.missionSwap: return has(Action.missionSwap) || has(Action.missionRotate)
                                        || has(Action.missionTake) || has(Action.missionChain);
        case Negatable.nonShotPlay: return !has(Action.drink);
        // `divine` e `effectCard` sao tipo de carta, nao efeito: sem o catalogo
        // por perto, cancelam igual. Refinar exige o `type` de o_jogo.cards.
        default:                    return true;
    }
}

function runResolution(draft, now){
    const { item, choices } = draft.resolution;
    const entry = getCardEffects(item.idCard);

    const result = runEffects(draft, entry, {
        sourceId: item.byId,
        playedById: item.respondsToPlayerId ?? null,
        idCard: item.idCard,
        choices,
        previous: [],
        slot: '',
        seedRef: draft,   // o sorteio de alvo avanca a semente da partida
        copyOf: item.copyOf ?? null,
    });

    if(result.needs){
        draft.phase = Phase.pending;
        draft.pending = [{ ...result.needs, idCard: item.idCard, uid: item.uid }];
        return;
    }

    draft.resolution = null;
    draft.pending = [];
    discardPlayed(draft, item);
    finishTurnStep(draft, now);
}

function discardPlayed(draft, item){
    const owner = playerById(draft, item.byId);
    if(!owner) return;
    // Equipamento fica na mesa: quem o tira e equipment.destroy.
    const entry = getCardEffects(item.idCard);
    if(firstAction(entry, Action.equip)) return;
    toDiscard(draft, owner, item.idCard);
}

/**
 * Depois de resolver um item: se ainda ha pilha, a mesa ganha nova janela sobre
 * o novo topo. Se nao, o turno vai para `end` — ou volta para `play`, quando a
 * carta deu jogada extra.
 */
function finishTurnStep(draft, now){
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
 * Passa a vez. Consome `skipTurns`: quem esta pulando perde o turno e o
 * contador cai — o pulo e do jogador, nao da cadeira, entao inverter a mesa no
 * meio nao devolve o turno perdido.
 */
function advanceTurn(draft, now){
    expireOngoing(draft);

    const size = draft.order.length;
    for(let step = 1; step <= size * 2; step++){
        const index = ((draft.turnIndex + step * draft.direction) % size + size) % size;
        const player = playerById(draft, draft.order[index]);
        if(!player || player.out) continue;
        if(player.skipTurns > 0){
            player.skipTurns--;
            draft.log.push({ turn: draft.turnCount, type: 'turn.skipped', playerId: player.id });
            continue;
        }
        draft.turnIndex = index;
        break;
    }

    draft.turnCount++;
    draft.playsLeft = PLAYS_PER_TURN;
    draft.phase = Phase.draw;

    if(draft.endsInTurns !== null){
        draft.endsInTurns--;
        if(draft.endsInTurns <= 0) return endMatch(draft);
    }
    applyTurnEffects(draft, now);
    checkEndConditions(draft);
}

/** Efeitos prolongados que disparam na virada: eachTurn, onTargetTurn, delayed. */
function applyTurnEffects(draft, now){
    const player = currentPlayer(draft);
    if(!player) return;

    for(const ongoing of [...draft.ongoing]){
        const hits = ongoing.timing === Timing.eachTurn
            || (ongoing.timing === Timing.onTargetTurn && ongoing.targets.includes(player.id))
            || (ongoing.timing === Timing.delayed && ongoing.turnsLeft === 0);
        if(!hits) continue;

        // Roda o efeito como imediato: o `timing` ja cumpriu o papel dele, que
        // era adiar ate aqui. Sem isso, o efeito se reagendaria para sempre.
        runEffects(draft, { effects: [{ ...ongoing.effect, timing: Timing.immediate }] }, {
            sourceId: ongoing.sourceId,
            idCard: ongoing.idCard,
            choices: { 0: ongoing.targets },
            previous: ongoing.targets,
            slot: '',
            seedRef: draft,
        });
        if(ongoing.timing === Timing.delayed){
            draft.ongoing = draft.ongoing.filter(other => other !== ongoing);
        }
    }
}

/** Vence a contagem das duracoes e limpa o que acabou. */
function expireOngoing(draft){
    const surviving = [];
    for(const ongoing of draft.ongoing){
        if(ongoing.turnsLeft !== null && ongoing.turnsLeft !== undefined){
            ongoing.turnsLeft--;
            if(ongoing.turnsLeft < 0){
                releaseOngoing(draft, ongoing);
                continue;
            }
        }
        if(ongoing.drinksLeft !== null && ongoing.drinksLeft !== undefined && ongoing.drinksLeft <= 0){
            releaseOngoing(draft, ongoing);
            continue;
        }
        surviving.push(ongoing);
    }
    draft.ongoing = surviving;
}

// Alguns efeitos deixam contador ligado no jogador; ao expirar, e preciso
// desligar. Hoje so shots.ignore faz isso — mas o esquecimento dele seria um
// bug silencioso de apuracao, que e o pior tipo que este jogo pode ter.
function releaseOngoing(draft, ongoing){
    if(ongoing.effect?.action !== Action.shotsIgnore) return;
    for(const id of ongoing.targets){
        const player = playerById(draft, id);
        if(player && player.ignoringShots > 0) player.ignoringShots--;
    }
}

function checkEndConditions(draft){
    for(const condition of draft.endWhen ?? []){
        const reached = draft.players.some(player => {
            if(condition.shots === undefined) return false;
            const { gte, lte } = condition.shots;
            return (gte === undefined || player.shots >= gte)
                && (lte === undefined || player.shots <= lte);
        });
        if(reached) return endMatch(draft);
    }
    // Mesa sem carta na mao tambem acaba: sem isso a partida fica em loop de
    // turnos vazios.
    const anyCards = draft.players.some(p => !p.out && (p.hand.length || p.deck.length));
    if(!anyCards) endMatch(draft);
}

/**
 * Fecho de cada comando: baralho que acabou encerra a partida.
 *
 * Vem depois da resolucao, e nao dentro da compra, para a carta em curso ainda
 * fazer efeito — quem esvaziou o baralho comprando ainda joga a carta que
 * comprou.
 */
function settle(draft){
    if(draft.deckEmptied !== undefined
        && draft.deckEmptied !== null
        && draft.status === MatchStatus.progress
        && draft.phase !== Phase.window
        && draft.phase !== Phase.pending){
        endMatch(draft);
    }
    return draft;
}

// ------------------------------------------------------------------ fim

/**
 * Encerra. Se algum Sjehnsens ainda nao apontou quem e quem, a partida para em
 * `guessing`: a missao dele *e* o palpite, entao apurar antes seria dar como
 * errado um palpite que ninguem deixou fazer.
 */
function endMatch(draft){
    const needsGuess = draft.players.some(player =>
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

function finalize(draft){
    const { winners, byPlayer } = evaluateMissions(draft);

    // Destino ligado (link.fate): ganham ou perdem juntos. Roda depois da
    // apuracao porque e um ajuste sobre o resultado, nao uma missao.
    const final = new Set(winners);
    for(const link of draft.links ?? []){
        if(link.kind !== 'fate') continue;
        if(link.between.some(id => final.has(id))) link.between.forEach(id => final.add(id));
    }

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
    draft.log.push({ turn: draft.turnCount, type: 'match.end', winners: draft.winners });
}

// --------------------------------------------------------------- comandos

/**
 * Aplica um comando e devolve o estado novo.
 *
 * @param {object} state
 * @param {object} command  { type, playerId, idCard, choices, value, now }
 * @param {number} [command.now] instante em ms; a janela de interferencia
 *        precisa de relogio, e recebe-lo em vez de chamar Date.now() e o que
 *        mantem esta camada pura e testavel.
 * @returns {object} estado novo
 */
export function apply(state, command){
    const draft = cloneState(state);
    const now = command.now ?? 0;

    if(draft.status === MatchStatus.finished && command.type !== Command.guess){
        fail('partida encerrada');
    }

    switch(command.type){
        case Command.draw: {
            if(draft.phase !== Phase.draw) fail('nao e a fase de compra');
            const player = currentPlayer(draft);
            if(command.playerId !== player.id) fail('nao e a sua vez');
            runEffects(draft, { effects: [{ action: Action.handDraw, target: { kind: 'self' }, amount: 1 }] },
                { sourceId: player.id, choices: {}, slot: '', seedRef: draft });
            draft.phase = Phase.play;
            break;
        }

        case Command.play: {
            if(draft.phase !== Phase.play) fail('nao e a fase de jogada');
            const player = currentPlayer(draft);
            if(command.playerId !== player.id) fail('nao e a sua vez');
            if(!player.hand.includes(command.idCard)) fail('carta nao esta na mao');
            if(draft.playsLeft <= 0) fail('sem jogadas neste turno');

            player.hand.splice(player.hand.indexOf(command.idCard), 1);
            draft.playsLeft--;
            draft.stack.push(makeItem(draft, command));
            openWindow(draft, now);
            break;
        }

        // Fora da vez. So carta de reacao entra, e so enquanto a janela do
        // topo esta aberta — o resto do tempo a pilha esta resolvendo.
        case Command.react: {
            if(draft.phase !== Phase.window) fail('a janela nao esta aberta');
            const player = playerById(draft, command.playerId);
            if(!player || player.out) fail('jogador fora da mesa');
            if(!player.hand.includes(command.idCard)) fail('carta nao esta na mao');
            if(!isReaction(command.idCard)) fail('esta carta nao reage fora da vez');

            const top = draft.stack[draft.stack.length - 1];
            if(top?.byId === command.playerId) fail('nao se reage a propria jogada');

            player.hand.splice(player.hand.indexOf(command.idCard), 1);
            draft.stack.push(makeItem(draft, command, top));
            openWindow(draft, now);
            break;
        }

        case Command.pass: {
            if(draft.phase !== Phase.window) fail('a janela nao esta aberta');
            if(!pendingResponders(draft).includes(command.playerId)) fail('voce nao tem o que passar');
            draft.window.passed.push(command.playerId);
            if(pendingResponders(draft).length === 0) beginResolution(draft, now);
            break;
        }

        // O relogio da mesa. Fecha a janela vencida; fora dela, nao faz nada —
        // chamar tick a toda hora tem que ser barato e inofensivo.
        case Command.tick: {
            if(draft.phase === Phase.window && now >= draft.window.closesAt){
                beginResolution(draft, now);
            }
            break;
        }

        case Command.answer: {
            if(draft.phase !== Phase.pending || !draft.resolution) fail('nada esperando resposta');
            const request = draft.pending[0];
            if(request.chooserId !== undefined && request.chooserId !== command.playerId){
                fail('a escolha nao e sua');
            }
            const choices = keyFor(draft.resolution.choices, request, command.playerId, command.value);

            // Refaz a resolucao inteira sobre o snapshot, agora com a resposta.
            // Determinismo vem da semente: o mesmo sorteio sai igual.
            const restored = cloneState(draft.resolution.snapshot);
            restored.resolution = { ...draft.resolution, choices, snapshot: draft.resolution.snapshot };
            runResolution(restored, now);
            return settle(restored);
        }

        // O palpite do Sjehnsens. Aceito ate a apuracao, e so depois dela a
        // partida fecha de verdade.
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

let uidCounter = 0;

function makeItem(draft, command, respondsTo){
    uidCounter++;
    return {
        uid: `${draft.turnCount}:${uidCounter}`,
        idCard: command.idCard,
        byId: command.playerId,
        choices: command.choices ?? {},
        respondsTo: respondsTo?.uid,
        respondsToPlayerId: respondsTo?.byId,
    };
}

/**
 * Onde a resposta entra em `choices`, conforme o tipo do pedido.
 *
 * `optIn` acumula por jogador em vez de sobrescrever: "todos podem beber" sao
 * varias respostas para o mesmo efeito, e a resolucao so segue quando a ultima
 * chegar.
 */
function keyFor(choices, request, playerId, value){
    switch(request.kind){
        case 'optIn': {
            const key = request.slot + ':optIn';
            return { ...choices, [key]: { ...(choices[key] ?? {}), [playerId]: value === true } };
        }
        case 'option': return { ...choices, [request.slot + ':option']: value };
        case 'cards':  return { ...choices, [request.slot + ':cards']: value };
        default:       return { ...choices, [request.slot]: value };  // alvo escolhido
    }
}

/** Conveniencia para a UI: o que este jogador pode fazer agora. */
export function legalCommands(state, playerId){
    if(state.status !== MatchStatus.progress) return [];
    const isTurn = currentPlayer(state)?.id === playerId;
    switch(state.phase){
        case Phase.draw:   return isTurn ? [Command.draw] : [];
        case Phase.play:   return isTurn ? [Command.play] : [];
        case Phase.window: return pendingResponders(state).includes(playerId)
            ? [Command.react, Command.pass] : [];
        case Phase.pending: return state.pending[0]?.chooserId === playerId ? [Command.answer] : [];
        case Phase.end:    return isTurn ? [Command.endTurn] : [];
        default:           return [];
    }
}
