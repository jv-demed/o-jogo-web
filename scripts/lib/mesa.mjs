// A mesa de mentira: montar partida, jogar carta, responder escolha, beber.
//
// Saiu do validate-match.mjs quando o validate-cards.mjs nasceu: os dois jogam
// carta do mesmo jeito, e duas copias deste arquivo seriam duas mesas que
// discordam em silencio sobre quem responde o que. Continua em Node puro, sem
// dependencia — o motor em domain/match/ e puro, e e so ele que se importa.
//
// Nada aqui decide regra. Quem decide e o `apply`; isto aqui so aperta os
// botoes que a tela apertaria, do jeito mais simples que passa.

import { Command, apply } from '../../domain/match/engine.js';
import { arrangeTable } from '../../domain/match/dev.js';
import { CARD_EFFECTS } from '../../domain/cards/effects/index.js';
import { MISSIONS } from '../../domain/match/missions.js';
import { MatchStatus, Phase, createMatch, isSimultaneous, optInRound } from '../../domain/match/state.js';

export const IDS = Object.keys(CARD_EFFECTS).map(Number).sort((a, b) => a - b);

/**
 * O descarte da mesa (`state.discardPile`, em ordem) e os montes de cada
 * jogador (`player.discard`) sao a mesma carta contada duas vezes: um sabe
 * quando ela caiu, o outro de quem ela e. Escrever num e esquecer o outro faz
 * a pilha do centro mostrar carta errada — e e um bug silencioso, porque cada
 * lado sozinho continua coerente. Por isso os dois batem em toda simulacao.
 */
export function descarteBate(state){
    const daMesa = new Map();
    for(const { idCard, playerId } of state.discardPile){
        const chave = `${playerId}:${idCard}`;
        daMesa.set(chave, (daMesa.get(chave) ?? 0) + 1);
    }
    for(const player of state.players){
        for(const idCard of player.discard){
            const chave = `${player.id}:${idCard}`;
            const resta = daMesa.get(chave) ?? 0;
            if(resta === 0) return false;
            daMesa.set(chave, resta - 1);
        }
    }
    return [...daMesa.values()].every(resta => resta === 0);
}

/**
 * So os jogadores, para a apuracao: `evaluateMissions` nao precisa de partida,
 * e montar uma inteira para testar quem ganha seria barulho.
 */
export function mesa(players){
    return { players: players.map((p, i) => ({
        id: i + 1, shots: 0, shotsGiven: 0, guesses: {}, ...p,
        goal: p.goal ?? MISSIONS[p.mission].goal,
    })) };
}

export function novaMesa(seed = 1, lugares = 5){
    return createMatch({
        seed,
        players: Array.from({ length: lugares }, (_, i) => i + 1).map(id => ({
            id,
            name: 'p' + id,
            // Baralho generico: nao importa o que tem, a carta testada e
            // colocada na mao a mao. Precisa so ser fundo para as compras.
            deck: IDS.slice(0, 30),
        })),
    });
}

/**
 * Uma partida de verdade com a mesa montada a mao: a missao, os shots e a mao
 * de cada assento, e a vez de quem vai jogar. Os ids sao 1..N na ordem da
 * lista, entao `joga: 2` e o segundo assento.
 *
 * Quem monta e o `arrangeTable` de domain/match/dev.js — o mesmo que o
 * laboratorio de carta usa, para que a mesa do teste e a da tela sejam a mesma.
 *
 * @param {{mission: string, shots?: number, mao?: number[]}[]} assentos
 * @param {{seed?: number, joga?: number|string}} [opcoes] `joga` e o id do
 *        assento ou o nome da missao dele.
 */
export function montarMesa(assentos, { seed = 1, joga } = {}){
    const base = novaMesa(seed, assentos.length);
    const turnOf = typeof joga === 'string'
        ? assentos.findIndex(a => a.mission === joga) + 1
        : joga;
    if(turnOf === 0) throw new Error(`ninguem na mesa tem a missao ${joga}`);
    return arrangeTable(base, assentos.map(a => ({
        mission: a.mission, shots: a.shots ?? 0, hand: a.mao,
    })), { turnOf });
}

/**
 * Nome de missao vira id de jogador, na mesa como ela esta *agora*: depois de
 * uma troca, 'swarley' e quem tem a missao, e nao quem tinha no comeco.
 */
export function paraIds(state, valor){
    const lista = Array.isArray(valor) ? valor : [valor];
    return lista.map(item => {
        if(typeof item !== 'string') return item;
        const player = state.players.find(p => p.mission === item);
        if(!player) throw new Error(`ninguem na mesa tem a missao ${item}`);
        return player.id;
    });
}

/**
 * Quem responde o pedido pendente.
 *
 * A rodada de voluntarios (`optIn`) nao tem `chooserId`: ela pergunta a mesa
 * inteira de uma vez, e fecha quando o ultimo responder. A mesa de mentira
 * responde um por vez, na ordem da lista.
 */
export function quemResponde(state){
    const request = state.pending[0];
    return isSimultaneous(request)
        ? optInRound(request).waiting[0]
        : request.chooserId;
}

/**
 * Responde o pedido pendente.
 *
 * Com `escolhas[slot]`, responde o que o cenario mandou; sem, do jeito mais
 * simples que passa. Por tipo de pedido, o que a escolha aceita:
 *   - alvo (`choose`, `manual`): lista de ids ou nomes de missao;
 *   - `optIn`: lista de quem aceita (os outros dizem nao), ou true/false para
 *     todo mundo. Quem a carta ja obrigou responde sim — e o unico botao dele;
 *   - `option`: o indice da opcao;
 *   - `cards`: lista de ids de carta.
 */
export function responder(state, escolhas = {}, quem = quemResponde(state)){
    const request = state.pending[0];
    // Pedido com chave propria (a cadeia da 88, o "para quem" da 80) responde
    // por `slot:chave`; o resto, pelo slot.
    const escolha = request.key !== undefined
        ? escolhas[request.slot + ':' + request.key]
        : escolhas[request.slot];

    if(escolha !== undefined){
        switch(request.kind){
            case 'optIn':
                if((request.forced ?? []).includes(quem)) return true;
                if(typeof escolha === 'boolean') return escolha;
                return paraIds(state, escolha).includes(quem);
            // Voto: lista de quem acha a carta boa, ou true/false para todos.
            case 'vote':
                if(typeof escolha === 'boolean') return escolha;
                return paraIds(state, escolha).includes(quem);
            // Corrida: a ordem de chegada. Quem nao esta na lista toca depois.
            case 'race':
                return true;
            // Descarte de cada um: { missao ou id: [cartas] }.
            case 'handPick': {
                for(const [who, cards] of Object.entries(escolha)){
                    const [id] = paraIds(state, /^\d+$/.test(who) ? Number(who) : who);
                    if(id === quem) return cards;
                }
                return [state.players.find(p => p.id === quem).hand[0]];
            }
            case 'option':
            case 'cards':
            case 'missions':
            case 'ongoing':
                return escolha;
            case 'order':
                return paraIds(state, escolha);
            default:
                return paraIds(state, escolha);
        }
    }

    const outros = state.players.map(p => p.id).filter(id => id !== request.chooserId);
    const todos = state.players.map(p => p.id);

    switch(request.kind){
        case 'optIn':    return true;
        case 'vote':     return true;
        case 'race':     return true;
        case 'handPick': return [state.players.find(p => p.id === quem).hand[0]];
        case 'option':   return 0;
        case 'cards':    return [...new Set(request.cards)].slice(0, request.count ?? 1);
        case 'missions': return request.options.slice(0, request.count ?? 1);
        case 'order':    return [...request.ids].reverse();
        case 'ongoing':  return request.options[0];
        default: {
            const pool = request.candidates ?? todos;
            const count = request.upTo ? Math.min(1, request.count) : request.count;
            const preferidos = pool.filter(id => outros.includes(id));
            return (preferidos.length >= count ? preferidos : pool).slice(0, count);
        }
    }
}

/**
 * Na corrida (46) a ordem de chegada e a resposta: com `escolhas[slot]` como
 * lista, quem toca primeiro e o primeiro da lista.
 */
function quemCorre(state, escolhas){
    const request = state.pending[0];
    const ordem = escolhas?.[request.slot];
    const { waiting } = optInRound(request);
    if(Array.isArray(ordem)){
        for(const id of paraIds(state, ordem)) if(waiting.includes(id)) return id;
    }
    return waiting[0];
}

export const daVez = state => state.players.find(p => p.id === state.order[state.turnIndex]);

/**
 * Bebe o que a mesa deve.
 *
 * Todo shot para a partida ate quem bebeu confirmar, entao nenhuma simulacao
 * anda sem passar por aqui — que e exatamente o ponto da regra. Numa mesa de
 * mentira todo mundo bebe na hora.
 */
export function beber(state, now = 0, passos){
    let current = state;
    let guarda = 0;
    // O ritual vem antes: a musiquinha e o que destrava o shot, e o motor
    // recusa `drank` enquanto ela nao sair.
    while(current.rituals?.length){
        if(guarda++ > 200) throw new Error('fila de rituais sem fim');
        current = apply(current, {
            type: Command.performed,
            playerId: current.rituals[0].playerId,
            now,
        });
        passos?.push(current);
    }
    // A entrada confirmada continua na fila ate o ultimo beber — quem falta e
    // quem ainda nao tem `confirmed`.
    while(current.drinks?.length){
        if(guarda++ > 200) throw new Error('fila de shots sem fim');
        current = apply(current, {
            type: Command.drank,
            playerId: current.drinks.find(entry => !entry.confirmed).playerId,
            now,
        });
        passos?.push(current);
    }
    return current;
}

/** A mesa tem alguma pendencia humana (ritual ou shot) travando a partida? */
export const parada = state => Boolean(state.rituals?.length || state.drinks?.length);

/**
 * A passagem de vez automatica, como o `useMatchDriver` faz na tela: com o
 * turno resolvido nao sobra decisao nenhuma, e a mesa passa sozinha em vez de
 * esperar um toque. Aqui ela precisa existir porque o bot deixou de devolver
 * `endTurn` — sem isto a simulacao trava na fase `end`.
 */
export const passagem = state => (state.status === MatchStatus.progress
    && state.phase === Phase.end
    && !parada(state))
    ? { type: Command.endTurn, playerId: daVez(state)?.id, now: 999999 }
    : null;

/**
 * Passa a vez sem jogar nada: bebe o que a mesa deve e encerra o turno.
 *
 * Pula a compra e a jogada na marra (`phase = end`), que e o que os testes de
 * efeito prolongado querem — o efeito que esta na mesa cobra na virada, sem
 * carta nova nenhuma no meio para confundir a conta.
 */
export function passarVez(state, now = 0, passos, escolhas){
    let current = beber(state, now, passos);
    current = resolverPendentes(current, { escolhas, passos, now });
    current = { ...current, phase: Phase.end };
    current = apply(current, { type: Command.endTurn, playerId: daVez(current).id, now });
    passos?.push(current);
    // O comeco da vez pode perguntar (o equipamento da vez, o preso que pode
    // beber por conta propria): responde antes de seguir.
    return resolverPendentes(current, { escolhas, passos, now });
}

/**
 * Joga uma carta e resolve tudo o que ela abrir, respondendo as escolhas.
 *
 * @param {object} [opcoes]
 * @param {object} [opcoes.escolhas] respostas por slot (ver `responder`).
 * @param {object[]} [opcoes.passos] recebe cada estado intermediario, para o
 *        cenario conferir o que aconteceu *no meio* — a pergunta que a carta
 *        fez, a janela que abriu — e nao so onde a mesa parou.
 * @param {{joga: number|string, carta: number, recusada?: boolean}[]} [opcoes.reacoes]
 *        quem entra na janela, em ordem: cada uma responde ao topo da pilha
 *        de quando entra. A carta vai para a mao de quem reage, igual a
 *        jogada. `recusada: true` diz que o motor tem que recusar a reacao —
 *        e se ele aceitar, a partida estoura.
 */
export function jogar(state, idCard, { escolhas, passos, reacoes = [] } = {}){
    let current = state;
    // A carta so pode ser jogada depois da compra obrigatoria do turno.
    if(current.phase === Phase.draw){
        current = apply(current, { type: Command.draw, playerId: daVez(current).id, now: 0 });
        passos?.push(current);
    }
    const player = daVez(current);
    player.hand = [idCard, ...player.hand];

    current = apply(current, { type: Command.play, playerId: player.id, idCard, now: 0 });
    passos?.push(current);

    return resolverPendentes(current, { escolhas, passos, reacoes });
}

/**
 * Resolve tudo o que a mesa tem aberto: janela, escolha, ritual e shot, ate
 * ela parar numa fase sem pergunta (a vez de alguem jogar, ou o fim da vez).
 */
export function resolverPendentes(state, { escolhas, passos, reacoes = [], now: inicio = 1000 } = {}){
    let current = state;
    // Duas paradas ate a carta resolver: a declaracao dos alvos (antes da
    // janela) e a resolucao em si. O relogio anda: a janela abre a partir do
    // instante do comando, entao um `now` fixo abriria uma janela que nunca vence.
    let now = inicio;
    let guarda = 0;
    const fila = [...reacoes];
    while(guarda++ < 300){
        now += 60000;
        if(parada(current)){
            current = beber(current, now, passos);
            continue;
        }
        if(current.status !== MatchStatus.progress) break;
        if(current.phase === Phase.window && fila.length){
            current = reagir(current, fila.shift(), now);
            passos?.push(current);
            continue;
        }
        if(current.phase === Phase.window){
            current = apply(current, { type: Command.tick, now });
            passos?.push(current);
            continue;
        }
        if(current.phase === Phase.pending && current.resolution){
            const quem = current.pending[0].kind === 'race'
                ? quemCorre(current, escolhas)
                : quemResponde(current);
            current = apply(current, {
                type: Command.answer,
                playerId: quem,
                value: responder(current, escolhas, quem),
                now,
            });
            passos?.push(current);
            continue;
        }
        break;
    }
    if(guarda >= 300) throw new Error('escolha em loop');
    return current;
}


/**
 * A 69: o jogador da vez compra, e antes de ele jogar `joga` entra com a
 * Tchouameni. Resolve tudo e devolve a mesa parada na vez dele.
 */
export function tchouameni(state, joga, { escolhas, passos, reacoes = [] } = {}){
    let current = state;
    if(current.phase === Phase.draw){
        current = apply(current, { type: Command.draw, playerId: daVez(current).id, now: 0 });
        passos?.push(current);
    }
    const [quem] = paraIds(current, joga);
    const player = current.players.find(p => p.id === quem);
    player.hand = [69, ...player.hand];
    current = apply(current, { type: Command.react, playerId: quem, idCard: 69, now: 0 });
    passos?.push(current);
    return resolverPendentes(current, { escolhas, passos, reacoes });
}

/** Uma reacao na janela aberta, do jeito que a tela mandaria. */
function reagir(state, { joga, carta, recusada = false }, now){
    const [quem] = paraIds(state, joga);
    const draft = { ...state, players: state.players.map(p =>
        p.id === quem ? { ...p, hand: [carta, ...p.hand] } : p) };
    let depois;
    try{
        depois = apply(draft, { type: Command.react, playerId: quem, idCard: carta, now });
    }catch(err){
        // Recusada como o cenario esperava: a mesa segue com a carta na mao.
        if(recusada) return draft;
        throw err;
    }
    if(recusada) throw new Error(`a reacao com a carta ${carta} devia ser recusada`);
    return depois;
}
