// Passa as regras da partida por uma mesa de mentira.
//
// Roda sem dependencia nenhuma: `node scripts/validate-match.mjs`. Mesmo papel
// do validate-effects.mjs — o corpo daqui vira teste quando o Vitest entrar
// (pendencia aberta); as regras em si moram em domain/match/, que e puro.
//
// Sai com codigo 1 se algo quebrar, para poder ir pro CI direto.
//
// O que ele cobre:
//   1. apuracao das sete missoes, uma a uma, em mesas montadas na mao;
//   2. as 116 cartas do catalogo, jogadas de verdade numa mesa de 5, com as
//      escolhas respondidas automaticamente — nenhuma pode estourar excecao
//      nem cair no ramo "acao sem handler";
//   3. uma partida inteira, do primeiro turno ate a apuracao;
//   4. o alvo declarado antes da janela e a carta que fica na mesa enquanto o
//      efeito prolongado dela corre.

import { Command, apply, legalCommands } from '../domain/match/engine.js';
import { botCommand } from '../domain/match/bot.js';
import { createSoloMatch } from '../domain/match/solo.js';
import { CARD_EFFECTS } from '../domain/cards/effects/index.js';
import { MISSIONS, evaluateMissions } from '../domain/match/missions.js';
import { MatchStatus, Phase, createMatch } from '../domain/match/state.js';

let problemas = 0;
const erro = message => { console.error('ERRO ' + message); problemas++; };

const check = (label, condition) => { if(!condition) erro(label); };

/**
 * O descarte da mesa (`state.discardPile`, em ordem) e os montes de cada
 * jogador (`player.discard`) sao a mesma carta contada duas vezes: um sabe
 * quando ela caiu, o outro de quem ela e. Escrever num e esquecer o outro faz
 * a pilha do centro mostrar carta errada — e e um bug silencioso, porque cada
 * lado sozinho continua coerente. Por isso os dois batem em toda simulacao.
 */
function descarteBate(state){
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

// ------------------------------------------------------- 1. apuracao

function mesa(players){
    return { players: players.map((p, i) => ({
        id: i + 1, shots: 0, shotsGiven: 0, guesses: {}, ...p,
        goal: p.goal ?? MISSIONS[p.mission].goal,
    })) };
}

{
    const state = mesa([
        { mission: 'sauzburg', shots: 9 },
        { mission: 'swarley',  shots: 1 },
        { mission: 'sjamals',  shots: 4, shotsGiven: 7 },
    ]);
    const { byPlayer } = evaluateMissions(state);
    check('sauzburg com mais shots deveria ganhar', byPlayer[1]);
    check('swarley com menos shots deveria ganhar', byPlayer[2]);
    check('sjamals que mais deu shots deveria ganhar', byPlayer[3]);
}

{
    // Empate no topo leva os dois: senao a carta de dar shot vira empate de
    // proposito, que e o oposto do que a mesa quer.
    const state = mesa([
        { mission: 'sauzburg', shots: 5 },
        { mission: 'swarley',  shots: 5 },
    ]);
    const { byPlayer } = evaluateMissions(state);
    check('empate deveria dar vitoria aos dois extremos', byPlayer[1] && byPlayer[2]);
}

{
    const state = mesa([
        { mission: 'swelcows', shots: 9 },
        { mission: 'stanley',  shots: 3 },
    ]);
    const { byPlayer } = evaluateMissions(state);
    check('swelcows nunca ganha', byPlayer[1] === false);
    check('stanley ganha quando mais ninguem ganha', byPlayer[2] === true);
}

{
    const state = mesa([
        { mission: 'sauzburg', shots: 9 },
        { mission: 'swarley',  shots: 0 },
        { mission: 'stanley',  shots: 3 },
        { mission: 'smichaels', shots: 3 },
    ]);
    const { byPlayer } = evaluateMissions(state);
    check('stanley perde quando outros ganham', byPlayer[3] === false);
    check('smichaels ganha com 2 aliados vitoriosos', byPlayer[4] === true);
}

{
    const state = mesa([
        { mission: 'sjehnsens', shots: 2, guesses: { 2: 'sauzburg', 3: 'swelcows' } },
        { mission: 'sauzburg',  shots: 2 },
        { mission: 'swelcows',  shots: 2 },
    ]);
    check('sjehnsens que acertou todos deveria ganhar', evaluateMissions(state).byPlayer[1]);

    state.players[0].guesses = { 2: 'sauzburg' };
    check('sjehnsens com palpite faltando nao ganha', evaluateMissions(state).byPlayer[1] === false);
}

{
    // mission.setGoal troca a meta sem trocar a missao: a carta 5 faz o
    // Sauzburg passar a querer *menos* shots.
    const state = mesa([
        { mission: 'sauzburg', shots: 0, goal: 'fewestShots' },
        { mission: 'swarley',  shots: 8 },
    ]);
    check('sauzburg com meta trocada apura pela meta nova', evaluateMissions(state).byPlayer[1]);
}

// ------------------------------------------------- 2. as 116 cartas

const IDS = Object.keys(CARD_EFFECTS).map(Number).sort((a, b) => a - b);

function novaMesa(seed = 1){
    return createMatch({
        seed,
        players: [1, 2, 3, 4, 5].map(id => ({
            id,
            name: 'p' + id,
            // Baralho generico: nao importa o que tem, a carta testada e
            // colocada na mao a mao. Precisa so ser fundo para as compras.
            deck: IDS.slice(0, 30),
        })),
    });
}

/** Responde qualquer pedido de escolha do jeito mais simples que passa. */
function responder(state){
    const request = state.pending[0];
    const outros = state.players.map(p => p.id).filter(id => id !== request.chooserId);
    const todos = state.players.map(p => p.id);

    switch(request.kind){
        case 'optIn':  return true;
        case 'option': return 0;
        case 'cards':  return [];
        default: {
            const pool = request.candidates ?? todos;
            const count = request.upTo ? Math.min(1, request.count) : request.count;
            const preferidos = pool.filter(id => outros.includes(id));
            return (preferidos.length >= count ? preferidos : pool).slice(0, count);
        }
    }
}

const daVez = state => state.players.find(p => p.id === state.order[state.turnIndex]);

/**
 * Bebe o que a mesa deve.
 *
 * Todo shot para a partida ate quem bebeu confirmar, entao nenhuma simulacao
 * anda sem passar por aqui — que e exatamente o ponto da regra. Numa mesa de
 * mentira todo mundo bebe na hora.
 */
function beber(state, now = 0){
    let current = state;
    let guarda = 0;
    while(current.drinks?.length){
        if(guarda++ > 200) throw new Error('fila de shots sem fim');
        current = apply(current, {
            type: Command.drank,
            playerId: current.drinks[0].playerId,
            now,
        });
    }
    return current;
}

/** Joga uma carta e resolve tudo o que ela abrir, respondendo as escolhas. */
function jogar(state, idCard){
    let current = state;
    // A carta so pode ser jogada depois da compra obrigatoria do turno.
    if(current.phase === Phase.draw){
        current = apply(current, { type: Command.draw, playerId: daVez(current).id, now: 0 });
    }
    const player = daVez(current);
    player.hand = [idCard, ...player.hand];

    current = apply(current, { type: Command.play, playerId: player.id, idCard, now: 0 });

    // Duas paradas ate a carta resolver, e nesta ordem: a declaracao dos alvos
    // (que acontece *antes* da janela) e a resolucao em si. As duas param em
    // `pending`, e entre elas corre a janela de interferencia — daí o tick.
    // O relogio anda: a janela abre a partir do instante do comando, entao um
    // `now` fixo abriria uma janela que nunca vence.
    let now = 1000;
    let guarda = 0;
    while(guarda++ < 40){
        now += 60000;
        if(current.drinks?.length){
            current = beber(current, now);
            continue;
        }
        if(current.phase === Phase.window){
            current = apply(current, { type: Command.tick, now });
            continue;
        }
        if(current.phase === Phase.pending && current.resolution){
            const request = current.pending[0];
            current = apply(current, {
                type: Command.answer,
                playerId: request.chooserId,
                value: responder(current),
                now,
            });
            continue;
        }
        break;
    }
    if(guarda >= 40) throw new Error('escolha em loop');
    return current;
}

for(const id of IDS){
    const antes = novaMesa(id);
    try{
        const depois = jogar(antes, id);
        const semHandler = depois.log.filter(e => e.type === 'unhandled');
        for(const entrada of semHandler) erro(`carta #${id}: acao sem handler "${entrada.action}"`);

        const parada = depois.phase === Phase.pending && !depois.resolution;
        if(parada) erro(`carta #${id}: resolucao travou sem pedido pendente`);

        // Todo shot bebido tem que aparecer no log: e o log que a mesa le para
        // conferir quem bebe o que.
        const bebidos = depois.players.reduce((sum, p) => sum + p.shots, 0);
        const logados = depois.log
            .filter(e => e.type === 'drink' && e.counted)
            .reduce((sum, e) => sum + e.amount, 0);
        if(bebidos > 0 && logados === 0){
            erro(`carta #${id}: mexeu em shots sem registrar no log`);
        }

        // Aqui e onde o descarte forcado e o redraw da mao de fato acontecem:
        // a partida sorteada acima pode nunca tirar essas cartas do baralho.
        if(!descarteBate(depois)){
            erro(`carta #${id}: descartou sem passar pela pilha da mesa`);
        }
    }catch(err){
        erro(`carta #${id}: ${err.message}`);
    }
}

// ---------------------------------- 3. janela de interferencia

// Carta 2 (Festinha de Sexta) manda todo mundo beber; a 49 (Gemidinha) cancela
// uma jogada fora da vez. Juntas testam a pilha inteira: reacao entra por cima
// e resolve antes, cancelando o que estava embaixo.
{
    const base = novaMesa(11);
    let state = apply(base, { type: Command.draw, playerId: 1, now: 0 });
    state.players[0].hand = [2, ...state.players[0].hand];
    state.players[1].hand = [49, ...state.players[1].hand];

    state = apply(state, { type: Command.play, playerId: 1, idCard: 2, now: 0 });
    check('jogar abre a janela de interferencia', state.phase === Phase.window);
    check('a janela tem prazo', state.window.closesAt > 0);

    state = apply(state, { type: Command.react, playerId: 2, idCard: 49, now: 100 });
    check('a reacao entra por cima na pilha', state.stack.length === 2);

    // Todo mundo passando fecha antes do tempo: e o que evita esperar os 5s
    // toda jogada.
    for(const id of [1, 3, 4, 5]){
        if(state.phase === Phase.window) state = apply(state, { type: Command.pass, playerId: id, now: 200 });
    }
    let guarda = 0;
    while(state.phase === Phase.window && guarda++ < 10){
        state = apply(state, { type: Command.tick, now: 999999 });
        for(const id of [1, 2, 3, 4, 5]){
            if(state.phase === Phase.window && state.window.passed.includes(id) === false){
                try{ state = apply(state, { type: Command.pass, playerId: id, now: 999999 }); }catch{ /* nao era dele */ }
            }
        }
    }

    state = beber(state, 999999);
    check('a carta cancelada nao faz efeito',
        state.players.every(p => p.shots === 0));
    check('o cancelamento aparece no log',
        state.log.some(e => e.type === 'cancelled' && e.idCard === 2));
    check('a pilha esvazia depois de resolver', state.stack.length === 0);
    check('as duas cartas vao para o descarte',
        state.players[0].discard.includes(2) && state.players[1].discard.includes(49));
}

// Sem reacao, a carta resolve quando o relogio fecha a janela.
{
    const base = novaMesa(12);
    let state = apply(base, { type: Command.draw, playerId: 1, now: 0 });
    state.players[0].hand = [2, ...state.players[0].hand];
    state = apply(state, { type: Command.play, playerId: 1, idCard: 2, now: 0 });

    const cedo = apply(state, { type: Command.tick, now: 10 });
    check('tick antes do prazo nao resolve', cedo.phase === Phase.window);

    state = apply(state, { type: Command.tick, now: 999999 });
    check('a mesa para ate os quatro confirmarem o shot', state.drinks.length === 4);
    check('quem nao deve shot nao tem o que fazer',
        legalCommands(state, 1).length === 0
        && legalCommands(state, 2).join() === Command.drank);
    state = beber(state, 999999);
    check('todos os outros bebem 1 quando a carta resolve',
        state.players.filter(p => p.id !== 1).every(p => p.shots === 1));
    check('quem jogou nao bebe', state.players[0].shots === 0);
    check('quem mandou beber leva o credito do Sjamals',
        state.players[0].shotsGiven === 4);
    check('o turno termina depois da jogada', state.phase === Phase.end);
}

// -------------------------------- 4. o palpite do Sjehnsens

// A missao do Sjehnsens e o palpite: apurar sem deixar ele apontar seria dar
// como errado um palpite que ninguem chegou a fazer. Por isso a partida para
// em `guessing` antes de fechar.
{
    let state = novaMesa(13);
    state.players[0].mission = 'sjehnsens';
    state.players[0].goal = MISSIONS.sjehnsens.goal;
    // Mesa sem carta nenhuma: o proximo fim de turno encerra.
    for(const player of state.players){ player.hand = []; player.deck = []; }
    state.phase = Phase.end;

    state = apply(state, { type: Command.endTurn, playerId: 1, now: 0 });
    check('a partida para para o Sjehnsens palpitar', state.status === MatchStatus.guessing);
    check('sem palpite ainda nao ha vencedor', state.winners === null);

    const palpites = {};
    for(const other of state.players.slice(1)) palpites[other.id] = other.mission;
    state = apply(state, { type: Command.guess, playerId: 1, value: palpites, now: 0 });

    check('o palpite fecha a partida', state.status === MatchStatus.finished);
    check('sjehnsens que acertou todos ganha', state.winners.includes(1));
}

// ------------------------------------------------- 5. partida inteira

{
    let state = createMatch({
        seed: 2026,
        players: [1, 2, 3].map(id => ({ id, name: 'p' + id, deck: IDS.slice(0, 12) })),
    });

    check('mao inicial de 5 cartas', state.players.every(p => p.hand.length === 5));
    check('missoes distintas por jogador',
        new Set(state.players.map(p => p.mission)).size === state.players.length);

    let turnos = 0;
    while(state.status === MatchStatus.progress && turnos < 60){
        if(state.drinks.length){ state = beber(state); continue; }
        const player = daVez(state);

        if(state.phase === Phase.draw){
            const antes = player.hand.length;
            const tinhaBaralho = player.deck.length > 0;
            state = apply(state, { type: Command.draw, playerId: player.id, now: 0 });
            // Com baralho, a compra sempre soma 1 na mao. Sem baralho, a
            // compra e o gatilho do fim da partida.
            check('compra deveria somar 1 na mao',
                !tinhaBaralho || daVez(state).hand.length === antes + 1);
            check('baralho vazio deveria encerrar a partida',
                tinhaBaralho || state.status !== MatchStatus.progress);
            continue;
        }
        if(state.phase === Phase.play){
            const mao = daVez(state).hand;
            if(mao.length === 0){ state = apply(state, { type: Command.endTurn, now: 0 }); continue; }
            state = jogar(state, mao[0]);
            continue;
        }
        if(state.phase === Phase.end){
            state = apply(state, { type: Command.endTurn, playerId: player.id, now: 0 });
            turnos++;
            continue;
        }
        if(state.phase === Phase.window){
            state = apply(state, { type: Command.tick, now: 999999 });
            continue;
        }
        break;
    }

    // Um Sjehnsens sem palpite segura a apuracao — e o unico jeito de a missao
    // dele ser jogavel.
    if(state.status === MatchStatus.guessing){
        const sjehnsens = state.players.find(p => p.mission === 'sjehnsens');
        const palpites = {};
        for(const other of state.players){
            if(other.id !== sjehnsens.id) palpites[other.id] = other.mission;
        }
        state = apply(state, { type: Command.guess, playerId: sjehnsens.id, value: palpites, now: 0 });
        check('sjehnsens que acertou tudo tem que ganhar', state.winners.includes(sjehnsens.id));
    }

    check('a partida tem que terminar em 60 turnos', turnos < 60);
    if(state.status === MatchStatus.finished){
        check('partida encerrada tem resultado', Array.isArray(state.results));
    }
    console.log(`partida simulada: ${turnos} turno(s), status ${state.status}`);
}

// ------------------------------- 6. alvo declarado e efeito prolongado

// A carta 1 (A Bebida Infinita) e o caso completo das duas mecanicas: escolhe
// alvo *antes* da janela, e fica valendo por tres vezes do escolhido em vez de
// ir para o descarte na hora.
{
    let state = novaMesa(21);
    state = apply(state, { type: Command.draw, playerId: 1, now: 0 });
    state.players[0].hand = [1, ...state.players[0].hand];

    state = apply(state, { type: Command.play, playerId: 1, idCard: 1, now: 0 });
    check('a carta com alvo escolhido para antes da janela',
        state.phase === Phase.pending && state.resolution?.declaring === true);
    check('a janela ainda nao abriu na declaracao', state.phase !== Phase.window);

    state = apply(state, { type: Command.answer, playerId: 1, value: [2], now: 100 });
    check('escolhido o alvo, a janela abre', state.phase === Phase.window);
    check('a mesa ve em quem a carta bate',
        state.stack[state.stack.length - 1].targets.join() === '2');
    check('a janela recomeca do zero depois da escolha', state.window.closesAt === 100 + 10000);

    state = apply(state, { type: Command.tick, now: 100 + 10001 });
    check('o efeito prolongado entra na mesa', state.ongoing.length === 1);
    check('o prolongado sabe de que jogada veio', Boolean(state.ongoing[0].uid));
    check('a carta prolongada nao vai para o descarte na hora',
        !state.players[0].discard.includes(1)
        && !state.discardPile.some(e => e.idCard === 1));

    // Tres voltas da mesa: o alvo tem tres vezes, e bebe nas tres.
    let now = 20000;
    for(let i = 0; i < state.order.length * 3; i++){
        now += 1000;
        if(state.drinks.length){
            check('o shot cobrado e do alvo da carta',
                state.drinks.every(entry => entry.playerId === 2 && entry.idCard === 1));
            check('a mesa nao anda enquanto o alvo nao bebe',
                legalCommands(state, 1).length === 0);
        }
        state = beber(state, now);
        state.phase = Phase.end;
        state = apply(state, { type: Command.endTurn, playerId: daVez(state).id, now });
    }
    state = beber(state, now);
    check('o alvo bebeu uma vez por turno dele, tres vezes',
        state.players[1].shots === 3);
    check('quem jogou leva o credito das tres',
        state.players[0].shotsGiven === 3);
    check('a duracao acaba depois da terceira', state.ongoing.length === 0);
    check('a carta cai no descarte quando a duracao acaba',
        state.players[0].discard.includes(1)
        && state.discardPile.some(e => e.idCard === 1 && e.playerId === 1));
    check('o descarte da mesa e o do jogador continuam batendo', descarteBate(state));
    check('o fim do prolongado aparece no log',
        state.log.some(e => e.type === 'ongoing.end' && e.idCard === 1));

    // Cada cobranca vira um fato no log: e dele que a tela tira o anuncio no
    // comeco da vez de quem sofre — o shot sozinho nao diz de que carta veio.
    const cobrancas = state.log.filter(e => e.type === 'ongoing.trigger' && e.idCard === 1);
    check('as tres cobrancas aparecem no log', cobrancas.length === 3);
    check('cada cobranca diz quanto ainda falta',
        cobrancas.map(e => e.turnsLeft).join() === '2,1,0');
}

// ------------------------------------------- 7. mesa so de bots

// O modo solo em cima da mesa: cinco bots jogam sozinhos ate a apuracao. Se
// isto trava, e porque existe um estado em que ninguem tem comando legal — que
// e exatamente o bug que o solo revelaria depois de tres telas de UI.
{
    const { state: inicial, botIds } = createSoloMatch({
        seed: 99,
        you: { id: -99, name: 'bot zero' },
        botCount: 4,
        pool: IDS,
    });

    check('o solo monta a mesa pedida', inicial.players.length === 5);
    check('bot tem baralho aleatorio', inicial.players.every(p => p.deck.length + p.hand.length === 20));
    check('cada bot tem baralho proprio',
        new Set(inicial.players.map(p => p.deck.join(','))).size === inicial.players.length);
    check('os ids de bot sao negativos', botIds.every(id => id < 0));

    let state = inicial;
    let passos = 0;
    while(state.status !== MatchStatus.finished && passos < 5000){
        passos++;
        const comando = state.players
            .map(player => botCommand(state, player.id, 999999))
            .find(Boolean);
        if(!comando){
            // Ninguem tem o que fazer: so pode ser janela esperando o relogio.
            if(state.phase === Phase.window){
                state = apply(state, { type: Command.tick, now: 999999 });
                continue;
            }
            erro(`mesa travada na fase ${state.phase}`);
            break;
        }
        state = apply(state, comando);
    }

    check('a mesa de bots chega ao fim', state.status === MatchStatus.finished);
    check('o descarte da mesa bate com os montes dos bots', descarteBate(state));
    check('a mesa de bots descartou alguma coisa', state.discardPile.length > 0);
    check('a partida de bots apura', Array.isArray(state.results));
    check('alguem bebeu alguma coisa', state.players.some(p => p.shots > 0));
    console.log(`mesa de bots: ${passos} comando(s), ${state.turnCount} turnos, `
        + `vencedores ${state.winners?.join(', ') || 'ninguem'}`);
}

// ------------------------------ 8. solo com um humano na mesa

// O modo solo de verdade: bots mais uma pessoa. O humano aqui e o mais passivo
// possivel — passa na janela, joga a primeira carta, responde a escolha com o
// primeiro alvo. Se ate esse jogador termina a partida, nao existe estado em
// que a tela fica sem botao para apertar, que e o travamento que o solo
// esconderia atras de tres telas de UI.
{
    const { state: inicial, botIds } = createSoloMatch({
        seed: 7,
        you: { id: 1, name: 'voce' },
        botCount: 3,
        pool: IDS,
    });

    let state = inicial;
    let passos = 0;
    let jogadasDoHumano = 0;

    while(state.status !== MatchStatus.finished && passos < 5000){
        passos++;

        const doBot = botIds.map(id => botCommand(state, id, 999999)).find(Boolean);
        if(doBot){ state = apply(state, doBot); continue; }

        const eu = state.players.find(p => p.id === 1);
        const acoes = legalCommands(state, 1);

        if(state.status === MatchStatus.guessing){
            const palpites = {};
            for(const other of state.players){
                if(other.id !== 1) palpites[other.id] = other.mission;
            }
            state = apply(state, { type: Command.guess, playerId: 1, value: palpites, now: 0 });
            continue;
        }
        if(acoes.includes(Command.drank)){
            state = apply(state, { type: Command.drank, playerId: 1, now: 999999 });
            continue;
        }
        if(acoes.includes(Command.draw)){
            state = apply(state, { type: Command.draw, playerId: 1, now: 999999 });
            continue;
        }
        if(acoes.includes(Command.play)){
            if(eu.hand.length === 0){ state = apply(state, { type: Command.tick, now: 999999 }); continue; }
            state = apply(state, { type: Command.play, playerId: 1, idCard: eu.hand[0], now: 999999 });
            jogadasDoHumano++;
            continue;
        }
        if(acoes.includes(Command.pass)){
            state = apply(state, { type: Command.pass, playerId: 1, now: 999999 });
            continue;
        }
        if(acoes.includes(Command.answer)){
            state = apply(state, {
                type: Command.answer, playerId: 1, value: responder(state), now: 999999,
            });
            continue;
        }
        if(acoes.includes(Command.endTurn)){
            state = apply(state, { type: Command.endTurn, playerId: 1, now: 999999 });
            continue;
        }
        // Ninguem tem o que fazer: so pode ser a janela esperando o relogio,
        // que na tela e o tick do hook.
        if(state.phase === Phase.window){
            state = apply(state, { type: Command.tick, now: 999999 });
            continue;
        }
        erro(`solo travado na fase ${state.phase} (ninguem tem comando legal)`);
        break;
    }

    check('o solo com humano chega ao fim', state.status === MatchStatus.finished);
    check('o descarte da mesa bate com os montes no solo', descarteBate(state));
    check('o humano chegou a jogar', jogadasDoHumano > 0);
    console.log(`solo: ${passos} comando(s), ${state.turnCount} turnos, `
        + `${jogadasDoHumano} jogadas suas`);
}

// ------------------------------------------------------------- panorama

console.log(`cartas jogadas sem quebrar: ${IDS.length}`);

if(problemas){
    console.error(`\n${problemas} problema(s).`);
    process.exit(1);
}
console.log('\ntudo valido.');
