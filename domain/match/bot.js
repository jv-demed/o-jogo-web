import { Action, Negatable, Timing } from '../cards/vocabulary.js';
import { getCardEffects } from '../cards/effects/index.js';
import { ALL_MISSIONS } from './missions.js';
import { Command, isReaction } from './engine.js';
import { MatchStatus, Phase, currentPlayer, playerById } from './state.js';

/**
 * O jogador automatico.
 *
 * Existe para o modo solo: da para testar a partida inteira sem juntar cinco
 * pessoas numa sala. Nao e adversario esperto, e nem tenta ser — ele nao olha
 * missao (nao teria como: missao e secreta) nem planeja turno. O que ele faz e
 * jogar *sempre* e jogar *legal*, que e o que um teste precisa.
 *
 * Puro como o resto de domain/match/: recebe estado e devolve comando. Quem
 * decide *quando* chamar — e com quanto atraso, para a mesa conseguir
 * acompanhar — e a camada de cima.
 *
 * A politica, em uma linha cada:
 *   - guarda carta de reacao para a janela, em vez de queimar na propria vez;
 *   - so reage quando a carta na pilha ia fazer ele beber, e quando tem com que
 *     cancelar;
 *   - escolhendo alvo, mira quem tem menos shots — sem saber as missoes, o
 *     unico palpite razoavel e "espalhar", que atrapalha tanto o Sauzburg
 *     quanto o Swarley;
 *   - palpite do Sjehnsens: usa o que espiou, e chuta o resto sem repetir.
 */

const effectsOf = idCard => getCardEffects(idCard)?.effects ?? [];

const hasAction = (idCard, action) => effectsOf(idCard).some(effect => effect.action === action);

/** Cartas que o bot prefere segurar: valem mais na janela do que na propria vez. */
const isDefensive = idCard =>
    effectsOf(idCard).some(effect => effect.timing === Timing.reaction);

/**
 * A carta na pilha ia me fazer beber?
 *
 * Onde a jogada declarou alvo (`item.targets`, escolhido antes da janela abrir),
 * nao ha o que adivinhar: a carta ameaca quem ela aponta, e mais ninguem. O
 * resto continua leitura grosseira do alvo *escrito* na carta, e nao do
 * resolvido — `all` e `random` contam como ameaca porque ainda nao sortearam.
 */
function threatensMe(state, item, playerId){
    if(!item || item.byId === playerId) return false;
    return effectsOf(item.idCard).some(effect => {
        if(effect.action !== Action.drink && effect.action !== Action.shotsAdd) return false;
        const kind = effect.target?.kind;
        if(kind === 'self') return false;
        if(kind === 'choose' || kind === 'manual'){
            // Sem alvo declarado ainda, na duvida vale gastar a defesa.
            return item.targets?.length ? item.targets.includes(playerId) : true;
        }
        if(kind === 'all') return effect.target.except !== 'self' || item.byId !== playerId;
        return true;
    });
}

/** Uma carta na mao que cancela ou desvia o que esta na pilha. */
function findAnswer(player){
    return player.hand.find(idCard => {
        if(!isReaction(idCard)) return false;
        return effectsOf(idCard).some(effect =>
            (effect.action === Action.negate || effect.action === Action.redirect)
            && (effect.what === Negatable.play || effect.what === Negatable.drink));
    }) ?? null;
}

/**
 * Qual carta jogar na propria vez. Deixa as de reacao por ultimo, e entre as
 * outras prefere a que faz alguem beber — e o unico jeito de a partida andar
 * para algum lugar em vez de virar troca de missao infinita.
 */
function pickCard(player){
    const playable = player.hand.filter(idCard => !isDefensive(idCard));
    const pool = playable.length ? playable : player.hand;
    return pool.find(idCard => hasAction(idCard, Action.drink)) ?? pool[0] ?? null;
}

/** Alvos preferidos: quem bebeu menos, e nunca ele mesmo se der para evitar. */
function preferredTargets(state, request, playerId){
    const pool = (request.candidates ?? state.players.map(p => p.id))
        .filter(id => {
            const player = playerById(state, id);
            return player && !player.out;
        });
    const others = pool.filter(id => id !== playerId);
    const ranked = [...(others.length ? others : pool)].sort((a, b) =>
        (playerById(state, a).shots ?? 0) - (playerById(state, b).shots ?? 0));
    const count = request.upTo ? Math.min(1, request.count) : request.count;
    return ranked.slice(0, count);
}

/** O palpite do Sjehnsens: o que ele espiou, mais um chute sem repetir. */
function buildGuess(state, player){
    const guesses = { ...player.knownMissions };
    const usadas = new Set([player.mission, ...Object.values(guesses)]);
    const sobrando = ALL_MISSIONS.filter(mission => !usadas.has(mission));

    for(const other of state.players){
        if(other.id === player.id || guesses[other.id]) continue;
        guesses[other.id] = other.missionRevealed ? other.mission : (sobrando.shift() ?? ALL_MISSIONS[0]);
    }
    return guesses;
}

/**
 * O que este bot faria agora. `null` quer dizer "nao e comigo" — a mesa esta
 * esperando outra pessoa, e quem chama nao precisa saber quem.
 *
 * @param {object} state
 * @param {number} playerId
 * @param {number} now  instante em ms, o mesmo relogio que a janela usa
 * @returns {object|null} comando pronto para `apply`
 */
export function botCommand(state, playerId, now = 0){
    const player = playerById(state, playerId);
    if(!player || player.out) return null;

    // Fila de shots aberta: quem deve, bebe na hora — a confirmacao existe para
    // o shot de verdade, e do outro lado da mesa de teste nao ha ninguem para
    // beber. Quem nao deve nao faz nada, porque a mesa inteira esta parada.
    if(state.drinks?.length){
        return state.drinks.some(entry => entry.playerId === playerId)
            ? { type: Command.drank, playerId, now }
            : null;
    }

    if(state.status === MatchStatus.guessing){
        return player.mission === 'sjehnsens'
            ? { type: Command.guess, playerId, value: buildGuess(state, player), now }
            : null;
    }
    if(state.status !== MatchStatus.progress) return null;

    const isTurn = currentPlayer(state)?.id === playerId;

    switch(state.phase){
        case Phase.draw:
            return isTurn ? { type: Command.draw, playerId, now } : null;

        case Phase.play: {
            if(!isTurn) return null;
            const idCard = pickCard(player);
            return idCard === null ? null : { type: Command.play, playerId, idCard, now };
        }

        case Phase.window: {
            const canRespond = !state.window?.passed.includes(playerId)
                && state.stack[state.stack.length - 1]?.byId !== playerId;
            if(!canRespond) return null;

            const top = state.stack[state.stack.length - 1];
            if(threatensMe(state, top, playerId)){
                const idCard = findAnswer(player);
                if(idCard) return { type: Command.react, playerId, idCard, now };
            }
            return { type: Command.pass, playerId, now };
        }

        case Phase.pending: {
            const request = state.pending[0];
            if(!request || request.chooserId !== playerId) return null;
            return { type: Command.answer, playerId, value: answerFor(state, request, playerId), now };
        }

        case Phase.end:
            return isTurn ? { type: Command.endTurn, playerId, now } : null;

        default:
            return null;
    }
}

function answerFor(state, request, playerId){
    switch(request.kind){
        // "Pode beber, se quiser": o bot nunca quer.
        case 'optIn':  return false;
        case 'option': return 0;
        case 'cards':  return [];
        default:       return preferredTargets(state, request, playerId);
    }
}
