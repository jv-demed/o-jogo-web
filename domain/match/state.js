import { sample, shuffle } from './rng.js';
import { ALL_MISSIONS, MISSIONS } from './missions.js';

/**
 * O estado da partida e como ela nasce.
 *
 * Camada pura, igual a domain/cards/: nao importa React nem Supabase. O estado
 * e um objeto JSON puro de proposito — e ele que vai ser serializado numa
 * coluna `jsonb` da partida e reconstruido no cliente. Nada de Map, Set ou
 * classe aqui dentro, ou o round-trip pelo banco perde informacao.
 *
 * Regra da mesa, decidida em 2026-08-26:
 *   - cada jogador tem o proprio baralho e comeca com HAND_SIZE cartas;
 *   - na sua vez compra 1 (fica com 6) e joga 1;
 *   - toda carta jogada abre uma janela de interferencia antes de resolver.
 */

export const HAND_SIZE = 5;
export const PLAYS_PER_TURN = 1;

// Quanto tempo a mesa tem para reagir a uma carta antes dela resolver. Nao e
// so sabor: sem janela, carta de defesa e carta rapida (dois tipos inteiros do
// catalogo) nao teriam quando entrar. Qualquer um pode encurtar passando.
export const REACTION_WINDOW_MS = 5000;

// Fases do turno. O estado guarda a fase porque a mesma acao ("jogar carta") e
// legal ou nao dependendo dela — e quem decide isso e o servidor, nao a UI.
export const Phase = Object.freeze({
    draw:    'draw',    // o jogador da vez ainda nao comprou
    play:    'play',    // comprou, precisa jogar
    window:  'window',  // carta na pilha, mesa pode interferir
    pending: 'pending', // resolucao travada esperando uma escolha
    end:     'end',     // turno resolvido, pronto para passar
});

export const MatchStatus = Object.freeze({
    progress: 'progress',
    // A partida acabou mas ainda nao foi apurada: o Sjehnsens precisa apontar
    // quem e quem antes, porque o palpite dele *e* a missao.
    guessing: 'guessing',
    finished: 'finished',
});

function createPlayer({ id, name, deck, mission }){
    return {
        id,
        name,
        mission,                 // identidade secreta; so o dono ve
        goal: MISSIONS[mission].goal,  // pode ser trocada por carta (mission.setGoal)
        missionRevealed: false,  // aberta para a mesa por mission.reveal
        missionLocked: false,    // mission.lock: nao pode ser trocada
        knownMissions: {},       // o que este jogador espiou: idJogador -> missao
        guesses: {},             // palpite final, o que o Sjehnsens precisa acertar

        shots: 0,                // shots que contam para a apuracao
        shotsGiven: 0,           // shots que ele fez os outros beberem (Sjamals)
        shotsIgnored: 0,         // bebeu mas nao contou (shots.ignore)
        ignoringShots: 0,        // quantos efeitos de shots.ignore estao ativos nele

        hand: [],
        deck,
        discard: [],
        equipment: [],           // [{ idCard, from }] — equipamentos em jogo nele
        revealed: [],            // cartas da mao que a mesa ja viu
        peeked: null,            // ultima espiada deste jogador no baralho alheio

        skipTurns: 0,            // turnos a pular (turn.skip)
        extraPlays: 0,           // jogadas extras acumuladas (turn.extraPlay)

        forcedWin: false,        // game.win
        forcedLose: false,       // game.lose
        out: false,              // saiu da mesa; nao joga mais, ainda apura
    };
}

/**
 * Monta a partida a partir dos jogadores do lobby, na ordem de turno ja
 * definida la, e dos baralhos deles.
 *
 * As missoes sao sorteadas sem reposicao: uma por jogador, secreta. Com menos
 * de sete na mesa sobram missoes fora do jogo — o Sjehnsens tem menos gente
 * para adivinhar, e uma carta que fala de uma missao ausente simplesmente nao
 * acha alvo (`target: mission` devolve lista vazia, e nao erro).
 *
 * @param {number} params.seed
 * @param {{id: number, name: string, deck: number[]}[]} params.players
 *        em ordem de turno; `deck` e a lista plana de ids de carta.
 */
export function createMatch({ seed, players }){
    if(players.length < 2) throw new Error('partida precisa de ao menos 2 jogadores');
    if(players.length > ALL_MISSIONS.length){
        throw new Error(`mesa de ate ${ALL_MISSIONS.length} jogadores; recebi ${players.length}`);
    }

    let rng = seed | 0;

    const drawn = sample(rng, ALL_MISSIONS, players.length);
    rng = drawn.seed;

    const built = players.map((entry, i) => {
        const shuffled = shuffle(rng, entry.deck ?? []);
        rng = shuffled.seed;
        const player = createPlayer({
            id: entry.id,
            name: entry.name,
            deck: shuffled.items,
            mission: drawn.items[i],
        });
        player.hand = player.deck.splice(0, HAND_SIZE);
        return player;
    });

    return {
        seed: rng,
        status: MatchStatus.progress,

        players: built,
        order: built.map(p => p.id),
        direction: 1,             // order.reverse inverte
        turnIndex: 0,

        phase: Phase.draw,
        playsLeft: PLAYS_PER_TURN,

        // Pilha de jogadas aguardando resolucao. Resolve do topo para a base:
        // a reacao entra por cima da carta que ela responde, e e ela que
        // resolve primeiro — e assim que "cancelar" chega a tempo de cancelar.
        stack: [],
        window: null,             // { closesAt, passed: number[] }

        // Decisoes que travam a resolucao ate alguem responder: escolher alvo,
        // escolher entre opcoes, ou o juiz humano de uma carta `manual`.
        pending: [],

        // Efeitos com duracao, que sobrevivem a jogada que os criou.
        ongoing: [],
        // Vinculos entre jogadores (link.shots, link.fate).
        links: [],
        // Condicoes de fim de jogo plantadas por carta (game.endWhen).
        endWhen: [],
        // Resolucao em curso, quando ela travou numa escolha. Carrega o
        // snapshot de onde ela recomeca.
        resolution: null,

        turnCount: 0,
        endsInTurns: null,        // game.endIn
        log: [],
        winners: null,
        results: null,
    };
}

// ------------------------------------------------------------------ leitura

export const playerById = (state, id) => state.players.find(p => p.id === id) ?? null;

export const currentPlayer = state => state.players.find(p => p.id === state.order[state.turnIndex]) ?? null;

/** Jogadores em ordem de turno a partir de `fromId`, sem incluir ele. */
export function playersAfter(state, fromId){
    const start = state.order.indexOf(fromId);
    if(start === -1) return [];
    const out = [];
    for(let i = 1; i < state.order.length; i++){
        const index = (start + i * state.direction + state.order.length * i) % state.order.length;
        const player = playerById(state, state.order[index]);
        if(player && !player.out) out.push(player);
    }
    return out;
}

/** Distancia na roda, sempre positiva, ignorando a direcao corrente. */
export function seatDistance(state, fromId, toId){
    const size = state.order.length;
    const from = state.order.indexOf(fromId);
    const to = state.order.indexOf(toId);
    if(from === -1 || to === -1) return Infinity;
    const forward = (to - from + size) % size;
    return Math.min(forward, size - forward);
}

/** Copia defensiva. O motor trabalha sobre o clone e devolve estado novo. */
export const cloneState = state => structuredClone(state);
