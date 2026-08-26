import { Action, Metric, Mission, Negatable, Pile, Rounding, Scope, Timing } from '../vocabulary.js';
import {
    all, choose, equipped, filter, mission, others, played, previousPlayer,
    random, rank, sameTarget, self,
} from '../targets.js';
import { permanent, turns, untilDestroyed, untilDrinks, untilMissionChange } from '../durations.js';

/**
 * Efeitos das cartas do pack 3 (Amigue Secrete 2025), ids 83 a 116.
 *
 * Mesmas regras dos packs anteriores: chave = `card.id`, e o `text` da carta
 * ganha de qualquer divergencia com o que esta modelado aqui.
 */

// As seis Gladsxodia (111 a 116) so diferem no sabor: cada uma cita uma
// identidade, mas a mecanica e identica, e a condicao de vitoria pergunta pelo
// conjunto inteiro. Seis copias esconderiam justamente isso.
const GLADSXODIA = [111, 112, 113, 114, 115, 116];
const gladsxodia = () => ({
    effects: [
        { action: Action.drink, target: choose(1), amount: 1 },
        { action: Action.gameWin, target: self(), if: { holds: GLADSXODIA, who: 'self' } },
    ],
    note: 'A identidade citada no texto e so sabor: a carta nao olha missao.',
});

export const PACK_3_EFFECTS = {
    // 83 — Po de Pirlimpimpim
    83: { effects: [
        { action: Action.drink, target: choose(1), amount: 5 },
    ]},

    // 84 — Freio de Ouro
    84: { effects: [
        { action: Action.turnSkip, target: self(), amount: 2 },
        { action: Action.negate, what: Negatable.play, target: self(),
          timing: Timing.passive, duration: turns(2) },
    ]},

    // 85 — Jp da Ganancia
    85: { effects: [
        { action: Action.handDraw, target: self(), amount: 2 },
        { action: Action.handDraw, target: self(), amount: 1, chance: 0.5,
          timing: Timing.eachTurn },
    ], note: 'A compra vira 50% de chance, ate o numero de cartas na mao se estabilizar.' },

    // 86 — Caipirinha de Banana
    86: { effects: [
        { action: Action.drink, target: rank(Metric.shotsGiven), amount: 2 },
    ]},

    // 87 — Ao Infinito e Alem
    87: { effects: [
        { action: Action.shotsSet, target: choose(1), amount: 'infinity',
          timing: Timing.passive, duration: turns(2) },
    ]},

    // 88 — Vamos Fazer um Sorteio?
    88: { effects: [
        { action: Action.missionChain, between: choose(1),
          condition: { stopAt: { mission: Mission.stanley } } },
    ], note: 'A cadeia para na tentativa de troca com o Stanley — essa troca nao acontece.' },

    // 89 — Foto do Frango
    89: { effects: [
        { action: Action.handGive, target: choose(1), amount: 1, chooser: 'target' },
        { action: Action.turnExtraPlay, target: self(), amount: 1 },
    ]},

    // 90 — Tu Diz?
    90: {
        effects: [
            { action: Action.redirect, what: Negatable.drink, target: played(),
              timing: Timing.reaction },
        ],
        ritual: 'Dizer "tu diz?".',
        note: 'Vale tambem quando a carta de shot mira outro jogador, nao so voce.',
    },

    // 91 — #CriseNaDiretoria
    91: { effects: [
        { action: Action.drink, target: filter({ shots: { gte: 5 } }), amount: 1 },
    ]},

    // 92 — Slides?
    92: { effects: [
        { action: Action.handReveal, target: all(), amount: 1, from: Pile.hand },
    ], note: 'A carta mostrada e aleatoria, nao escolhida.' },

    // 93 — Boleto do Dron
    93: { effects: [
        { action: Action.equip, target: choose(1), timing: Timing.passive, duration: untilDestroyed() },
        { action: Action.drink, target: equipped(), amount: 1,
          timing: Timing.eachTurn, duration: untilDrinks(3),
          then: { action: Action.drink, target: equipped(), amount: 1, chance: 0.5,
                  then: { action: Action.drink, target: equipped(), amount: 1, chance: 0.25 } } },
    ], note: 'Aos 3 shots o boleto esta quitado e a carta e destruida.' },

    // 94 — Cama Embaixo da Mesa
    94: { effects: [
        { action: Action.turnSkip, target: self(), amount: 1,
          then: { action: Action.turnExtraPlay, target: self(), amount: 1,
                  timing: Timing.delayed, duration: turns(1) } },
    ]},

    // 95 — Tatuagem de Shuriken
    95: { effects: [
        { action: Action.drink, target: mission(Mission.swelcows), amount: 1 },
        { action: Action.drink, target: random(1), amount: 1 },
    ]},

    // 96 — Enem
    96: { effects: [
        { action: Action.handDiscard, target: choose(1), amount: 1,
          condition: { onDrink: true },
          timing: Timing.passive, duration: turns(2) },
    ], note: 'A carta perdida e aleatoria, e a penalidade vale a cada shot bebido.' },

    // 97 — Maldicao do Jogador
    97: { effects: [
        { action: Action.gameLose, target: choose(1),
          timing: Timing.passive, duration: untilMissionChange() },
    ], note: 'Duracao sem identidade: vale ate a missao do proprio alvo trocar de dono.' },

    // 98 — Separar e Procurar Pistas
    98: { effects: [
        { action: Action.missionPeek, target: choose(1) },
    ]},

    // 99 — Pedido de Casamento
    99: { effects: [
        { action: Action.linkFate, between: choose(1, { secret: true }),
          timing: Timing.passive, duration: permanent() },
    ], note: 'Permanente ate outra carta anular — "ate que a morte os separem".' },

    // 100 — Uvas para Ressaca
    100: { effects: [
        { action: Action.shotsHalve, target: choose(1), rounding: Rounding.up },
    ]},

    // 101 — Valeu Valeu
    101: {
        effects: [
            { action: Action.drink, target: sameTarget(), amount: 1, timing: Timing.reaction },
        ],
        ritual: 'Dizer "valeu valeu".',
        note: 'O alvo aqui e o da carta em jogo agora, e vale para todos eles.',
    },

    // 102 — Condimentos Vencidos
    102: { effects: [
        { action: Action.turnSkip, target: choose(1), duration: untilDrinks(3) },
    ], note: 'Sem prazo em turnos: so volta a jogar depois de beber os 3 shots.' },

    // 103 — Vamos pra Argentina
    103: { effects: [
        { action: Action.negate, what: Negatable.play, target: previousPlayer(),
          timing: Timing.reaction },
    ], note: 'Diferente das defesas, o alvo aqui e quem jogou, nao quem se protege.' },

    // 104 — Leo Noites
    104: { effects: [
        { action: Action.auraDispel, scope: Scope.prolonged, amount: 1 },
    ]},

    // 105 — Nao e o Momento
    105: { effects: [
        { action: Action.negate, what: Negatable.play, target: played(),
          timing: Timing.reaction },
    ], note: 'So contra jogada dirigida a um terceiro; a carta nao defende voce mesmo.' },

    // 106 — Eu Sou o Lucas
    106: { effects: [
        { action: Action.drink, target: random(1), amount: 1 },
    ]},

    // 107 — Vendedor de Drogas
    107: { effects: [
        { action: Action.choice, chooser: 'self', options: [
            { action: Action.drink, target: choose(1), amount: 1 },
            { action: Action.shotsRemove, target: choose(1), amount: 1 },
        ]},
    ]},

    // 108 — Boina
    108: { effects: [
        { action: Action.equip, target: choose(1), timing: Timing.passive, duration: untilDestroyed() },
        { action: Action.missionLock, target: equipped(),
          timing: Timing.passive, duration: untilDestroyed() },
    ]},

    // 109 — Paz Terrivel
    109: { effects: [
        { action: Action.gameWin, target: self(), condition: { gameEndsWithin: 2 },
          timing: Timing.endgame, duration: turns(2) },
        { action: Action.gameLose, target: others(), condition: { gameEndsWithin: 2 },
          timing: Timing.endgame, duration: turns(2) },
    ]},

    // 110 — Petricor
    110: { effects: [
        { action: Action.shotsSet, target: choose(1), amount: 0 },
    ]},

    // 111 a 116 — Gladsxodia #1 a #6
    ...Object.fromEntries(GLADSXODIA.map(id => [id, gladsxodia()])),
};
