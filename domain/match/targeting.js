import { ConditionWho, TargetKind } from '../cards/vocabulary.js';
import { ALL_MISSIONS } from './missions.js';
import { effectiveShots, isImmune, isPrisoner } from './marks.js';
import { pick, sample } from './rng.js';
import { playerById, seatDistance } from './state.js';

/**
 * Traduz um `target` do catalogo na lista de jogadores que ele atinge.
 *
 * Divide os alvos em duas familias, e a divisao e a razao de este arquivo
 * existir separado do resolvedor:
 *
 *   - **automaticos** (self, all, random, relative, farthest, mission, rank,
 *     filter, played, equipped, sameTarget, playTargets) — a mesa ja tem a
 *     informacao, o motor calcula sozinho;
 *   - **escolhidos** (choose, manual, missionPick, race) — dependem de alguem
 *     apontar. Vem no comando, em `choices`, e aqui so sao *conferidos*.
 *
 * Quem esta imune (carta 84) nao entra em alvo nenhum que se escolhe ou que
 * varre a mesa: nem escolha, nem todos, nem missao, nem sorteio. So o que ja
 * estava nele continua (`sameTarget`, `equipped`, o proprio `self`).
 *
 * Alvo sem ninguem nao e erro: "todos os Swarley" numa mesa de tres, onde a
 * missao nem foi sorteada, e simplesmente lista vazia.
 */

const alive = state => state.players.filter(p => !p.out && !isImmune(state, p.id));

const asList = value => (Array.isArray(value) ? value : [value]);

/** Quem escolhe este alvo: quem jogou, ou o alvo anterior com `by: 'target'`. */
const chooserOf = (target, ctx) => (target.by === 'target'
    ? (ctx.previous?.[0] ?? ctx.sourceId)
    : ctx.sourceId);

/**
 * `except: 'self' | 'previous' | { mission }`.
 *
 * "Outro" no texto exclui quem escolhe — na 76 o segundo a escolher e o alvo,
 * e e ele que nao pode se apontar. `previous` tira quem a carta ja apontou
 * (na 13, o segundo e diferente do primeiro).
 */
function applyExcept(players, except, ctx, chooserId = ctx.sourceId){
    if(except === undefined) return players;
    if(except === 'self') return players.filter(p => p.id !== chooserId);
    if(except === 'previous') return players.filter(p => !(ctx.previous ?? []).includes(p.id));
    const missions = new Set(asList(except.mission));
    return players.filter(p => !missions.has(p.mission));
}

function fieldOf(state, player, field){
    if(field === 'shots') return effectiveShots(state, player);
    const value = player[field];
    return Array.isArray(value) ? value.length : (value ?? 0);
}

// `where` do kind filter (e do `choose`, para so oferecer quem tem o que a
// carta pede — a 80 so tira equipamento de quem tem um).
function matchesWhere(state, player, where){
    for(const [field, test] of Object.entries(where ?? {})){
        const value = fieldOf(state, player, field);
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

/** Vai perder a proxima vez: pulo marcado, preso. "O proximo a jogar" passa por cima dele. */
const losesNextTurn = (state, player) => (player.skipTurns ?? 0) > 0 || isPrisoner(state, player.id);

// Vizinhanca. `offset` (proximo, anterior) segue a direcao corrente da mesa:
// "o proximo jogador" muda de lado quando a ordem inverte. `direction` e a
// esquerda da cadeira, fixa — a 54 inverte quem joga depois, nao onde fica a
// esquerda de ninguem.
function relative(state, target, ctx){
    const size = state.order.length;
    const from = state.order.indexOf(ctx.sourceId);
    if(from === -1) return [];

    const step = target.offset !== undefined
        ? Math.sign(target.offset) * state.direction
        : (target.direction === 'left' ? 1 : -1);
    const count = target.offset !== undefined ? Math.abs(target.offset) : (target.count ?? 1);

    const out = [];
    for(let i = 1; i < size && out.length < count; i++){
        const index = ((from + step * i) % size + size) % size;
        const player = playerById(state, state.order[index]);
        if(!player || player.out || player.id === ctx.sourceId) continue;
        if(isImmune(state, player.id)) continue;
        // "O proximo *a jogar*": quem vai perder a vez nao e o proximo.
        if(target.toPlay && losesNextTurn(state, player)) continue;
        out.push(player);
        if(target.offset === undefined && out.length >= count) break;
    }
    return out.slice(0, count);
}

function ranked(state, target){
    const pool = alive(state);
    if(pool.length === 0) return [];
    const metric = target.by ?? 'shots';
    const order = target.order ?? 'desc';
    const read = p => fieldOf(state, p, metric);
    const sorted = [...pool].sort((a, b) => (order === 'desc' ? read(b) - read(a) : read(a) - read(b)));

    // Empate no corte leva todo mundo empatado: "quem mais deu shots" com dois
    // em 7 sao os dois.
    const cut = sorted[Math.min(target.count ?? 1, sorted.length) - 1];
    const limit = read(cut);
    // Ninguem deu shot nenhum: nao ha "o maior", e a carta nao pega ninguem.
    if(order === 'desc' && limit === 0) return [];
    return sorted
        .filter(p => (order === 'desc' ? read(p) >= limit : read(p) <= limit))
        .map(p => p.id);
}

function farthest(state, ctx){
    const pool = alive(state).filter(p => p.id !== ctx.sourceId);
    if(pool.length === 0) return [];
    const max = Math.max(...pool.map(p => seatDistance(state, ctx.sourceId, p.id)));
    return pool.filter(p => seatDistance(state, ctx.sourceId, p.id) === max).map(p => p.id);
}

/** As missoes que estao na mesa agora, na ordem do catalogo (nao na dos assentos). */
export const missionsInPlay = state =>
    ALL_MISSIONS.filter(mission => state.players.some(p => !p.out && p.mission === mission));

/**
 * @param {object} state
 * @param {object} target   o `target`/`between` da carta
 * @param {object} ctx      { sourceId, playedById, equippedTo, previous, choices, slot, seedRef, playTargets }
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
            return { ids: alive(state).filter(p => matchesWhere(state, p, target.where)).map(p => p.id) };

        case TargetKind.played:
            return { ids: ctx.playedById ? [ctx.playedById] : [] };

        case TargetKind.equipped:
            return { ids: ctx.equippedTo ? [ctx.equippedTo] : [] };

        case TargetKind.sameTarget:
            return { ids: [...(ctx.previous ?? [])] };

        case TargetKind.playTargets:
            return { ids: [...(ctx.playTargets ?? [])] };

        case TargetKind.missionPick:
            return missionPick(state, target, ctx);

        case TargetKind.race:
            return race(state, ctx);

        case TargetKind.choose:
        case TargetKind.manual:
            return checkChoice(state, target, ctx);

        default:
            return { ids: [] };
    }
}

/**
 * A 74: quem jogou escolhe 3 das 7 missoes (pode cair em missao que ninguem
 * tem), e e publico — por isso a escolha e declarada antes da janela. Quem
 * tem as escolhidas bebe; quem jogou, se tiver uma delas, bebe so o dele.
 */
function missionPick(state, target, ctx){
    const key = ctx.slot + ':missions';
    const chosen = ctx.choices?.[key];
    const count = target.count ?? 1;
    if(chosen === undefined){
        return { needs: { kind: 'missions', slot: ctx.slot, chooserId: ctx.sourceId,
            options: [...ALL_MISSIONS], count, declare: true } };
    }
    const list = asList(chosen);
    if(list.length !== count || new Set(list).size !== list.length
        || list.some(m => !ALL_MISSIONS.includes(m))){
        throw new Error('escolha invalida: esperado ' + count + ' missao(oes) distintas');
    }
    const ids = applyExcept(alive(state), target.except, ctx)
        .filter(p => list.includes(p.mission)).map(p => p.id);
    return { ids };
}

/**
 * A corrida da 46: todo mundo menos quem jogou tem um botao, e o ultimo a tocar
 * bebe. A ordem e a de chegada dos comandos; quando so falta um, acabou.
 */
function race(state, ctx){
    const racers = alive(state).filter(p => p.id !== ctx.sourceId).map(p => p.id);
    const touched = ctx.choices?.[ctx.slot + ':race'] ?? [];
    const left = racers.filter(id => !touched.includes(id));
    if(left.length > 1){
        return { needs: { kind: 'race', slot: ctx.slot, racers, touched } };
    }
    return { ids: left };
}

/**
 * Confere a escolha que chegou junto do comando. Quem escolhe e, por padrao,
 * quem jogou a carta; `by: 'target'` passa a escolha para o alvo (carta 9: o
 * Swarley bebe e *ele* escolhe quem bebe junto).
 */
function checkChoice(state, target, ctx){
    const chooser = chooserOf(target, ctx);
    const pool = applyExcept(alive(state), target.except, ctx, chooser)
        .filter(p => !target.where || matchesWhere(state, p, target.where));

    const offered = ctx.choices?.[ctx.slot];
    if(offered === undefined){
        return { needs: {
            kind: target.kind,
            slot: ctx.slot,
            chooserId: chooser,
            count: Math.min(target.count ?? 1, pool.length),
            candidates: pool.map(p => p.id),
            upTo: target.upTo === true,
            description: target.description,
            // Alvo em segredo (99): nao e declarado, para nao aparecer na mesa.
            ...(target.secret ? { secret: true, declare: false } : {}),
        } };
    }

    const ids = asList(offered);
    const legal = new Set(pool.map(p => p.id));
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
            // "Se voce ou o jogador escolhido": o escolhido e o do efeito
            // anterior quando este mira quem jogou (24).
            ? [ctx.sourceId, ...(ctx.previous ?? []), ...ids]
            : ids;

    const players = subjects.map(id => playerById(state, id)).filter(Boolean);
    if(players.length === 0) return condition.not === true;

    const holds = player => {
        if(condition.mission !== undefined){
            const missions = new Set(asList(condition.mission));
            if(!missions.has(player.mission)) return false;
        }
        if(condition.shots !== undefined && !matchesWhere(state, player, { shots: condition.shots })) return false;
        if(condition.holds !== undefined){
            const wanted = asList(condition.holds);
            if(!wanted.every(id => player.hand.includes(id))) return false;
        }
        return true;
    };

    // `any`: basta um dos alvos (68: "se algum deles for o Smichaels").
    const result = who === ConditionWho.selfOrTarget || condition.any === true
        ? players.some(holds)
        : players.every(holds);

    return condition.not === true ? !result : result;
}

// ------------------------------------------------ alvos de uma jogada

// Alvo que a mesa ve durante a janela, sem precisar de missao nem de sorteio:
// e o que a 101 pode somar.
const PUBLIC_KINDS = new Set([
    TargetKind.choose, TargetKind.manual, TargetKind.relative, TargetKind.farthest,
    TargetKind.rank, TargetKind.filter, TargetKind.all,
]);

/**
 * Quem uma jogada na pilha pode atingir, efeito por efeito, sem resolver nada.
 *
 * E o que as reacoes perguntam: "contra voce" quer dizer que os alvos da jogada
 * incluem voce — declarado, automatico ou por missao (o motor sabe; so a sua
 * tela acende a carta). Alvo sorteado ainda nao saiu, entao conta como
 * possivel para todo mundo (`random`).
 *
 * @returns {{ action: string, ids: number[], random: boolean, public: boolean }[]}
 */
export function playTargetsOf(state, item, effects){
    const out = [];
    const choices = item.choices ?? {};
    const seedRef = { seed: state.seed ?? 0 };
    const ctx = slot => ({ sourceId: item.byId, playedById: item.respondsToPlayerId ?? null,
        choices, slot, seedRef: { ...seedRef }, previous: [], playTargets: [] });

    const walk = (effect, slot, previous) => {
        if(!effect) return;
        const spec = effect.between ?? effect.target;
        let ids = [];
        let isRandom = false;
        let isPublic = false;
        if(spec){
            switch(spec.kind){
                case TargetKind.random:
                case TargetKind.race:
                    isRandom = true;
                    break;
                case TargetKind.sameTarget:
                    ids = previous;
                    break;
                case TargetKind.choose:
                case TargetKind.manual: {
                    const chosen = choices[slot];
                    if(chosen === undefined) isRandom = true;
                    else ids = asList(chosen).filter(id => typeof id === 'number');
                    isPublic = chosen !== undefined && !spec.secret;
                    break;
                }
                case TargetKind.missionPick: {
                    const chosen = choices[slot + ':missions'];
                    if(chosen === undefined) isRandom = true;
                    else ids = state.players.filter(p => asList(chosen).includes(p.mission)).map(p => p.id);
                    break;
                }
                default: {
                    const resolved = resolveTarget(state, spec, { ...ctx(slot), previous });
                    ids = resolved.ids ?? [];
                    isPublic = PUBLIC_KINDS.has(spec.kind)
                        && !(spec.kind === TargetKind.all && spec.except?.mission !== undefined);
                }
            }
        }
        out.push({ action: effect.action, ids, random: isRandom, public: isPublic });
        walk(effect.then, slot + '.then', ids);
        walk(effect.otherwise, slot + '.else', previous);
        (effect.options ?? []).forEach((option, i) => walk(option, slot + '.' + i, ids));
    };
    (effects ?? []).forEach((effect, i) => walk(effect, String(i), []));
    return out;
}
