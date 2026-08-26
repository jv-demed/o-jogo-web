import {
    AMOUNT_KEYWORDS, Action, Chooser, ConditionWho, Direction, DurationKind,
    Goal, Metric, Mission, Negatable, Pile, Rounding, Scope, TargetKind, Timing,
} from './vocabulary.js';

const ACTIONS    = new Set(Object.values(Action));
const TIMINGS    = new Set(Object.values(Timing));
const KINDS      = new Set(Object.values(TargetKind));
const MISSIONS   = new Set(Object.values(Mission));
const DURATIONS  = new Set(Object.values(DurationKind));
const NEGATABLES = new Set(Object.values(Negatable));
const SCOPES     = new Set(Object.values(Scope));
const GOALS      = new Set(Object.values(Goal));
const CHOOSERS   = new Set(Object.values(Chooser));
const METRICS    = new Set(Object.values(Metric));
const WHOS       = new Set(Object.values(ConditionWho));
const PILES      = new Set(Object.values(Pile));
const ROUNDINGS  = new Set(Object.values(Rounding));
const DIRECTIONS = new Set(Object.values(Direction));
const KEYWORDS   = new Set(AMOUNT_KEYWORDS);

// Chaves aceitas num efeito. A lista existe para que um `targe:` ou um
// `duracao:` com typo vire erro, e nao um campo silenciosamente ignorado pelo
// resolvedor — que e exatamente a classe de bug que o JS solto deixa passar.
const EFFECT_KEYS = new Set([
    'action', 'target', 'between', 'amount', 'timing', 'duration', 'if',
    'otherwise', 'then', 'options', 'chooser', 'what', 'scope', 'mission',
    'goal', 'instruction', 'condition', 'direction', 'from', 'rounding',
    'chance', 'optional', 'upTo', 'blind', 'by', 'note',
]);

const TARGET_KEYS = new Set([
    'kind', 'count', 'upTo', 'except', 'mission', 'secret', 'direction',
    'offset', 'by', 'order', 'where', 'description', 'note',
]);

// Acoes que precisam saber em quem batem. As de fora (order.reverse,
// game.endIn, aura.dispel...) atingem a mesa inteira e nao levam `target`.
const NEEDS_TARGET = new Set([
    Action.drink, Action.shotsAdd, Action.shotsRemove, Action.shotsSet,
    Action.shotsHalve, Action.shotsIgnore, Action.turnSkip, Action.turnExtraPlay,
    Action.handDraw, Action.handDiscard, Action.handRedraw, Action.handSteal,
    Action.handGive, Action.handReveal, Action.deckPeek, Action.deckReturn,
    Action.missionPeek, Action.missionReveal, Action.missionTake,
    Action.missionLock, Action.equip, Action.gameWin, Action.gameLose,
]);

// Acoes sobre um par (ou grupo). Se `between` resolver um jogador so, quem
// jogou completa a dupla — e o caso do "troque de missao com ele".
const NEEDS_BETWEEN = new Set([
    Action.shotsSwap, Action.missionSwap, Action.missionRotate,
    Action.linkShots, Action.linkFate,
]);

// Acoes que resolvem e acabam. Duracao nelas e sinal de modelagem errada:
// "beba 1 shot" resolve e pronto. Ja as que criam estado (turn.skip,
// game.lose, mission.lock...) resolvem na hora e deixam uma marca que expira,
// entao levam duration mesmo com timing immediate.
const INSTANT = new Set([
    Action.drink, Action.shotsAdd, Action.shotsRemove, Action.shotsSet,
    Action.shotsHalve, Action.shotsSwap, Action.shotsTransfer,
    Action.handDraw, Action.handDiscard, Action.handRedraw, Action.handSteal,
    Action.handGive, Action.handReveal, Action.deckPeek, Action.deckReturn,
    Action.missionSwap, Action.missionRotate, Action.missionPeek,
    Action.missionReveal, Action.missionTake, Action.missionChain,
    Action.orderReverse, Action.orderRearrange,
    Action.equipmentDestroy, Action.equipmentTransfer, Action.auraDispel,
]);

const isPlainObject = v => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = v => Number.isInteger(v) && v > 0;
const asList = v => (Array.isArray(v) ? v : [v]);

function checkMissions(value, path, errors){
    const list = asList(value);
    if(list.length === 0) errors.push(path + ': lista vazia');
    for(const m of list){
        if(!MISSIONS.has(m)) errors.push(path + ': identidade desconhecida "' + m + '"');
    }
}

function checkKeys(obj, allowed, path, errors){
    for(const key of Object.keys(obj)){
        if(!allowed.has(key)) errors.push(path + ': chave desconhecida "' + key + '"');
    }
}

function validateAmount(amount, path, errors){
    if(typeof amount === 'number'){
        if(!Number.isFinite(amount) || amount < 0){
            errors.push(path + '.amount: numero invalido (' + amount + ')');
        }
        return;
    }
    if(typeof amount === 'string'){
        if(!KEYWORDS.has(amount)){
            errors.push(path + '.amount: palavra desconhecida "' + amount + '"');
        }
        return;
    }
    errors.push(path + '.amount: esperado numero ou uma de ' + [...KEYWORDS].join('/'));
}

function validateTarget(target, path, errors){
    if(!isPlainObject(target)){
        errors.push(path + ': esperado objeto');
        return;
    }
    checkKeys(target, TARGET_KEYS, path, errors);
    if(!KINDS.has(target.kind)){
        errors.push(path + '.kind: desconhecido "' + target.kind + '"');
        return;
    }
    if(target.count !== undefined && !isCount(target.count)){
        errors.push(path + '.count: esperado inteiro positivo');
    }
    for(const flag of ['upTo', 'secret']){
        if(target[flag] !== undefined && typeof target[flag] !== 'boolean'){
            errors.push(path + '.' + flag + ': esperado booleano');
        }
    }
    // `by` e sobrecarregado: no kind "rank" e a metrica comparada; nos outros,
    // quem faz a escolha. Sao vocabularios diferentes, e conferir contra o
    // errado transformava todo alvo por ranking em erro.
    if(target.by !== undefined){
        const permitidos = target.kind === TargetKind.rank ? METRICS : CHOOSERS;
        if(!permitidos.has(target.by)){
            errors.push(path + '.by: desconhecido "' + target.by + '"');
        }
    }
    if(target.except !== undefined){
        if(target.except === 'self'){
            // ok
        }else if(isPlainObject(target.except) && target.except.mission !== undefined){
            checkMissions(target.except.mission, path + '.except.mission', errors);
        }else{
            errors.push(path + '.except: esperado "self" ou { mission }');
        }
    }
    if(target.kind === TargetKind.mission){
        checkMissions(target.mission, path + '.mission', errors);
    }else if(target.mission !== undefined){
        errors.push(path + '.mission: so faz sentido com kind "' + TargetKind.mission + '"');
    }
    if(target.kind === TargetKind.relative && target.direction === undefined && target.offset === undefined){
        errors.push(path + ': kind "relative" precisa de direction ou offset');
    }
    if(target.direction !== undefined && !DIRECTIONS.has(target.direction)){
        errors.push(path + '.direction: esperado left/right');
    }
    if(target.offset !== undefined && (!Number.isInteger(target.offset) || target.offset === 0)){
        errors.push(path + '.offset: esperado inteiro diferente de zero');
    }
    if(target.kind === TargetKind.rank && !target.by && !target.order){
        errors.push(path + ': kind "rank" precisa de by/order');
    }
    if(target.kind === TargetKind.filter && !isPlainObject(target.where)){
        errors.push(path + ': kind "filter" precisa de where');
    }
    if(target.kind === TargetKind.manual && !target.description){
        errors.push(path + ': kind "manual" precisa de description');
    }
}

function validateDuration(duration, path, errors){
    if(!isPlainObject(duration)){
        errors.push(path + ': esperado objeto');
        return;
    }
    if(!DURATIONS.has(duration.kind)){
        errors.push(path + '.kind: desconhecido "' + duration.kind + '"');
        return;
    }
    if(duration.kind === DurationKind.turns && !isCount(duration.turns)){
        errors.push(path + '.turns: esperado inteiro positivo');
    }
    // Sem `mission`, o gatilho e a missao do proprio alvo do efeito.
    if(duration.kind === DurationKind.untilMissionChange && duration.mission !== undefined){
        checkMissions(duration.mission, path + '.mission', errors);
    }
    if(duration.kind === DurationKind.untilDrinks && !isCount(duration.amount)){
        errors.push(path + '.amount: esperado inteiro positivo');
    }
}

function validateCondition(cond, path, errors){
    if(!isPlainObject(cond)){
        errors.push(path + ': esperado objeto');
        return;
    }
    if(cond.mission !== undefined) checkMissions(cond.mission, path + '.mission', errors);
    if(cond.who !== undefined && !WHOS.has(cond.who)){
        errors.push(path + '.who: desconhecido "' + cond.who + '"');
    }
    if(cond.not !== undefined && typeof cond.not !== 'boolean'){
        errors.push(path + '.not: esperado booleano');
    }
    if(cond.mission === undefined && cond.shots === undefined && cond.holds === undefined){
        errors.push(path + ': condicao vazia (esperado mission/shots/holds)');
    }
}

/**
 * Valida um efeito. Recursivo: entra em `options`, `then` e `otherwise`.
 * @returns {string[]} lista de problemas; vazia quer dizer valido.
 */
export function validateEffect(effect, path = 'effect'){
    const errors = [];
    if(!isPlainObject(effect)){
        return [path + ': esperado objeto'];
    }
    if(!ACTIONS.has(effect.action)){
        return [path + '.action: desconhecida "' + effect.action + '"'];
    }
    checkKeys(effect, EFFECT_KEYS, path, errors);

    if(effect.timing !== undefined && !TIMINGS.has(effect.timing)){
        errors.push(path + '.timing: desconhecido "' + effect.timing + '"');
    }
    if(effect.amount !== undefined) validateAmount(effect.amount, path, errors);
    if(effect.target !== undefined) validateTarget(effect.target, path + '.target', errors);
    if(effect.between !== undefined) validateTarget(effect.between, path + '.between', errors);
    if(effect.duration !== undefined) validateDuration(effect.duration, path + '.duration', errors);
    if(effect.if !== undefined) validateCondition(effect.if, path + '.if', errors);

    if(NEEDS_TARGET.has(effect.action) && effect.target === undefined){
        errors.push(path + ': acao "' + effect.action + '" precisa de target');
    }
    if(NEEDS_BETWEEN.has(effect.action) && effect.between === undefined){
        errors.push(path + ': acao "' + effect.action + '" precisa de between');
    }

    const pontual = effect.timing === undefined || effect.timing === Timing.immediate;
    if(effect.duration !== undefined && pontual && INSTANT.has(effect.action)){
        errors.push(path + ': duration numa acao instantanea; use delayed/eachTurn/passive');
    }
    if(effect.timing === Timing.delayed && effect.duration === undefined){
        errors.push(path + ': timing "delayed" precisa de duration');
    }

    if(effect.action === Action.negate || effect.action === Action.redirect){
        if(!NEGATABLES.has(effect.what)){
            errors.push(path + '.what: nao negavel/desviavel "' + effect.what + '"');
        }
    }else if(effect.what !== undefined){
        errors.push(path + '.what: so vale para negate/redirect');
    }
    if(effect.action === Action.copy || effect.action === Action.auraDispel){
        if(!SCOPES.has(effect.scope)) errors.push(path + '.scope: desconhecido "' + effect.scope + '"');
    }else if(effect.scope !== undefined){
        errors.push(path + '.scope: so vale para copy/aura.dispel');
    }
    if(effect.action === Action.missionSetGoal){
        checkMissions(effect.mission, path + '.mission', errors);
        if(!GOALS.has(effect.goal)) errors.push(path + '.goal: desconhecida "' + effect.goal + '"');
    }else if(effect.mission !== undefined){
        errors.push(path + '.mission: fora de mission.setGoal, use target/between');
    }
    if(effect.action === Action.choice){
        if(!Array.isArray(effect.options) || effect.options.length < 2){
            errors.push(path + '.options: choice precisa de ao menos 2 opcoes');
        }
        if(!CHOOSERS.has(effect.chooser)) errors.push(path + '.chooser: desconhecido "' + effect.chooser + '"');
    }else if(effect.options !== undefined){
        errors.push(path + '.options: so vale para choice');
    }
    if(effect.action === Action.manual && !effect.instruction){
        errors.push(path + '.instruction: manual precisa descrever o que a mesa faz');
    }
    if(effect.action === Action.gameEndWhen && !isPlainObject(effect.condition)){
        errors.push(path + '.condition: game.endWhen precisa da condicao de corte');
    }
    if(effect.from !== undefined && !PILES.has(effect.from)){
        errors.push(path + '.from: desconhecido "' + effect.from + '"');
    }
    if(effect.direction !== undefined && !DIRECTIONS.has(effect.direction)){
        errors.push(path + '.direction: esperado left/right');
    }
    if(effect.rounding !== undefined && !ROUNDINGS.has(effect.rounding)){
        errors.push(path + '.rounding: desconhecido "' + effect.rounding + '"');
    }
    if(effect.chance !== undefined && !(effect.chance > 0 && effect.chance <= 1)){
        errors.push(path + '.chance: esperado numero em (0, 1]');
    }
    for(const flag of ['optional', 'upTo', 'blind']){
        if(effect[flag] !== undefined && typeof effect[flag] !== 'boolean'){
            errors.push(path + '.' + flag + ': esperado booleano');
        }
    }
    if(effect.otherwise !== undefined && effect.if === undefined){
        errors.push(path + '.otherwise: sem um "if" correspondente');
    }

    if(Array.isArray(effect.options)){
        effect.options.forEach((opt, i) => {
            errors.push(...validateEffect(opt, path + '.options[' + i + ']'));
        });
    }
    for(const key of ['then', 'otherwise']){
        if(effect[key] !== undefined){
            errors.push(...validateEffect(effect[key], path + '.' + key));
        }
    }
    return errors;
}

const ENTRY_KEYS = new Set(['effects', 'ritual', 'note']);

/**
 * Valida a entrada de uma carta: `{ effects, ritual?, note? }`.
 * @returns {string[]}
 */
export function validateCardEffects(entry, label = 'card'){
    if(!isPlainObject(entry)) return [label + ': esperado objeto'];
    const errors = [];
    checkKeys(entry, ENTRY_KEYS, label, errors);
    if(!Array.isArray(entry.effects) || entry.effects.length === 0){
        errors.push(label + '.effects: esperado array nao vazio');
        return errors;
    }
    entry.effects.forEach((e, i) => {
        errors.push(...validateEffect(e, label + '.effects[' + i + ']'));
    });
    return errors;
}
