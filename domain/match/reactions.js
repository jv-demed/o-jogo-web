import { Action, Negatable, Timing } from '../cards/vocabulary.js';
import { getCardEffects } from '../cards/effects/index.js';
import { CardKind, cardKind } from '../cards/types.js';
import { playTargetsOf } from './targeting.js';

/**
 * O que cada carta de reacao combate, e contra o que ela pode entrar.
 *
 * Mora fora do engine.js porque o resolvedor tambem pergunta (a 33 nao copia
 * reacao), e o resolvedor nao pode importar o motor.
 *
 * As regras, decididas:
 *   - defesa so entra na janela, contra o que ela combate;
 *   - negar ou desviar shot (11, 59, 60, 23, 90) mexe so no shot;
 *   - anular a carta inteira (26, 36, 49, 67, 105) — "contra voce" quer dizer
 *     que os alvos da jogada incluem voce, declarado, automatico ou por missao;
 *     alvo sorteado conta como possivel.
 */

/** Uma carta so entra fora da vez se algum efeito dela reage. */
export function isReaction(idCard){
    const entry = getCardEffects(idCard);
    return Boolean(entry?.effects?.some(effect => effect.timing === Timing.reaction));
}

const firstAction = (entry, action) =>
    entry?.effects?.find(effect => effect.action === action) ?? null;

/** O que a carta de defesa combate (`negate`/`redirect`), ou null. */
export const cancelOf = idCard => {
    const entry = getCardEffects(idCard);
    return firstAction(entry, Action.negate) ?? firstAction(entry, Action.redirect);
};

/**
 * Os efeitos que contam numa jogada. Equipamento conta so o `equip`: o que vem
 * depois e o que ele faz na cadeira, depois, e nao o que a jogada faz agora.
 */
export function playEffects(idCard){
    const effects = getCardEffects(idCard)?.effects ?? [];
    return effects[0]?.action === Action.equip ? [effects[0]] : effects;
}

/** As acoes de uma carta, inclusive dentro de escolha e de "se... entao". */
export function actionsOf(idCard){
    const actions = new Set();
    const walk = effects => {
        for(const effect of [effects ?? []].flat()){
            if(!effect) continue;
            actions.add(effect.action);
            walk(effect.options);
            walk(effect.then);
            walk(effect.otherwise);
        }
    };
    walk(playEffects(idCard));
    return actions;
}

const SWAPS = [Action.missionSwap, Action.missionRotate, Action.missionChain];

// Acoes que mexem num jogador e por isso podem ser "contra" ele. Pular, trocar,
// descartar, espiar: tudo o que a mesa sentiria como jogada contra voce.
const AGAINST = new Set(Object.values(Action).filter(action => ![
    Action.negate, Action.redirect, Action.choice, Action.manual, Action.orderReverse,
    Action.gameEndIn, Action.gameEndWhen, Action.auraDispel, Action.copy,
].includes(action)));

/**
 * Quem a jogada pode atingir. `ids` sao os alvos certos; `random` diz que ha
 * alvo ainda nao sorteado (e ai qualquer um e possivel).
 */
export function reach(state, item, { only } = {}){
    const ids = new Set();
    let random = false;
    for(const entry of playTargetsOf(state, item, playEffects(item.idCard))){
        if(only && !only(entry.action)) continue;
        if(!AGAINST.has(entry.action)) continue;
        if(entry.random) random = true;
        for(const id of entry.ids) ids.add(id);
    }
    return { ids, random };
}

const mayHit = (reached, playerId) => reached.random || reached.ids.has(playerId);

/**
 * Os alvos da jogada que a mesa ve na janela, para a 101 somar 1 em cada:
 * declarados, todos, vizinhos, proximo, anterior, mais distante, ranking,
 * filtro. Nada por missao nem sorteado.
 */
export function publicTargets(state, item){
    const entries = playTargetsOf(state, item, playEffects(item.idCard))
        .filter(entry => AGAINST.has(entry.action));
    if(entries.some(entry => entry.random)) return [];
    const ids = new Set();
    for(const entry of entries){
        if(!entry.public) continue;
        for(const id of entry.ids) ids.add(id);
    }
    return [...ids];
}

/**
 * Esta reacao serve contra o topo da pilha, para este jogador?
 *
 * A conta por carta, e nao por efeito, porque o que separa a 11 da 60 nao e o
 * verbo (as duas negam shot), e de quem e o shot.
 */
export function fitsAgainst(state, playerId, idCard, top){
    const cancels = cancelOf(idCard);
    const actions = actionsOf(top.idCard);
    const has = action => actions.has(action);
    const drinkReach = () => reach(state, top, { only: action => action === Action.drink });

    switch(idCard){
        // 69 entra antes da jogada, nao contra uma carta: ver engine.js.
        case 69: return false;
        // 101: soma 1 em cada alvo publico da jogada.
        case 101: return publicTargets(state, top).length > 0;
        // 105: so contra jogada que atinge outro jogador, e nao voce.
        case 105: {
            const reached = reach(state, top);
            if(reached.random) return false;
            const others = [...reached.ids].filter(id => id !== top.byId);
            return others.length > 0 && !reached.ids.has(playerId);
        }
        default:
    }
    if(!cancels) return true;

    switch(cancels.what){
        case Negatable.drink:
            if(!has(Action.drink)) return false;
            // 60 bloqueia o shot de qualquer jogador; 90 devolve a carta de shot
            // jogada contra voce ou outro. As outras protegem o seu shot.
            if(idCard === 60 || cancels.action === Action.redirect && cancels.target?.kind === 'played') return true;
            return mayHit(drinkReach(), playerId);
        case Negatable.equipment:
            return has(Action.equip);
        case Negatable.missionSwap:
            // `missionTake` (64) copia o objetivo, ninguem perde a sua: nao e troca.
            return SWAPS.some(has);
        case Negatable.nonShotPlay:
            return !has(Action.drink) && mayHit(reach(state, top), playerId);
        case Negatable.effectCard:
            return cardKind(top.idCard) === CardKind.effect && mayHit(reach(state, top), playerId);
        case Negatable.divine:
            return cardKind(top.idCard) === CardKind.divine && mayHit(reach(state, top), playerId);
        case Negatable.play:
        default:
            return true;
    }
}

/** Defesa que mexe so no shot: pendura um escudo na jogada, em vez de cancela-la. */
export const isShotShield = idCard => {
    const cancels = cancelOf(idCard);
    return Boolean(cancels) && cancels.what === Negatable.drink;
};
