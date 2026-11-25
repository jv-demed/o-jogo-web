import { Action, Chooser, DurationKind, Goal, Mission, Negatable, Pile, Rounding, Scope, Timing } from '../cards/vocabulary.js';
import { getCardEffects } from '../cards/effects/index.js';
import { isReaction as reactsByEffect } from './reactions.js';
import { MISSIONS } from './missions.js';
import { INFINITE_SHOTS, OngoingKind, equipped, hasMark, isImmune, isLocked } from './marks.js';
import { nextRandom, shuffle } from './rng.js';
import {
    dispellable, fromDiscard, playerById, releaseOngoingCard, tableCardWaiting, toDiscard,
} from './state.js';
import { meetsCondition, missionsInPlay, resolveTarget } from './targeting.js';

export { INFINITE_SHOTS };

/**
 * O resolvedor: uma acao do vocabulario de cada vez.
 *
 * Cada carta especial e tratada individualmente, mas nao *por carta* — por
 * acao. A carta ja e dado (domain/cards/effects/), entao aqui mora so o que
 * cada verbo faz com a mesa.
 *
 * O que este arquivo *nao* faz: turno, pilha e janela de interferencia, que
 * sao de engine.js. Aqui e sempre "este efeito, agora, nestes alvos".
 *
 * Convencao: toda funcao recebe `draft`, ja clonado pelo motor, e muda em
 * cima. Toda escolha que um handler precisa (cartas, missoes, ordem) volta como
 * `{ needs }`: a resolucao para, o motor abre o pedido e refaz tudo desde o
 * snapshot quando a resposta chegar — por isso nada aqui pode ter efeito fora
 * do `draft`.
 */

const asList = value => (Array.isArray(value) ? value : [value]);

const round = (value, rounding) => (rounding === Rounding.up ? Math.ceil(value) : Math.floor(value));

/** Traduz `amount` — numero ou palavra do vocabulario — num numero de agora. */
function amountOf(effect, draft, player){
    const amount = effect.amount ?? 1;
    if(typeof amount === 'number') return amount;
    switch(amount){
        case 'infinity':    return INFINITE_SHOTS;
        case 'all':         return player ? (player.shots ?? 0) : 0;
        case 'half':        return round((player?.shots ?? 0) / 2, effect.rounding ?? Rounding.down);
        case 'perOpponent': return draft.players.filter(p => !p.out).length - 1;
        default:            return 1;
    }
}

function log(draft, entry){
    draft.log.push({ turn: draft.turnCount, ...entry });
}

const rand = draft => {
    const rolled = nextRandom(draft.seed);
    draft.seed = rolled.seed;
    return rolled.value;
};

/** O comportamento de um equipamento e o da carta que ele imita (33 copiando). */
const behavior = item => item.as ?? item.idCard;

// -------------------------------------------------------------------- shots

/**
 * Os escudos que as defesas de shot deixaram na jogada que esta resolvendo.
 *
 * Negar ou desviar shot mexe so no shot, e nao cancela a carta de baixo: o
 * resto dela acontece. Por isso a 11, a 59, a 60, a 23 e a 90 nao tiram a carta
 * da pilha — penduram um escudo nela (`item.shields`), e e aqui, no shot, que o
 * escudo age. A conta e por carta, e nao por shot: contra a 83 (5 shots), a 11
 * tira 1 dos 5, e nao o primeiro de cinco shots de 1.
 */
function shield(draft, id, amount, ctx){
    const shields = ctx.shields ?? [];
    // 90: todos os shots da carta voltam para quem a jogou, e mais ninguem bebe.
    if(shields.some(s => s.kind === 'reverse')){
        ctx.reversed.total += amount;
        log(draft, { type: 'drink.reversed', playerId: id, amount });
        return 0;
    }
    let left = amount;
    for(const s of shields){
        if(left <= 0 || s.left <= 0 || s.playerId !== id) continue;
        const used = Math.min(left, s.left);
        s.left -= used;
        left -= used;
        if(s.kind === 'redirect'){
            log(draft, { type: 'drink.redirected', from: id, to: s.to, amount: used });
            drink(draft, s.to, used, { ...ctx, shields: [] });
        }else{
            log(draft, { type: 'drink.blocked', playerId: id, amount: used });
        }
    }
    return left;
}

/**
 * Beber de verdade: conta na apuracao, credita quem mandou beber (a metrica do
 * Sjamals) e passa por tudo o que esta valendo e liga no shot.
 *
 * Todo shot entra em `draft.drinks`, a fila de confirmacao — o do vinculo da 61
 * tambem: a partida para ate quem bebeu dizer que bebeu.
 *
 * Beber para a prisao (48, 102), a Quinta Dimensao (62) e o Enem (96) conta
 * mesmo quando a 78 faz o shot nao contar: o shot desceu.
 */
export function drink(draft, id, amount, ctx, { linked = false } = {}){
    const player = playerById(draft, id);
    if(!player || amount <= 0) return;

    amount = shield(draft, id, amount, ctx);
    if(amount <= 0) return;

    // 73: o Pixuco corta pela metade, para cima, a conta que o Sjehnsens ou o
    // Swelcows recebe — conferido na hora, pela missao de agora.
    if(equipped(player, 73).length && [Mission.sjehnsens, Mission.swelcows].includes(player.mission)){
        amount = Math.ceil(amount / 2);
    }

    draft.drinks = [...(draft.drinks ?? []), { playerId: id, amount, idCard: ctx.idCard ?? null }];

    if(player.ignoringShots > 0 || hasMark(draft, OngoingKind.ignore, id)){
        player.shotsIgnored = (player.shotsIgnored ?? 0) + amount;
        log(draft, { type: 'drink', playerId: id, amount, counted: false });
    }else{
        player.shots += amount;
        log(draft, { type: 'drink', playerId: id, amount, counted: true });
    }

    if(ctx.sourceId !== id){
        const source = playerById(draft, ctx.sourceId);
        if(source) source.shotsGiven += amount;
    }

    for(const ongoing of [...draft.ongoing]){
        if(!draft.ongoing.includes(ongoing)) continue;
        switch(ongoing.kind){
            case OngoingKind.prison:
                if(!ongoing.targets.includes(id)) break;
                ongoing.drinksLeft -= amount;
                if(ongoing.drinksLeft <= 0) endOngoing(draft, ongoing);
                break;
            case OngoingKind.endWhen:
                ongoing.counts = { ...(ongoing.counts ?? {}), [id]: (ongoing.counts?.[id] ?? 0) + amount };
                if(ongoing.counts[id] >= (ongoing.limit ?? 5) && !draft.endPending){
                    draft.endPending = true;
                    log(draft, { type: 'game.endReached', playerId: id, idCard: ongoing.idCard });
                }
                break;
            case OngoingKind.enem:
                if(!ongoing.targets.includes(id)) break;
                for(let i = 0; i < amount && player.hand.length; i++){
                    const index = Math.floor(rand(draft) * player.hand.length);
                    const [lost] = player.hand.splice(index, 1);
                    toDiscard(draft, player, lost);
                    log(draft, { type: 'hand.lost', playerId: id, idCard: lost, by: ongoing.idCard });
                }
                break;
            case OngoingKind.link:
                // Um vinculo nao dispara outro: dois fios cruzados se
                // realimentariam sem fim.
                if(linked || !ongoing.targets.includes(id)) break;
                for(const other of ongoing.targets.filter(x => x !== id)){
                    log(draft, { type: 'drink.linked', from: id, to: other, idCard: ongoing.idCard });
                    drink(draft, other, amount, { ...ctx, shields: [] }, { linked: true });
                }
                break;
            default:
        }
    }
    // Partida gravada antes de o vinculo virar efeito na mesa.
    if(!linked){
        for(const link of draft.links ?? []){
            if(link.kind !== 'shots' || !link.between.includes(id)) continue;
            for(const other of link.between.filter(x => x !== id)){
                drink(draft, other, amount, { ...ctx, shields: [] }, { linked: true });
            }
        }
    }
}

/** O par de `between`. Com um alvo so, quem jogou completa a dupla. */
function pairOf(ids, ctx){
    if(ids.length >= 2) return ids.slice(0, 2);
    if(ids.length === 1) return [ctx.sourceId, ids[0]];
    return [];
}

// --------------------------------------------------------- mao e baralho

/**
 * Compra. Baralho vazio *nao* embaralha o descarte de volta: e o fim da
 * partida. Quem encerra e o motor, no fim do comando: a carta em curso ainda
 * resolve.
 */
export function draw(draft, player, count, from = Pile.top){
    for(let i = 0; i < count; i++){
        if(player.deck.length === 0){
            draft.deckEmptied = player.id;
            log(draft, { type: 'deck.empty', playerId: player.id });
            return;
        }
        const card = from === Pile.bottom ? player.deck.pop() : player.deck.shift();
        player.hand.push(card);
    }
}

function discard(draft, player, cards){
    for(const idCard of cards){
        const index = player.hand.indexOf(idCard);
        if(index === -1) continue;
        player.hand.splice(index, 1);
        toDiscard(draft, player, idCard);
    }
}

/** Pede cartas a alguem: a pergunta comum de mao, descarte, jogadas e equipamento. */
function askCards(ctx, key, request){
    const value = ctx.choices?.[ctx.slot + ':' + key];
    if(value !== undefined) return { value: asList(value) };
    return { needs: { kind: 'cards', slot: ctx.slot, key, ...request } };
}

// ----------------------------------------------------------------- missoes

/**
 * Trocar missao move o par identidade+meta junto — sao a mesma coisa. Missao
 * trancada (108) ou jogador imune (84) barram, e o log diz que barrou.
 */
function swapMissions(draft, a, b){
    const first = playerById(draft, a);
    const second = playerById(draft, b);
    if(!first || !second || a === b) return false;
    if(isLocked(draft, first) || isLocked(draft, second)
        || isImmune(draft, a) || isImmune(draft, b)){
        log(draft, { type: 'mission.swap.blocked', between: [a, b] });
        return false;
    }
    [first.mission, second.mission] = [second.mission, first.mission];
    [first.goal, second.goal] = [second.goal, first.goal];
    [first.goalChangedBy, second.goalChangedBy] = [second.goalChangedBy ?? null, first.goalChangedBy ?? null];
    // A missao que trocou de dono deixa de estar revelada: a mesa viu a
    // identidade, nao o assento.
    first.missionRevealed = false;
    second.missionRevealed = false;
    expireOnMissionChange(draft, [a, b]);
    log(draft, { type: 'mission.swap', between: [a, b] });
    return true;
}

/**
 * Gira as missoes numa roda. Quem esta trancado ou imune fica fora da roda e
 * fica com a dele; a meta anda com a missao, igual a troca. Com dois na roda e
 * uma troca; com menos, nada.
 *
 * `toNext`: cada um passa a sua para o seguinte no sentido da roda (a roda ja
 * vem na ordem do sentido corrente); senao, para o anterior.
 */
function rotateMissions(draft, ids, toNext = true){
    const ring = ids.filter(id => {
        const player = playerById(draft, id);
        return player && !player.out && !isLocked(draft, player) && !isImmune(draft, id);
    });
    const left = ids.filter(id => !ring.includes(id));
    if(left.length) log(draft, { type: 'mission.rotate.blocked', ids: left });
    if(ring.length < 2) return false;
    const before = ring.map(id => {
        const p = playerById(draft, id);
        return { mission: p.mission, goal: p.goal, goalChangedBy: p.goalChangedBy ?? null };
    });
    ring.forEach((id, i) => {
        const from = toNext ? (i - 1 + ring.length) % ring.length : (i + 1) % ring.length;
        const player = playerById(draft, id);
        Object.assign(player, before[from]);
        player.missionRevealed = false;
    });
    expireOnMissionChange(draft, ring);
    log(draft, { type: 'mission.rotate', ring: ringInSeatOrder(draft, ring) });
    return true;
}

// A roda vai para o log na ordem dos assentos: a ordem em que os efeitos acharam
// cada um (por missao, na 41) diria quem e quem.
const ringInSeatOrder = (draft, ids) => [...ids].sort((a, b) => draft.order.indexOf(a) - draft.order.indexOf(b));

/**
 * A missao destes jogadores acabou de mudar de mao: vence o que dependia dela.
 *
 * Roda *depois* da troca, entao "a missao Sauzburg estava na troca" se le como
 * "algum dos envolvidos tem a Sauzburg agora".
 *
 * As cartas da mesa (`onTable`) tem dois relogios: o efeito acaba aqui, na
 * primeira troca da missao, mas a carta so sai quando todo mundo ja trocou.
 */
export function expireOnMissionChange(draft, ids){
    const expired = draft.ongoing.filter(ongoing => {
        if(ongoing.onTable || ongoing.global) return false;
        if(ongoing.duration?.kind !== DurationKind.untilMissionChange) return false;
        return ongoing.duration.mission !== undefined
            ? ids.some(id => playerById(draft, id)?.mission === ongoing.duration.mission)
            : ongoing.targets.some(id => ids.includes(id));
    });
    for(const ongoing of expired) endOngoing(draft, ongoing);

    for(const ongoing of draft.ongoing){
        if(!ongoing.onTable) continue;
        const mission = ongoing.duration?.mission;
        if(ongoing.active && ids.some(id => playerById(draft, id)?.mission === mission)){
            undoGoal(draft, ongoing);
        }
        ongoing.awaitingSwap = (ongoing.awaitingSwap ?? []).filter(id => !ids.includes(id));
    }
    settleTableCards(draft);
}

/**
 * Desliga a meta que uma carta da mesa impos. So uma vez: o efeito nao volta,
 * nem se a missao voltar. Quem tem a missao agora recebe a meta padrao dela, e
 * so se a meta ainda e a desta carta (`goalChangedBy`).
 *
 * Nao entra no log de proposito: "a carta 5 parou de valer" logo depois de A
 * trocar com B diria que o Sauzburg e A ou B.
 */
function undoGoal(draft, ongoing){
    ongoing.active = false;
    const mission = ongoing.duration?.mission ?? ongoing.mission;
    for(const player of draft.players){
        if(player.mission !== mission) continue;
        if(player.goalChangedBy !== ongoing.idCard) continue;
        player.goal = MISSIONS[player.mission].goal;
        player.goalChangedBy = null;
    }
}

/** Tira da mesa a carta que todo mundo ja trocou de missao desde que ela entrou. */
export function settleTableCards(draft){
    const done = draft.ongoing.filter(ongoing =>
        ongoing.onTable && tableCardWaiting(draft, ongoing).length === 0);
    for(const ongoing of done) endOngoing(draft, ongoing);
}

// ---------------------------------------------------- efeitos prolongados

/**
 * O fim de um efeito que estava valendo. Um caminho so, para todo fim: duracao,
 * troca de missao, dissipar (81, 104), a 103 desfazendo a jogada.
 *
 * Desfaz o que o efeito ligou (quase tudo e lido na hora, entao basta sair da
 * lista; a meta trocada e a excecao), devolve a carta ao descarte de quem jogou
 * uma vez so, e conta no log.
 */
export function endOngoing(draft, ongoing, reason = 'expired'){
    if(!draft.ongoing.includes(ongoing)) return;
    draft.ongoing = draft.ongoing.filter(other => other !== ongoing);

    if(ongoing.kind === OngoingKind.goalTable || ongoing.onTable){
        if(ongoing.active) undoGoal(draft, ongoing);
    }
    if(ongoing.kind === OngoingKind.goalLater && ongoing.fired){
        undoGoal(draft, ongoing);
    }
    // Partida gravada antes de os passivos serem lidos na hora.
    if(ongoing.effect?.action === Action.shotsIgnore && !ongoing.kind){
        for(const id of ongoing.targets){
            const player = playerById(draft, id);
            if(player && player.ignoringShots > 0) player.ignoringShots--;
        }
    }

    const returned = releaseOngoingCard(draft, ongoing);
    // O segredo da 99 nao sai no log: o alvo dela fica so com quem jogou.
    const targets = ongoing.kind === OngoingKind.fate ? [ongoing.sourceId] : ongoing.targets;
    log(draft, { type: 'ongoing.end', idCard: ongoing.idCard, targets, returned, reason,
        ...(ongoing.onTable || ongoing.global ? { onTable: true } : {}) });
}

/** Planta um efeito que dura. Devolve a entrada para quem quiser completar. */
function plant(draft, ctx, fields){
    draft.ongoingSeq = (draft.ongoingSeq ?? draft.ongoing.length) + 1;
    const duration = fields.duration ?? null;
    const ongoing = {
        id: draft.ongoingSeq,
        targets: [],
        sourceId: ctx.sourceId,
        idCard: ctx.idCard,
        // A jogada que plantou o efeito: e por ela que o motor sabe que a carta
        // ficou na mesa, e qual carta devolver quando acabar.
        uid: ctx.uid ?? null,
        timing: Timing.passive,
        turnsLeft: duration?.kind === DurationKind.turns ? duration.turns : null,
        roundsLeft: duration?.kind === DurationKind.rounds ? duration.rounds : null,
        drinksLeft: duration?.kind === DurationKind.untilDrinks ? duration.amount : null,
        ...fields,
        duration,
    };
    draft.ongoing.push(ongoing);
    const secret = ongoing.kind === OngoingKind.fate;
    log(draft, { type: 'ongoing', action: fields.effect?.action ?? null, kind: ongoing.kind,
        idCard: ctx.idCard, targets: secret ? [ctx.sourceId] : ongoing.targets,
        turns: ongoing.turnsLeft, rounds: ongoing.roundsLeft,
        ...(ongoing.onTable || ongoing.global ? { onTable: true } : {}) });
    return ongoing;
}

/**
 * Meta trocada ligada a uma missao: "a missao de Sauzburg passa a ser ... ate
 * uma troca de missao de Sauzburg" (5, 68, 71; a 10 no ramo do Swarley).
 *
 * O efeito (`active`) acaba na primeira troca da missao; a carta
 * (`awaitingSwap`) fica na mesa ate todo mundo ter trocado ao menos uma vez —
 * saindo antes, ela apontaria quem e o dono da missao. Na 68 a carta fica na
 * mesa mesmo sem Smichaels entre os escolhidos, inativa, pelo mesmo motivo: a
 * carta indo para o descarte contaria que ele nao estava.
 */
function plantOnTable(draft, effect, ctx, active){
    if(active){
        for(const player of draft.players){
            if(!asList(effect.mission).includes(player.mission)) continue;
            player.goal = effect.goal;
            player.goalChangedBy = ctx.idCard ?? null;
        }
    }
    plant(draft, ctx, {
        kind: OngoingKind.goalTable,
        effect,
        duration: effect.duration,
        onTable: true,
        active,
        mission: effect.mission,
        awaitingSwap: draft.order.filter(id => !playerById(draft, id)?.out),
    });
}

const isTableEffect = effect =>
    effect.timing === Timing.passive
    && effect.action === Action.missionSetGoal
    && effect.duration?.kind === DurationKind.untilMissionChange
    && effect.duration.mission !== undefined;

/**
 * O que cada acao vira quando dura. Imediato com `duration` usa o mesmo
 * caminho do passivo: aplica agora, fica em `ongoing`, e o fim desfaz.
 */
function planted(draft, effect, ids, ctx){
    const base = { effect, duration: effect.duration, targets: ids };
    switch(effect.action){
        case Action.drink:
            if(effect.timing === Timing.onTargetTurn){
                return plant(draft, ctx, { ...base, kind: OngoingKind.turnDrink, timing: Timing.onTargetTurn });
            }
            return null;
        case Action.missionSetGoal:
            // 20: depois de N rodadas, a meta da missao muda. Fica na mesa,
            // fora das cadeiras: a meta e da missao, e a carta nao aponta ninguem.
            return plant(draft, ctx, { ...base, kind: OngoingKind.goalLater, targets: [], global: true,
                mission: effect.mission, goal: effect.goal, timing: Timing.delayed });
        case Action.shotsIgnore:
            return plant(draft, ctx, { ...base, kind: OngoingKind.ignore });
        case Action.gameLose:
            return plant(draft, ctx, { ...base, kind: OngoingKind.lose });
        case Action.gameWin:
            // 109: so vale se a partida acabar enquanto ela estiver na mesa.
            return plant(draft, ctx, { ...base, kind: OngoingKind.peace });
        case Action.shotsSet:
            return plant(draft, ctx, { ...base, kind: OngoingKind.infinity });
        case Action.handDiscard:
            return plant(draft, ctx, { ...base, kind: OngoingKind.enem });
        case Action.immune:
            return plant(draft, ctx, { ...base, kind: OngoingKind.immune });
        case Action.turnSkip:
            if(effect.duration?.kind !== DurationKind.untilDrinks) return null;
            // 48 e 102: preso ate beber; a 48 tambem solta depois de 3 vezes.
            return plant(draft, ctx, { ...base, kind: OngoingKind.prison,
                skipsLeft: typeof effect.amount === 'number' ? effect.amount : null });
        case Action.handDraw:
            // 85: a compra da vez pode falhar, ate ele terminar uma vez sua com
            // 5 cartas ou menos — conferido a partir da vez seguinte.
            return plant(draft, ctx, { ...base, kind: OngoingKind.greed, since: draft.turnCount });
        case Action.linkShots:
            return plant(draft, ctx, { ...base, kind: OngoingKind.link, targets: pairOf(ids, ctx) });
        case Action.linkFate:
            // 99: o alvo e segredo. A carta fica na cadeira de quem jogou, e o
            // escolhido so mora em `partner`.
            return plant(draft, ctx, { ...base, kind: OngoingKind.fate, targets: [ctx.sourceId],
                partner: ids[0] ?? null });
        case Action.gameEndIn:
            return plant(draft, ctx, { ...base, kind: OngoingKind.endIn, targets: [], global: true });
        case Action.gameEndWhen:
            return plant(draft, ctx, { ...base, kind: OngoingKind.endWhen, targets: [], global: true,
                counts: {}, limit: effect.condition?.shots?.gte ?? 5 });
        default:
            return null;
    }
}

// ----------------------------------------------------------- equipamentos

/**
 * Destroi um equipamento: sai da cadeira e vai para o descarte de quem o jogou.
 * O que ele fazia e lido na hora (marks.js), entao destruir ja e desfazer.
 */
export function destroyEquipment(draft, holderId, item, reason = 'destroyed'){
    const holder = playerById(draft, holderId);
    if(!holder) return;
    const index = holder.equipment.indexOf(item);
    if(index === -1) return;
    holder.equipment.splice(index, 1);
    const owner = playerById(draft, item.from) ?? holder;
    toDiscard(draft, owner, item.idCard);
    log(draft, { type: 'equipment.destroy', playerId: holderId, idCard: item.idCard, reason });
}

// ------------------------------------------------------------------ 103

/**
 * O diario de uma jogada: o que ela mudou, para a 103 poder desfazer. Guarda
 * so o antes e o depois do que tem volta — carta comprada, roubada ou
 * descartada e informacao vista nao voltam, entao nem entram.
 */
export function journalOf(before, after, uid){
    const FIELDS = ['shots', 'shotsGiven', 'mission', 'goal', 'goalChangedBy', 'skipTurns',
        'nextTurnPlays', 'extraPlays'];
    const players = {};
    for(const now of after.players){
        const was = before.players.find(p => p.id === now.id);
        if(!was) continue;
        const diff = {};
        for(const field of FIELDS){
            if((was[field] ?? null) !== (now[field] ?? null)) diff[field] = [was[field] ?? null, now[field] ?? null];
        }
        if(Object.keys(diff).length) players[now.id] = diff;
    }
    return {
        players,
        order: before.order.join() !== after.order.join() ? [before.order, after.order] : null,
        direction: before.direction !== after.direction ? [before.direction, after.direction] : null,
        uid,
    };
}

function undoPlay(draft, play, ctx){
    const { journal } = play;
    let undone = false;
    for(const [id, diff] of Object.entries(journal.players ?? {})){
        const player = playerById(draft, Number(id));
        if(!player) continue;
        for(const field of ['shots', 'shotsGiven', 'skipTurns', 'nextTurnPlays', 'extraPlays']){
            if(!diff[field]) continue;
            const [was, now] = diff[field];
            player[field] = Math.max(0, (player[field] ?? 0) - ((now ?? 0) - (was ?? 0)));
            undone = true;
        }
    }
    // Missao destroca so se ninguem trocou de novo depois.
    const swapped = Object.entries(journal.players ?? {}).filter(([, diff]) => diff.mission);
    if(swapped.length && swapped.every(([id, diff]) => playerById(draft, Number(id))?.mission === diff.mission[1])){
        for(const [id, diff] of swapped){
            const player = playerById(draft, Number(id));
            player.mission = diff.mission[0];
            if(diff.goal) player.goal = diff.goal[0];
            if(diff.goalChangedBy) player.goalChangedBy = diff.goalChangedBy[0];
            player.missionRevealed = false;
        }
        expireOnMissionChange(draft, swapped.map(([id]) => Number(id)));
        undone = true;
    }
    if(journal.direction){ draft.direction = journal.direction[0]; undone = true; }
    if(journal.order){
        const current = draft.order[draft.turnIndex];
        draft.order = [...journal.order[0]];
        draft.turnIndex = draft.order.indexOf(current);
        undone = true;
    }
    for(const ongoing of draft.ongoing.filter(o => o.uid === journal.uid)){
        endOngoing(draft, ongoing, 'undone');
        undone = true;
    }
    for(const player of draft.players){
        for(const item of player.equipment.filter(e => e.uid === journal.uid)){
            destroyEquipment(draft, player.id, item, 'undone');
            undone = true;
        }
    }
    return undone;
}

// ------------------------------------------------------------- handlers

/**
 * Uma entrada por acao do vocabulario. Assinatura: (draft, effect, ids, ctx)
 * -> void | { needs }. `ids` ja e a lista de alvos resolvida.
 */
const HANDLERS = {
    [Action.drink]: (draft, effect, ids, ctx) => {
        for(const id of ids){
            drink(draft, id, amountOf(effect, draft, playerById(draft, id)), ctx);
        }
    },

    [Action.shotsAdd]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(player) player.shots += amountOf(effect, draft, player);
        }
    },

    [Action.shotsRemove]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(!player) continue;
            const amount = Math.min(player.shots, amountOf(effect, draft, player));
            player.shots -= amount;
            log(draft, { type: 'shots.remove', playerId: id, amount });
        }
    },

    // A 110 zera a contagem real e tira o infinito da 87.
    [Action.shotsSet]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(!player) continue;
            player.shots = amountOf(effect, draft, player);
            for(const ongoing of draft.ongoing.filter(o => o.kind === OngoingKind.infinity && o.targets.includes(id))){
                endOngoing(draft, ongoing);
            }
            log(draft, { type: 'shots.set', playerId: id, amount: player.shots });
        }
    },

    // 79 e 100: perde metade, e o que *sobra* arredonda para cima (3 vira 2).
    [Action.shotsHalve]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(!player) continue;
            const before = player.shots;
            player.shots = round(player.shots / 2, effect.rounding ?? Rounding.down);
            log(draft, { type: 'shots.remove', playerId: id, amount: before - player.shots });
        }
    },

    [Action.shotsSwap]: (draft, effect, ids, ctx) => {
        const [a, b] = pairOf(ids, ctx);
        const first = playerById(draft, a);
        const second = playerById(draft, b);
        if(first && second){
            [first.shots, second.shots] = [second.shots, first.shots];
            log(draft, { type: 'shots.swap', between: [a, b] });
        }
    },

    [Action.shotsTransfer]: (draft, effect, ids, ctx) => {
        const [a, b] = pairOf(ids, ctx);
        const from = playerById(draft, a);
        const to = playerById(draft, b);
        if(!from || !to) return;
        const amount = Math.min(from.shots, amountOf(effect, draft, from));
        from.shots -= amount;
        to.shots += amount;
        log(draft, { type: 'shots.transfer', from: a, to: b, amount });
    },

    [Action.turnSkip]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(player) player.skipTurns += amountOf(effect, draft, player);
        }
        if(ids.length) log(draft, { type: 'turn.skip', targets: ids, amount: effect.amount ?? 1 });
    },

    // Jogada extra agora (89). Com `timing: delayed`, e na proxima vez de quem
    // recebe (94: volta da cama e joga 2) — nunca numa vez alheia.
    [Action.turnExtraPlay]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(!player) continue;
            if(effect.timing === Timing.delayed) player.nextTurnPlays = (player.nextTurnPlays ?? 0) + amountOf(effect, draft, player);
            else player.extraPlays += amountOf(effect, draft, player);
        }
    },

    [Action.handDraw]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(player) draw(draft, player, amountOf(effect, draft, player), effect.from);
        }
    },

    // 58: cada escolhido escolhe a propria carta, todos ao mesmo tempo. Mao
    // vazia nao responde.
    [Action.handDiscard]: (draft, effect, ids, ctx) => {
        const players = ids.filter(id => playerById(draft, id)?.hand.length);
        const key = ctx.slot + ':handPick';
        const picked = ctx.choices?.[key] ?? {};
        const answered = players.filter(id => picked[id] !== undefined);
        if(answered.length < players.length){
            return { needs: { kind: 'handPick', slot: ctx.slot, players, answered,
                count: typeof effect.amount === 'number' ? effect.amount : 1 } };
        }
        for(const id of players){
            const player = playerById(draft, id);
            const count = amountOf(effect, draft, player);
            const chosen = asList(picked[id]).filter(c => player.hand.includes(c)).slice(0, count);
            const cards = chosen.length ? chosen : player.hand.slice(0, count);
            discard(draft, player, cards);
            log(draft, { type: 'hand.discard', playerId: id, cards });
        }
    },

    [Action.handRedraw]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(!player) continue;
            const size = player.hand.length;
            for(const idCard of player.hand) toDiscard(draft, player, idCard);
            player.hand = [];
            draw(draft, player, size);
            log(draft, { type: 'hand.redraw', playerId: id, size });
        }
    },

    // 52: roubo as cegas, sorteado pela semente. Quem joga a roubada na hora e
    // o `then` (card.playNow).
    [Action.handSteal]: (draft, effect, ids, ctx) => {
        const thief = playerById(draft, ctx.sourceId);
        if(!thief) return;
        ctx.stolen = [];
        for(const id of ids){
            const victim = playerById(draft, id);
            if(!victim || victim.hand.length === 0) continue;
            const count = Math.min(amountOf(effect, draft, victim), victim.hand.length);
            for(let i = 0; i < count; i++){
                const index = Math.floor(rand(draft) * victim.hand.length);
                const [card] = victim.hand.splice(index, 1);
                thief.hand.push(card);
                ctx.stolen.push(card);
            }
            log(draft, { type: 'hand.steal', from: id, to: thief.id, count });
        }
    },

    // A carta que acabou de chegar entra na pilha como jogada de quem a pegou.
    // Quem empilha e o motor, depois que esta carta terminar de resolver.
    [Action.playNow]: (draft, effect, ids, ctx) => {
        for(const idCard of ctx.stolen ?? []){
            draft.queuedPlays = [...(draft.queuedPlays ?? []), { idCard, byId: ctx.sourceId }];
        }
    },

    // 89: o alvo escolhe uma carta da propria mao e entrega a quem jogou.
    [Action.handGive]: (draft, effect, ids, ctx) => {
        const receiver = playerById(draft, ctx.sourceId);
        for(const id of ids){
            const giver = playerById(draft, id);
            if(!giver || !receiver || giver.hand.length === 0) continue;
            const count = Math.min(amountOf(effect, draft, giver), giver.hand.length);
            const asked = askCards(ctx, 'give', { chooserId: id, source: Pile.hand,
                cards: [...giver.hand], count });
            if(asked.needs) return asked;
            const cards = asked.value.filter(c => giver.hand.includes(c)).slice(0, count);
            for(const idCard of cards.length ? cards : giver.hand.slice(0, count)){
                giver.hand.splice(giver.hand.indexOf(idCard), 1);
                receiver.hand.push(idCard);
            }
            log(draft, { type: 'hand.give', from: id, to: receiver.id, count });
        }
    },

    // 92: cada um mostra uma carta sorteada da mao.
    [Action.handReveal]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(!player || player.hand.length === 0) continue;
            const pool = [...player.hand];
            const cards = [];
            for(let i = 0; i < amountOf(effect, draft, player) && pool.length; i++){
                cards.push(pool.splice(Math.floor(rand(draft) * pool.length), 1)[0]);
            }
            player.revealed = [...(player.revealed ?? []), ...cards];
            log(draft, { type: 'hand.reveal', playerId: id, cards });
        }
    },

    [Action.deckPeek]: (draft, effect, ids, ctx) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(!player) continue;
            const count = amountOf(effect, draft, player);
            const cards = effect.from === Pile.bottom ? player.deck.slice(-count) : player.deck.slice(0, count);
            const watcher = playerById(draft, ctx.sourceId);
            if(watcher) watcher.peeked = { playerId: id, cards };
            log(draft, { type: 'deck.peek', playerId: id, by: ctx.sourceId, count });
        }
    },

    // 22: escolhe do proprio descarte, volta ao baralho, e o baralho e
    // embaralhado com a semente.
    [Action.deckReturn]: (draft, effect, ids, ctx) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(!player) continue;
            const source = effect.from === Pile.hand ? player.hand : player.discard;
            const count = Math.min(amountOf(effect, draft, player), source.length);
            if(count === 0) continue;
            const asked = askCards(ctx, 'return', { chooserId: id, source: effect.from ?? Pile.discard,
                cards: [...source], count });
            if(asked.needs) return asked;
            const cards = [];
            const pool = [...source];
            for(const idCard of asked.value){
                const index = pool.indexOf(idCard);
                if(index !== -1 && cards.length < count){ cards.push(idCard); pool.splice(index, 1); }
            }
            for(const idCard of cards){
                if(effect.from === Pile.hand) source.splice(source.indexOf(idCard), 1);
                else fromDiscard(draft, player, idCard);
                player.deck.push(idCard);
            }
            const shuffled = shuffle(draft.seed, player.deck);
            draft.seed = shuffled.seed;
            player.deck = shuffled.items;
            log(draft, { type: 'deck.return', playerId: id, cards });
        }
    },

    [Action.missionSwap]: (draft, effect, ids, ctx) => {
        // Troca por missao (40): sem as duas missoes na mesa, nada acontece —
        // quem jogou nao completa a dupla.
        if(effect.between?.kind === 'mission'){
            if(ids.length === 2) swapMissions(draft, ids[0], ids[1]);
            return;
        }
        const [a, b] = pairOf(ids, ctx);
        if(a !== undefined && b !== undefined) swapMissions(draft, a, b);
    },

    // 41 gira so entre os presentes; 56 gira a mesa inteira, para o anterior
    // ou para o seguinte no sentido de agora.
    [Action.missionRotate]: (draft, effect, ids) => {
        const ring = effect.between?.kind === 'mission'
            ? ids
            : (() => {
                const start = draft.order.indexOf(draft.order[draft.turnIndex]);
                const out = [];
                for(let i = 0; i < draft.order.length; i++){
                    const index = ((start + i * draft.direction) % draft.order.length + draft.order.length) % draft.order.length;
                    const id = draft.order[index];
                    if(ids.includes(id)) out.push(id);
                }
                return out;
            })();
        const seatRing = effect.between?.kind === 'mission' ? ringInSeatOrder(draft, ring) : ring;
        rotateMissions(draft, seatRing, effect.direction !== 'left');
    },

    [Action.missionPeek]: (draft, effect, ids, ctx) => {
        const watcher = playerById(draft, ctx.sourceId);
        if(!watcher) return;
        for(const id of ids){
            const player = playerById(draft, id);
            if(player) watcher.knownMissions[id] = player.mission;
        }
        log(draft, { type: 'mission.peek', by: ctx.sourceId, targets: ids });
    },

    [Action.missionReveal]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(!player) continue;
            player.missionRevealed = true;
            for(const other of draft.players) other.knownMissions[id] = player.mission;
        }
        log(draft, { type: 'mission.reveal', targets: ids });
    },

    // Os de agora: a 20, quando dispara. A meta e da missao e anda com ela.
    [Action.missionSetGoal]: (draft, effect, ids, ctx) => {
        for(const player of draft.players){
            if(!asList(effect.mission).includes(player.mission)) continue;
            player.goal = effect.goal;
            player.goalChangedBy = ctx.idCard ?? null;
        }
    },

    // A 64 nao troca: a escolha fica no equipamento (ver `equip`).
    [Action.missionTake]: () => {},

    [Action.missionLock]: () => {},

    /**
     * 88: cada um aponta o proximo, na propria tela, entre quem ainda nao
     * entrou na cadeia. A missao do apontado e conferida *antes* de trocar:
     * Stanley apontado, a troca nao acontece e a cadeia acaba. Acaba tambem
     * quando nao sobra ninguem ou a troca e barrada.
     */
    [Action.missionChain]: (draft, effect, ids, ctx) => {
        let current = ctx.sourceId;
        const chain = [current];
        let next = ids[0];
        for(let step = 0; next !== undefined; step++){
            const pointed = playerById(draft, next);
            if(!pointed) break;
            if(pointed.mission === Mission.stanley){
                log(draft, { type: 'mission.chain.stop', by: current, at: next });
                break;
            }
            if(!swapMissions(draft, current, next)) break;
            chain.push(next);
            current = next;
            const remaining = draft.players
                .filter(p => !p.out && !chain.includes(p.id) && !isImmune(draft, p.id))
                .map(p => p.id);
            if(remaining.length === 0) break;
            const key = ctx.slot + ':chain' + step;
            const value = ctx.choices?.[key];
            if(value === undefined){
                return { needs: { kind: 'choose', slot: ctx.slot, key: 'chain' + step, chooserId: current,
                    candidates: remaining, count: 1, declare: false } };
            }
            next = asList(value)[0];
            if(!remaining.includes(next)) throw new Error('alvo ilegal na cadeia');
        }
    },

    [Action.negate]: (draft, effect, ids, ctx) => {
        log(draft, { type: 'negate', what: effect.what, by: ctx.sourceId });
    },

    [Action.redirect]: (draft, effect, ids, ctx) => {
        log(draft, { type: 'redirect', what: effect.what, by: ctx.sourceId, to: ids });
    },

    /**
     * Equipar poe a carta na cadeira de quem carrega, agora, e ela fica la.
     * O que ela faz vale para quem a carregar no momento (inclusive depois da
     * 80) e e lido na hora. A 64 pede a missao, em segredo, a quem carrega.
     */
    [Action.equip]: (draft, effect, ids, ctx) => {
        const as = ctx.copyCard ?? ctx.idCard;
        for(const id of ids){
            const player = playerById(draft, id);
            if(!player) continue;
            const item = { idCard: ctx.idCard, from: ctx.sourceId, uid: ctx.uid ?? null };
            if(as !== ctx.idCard) item.as = as;
            if(as === 64){
                const key = ctx.slot + ':missions';
                const value = ctx.choices?.[key];
                const options = missionsInPlay(draft);
                if(value === undefined){
                    return { needs: { kind: 'missions', slot: ctx.slot, chooserId: id, options,
                        count: 1, secret: true } };
                }
                const chosen = asList(value)[0];
                if(!options.includes(chosen)) throw new Error('missao fora da partida');
                item.mission = chosen;
            }
            player.equipment.push(item);
        }
        log(draft, { type: 'equip', idCard: ctx.idCard, targets: ids });
    },

    // 82: todos os equipamentos de todos.
    [Action.equipmentDestroy]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            for(const item of [...(player?.equipment ?? [])]) destroyEquipment(draft, id, item);
        }
    },

    // 80: de quem, qual e para quem — tudo declarado antes da janela.
    [Action.equipmentTransfer]: (draft, effect, ids, ctx) => {
        const fromId = ids[0];
        const from = playerById(draft, fromId);
        if(!from || from.equipment.length === 0) return;
        const asked = askCards(ctx, 'equipment', { chooserId: ctx.sourceId, source: 'equipment',
            cards: from.equipment.map(e => e.idCard), count: 1, declare: true });
        if(asked.needs) return asked;
        const item = from.equipment.find(e => e.idCard === asked.value[0]) ?? from.equipment[0];
        const key = ctx.slot + ':to';
        const candidates = draft.players.filter(p => !p.out && p.id !== fromId && !isImmune(draft, p.id)).map(p => p.id);
        const value = ctx.choices?.[key];
        if(value === undefined){
            return { needs: { kind: 'choose', slot: ctx.slot, key: 'to', chooserId: ctx.sourceId,
                candidates, count: 1, declare: true } };
        }
        const toId = asList(value)[0];
        if(!candidates.includes(toId)) throw new Error('alvo ilegal na escolha');
        from.equipment.splice(from.equipment.indexOf(item), 1);
        playerById(draft, toId).equipment.push(item);
        log(draft, { type: 'equipment.transfer', from: fromId, to: toId, idCard: item.idCard });
    },

    [Action.orderReverse]: draft => {
        draft.direction *= -1;
        log(draft, { type: 'order.reverse', direction: draft.direction });
    },

    // 34: quem jogou arruma os assentos dos escolhidos; a vez continua com
    // quem estava.
    [Action.orderRearrange]: (draft, effect, ids, ctx) => {
        if(ids.length < 2) return;
        const value = ctx.choices?.[ctx.slot + ':order'];
        if(value === undefined){
            return { needs: { kind: 'order', slot: ctx.slot, chooserId: ctx.sourceId,
                ids: ringInSeatOrder(draft, ids) } };
        }
        const wanted = asList(value);
        if(wanted.length !== ids.length || !ids.every(id => wanted.includes(id))){
            throw new Error('ordem invalida');
        }
        const currentId = draft.order[draft.turnIndex];
        const seats = ids.map(id => draft.order.indexOf(id)).sort((a, b) => a - b);
        seats.forEach((seat, i) => { draft.order[seat] = wanted[i]; });
        draft.turnIndex = draft.order.indexOf(currentId);
        log(draft, { type: 'order.rearrange', order: [...draft.order] });
    },

    [Action.gameEndIn]: () => {},
    [Action.gameEndWhen]: () => {},
    [Action.gameWin]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(player) player.forcedWin = true;
        }
        log(draft, { type: 'game.win', targets: ids });
    },
    [Action.gameLose]: () => {},
    [Action.linkShots]: () => {},
    [Action.linkFate]: () => {},
    [Action.immune]: () => {},
    [Action.shotsIgnore]: () => {},

    // 81 apaga tudo o que esta valendo; 104 apaga um, escolhido. Equipamento
    // fica de fora: sai por destruicao.
    [Action.auraDispel]: (draft, effect, ids, ctx) => {
        const pool = dispellable(draft);
        if(effect.amount === 'all'){
            for(const ongoing of pool) endOngoing(draft, ongoing, 'dispelled');
            log(draft, { type: 'aura.dispel', count: pool.length });
            return;
        }
        if(pool.length === 0){
            log(draft, { type: 'aura.dispel', count: 0 });
            return;
        }
        const value = ctx.choices?.[ctx.slot + ':ongoing'];
        if(value === undefined){
            return { needs: { kind: 'ongoing', slot: ctx.slot, chooserId: ctx.sourceId,
                options: pool.map(o => o.id) } };
        }
        const chosen = pool.find(o => o.id === value);
        if(!chosen) throw new Error('efeito invalido');
        endOngoing(draft, chosen, 'dispelled');
        log(draft, { type: 'aura.dispel', count: 1 });
    },

    /**
     * 33: escolhe uma carta ja jogada na partida (fora reacoes e a propria 33)
     * e resolve os efeitos dela como sua. A escolha e declarada antes da janela,
     * junto com os alvos da copia.
     */
    [Action.copy]: (draft, effect, ids, ctx) => {
        const pool = [...new Set(draft.history ?? [])]
            .filter(id => id !== ctx.idCard && !reactsByEffect(id) && id !== 33);
        if(pool.length === 0){
            log(draft, { type: 'copy.empty' });
            return;
        }
        const asked = askCards(ctx, 'copy', { chooserId: ctx.sourceId, source: 'played',
            cards: pool, count: 1, declare: true });
        if(asked.needs) return asked;
        const copied = asked.value[0];
        if(!pool.includes(copied)) throw new Error('carta fora das ja jogadas');
        log(draft, { type: 'copy', idCard: copied, by: ctx.sourceId });
        const result = runEffects(draft, { effects: getCardEffects(copied)?.effects ?? [] },
            { ...ctx, slot: ctx.slot + '.copy', copyCard: copied, previous: [] }, { ritual: false });
        if(result.needs) return result;
    },

    // 103: desfaz a ultima jogada do jogador anterior no sentido de agora, se
    // feita desde a sua ultima vez e nao cancelada. Sem nada, resolve em branco.
    [Action.playUndo]: (draft, effect, ids, ctx) => {
        const targetId = ids[0];
        const play = draft.lastPlays?.[targetId];
        const since = draft.lastTurnOf?.[ctx.sourceId]?.prev ?? -1;
        if(!play || play.cancelled || play.turn <= since || play.undone){
            log(draft, { type: 'play.undo', by: ctx.sourceId, target: targetId ?? null, idCard: null });
            return;
        }
        play.undone = true;
        const undone = undoPlay(draft, play, ctx);
        log(draft, { type: 'play.undo', by: ctx.sourceId, target: targetId, idCard: play.idCard, undone });
    },

    /**
     * Escolha entre opcoes. `skippable` acrescenta o "pular" como ultima opcao
     * (70, 77, 50). A opcao escolhida vem em `choices`; sem ela, o motor ja
     * teria aberto o pedido antes de chegar aqui.
     */
    [Action.choice]: (draft, effect, ids, ctx) => {
        const picked = ctx.choices?.[ctx.slot + ':option'] ?? ctx.voted;
        const option = effect.options?.[picked ?? 0];
        if(!option){
            log(draft, { type: 'choice.skip', by: ctx.sourceId, idCard: ctx.idCard });
            return;
        }
        return applyEffect(draft, option, { ...ctx, slot: ctx.slot + '.' + (picked ?? 0), previous: ids });
    },

    [Action.manual]: (draft, effect, ids, ctx) => {
        log(draft, { type: 'manual', instruction: effect.instruction, by: ctx.sourceId, targets: ids });
    },
};

// ------------------------------------------------------- percurso do efeito

const NOW = new Set([Timing.immediate, Timing.reaction, undefined]);

/** Quem esta carta ja mandou beber antes de a rodada de voluntarios abrir. */
function forcedDrinkers(draft, ctx, ids){
    const out = [];
    for(const entry of (draft.drinks ?? []).slice(ctx.drinksMark ?? 0)){
        if(ids.includes(entry.playerId) || out.includes(entry.playerId)) continue;
        out.push(entry.playerId);
    }
    return out;
}

/** O voto da 75: todos menos quem jogou, juntos; empate e carta boa. */
function vote(draft, effect, ctx){
    const key = ctx.slot + ':vote';
    const votes = ctx.choices?.[key] ?? {};
    const voters = draft.players.filter(p => !p.out && p.id !== ctx.sourceId).map(p => p.id);
    const answered = voters.filter(id => votes[id] !== undefined);
    if(answered.length < voters.length){
        return { needs: { kind: 'vote', slot: ctx.slot, voters, answered } };
    }
    const yes = voters.filter(id => votes[id] === true).length;
    const no = voters.length - yes;
    log(draft, { type: 'vote', idCard: ctx.idCard, yes, no });
    return { picked: yes >= no ? 0 : 1 };
}

/**
 * Resolve um efeito: alvo, condicao, sorte, acao e o `then` encadeado.
 *
 * @returns {{ needs?: object, ids?: number[] }} `needs` preenchido quer dizer
 *          que falta uma escolha; `ids` sao os alvos, para o efeito seguinte.
 */
export function applyEffect(draft, effect, ctx){
    const spec = effect.between ?? effect.target;
    const resolved = resolveTarget(draft, spec, ctx);
    if(resolved.needs) return { needs: resolved.needs };
    const ids = resolved.ids;

    if(!meetsCondition(draft, effect.if, ids, ctx)){
        // A carta da mesa fica mesmo sem efeito: sair diria que a missao nao
        // estava entre os escolhidos (68).
        if(isTableEffect(effect)){
            plantOnTable(draft, effect, ctx, false);
            return { ids };
        }
        return effect.otherwise
            ? applyEffect(draft, effect.otherwise, { ...ctx, slot: ctx.slot + '.else' })
            : { ids };
    }

    // `chance` e sorteio de mesa. Usa a semente da partida.
    if(typeof effect.chance === 'number' && effect.timing !== Timing.passive){
        if(rand(draft) >= effect.chance){
            log(draft, { type: 'chance.miss', action: effect.action, chance: effect.chance, idCard: ctx.idCard });
            return { ids, missed: true };
        }
    }

    // `optional` e "pode, se quiser": so atinge quem aceitou, e todos
    // respondem juntos. Quem a carta ja obrigou a beber entra na rodada sem
    // ter o que escolher — senao a rodada o apontaria (carta 4).
    let finalIds = ids;
    if(effect.optional === true && effect.action !== Action.choice){
        const accepted = ctx.choices?.[ctx.slot + ':optIn'] ?? {};
        const forced = forcedDrinkers(draft, ctx, ids);
        const round = [...ids, ...forced];
        const answered = round.filter(id => accepted[id] !== undefined);
        if(answered.length < round.length){
            return { needs: { kind: 'optIn', slot: ctx.slot, candidates: ids, forced, answered,
                ...(ctx.selfRelease ? { selfRelease: true } : {}) } };
        }
        finalIds = ids.filter(id => accepted[id] === true);
    }

    if(effect.action === Action.choice){
        if(effect.chooser === Chooser.table){
            const result = vote(draft, effect, ctx);
            if(result.needs) return result;
            const handled = HANDLERS[Action.choice](draft, effect, finalIds, { ...ctx, voted: result.picked });
            return handled?.needs ? handled : { ids: finalIds };
        }
        if(ctx.choices?.[ctx.slot + ':option'] === undefined){
            const chooserId = effect.chooser === Chooser.target
                ? (finalIds[0] ?? ctx.sourceId)
                : ctx.sourceId;
            const options = (effect.options ?? []).length + (effect.skippable ? 1 : 0);
            return { needs: {
                kind: 'option',
                slot: ctx.slot,
                chooserId,
                options,
                labels: [...(effect.options ?? []).map(o => o.label ?? null),
                    ...(effect.skippable ? ['Pular'] : [])],
            } };
        }
    }

    if(isTableEffect(effect)){
        plantOnTable(draft, effect, ctx, true);
        return { ids: finalIds };
    }

    // O que dura: aplica (ou guarda) agora, fica em `ongoing`, e o fim desfaz.
    // Equipar e agora: a carta vai para a cadeira, e e ela que dura.
    if(effect.action !== Action.equip && (effect.duration || !NOW.has(effect.timing)
        || effect.action === Action.gameEndIn || effect.action === Action.gameEndWhen)){
        // A pausa da 84 e da 48 e de verdade (skipTurns); a duracao e da
        // imunidade, ou da prisao.
        const durable = planted(draft, effect, finalIds, ctx);
        if(durable){
            if(effect.then){
                return applyEffect(draft, effect.then, { ...ctx, slot: ctx.slot + '.then', previous: finalIds });
            }
            return { ids: finalIds };
        }
        // Delayed sem estado proprio (94: joga 2 na volta) e passivo de
        // equipamento caem no handler — que sabe o que fazer com o timing.
        if(effect.timing === Timing.passive || effect.timing === Timing.onTargetTurn
            || effect.timing === Timing.eachTurn){
            return { ids: finalIds };
        }
    }

    const handler = HANDLERS[effect.action];
    if(!handler){
        log(draft, { type: 'unhandled', action: effect.action });
        return { ids: finalIds };
    }
    const result = handler(draft, effect, finalIds, ctx);
    if(result?.needs) return result;

    if(effect.then){
        return applyEffect(draft, effect.then, { ...ctx, slot: ctx.slot + '.then', previous: finalIds });
    }
    return { ids: finalIds };
}

/**
 * Roda a entrada inteira de uma carta (`{ effects, ritual, note }`).
 *
 * Para na primeira escolha faltando: o efeito seguinte pode depender dos
 * alvos do anterior (`sameTarget`, `except: 'previous'`), que vao em
 * `ctx.previous`.
 *
 * O ritual entra na fila no fim — ou no comeco, com `ritualFirst` (75: inventar
 * a carta vem antes do voto). Como a resolucao e refeita desde o snapshot a
 * cada resposta, o ritual cumprido fica marcado em `choices['ritual:done']`.
 */
export function runEffects(draft, entry, ctx, { ritual = true } = {}){
    const effects = entry?.effects ?? [];
    const ritualDone = ctx.choices?.['ritual:done'] === true;
    if(ritual && entry?.ritual && entry.ritualFirst && !ritualDone && !ctx.rehearsal){
        queueRitual(draft, entry, ctx);
    }
    let previous = ctx.previous ?? [];
    for(let i = 0; i < effects.length; i++){
        const slot = (ctx.slot ? ctx.slot + '.' : '') + i;
        const result = applyEffect(draft, effects[i], { ...ctx, slot, previous });
        if(result.needs) return { needs: result.needs, from: i };
        // Equipamento: o que vem depois do `equip` e o que ele faz enquanto
        // estiver na cadeira, e isso e lido na hora ou dispara na vez do
        // portador — nao agora.
        if(effects[i].action === Action.equip) break;
        previous = result.ids ?? previous;
    }
    if(ritual && entry?.ritual && !entry.ritualFirst) queueRitual(draft, entry, ctx);
    return {};
}

function queueRitual(draft, entry, ctx){
    log(draft, { type: 'ritual', text: entry.ritual });
    draft.rituals = [...(draft.rituals ?? []),
        { playerId: ctx.sourceId, text: entry.ritual, idCard: ctx.idCard ?? null, uid: ctx.uid ?? null }];
}

// ---------------------------------------------------- gatilhos da vez

/**
 * Os efeitos que disparam no comeco da vez de um jogador, ja na ordem:
 * a carta 1 que cobra dele, e os equipamentos que ele carrega.
 *
 * Os que nao perguntam nada rodam aqui mesmo; os que perguntam (70, 77)
 * voltam como gatilhos para o motor abrir o pedido.
 */
export function turnStartEffects(draft, player){
    const interactive = [];
    for(const ongoing of [...draft.ongoing]){
        if(ongoing.kind !== OngoingKind.turnDrink && !(ongoing.timing === Timing.onTargetTurn && !ongoing.kind)) continue;
        if(!ongoing.targets.includes(player.id)) continue;
        runEffects(draft, { effects: [{ ...ongoing.effect, timing: Timing.immediate }] }, {
            sourceId: ongoing.sourceId, idCard: ongoing.idCard, uid: ongoing.uid,
            choices: { 0: ongoing.targets }, previous: ongoing.targets, slot: '', seedRef: draft,
        });
        if(ongoing.turnsLeft !== null && ongoing.turnsLeft !== undefined) ongoing.turnsLeft--;
        log(draft, { type: 'ongoing.trigger', idCard: ongoing.idCard, playerId: player.id,
            timing: Timing.onTargetTurn, turnsLeft: ongoing.turnsLeft ?? null });
        if(ongoing.turnsLeft !== null && ongoing.turnsLeft !== undefined && ongoing.turnsLeft <= 0){
            endOngoing(draft, ongoing);
        }
    }

    for(const item of [...player.equipment]){
        const as = behavior(item);
        const ctx = { sourceId: item.from, idCard: item.idCard, choices: {}, slot: '', seedRef: draft, previous: [] };
        if(as === 73){
            // Pixuco: quem nao e Sjehnsens nem Swelcows bebe 1 na vez dele.
            if([Mission.sjehnsens, Mission.swelcows].includes(player.mission)) continue;
            log(draft, { type: 'ongoing.trigger', idCard: item.idCard, playerId: player.id, timing: 'equip' });
            drink(draft, player.id, 1, ctx);
        }else if(as === 93){
            // Boleto: 1 shot, 50% do segundo, 25% do terceiro. Quita so se os
            // tres sairem na mesma vez.
            log(draft, { type: 'ongoing.trigger', idCard: item.idCard, playerId: player.id, timing: 'equip' });
            let paid = 1;
            drink(draft, player.id, 1, ctx);
            if(rand(draft) < 0.5){
                paid++;
                drink(draft, player.id, 1, ctx);
                if(rand(draft) < 0.25){
                    paid++;
                    drink(draft, player.id, 1, ctx);
                }
            }
            log(draft, { type: 'boleto', playerId: player.id, paid });
            if(paid >= 3) destroyEquipment(draft, player.id, item, 'paid');
        }else if(as === 70 || as === 77){
            interactive.push({ kind: 'equip', idCard: item.idCard, as, byId: player.id, equipUid: item.uid });
        }
    }
    return interactive;
}

/** Os efeitos de um gatilho que pergunta: o que o equipamento faz na vez do portador. */
export function triggerEffects(trigger){
    if(trigger.kind === 'prison'){
        return [{ action: Action.drink, target: { kind: 'self' }, amount: 1, optional: true }];
    }
    const entry = getCardEffects(trigger.as ?? trigger.idCard);
    return (entry?.effects ?? []).slice(1).map(effect => {
        const { timing, duration, ...rest } = effect;
        return rest;
    });
}

export { Goal, Negatable, Scope };
