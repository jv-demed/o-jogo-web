import { Action, Chooser, Negatable, Pile, Rounding, Scope, Timing } from '../cards/vocabulary.js';
import { MISSIONS } from './missions.js';
import { nextRandom } from './rng.js';
import { fromDiscard, playerById, releaseOngoingCard, toDiscard } from './state.js';
import { meetsCondition, resolveTarget } from './targeting.js';

/**
 * O resolvedor: uma acao do vocabulario de cada vez.
 *
 * Cada carta especial e tratada individualmente, mas nao *por carta* — por
 * acao. Sao 116 cartas e 44 acoes: quem escreve caso a caso por carta escreve
 * o mesmo `bebe N` cem vezes. A carta ja e dado (domain/cards/effects/), entao
 * aqui mora so o que cada verbo faz com a mesa.
 *
 * O que este arquivo *nao* faz: turno, pilha e janela de interferencia, que
 * sao de engine.js. Aqui e sempre "este efeito, agora, nestes alvos".
 *
 * Convencao: toda funcao recebe `draft`, ja clonado pelo motor, e muda em
 * cima. A imutabilidade e garantida na fronteira do comando, nao aqui dentro —
 * fazer copia a cada shot deixaria o codigo ilegivel sem ganhar nada.
 */

// "Infinitos shots" (carta 1 do vocabulario, `shots.set` com amount 'infinity')
// precisa sobreviver ao JSON.stringify que leva o estado ate o banco.
// Infinity vira null no JSON; este numero, nao.
export const INFINITE_SHOTS = Number.MAX_SAFE_INTEGER;

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

// -------------------------------------------------------------------- shots

/**
 * Beber de verdade: conta na apuracao, credita quem mandou beber (a metrica do
 * Sjamals) e alimenta as duracoes `untilDrinks`.
 *
 * `shots.ignore` ativo no alvo faz o shot ser bebido e nao contar — a carta 135
 * do pack 2 e exatamente isso, e por isso e um flag e nao um desconto depois.
 */
function drink(draft, ids, amount, ctx){
    for(const id of ids){
        const player = playerById(draft, id);
        if(!player) continue;

        if(player.ignoringShots > 0){
            player.shotsIgnored += amount;
            log(draft, { type: 'drink', playerId: id, amount, counted: false });
        }else{
            player.shots += amount;
            log(draft, { type: 'drink', playerId: id, amount, counted: true });
        }

        if(ctx.sourceId !== id){
            const source = playerById(draft, ctx.sourceId);
            if(source) source.shotsGiven += amount;
        }
        for(const ongoing of draft.ongoing){
            if(ongoing.duration?.kind === 'untilDrinks' && ongoing.targets.includes(id)){
                ongoing.drinksLeft = (ongoing.drinksLeft ?? ongoing.duration.amount) - amount;
            }
        }
        // Vinculo de shots: quem esta ligado bebe junto. Nao recursivo de
        // proposito — dois vinculos cruzados se realimentariam sem fim.
        for(const linked of draft.links ?? []){
            if(linked.kind !== 'shots' || !linked.between.includes(id)) continue;
            for(const other of linked.between.filter(x => x !== id)){
                const target = playerById(draft, other);
                if(target) target.shots += amount;
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
 * Compra.
 *
 * Baralho vazio *nao* embaralha o descarte de volta: e o fim da partida. Foi a
 * escolha de 2026-08-26 para a duracao ter um limite natural — com reembaralho,
 * nenhuma mesa termina sozinha, so por carta de fim de jogo, e a partida vira
 * refem de quem comprou o pack certo. Assim o tamanho do baralho e o relogio, e
 * quem monta o deck escolhe o comprimento da partida.
 *
 * Quem encerra e o motor (engine.js), no fim do comando: a carta em curso ainda
 * resolve.
 */
function draw(draft, player, count, from = Pile.top){
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

// ----------------------------------------------------------------- missoes

/**
 * Trocar missao move o par identidade+meta junto — sao a mesma coisa, como diz
 * o vocabulario. `missionLocked` barra: e o que `mission.lock` compra.
 */
function swapMissions(draft, a, b){
    const first = playerById(draft, a);
    const second = playerById(draft, b);
    if(!first || !second) return false;
    if(first.missionLocked || second.missionLocked){
        log(draft, { type: 'mission.swap.blocked', between: [a, b] });
        return false;
    }
    [first.mission, second.mission] = [second.mission, first.mission];
    [first.goal, second.goal] = [second.goal, first.goal];
    // A missao que trocou de dono deixa de estar revelada: a mesa viu a
    // identidade, nao o assento.
    first.missionRevealed = false;
    second.missionRevealed = false;
    expireOnMissionChange(draft, [a, b]);
    log(draft, { type: 'mission.swap', between: [a, b] });
    return true;
}

/** Encerra efeitos com duracao `untilMissionChange` ligados a estes jogadores. */
function expireOnMissionChange(draft, ids){
    draft.ongoing = draft.ongoing.filter(ongoing => {
        if(ongoing.duration?.kind !== 'untilMissionChange') return true;
        if(ongoing.duration.mission !== undefined){
            return !ids.some(id => playerById(draft, id)?.mission === ongoing.duration.mission);
        }
        return !ongoing.targets.some(id => ids.includes(id));
    });
}

// ------------------------------------------------------------- handlers

/**
 * Uma entrada por acao do vocabulario. O default explicito la embaixo existe
 * para que uma acao nova sem handler apareca no log como pendencia, em vez de
 * sumir em silencio.
 *
 * Assinatura: (draft, effect, ids, ctx) -> void
 *   `ids` ja e a lista de alvos resolvida; `ctx` carrega quem jogou.
 */
const HANDLERS = {
    [Action.drink]: (draft, effect, ids, ctx) => {
        for(const id of ids){
            drink(draft, [id], amountOf(effect, draft, playerById(draft, id)), ctx);
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
            if(player) player.shots = Math.max(0, player.shots - amountOf(effect, draft, player));
        }
    },

    [Action.shotsSet]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(player) player.shots = amountOf(effect, draft, player);
        }
    },

    [Action.shotsHalve]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(player) player.shots = round(player.shots / 2, effect.rounding ?? Rounding.down);
        }
    },

    [Action.shotsSwap]: (draft, effect, ids, ctx) => {
        const [a, b] = pairOf(ids, ctx);
        const first = playerById(draft, a);
        const second = playerById(draft, b);
        if(first && second) [first.shots, second.shots] = [second.shots, first.shots];
    },

    // Tira de um, poe no outro. `between` chega em ordem: sai do primeiro.
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

    // Nao e pontual: liga um contador que faz os proximos shots nao contarem.
    // Quem desliga e a duracao, em engine.js.
    [Action.shotsIgnore]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(player) player.ignoringShots = (player.ignoringShots ?? 0) + 1;
        }
    },

    [Action.turnSkip]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(player) player.skipTurns += amountOf(effect, draft, player);
        }
    },

    [Action.turnExtraPlay]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(player) player.extraPlays += amountOf(effect, draft, player);
        }
    },

    [Action.handDraw]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(player) draw(draft, player, amountOf(effect, draft, player), effect.from);
        }
    },

    // Quais cartas descartar e escolha de quem descarta; chega em `choices`.
    // Sem escolha, cai nas primeiras da mao — que e o que o descarte
    // aleatorio de mesa faz na pratica.
    [Action.handDiscard]: (draft, effect, ids, ctx) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(!player) continue;
            const count = amountOf(effect, draft, player);
            const chosen = asList(ctx.choices?.[ctx.slot + ':cards'] ?? []).filter(c => player.hand.includes(c));
            discard(draft, player, chosen.length ? chosen.slice(0, count) : player.hand.slice(0, count));
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

    [Action.handSteal]: (draft, effect, ids, ctx) => {
        const thief = playerById(draft, ctx.sourceId);
        if(!thief) return;
        for(const id of ids){
            const victim = playerById(draft, id);
            if(!victim || victim.hand.length === 0) continue;
            const count = Math.min(amountOf(effect, draft, victim), victim.hand.length);
            for(let i = 0; i < count; i++){
                // Roubo as cegas: sorteia. `blind: false` na carta significa
                // que o ladrao ve a mao e escolhe — dai a escolha em choices.
                const chosen = ctx.choices?.[ctx.slot + ':cards']?.[i];
                let index = victim.hand.indexOf(chosen);
                if(index === -1){
                    const rolled = nextRandom(draft.seed);
                    draft.seed = rolled.seed;
                    index = Math.floor(rolled.value * victim.hand.length);
                }
                thief.hand.push(victim.hand.splice(index, 1)[0]);
            }
            log(draft, { type: 'hand.steal', from: id, to: thief.id, count });
        }
    },

    [Action.handGive]: (draft, effect, ids, ctx) => {
        const giver = playerById(draft, ctx.sourceId);
        if(!giver) return;
        for(const id of ids){
            const receiver = playerById(draft, id);
            if(!receiver) continue;
            const count = Math.min(amountOf(effect, draft, giver), giver.hand.length);
            const chosen = asList(ctx.choices?.[ctx.slot + ':cards'] ?? []).filter(c => giver.hand.includes(c));
            const cards = chosen.length ? chosen.slice(0, count) : giver.hand.slice(0, count);
            for(const idCard of cards){
                giver.hand.splice(giver.hand.indexOf(idCard), 1);
                receiver.hand.push(idCard);
            }
        }
    },

    // Revelar nao move carta: marca o que a mesa passou a saber. Guardar isso
    // no estado (e nao so numa animacao) e o que deixa o Sjehnsens jogavel.
    [Action.handReveal]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(!player) continue;
            const count = amountOf(effect, draft, player);
            const cards = player.hand.slice(0, count);
            player.revealed = [...(player.revealed ?? []), ...cards];
            log(draft, { type: 'hand.reveal', playerId: id, cards });
        }
    },

    [Action.deckPeek]: (draft, effect, ids, ctx) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(!player) continue;
            const count = amountOf(effect, draft, player);
            const cards = effect.from === Pile.bottom
                ? player.deck.slice(-count)
                : player.deck.slice(0, count);
            const watcher = playerById(draft, ctx.sourceId);
            if(watcher) watcher.peeked = { playerId: id, cards };
            log(draft, { type: 'deck.peek', playerId: id, by: ctx.sourceId, count });
        }
    },

    // Volta cartas do descarte (ou da mao) para o baralho.
    [Action.deckReturn]: (draft, effect, ids, ctx) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(!player) continue;
            const source = effect.from === Pile.hand ? player.hand : player.discard;
            const count = Math.min(amountOf(effect, draft, player), source.length);
            const chosen = asList(ctx.choices?.[ctx.slot + ':cards'] ?? []).filter(c => source.includes(c));
            const cards = chosen.length ? chosen.slice(0, count) : source.slice(0, count);
            for(const idCard of cards){
                if(effect.from === Pile.hand) source.splice(source.indexOf(idCard), 1);
                else fromDiscard(draft, player, idCard);
                player.deck.unshift(idCard);
            }
        }
    },

    [Action.missionSwap]: (draft, effect, ids, ctx) => {
        const [a, b] = pairOf(ids, ctx);
        if(a !== undefined && b !== undefined) swapMissions(draft, a, b);
    },

    // Todos passam a missao adiante, na roda. Uma so rotacao, nao N trocas.
    [Action.missionRotate]: (draft, effect, ids) => {
        const ring = ids.length >= 2 ? ids : draft.order.filter(id => !playerById(draft, id)?.out);
        if(ring.length < 2) return;
        const missions = ring.map(id => playerById(draft, id).mission);
        ring.forEach((id, i) => {
            const player = playerById(draft, id);
            const mission = missions[(i - 1 + ring.length) % ring.length];
            player.mission = mission;
            player.goal = MISSIONS[mission].goal;
            player.missionRevealed = false;
        });
        expireOnMissionChange(draft, ring);
        log(draft, { type: 'mission.rotate', ring });
    },

    // Espiar e informacao privada de quem jogou; revelar e publica. A diferenca
    // e o motivo de serem duas acoes e nao um flag.
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

    // Muda a condicao de vitoria de quem carrega aquela missao — nao troca a
    // missao de dono. Por isso mexe em `goal`, e nao em `mission`.
    [Action.missionSetGoal]: (draft, effect) => {
        for(const player of draft.players){
            if(asList(effect.mission).includes(player.mission)) player.goal = effect.goal;
        }
        log(draft, { type: 'mission.setGoal', mission: effect.mission, goal: effect.goal });
    },

    // Tomar a missao do alvo e uma troca em que quem joga escolhe o lado.
    [Action.missionTake]: (draft, effect, ids, ctx) => {
        for(const id of ids) swapMissions(draft, ctx.sourceId, id);
    },

    [Action.missionLock]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(player) player.missionLocked = true;
        }
    },

    // Troca em cadeia: A com B, B com C... ate a condicao de parada. Sem
    // condicao, roda a mesa inteira uma vez.
    [Action.missionChain]: (draft, effect, ids, ctx) => {
        let current = ctx.sourceId;
        const visited = new Set([current]);
        for(const id of [...ids, ...draft.order]){
            if(visited.has(id)) continue;
            if(!swapMissions(draft, current, id)) break;
            visited.add(id);
            current = id;
            if(effect.condition && meetsCondition(draft, effect.condition, [id], ctx)) break;
        }
    },

    // negate/redirect nao mexem na mesa aqui: quem os consome e a pilha, em
    // engine.js, no momento de resolver a jogada de baixo. Este handler so
    // registra, para o log da mesa contar a historia certa.
    [Action.negate]: (draft, effect, ids, ctx) => {
        log(draft, { type: 'negate', what: effect.what, by: ctx.sourceId });
    },

    // Desviar e cancelar mais mandar de volta: quem manda beber e que bebe. O
    // cancelamento da jogada de baixo e da pilha (engine.js); o shot que sobra
    // e este handler.
    [Action.redirect]: (draft, effect, ids, ctx) => {
        log(draft, { type: 'redirect', what: effect.what, by: ctx.sourceId, to: ids });
        if(effect.what === Negatable.drink && ids.length){
            drink(draft, ids, amountOf(effect, draft, playerById(draft, ids[0])), ctx);
        }
    },

    [Action.equip]: (draft, effect, ids, ctx) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(player) player.equipment.push({ idCard: ctx.idCard, from: ctx.sourceId });
        }
        log(draft, { type: 'equip', idCard: ctx.idCard, targets: ids });
    },

    [Action.equipmentDestroy]: (draft, effect, ids, ctx) => {
        const chosen = asList(ctx.choices?.[ctx.slot + ':cards'] ?? []);
        for(const id of ids){
            const player = playerById(draft, id);
            if(!player || player.equipment.length === 0) continue;
            const index = chosen.length
                ? player.equipment.findIndex(e => chosen.includes(e.idCard))
                : 0;
            if(index === -1) continue;
            const [removed] = player.equipment.splice(index, 1);
            dropOngoingFromEquipment(draft, id, removed.idCard);
            log(draft, { type: 'equipment.destroy', playerId: id, idCard: removed.idCard });
        }
    },

    [Action.equipmentTransfer]: (draft, effect, ids, ctx) => {
        const [a, b] = pairOf(ids, ctx);
        const from = playerById(draft, a);
        const to = playerById(draft, b);
        if(!from || !to || from.equipment.length === 0) return;
        const chosen = asList(ctx.choices?.[ctx.slot + ':cards'] ?? []);
        const index = chosen.length ? from.equipment.findIndex(e => chosen.includes(e.idCard)) : 0;
        if(index === -1) return;
        const [moved] = from.equipment.splice(index, 1);
        to.equipment.push(moved);
        // O equipamento leva junto os efeitos passivos: eles apontam para o
        // portador, e o portador mudou.
        for(const ongoing of draft.ongoing){
            if(ongoing.idCard === moved.idCard && ongoing.equippedTo === a) ongoing.equippedTo = b;
        }
    },

    [Action.orderReverse]: draft => {
        draft.direction *= -1;
        log(draft, { type: 'order.reverse', direction: draft.direction });
    },

    // Rearranjar mexe nos assentos, nao em quem esta jogando: a vez continua
    // com quem estava jogando, ainda que agora sentado em outro lugar.
    [Action.orderRearrange]: (draft, effect, ids, ctx) => {
        if(ids.length < 2) return;
        const currentId = draft.order[draft.turnIndex];
        const seats = ids.map(id => draft.order.indexOf(id)).filter(i => i !== -1).sort((a, b) => a - b);
        const wanted = asList(ctx.choices?.[ctx.slot + ':order'] ?? [...ids].reverse());
        seats.forEach((seat, i) => { draft.order[seat] = wanted[i] ?? ids[i]; });
        draft.turnIndex = draft.order.indexOf(currentId);
        log(draft, { type: 'order.rearrange', order: [...draft.order] });
    },

    [Action.gameEndIn]: (draft, effect) => {
        const turns = typeof effect.amount === 'number' ? effect.amount : 1;
        draft.endsInTurns = draft.endsInTurns === null ? turns : Math.min(draft.endsInTurns, turns);
        log(draft, { type: 'game.endIn', turns });
    },

    // Condicao de fim que fica de sentinela. Quem checa e o motor, a cada
    // turno; guardar aqui e so registrar a promessa.
    [Action.gameEndWhen]: (draft, effect) => {
        draft.endWhen = [...(draft.endWhen ?? []), effect.condition];
        log(draft, { type: 'game.endWhen', condition: effect.condition });
    },

    [Action.gameWin]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(player) player.forcedWin = true;
        }
        log(draft, { type: 'game.win', targets: ids });
    },

    [Action.gameLose]: (draft, effect, ids) => {
        for(const id of ids){
            const player = playerById(draft, id);
            if(player) player.forcedLose = true;
        }
        log(draft, { type: 'game.lose', targets: ids });
    },

    [Action.linkShots]: (draft, effect, ids, ctx) => {
        const between = pairOf(ids, ctx);
        if(between.length === 2){
            draft.links = [...(draft.links ?? []), { kind: 'shots', between }];
        }
    },

    // Destino ligado: ganham ou perdem juntos. Nao e shot, e apuracao — por
    // isso e um vinculo lido no fim, e nao um handler que mexe em contador.
    [Action.linkFate]: (draft, effect, ids, ctx) => {
        const between = pairOf(ids, ctx);
        if(between.length === 2){
            draft.links = [...(draft.links ?? []), { kind: 'fate', between, secret: effect.target?.secret === true }];
        }
    },

    // Dissipar: apaga efeitos prolongados e/ou equipamentos em jogo.
    [Action.auraDispel]: (draft, effect, ids) => {
        const scope = effect.scope;
        if(scope === Scope.prolonged || scope === Scope.all){
            const dispelled = draft.ongoing.filter(o => o.timing === Timing.eachTurn
                || o.timing === Timing.onTargetTurn
                || o.timing === Timing.delayed);
            draft.ongoing = draft.ongoing.filter(o => !dispelled.includes(o));
            // Dissipar tira o efeito da mesa, e a carta que estava segurando ele
            // na area do alvo vai junto para o descarte.
            for(const gone of dispelled) releaseOngoingCard(draft, gone);
        }
        if(scope === Scope.equipment || scope === Scope.all){
            const affected = ids.length ? ids : draft.players.map(p => p.id);
            for(const id of affected){
                const player = playerById(draft, id);
                if(!player) continue;
                for(const item of player.equipment) dropOngoingFromEquipment(draft, id, item.idCard);
                player.equipment = [];
            }
        }
        log(draft, { type: 'aura.dispel', scope });
    },

    // Copiar so faz sentido com a pilha na mao: o motor injeta os efeitos da
    // carta copiada em `ctx.copyOf` antes de chamar. Sem isso, nao ha o que
    // copiar e a carta resolve em branco (mesa vazia, primeira jogada).
    [Action.copy]: (draft, effect, ids, ctx) => {
        if(!ctx.copyOf) {
            log(draft, { type: 'copy.empty', scope: effect.scope });
            return;
        }
        runEffects(draft, { effects: ctx.copyOf }, { ...ctx, copyOf: null });
    },

    // Escolha entre opcoes. A opcao escolhida vem em `choices`; sem ela, o
    // motor ja teria aberto um pending antes de chegar aqui.
    [Action.choice]: (draft, effect, ids, ctx) => {
        const picked = ctx.choices?.[ctx.slot + ':option'];
        const option = effect.options?.[picked ?? 0];
        if(!option) return;
        applyEffect(draft, option, { ...ctx, slot: ctx.slot + '.' + (picked ?? 0), previous: ids });
    },

    // Juiz humano. Nao ha o que executar: entra no log para a mesa cumprir e
    // fica registrado que aconteceu.
    [Action.manual]: (draft, effect, ids, ctx) => {
        log(draft, { type: 'manual', instruction: effect.instruction, by: ctx.sourceId, targets: ids });
    },
};

function dropOngoingFromEquipment(draft, playerId, idCard){
    draft.ongoing = draft.ongoing.filter(o => !(o.idCard === idCard && o.equippedTo === playerId));
}

// ------------------------------------------------------- percurso do efeito

const NOW = new Set([Timing.immediate, Timing.reaction, undefined]);

/**
 * Resolve um efeito: alvo, condicao, sorte, acao e o `then` encadeado.
 *
 * @returns {{ needs?: object }} `needs` preenchido quer dizer que falta uma
 *          escolha; o motor abre um pending e repete o comando depois.
 */
export function applyEffect(draft, effect, ctx){
    const spec = effect.between ?? effect.target;
    const resolved = resolveTarget(draft, spec, ctx);
    if(resolved.needs) return { needs: resolved.needs };
    const ids = resolved.ids;

    if(!meetsCondition(draft, effect.if, ids, ctx)){
        return effect.otherwise
            ? applyEffect(draft, effect.otherwise, { ...ctx, slot: ctx.slot + '.else' })
            : {};
    }

    // `chance` e sorteio de mesa (carta 43: comprar com 50%). Usa a semente da
    // partida para o resultado ser reconferivel depois.
    if(typeof effect.chance === 'number'){
        const rolled = nextRandom(draft.seed);
        draft.seed = rolled.seed;
        if(rolled.value >= effect.chance){
            log(draft, { type: 'chance.miss', action: effect.action, chance: effect.chance });
            return {};
        }
    }

    // `optional` e "pode, se quiser": so atinge quem aceitou. A pergunta e de
    // cada candidato, um por vez — "todos podem beber" e cinco decisoes, nao
    // uma. Quem jogou a carta nao responde pelos outros.
    let finalIds = ids;
    if(effect.optional === true){
        const accepted = ctx.choices?.[ctx.slot + ':optIn'] ?? {};
        const faltando = ids.find(id => accepted[id] === undefined);
        if(faltando !== undefined){
            return { needs: { kind: 'optIn', slot: ctx.slot, chooserId: faltando, candidates: ids } };
        }
        finalIds = ids.filter(id => accepted[id] === true);
    }

    // Carta que oferece opcoes so resolve depois de alguem escolher. Perguntar
    // aqui, e nao dentro do handler, e o que permite parar a resolucao — o
    // handler ja nao teria como voltar atras.
    if(effect.action === Action.choice && ctx.choices?.[ctx.slot + ':option'] === undefined){
        // `chooser: 'table'` e voto da mesa, que ainda nao existe como
        // mecanica; ate existir, decide quem jogou a carta.
        const chooserId = effect.chooser === Chooser.target
            ? (finalIds[0] ?? ctx.sourceId)
            : ctx.sourceId;
        return { needs: {
            kind: 'option',
            slot: ctx.slot,
            chooserId,
            options: (effect.options ?? []).length,
            byTable: effect.chooser === Chooser.table,
        } };
    }

    // Efeito que nao resolve agora vira estado prolongado. A pilha continua:
    // quem executa depois e o motor, no turno certo.
    if(!NOW.has(effect.timing)){
        draft.ongoing.push({
            id: draft.ongoing.length + 1,
            effect,
            targets: finalIds,
            sourceId: ctx.sourceId,
            idCard: ctx.idCard,
            // A jogada que plantou o efeito. E por ele que o motor sabe que a
            // carta ficou na mesa em vez de ir para o descarte, e que sabe qual
            // carta devolver quando a duracao acabar.
            uid: ctx.uid ?? null,
            equippedTo: effect.timing === Timing.passive ? finalIds[0] : undefined,
            timing: effect.timing,
            duration: effect.duration ?? null,
            turnsLeft: effect.duration?.kind === 'turns' ? effect.duration.turns : null,
            drinksLeft: effect.duration?.kind === 'untilDrinks' ? effect.duration.amount : null,
        });
        log(draft, { type: 'ongoing', action: effect.action, timing: effect.timing,
            idCard: ctx.idCard, targets: finalIds,
            turns: effect.duration?.kind === 'turns' ? effect.duration.turns : null });
        return {};
    }

    const handler = HANDLERS[effect.action];
    if(!handler){
        log(draft, { type: 'unhandled', action: effect.action });
        return {};
    }
    handler(draft, effect, finalIds, ctx);

    if(effect.then){
        return applyEffect(draft, effect.then, { ...ctx, slot: ctx.slot + '.then', previous: finalIds });
    }
    return {};
}

/**
 * Roda a entrada inteira de uma carta (`{ effects, ritual, note }`).
 *
 * Para na primeira escolha faltando e devolve `needs`: nao adianta resolver o
 * segundo efeito antes de saber o alvo do primeiro, porque `sameTarget` e
 * `then` dependem dele.
 */
export function runEffects(draft, entry, ctx){
    const effects = entry?.effects ?? [];
    for(let i = 0; i < effects.length; i++){
        const slot = (ctx.slot ? ctx.slot + '.' : '') + i;
        const result = applyEffect(draft, effects[i], { ...ctx, slot });
        if(result.needs) return { needs: result.needs, from: i };
    }
    if(entry?.ritual) log(draft, { type: 'ritual', text: entry.ritual });
    return {};
}
