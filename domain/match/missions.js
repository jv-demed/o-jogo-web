import { Goal, Mission } from '../cards/vocabulary.js';

/**
 * As sete missoes, com a condicao de vitoria de cada uma.
 *
 * A missao e a identidade secreta: quem e o jogador *e* o que ele precisa para
 * ganhar sao a mesma coisa, e e por isso que `mission.swap` move um par so.
 * Isso ja estava escrito em domain/cards/vocabulary.js; aqui esta a outra
 * metade — o que cada uma quer.
 *
 * Uma missao pode ter a meta trocada em jogo (`mission.setGoal`, ex.: a carta
 * 5 faz o Sauzburg passar a querer *menos* shots). Por isso a apuracao le
 * `player.goal`, e nao `MISSIONS[player.mission].goal`: o default vem daqui, o
 * valor corrente vive no jogador.
 */

// Superset de Goal (domain/cards/vocabulary.js). Goal e o que uma *carta* pode
// impor a uma missao; estas quatro sao condicoes que so nascem com a missao e
// que nenhuma carta sabe escrever.
export const MissionGoal = Object.freeze({
    ...Goal,
    identifyAll:    'identifyAll',    // acertar quem e quem
    mostShotsGiven: 'mostShotsGiven', // fez os outros beberem mais
    soleWinner:     'soleWinner',     // ganha se mais ninguem ganhar
    never:          'never',          // nao ganha; o objetivo e passar a missao adiante
});

export const MISSIONS = Object.freeze({
    [Mission.sauzburg]: {
        id: Mission.sauzburg,
        name: 'Sauzburg',
        goal: MissionGoal.mostShots,
        text: 'Seja o jogador com mais shots no final.',
    },
    [Mission.swarley]: {
        id: Mission.swarley,
        name: 'Swarley',
        goal: MissionGoal.fewestShots,
        text: 'Seja o jogador com menos shots no final.',
    },
    [Mission.sjehnsens]: {
        id: Mission.sjehnsens,
        name: 'Sjehnsens',
        goal: MissionGoal.identifyAll,
        text: 'No final, acerte quem e quem.',
    },
    [Mission.stanley]: {
        id: Mission.stanley,
        name: 'Stanley',
        goal: MissionGoal.soleWinner,
        text: 'Ganha se mais ninguem ganhar.',
    },
    [Mission.smichaels]: {
        id: Mission.smichaels,
        name: 'Smichaels',
        goal: MissionGoal.alliesWin,
        amount: 2,
        text: 'Ganha se mais 2 jogadores ganharem.',
    },
    [Mission.sjamals]: {
        id: Mission.sjamals,
        name: 'Sjamals',
        goal: MissionGoal.mostShotsGiven,
        text: 'Seja quem mais fez outros tomarem shots.',
    },
    [Mission.swelcows]: {
        id: Mission.swelcows,
        name: 'Swelcows',
        goal: MissionGoal.never,
        text: 'Nao ganha nunca. O objetivo e se livrar da missao.',
    },
});

export const ALL_MISSIONS = Object.freeze(Object.keys(MISSIONS));

/** Metas que so podem ser apuradas depois de saber quem mais ganhou. */
const DEPENDENT = new Set([MissionGoal.soleWinner, MissionGoal.alliesWin]);

// Empate ganha junto: com dois jogadores em 7 shots, os dois sao "o jogador com
// mais shots". A alternativa (ninguem ganha no empate) transformaria a carta de
// dar shot num empate proposital, que e o oposto do que a mesa quer.
function extremes(players, metric, order){
    if(players.length === 0) return [];
    const values = players.map(p => p[metric] ?? 0);
    const best = order === 'desc' ? Math.max(...values) : Math.min(...values);
    return players.filter(p => (p[metric] ?? 0) === best).map(p => p.id);
}

/**
 * Apura a missao de um jogador, na primeira passada — a que nao depende do
 * resultado dos outros.
 *
 * @returns {boolean|null} null quando a meta e dependente e fica para a
 *                         segunda passada.
 */
function evaluateBase(state, player){
    const goal = player.goal ?? MISSIONS[player.mission].goal;
    const alive = state.players;

    switch(goal){
        case MissionGoal.mostShots:
            return extremes(alive, 'shots', 'desc').includes(player.id);
        case MissionGoal.fewestShots:
            return extremes(alive, 'shots', 'asc').includes(player.id);
        case MissionGoal.mostShotsGiven:
            return extremes(alive, 'shotsGiven', 'desc').includes(player.id);
        case MissionGoal.identifyAll:
            // Acertar *todos* os outros. Um palpite faltando conta como erro:
            // "acertar quem e quem" nao admite deixar alguem em branco.
            return alive
                .filter(other => other.id !== player.id)
                .every(other => player.guesses?.[other.id] === other.mission);
        case MissionGoal.winAtEnd:
            return true;
        case MissionGoal.never:
        case MissionGoal.loseAtEnd:
            return false;
        default:
            return DEPENDENT.has(goal) ? null : false;
    }
}

/**
 * Quem ganhou a partida. Pode ser mais de um: as missoes nao sao exclusivas
 * entre si, e varias sao *feitas* para coincidir.
 *
 * Duas passadas, porque duas metas perguntam sobre o resultado alheio:
 *
 *   1. as metas objetivas (shots, shots dados, palpites) e as vitorias/derrotas
 *      forcadas por carta (`game.win` / `game.lose`);
 *   2. Stanley ("ninguem mais ganhou") e Smichaels ("mais 2 ganharam"), olhando
 *      so para o resultado da passada 1.
 *
 * A passada 2 nao se le a si mesma de proposito: sem isso, Stanley e Smichaels
 * ficariam em referencia circular (o Smichaels contaria o Stanley como aliado,
 * o que faria o Stanley perder, o que tiraria o aliado do Smichaels...). O
 * corte e arbitrario, mas e o unico que termina — e a mesa julga igual.
 *
 * @returns {{ winners: number[], byPlayer: Record<number, boolean> }}
 */
export function evaluateMissions(state){
    const byPlayer = {};
    const pending = [];

    for(const player of state.players){
        if(player.forcedLose){ byPlayer[player.id] = false; continue; }
        if(player.forcedWin){ byPlayer[player.id] = true; continue; }

        const result = evaluateBase(state, player);
        if(result === null) pending.push(player);
        else byPlayer[player.id] = result;
    }

    const baseWinners = state.players
        .filter(p => byPlayer[p.id])
        .map(p => p.id);

    for(const player of pending){
        const goal = player.goal ?? MISSIONS[player.mission].goal;
        const others = baseWinners.filter(id => id !== player.id);
        byPlayer[player.id] = goal === MissionGoal.soleWinner
            ? others.length === 0
            : others.length >= (MISSIONS[player.mission].amount ?? 2);
    }

    return {
        winners: state.players.filter(p => byPlayer[p.id]).map(p => p.id),
        byPlayer,
    };
}
