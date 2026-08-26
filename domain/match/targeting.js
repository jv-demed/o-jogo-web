import { ConditionWho, TargetKind } from '../cards/vocabulary.js';
import { pick, sample } from './rng.js';
import { playerById, seatDistance } from './state.js';

/**
 * Traduz um `target` do catalogo na lista de jogadores que ele atinge.
 *
 * Divide os alvos em duas familias, e a divisao e a razao de este arquivo
 * existir separado do resolvedor:
 *
 *   - **automaticos** (self, all, random, relative, farthest, mission, rank,
 *     filter, played, equipped, sameTarget) — a mesa ja tem a informacao, o
 *     motor calcula sozinho;
 *   - **escolhidos** (choose, manual) — dependem de alguem apontar. Vem no
 *     comando de jogada, em `choices`, e aqui so sao *conferidos*. Confiar na
 *     escolha que chega do cliente seria abrir mao da unica validacao que
 *     importa: escolher tres quando a carta diz um, ou apontar quem ja saiu.
 *
 * Alvo sem ninguem nao e erro: "todos os Swarley" numa mesa de tres, onde a
 * missao nem foi sorteada, e simplesmente lista vazia — a carta resolve sem
 * efeito, exatamente como na mesa de verdade.
 */

const alive = state => state.players.filter(p => !p.out);

const asList = value => (Array.isArray(value) ? value : [value]);

/** Aplica `except: 'self' | { mission }` sobre uma lista de jogadores. */
function applyExcept(players, except, ctx){
    if(except === undefined) return players;
    if(except === 'self') return players.filter(p => p.id !== ctx.sourceId);
    const missions = new Set(asList(except.mission));
    return players.filter(p => !missions.has(p.mission));
}

// `where` do kind filter. Vocabulario minusculo de proposito: hoje so o
// catalogo usa `{ shots: { gte } }` (carta 82). Cresce quando uma carta pedir.
function matchesWhere(player, where){
    for(const [field, test] of Object.entries(where)){
        const value = player[field] ?? 0;
        if(typeof test === 'number'){
            if(value !== test) return false;
            continue;
        }
        if(test.gte !== undefined && !(value >= test.gte)) return false;
        if(test.lte !== undefined && !(value <= test.lte)) return false;
        if(test.gt  !== undefined && !(value >  test.gt))  return false;
        if(test.lt  !== undefined && !(value <  test.lt))  return false;
    }
    return true;
}

// Vizinhanca. `direction` conta a partir de quem jogou, na roda; `offset`
// negativo e o anterior. A direcao corrente da mesa (order.reverse) entra aqui:
// "o proximo jogador" muda de lado quando a mesa inverte.
function relative(state, target, ctx){
    const size = state.order.length;
    const from = state.order.indexOf(ctx.sourceId);
    if(from === -1) return [];

    const step = target.offset !== undefined
        ? Math.sign(target.offset) * state.direction
        : (target.direction === 'left' ? 1 : -1) * state.direction;
    const count = target.offset !== undefined ? Math.abs(target.offset) : (target.count ?? 1);

    const out = [];
    for(let i = 1; i <= count; i++){
        const index = ((from + step * i) % size + size) % size;
        const player = playerById(state, state.order[index]);
        if(player && !player.out && player.id !== ctx.sourceId) out.push(player);
    }
    // `offset` aponta um so — o de N casas adiante, nao os N do caminho.
    return target.offset !== undefined ? out.slice(-1) : out;
}

function ranked(state, target){
    const pool = alive(state);
    if(pool.length === 0) return [];
    const metric = target.by ?? 'shots';
    const order = target.order ?? 'desc';
    const sorted = [...pool].sort((a, b) => (order === 'desc'
        ? (b[metric] ?? 0) - (a[metric] ?? 0)
        : (a[metric] ?? 0) - (b[metric] ?? 0)));

    // Empate no corte leva todo mundo empatado: "quem mais bebeu" com dois em
    // 7 shots sao os dois. Cortar pelo indice escolheria um deles a esmo.
    const cut = sorted[Math.min(target.count ?? 1, sorted.length) - 1];
    const limit = cut[metric] ?? 0;
    return sorted
        .filter(p => (order === 'desc' ? (p[metric] ?? 0) >= limit : (p[metric] ?? 0) <= limit))
        .map(p => p.id);
}

function farthest(state, ctx){
    const pool = alive(state).filter(p => p.id !== ctx.sourceId);
    if(pool.length === 0) return [];
    const max = Math.max(...pool.map(p => seatDistance(state, ctx.sourceId, p.id)));
    return pool.filter(p => seatDistance(state, ctx.sourceId, p.id) === max).map(p => p.id);
}

/**
 * @param {object} state
 * @param {object} target   o `target`/`between` da carta
 * @param {object} ctx      { sourceId, playedById, equippedTo, previous, choices, slot, seedRef }
 * @returns {{ ids: number[] } | { needs: object }}
 *          `needs` quer dizer "falta alguem escolher" — o motor abre um pending
 *          com esse objeto e a resolucao espera.
 */
export function resolveTarget(state, target, ctx){
    if(!target) return { ids: [] };

    switch(target.kind){
        case TargetKind.self:
            return { ids: [ctx.sourceId] };

        case TargetKind.all:
            return { ids: applyExcept(alive(state), target.except, ctx).map(p => p.id) };

        case TargetKind.random: {
            const pool = applyExcept(alive(state), target.except, ctx).map(p => p.id);
            const count = target.count ?? 1;
            if(count === 1){
                const { seed, item } = pick(ctx.seedRef.seed, pool);
                ctx.seedRef.seed = seed;
                return { ids: item === null ? [] : [item] };
            }
            const { seed, items } = sample(ctx.seedRef.seed, pool, count);
            ctx.seedRef.seed = seed;
            return { ids: items };
        }

        case TargetKind.relative:
            return { ids: relative(state, target, ctx).map(p => p.id) };

        case TargetKind.farthest:
            return { ids: farthest(state, ctx) };

        case TargetKind.mission: {
            const missions = new Set(asList(target.mission));
            return { ids: alive(state).filter(p => missions.has(p.mission)).map(p => p.id) };
        }

        case TargetKind.rank:
            return { ids: ranked(state, target) };

        case TargetKind.filter:
            return { ids: alive(state).filter(p => matchesWhere(p, target.where)).map(p => p.id) };

        case TargetKind.played:
            return { ids: ctx.playedById ? [ctx.playedById] : [] };

        case TargetKind.equipped:
            return { ids: ctx.equippedTo ? [ctx.equippedTo] : [] };

        case TargetKind.sameTarget:
            return { ids: [...(ctx.previous ?? [])] };

        case TargetKind.choose:
        case TargetKind.manual:
            return checkChoice(state, target, ctx);

        default:
            return { ids: [] };
    }
}

/**
 * Confere a escolha que chegou junto do comando. Quem escolhe e, por padrao,
 * quem jogou a carta; `by: 'target'` passa a escolha para o alvo (carta 9: o
 * Swarley bebe e *ele* escolhe quem bebe junto).
 */
function checkChoice(state, target, ctx){
    const chooser = target.by === 'target'
        ? (ctx.previous?.[0] ?? ctx.sourceId)
        : ctx.sourceId;

    const offered = ctx.choices?.[ctx.slot];
    if(offered === undefined){
        return { needs: {
            kind: target.kind,
            slot: ctx.slot,
            chooserId: chooser,
            count: Math.min(target.count ?? 1,
                applyExcept(alive(state), target.except, ctx).length),
            candidates: applyExcept(alive(state), target.except, ctx).map(p => p.id),
            upTo: target.upTo === true,
            description: target.description,
        } };
    }

    const ids = asList(offered);
    const legal = new Set(applyExcept(alive(state), target.except, ctx).map(p => p.id));
    // "Escolha 3 jogadores" numa mesa de 3 e a mesa inteira, nao jogada
    // ilegal: o numero da carta foi escrito pensando na mesa cheia.
    const count = Math.min(target.count ?? 1, legal.size);

    if(ids.some(id => !legal.has(id))) throw new Error('alvo ilegal na escolha');
    if(new Set(ids).size !== ids.length) throw new Error('alvo repetido na escolha');
    if(target.upTo === true ? ids.length > count : ids.length !== count){
        throw new Error('escolha invalida: esperado ' + (target.upTo ? 'ate ' : '') + count + ' alvo(s)');
    }
    return { ids };
}

/** Avalia o `if` de um efeito. Pergunta sobre o alvo, salvo `who` dizer outro. */
export function meetsCondition(state, condition, ids, ctx){
    if(!condition) return true;

    const who = condition.who ?? ConditionWho.target;
    const subjects = who === ConditionWho.self
        ? [ctx.sourceId]
        : who === ConditionWho.selfOrTarget
            ? [ctx.sourceId, ...ids]
            : ids;

    const players = subjects.map(id => playerById(state, id)).filter(Boolean);
    if(players.length === 0) return false;

    const holds = player => {
        if(condition.mission !== undefined){
            const missions = new Set(asList(condition.mission));
            if(!missions.has(player.mission)) return false;
        }
        if(condition.shots !== undefined && !matchesWhere(player, { shots: condition.shots })) return false;
        // `holds`: ter a carta X em mao ou equipada. E o caso da 105 (Gladsxodia).
        if(condition.holds !== undefined){
            const wanted = asList(condition.holds);
            const owned = [...player.hand, ...player.equipment.map(e => e.idCard)];
            if(!wanted.every(id => owned.includes(id))) return false;
        }
        return true;
    };

    const result = who === ConditionWho.selfOrTarget
        ? players.some(holds)
        : players.every(holds);

    return condition.not === true ? !result : result;
}
