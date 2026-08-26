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
//   3. uma partida inteira, do primeiro turno ate a apuracao.

import { Command, apply } from '../domain/match/engine.js';
import { CARD_EFFECTS } from '../domain/cards/effects/index.js';
import { MISSIONS, evaluateMissions } from '../domain/match/missions.js';
import { MatchStatus, Phase, createMatch } from '../domain/match/state.js';

let problemas = 0;
const erro = message => { console.error('ERRO ' + message); problemas++; };

const check = (label, condition) => { if(!condition) erro(label); };

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
        case 'optIn':  return request.candidates;
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
    current = apply(current, { type: Command.tick, now: 999999 });

    let guarda = 0;
    while(current.phase === Phase.pending && current.resolution){
        if(guarda++ > 20) throw new Error('escolha em loop');
        const request = current.pending[0];
        current = apply(current, {
            type: Command.answer,
            playerId: request.chooserId,
            value: responder(current),
            now: 999999,
        });
    }
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

// ------------------------------------------------------------- panorama

console.log(`cartas jogadas sem quebrar: ${IDS.length}`);

if(problemas){
    console.error(`\n${problemas} problema(s).`);
    process.exit(1);
}
console.log('\ntudo valido.');
