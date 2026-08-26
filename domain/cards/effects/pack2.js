import { Action, Goal, Mission, Negatable, Rounding, Scope, Timing } from '../vocabulary.js';
import { all, choose, equipped, manual, mission, played, sameTarget, self } from '../targets.js';
import { turns, untilDestroyed, untilMissionChange } from '../durations.js';

/**
 * Efeitos das cartas do pack 2 (Amigue Secrete 2024), ids 64 a 82.
 *
 * Mesmas regras do pack 1: chave = `card.id`, o `text` da carta continua sendo
 * a fonte da verdade narrativa e, quando os dois discordarem, e esta entrada
 * que esta errada.
 *
 * Este e o primeiro pack com equipamento. A convencao aqui: o primeiro efeito
 * e o `equip` (quem carrega, e ate quando), e os seguintes sao o que o
 * equipamento faz enquanto estiver em jogo, mirando `equipped()`.
 */
export const PACK_2_EFFECTS = {
    // 64 — Bitrix
    64: { effects: [
        { action: Action.equip, target: self(), timing: Timing.passive, duration: untilDestroyed() },
        { action: Action.missionTake, target: self(), between: choose(1),
          timing: Timing.passive, duration: untilDestroyed() },
    ], note: 'Pega qualquer missao em jogo; a carta de missao do portador continua trocavel.' },

    // 65 — Baguga ou Morte?
    65: { effects: [
        { action: Action.choice, chooser: 'target', target: choose(1), options: [
            { action: Action.drink, target: sameTarget(), amount: 'perOpponent' },
            { action: Action.drink, target: sameTarget(), amount: 'perOpponent',
              then: { action: Action.turnSkip, target: sameTarget(), amount: 2 } },
        ]},
    ], note: 'Morte e a baguga mais os 2 turnos: "mas antes, baguga!".' },

    // 66 — Que Papinho
    66: {
        effects: [
            { action: Action.negate, what: Negatable.equipment, target: self(),
              timing: Timing.reaction,
              then: { action: Action.equipmentDestroy, target: played() } },
        ],
        ritual: 'Dizer "que papinho".',
    },

    // 67 — Ricardo Goleiro 1
    67: { effects: [
        { action: Action.negate, what: Negatable.divine, target: self(), timing: Timing.reaction },
    ]},

    // 68 — Uma Noite de Furia
    68: {
        effects: [
            { action: Action.missionSetGoal, mission: Mission.smichaels, goal: Goal.winAtEnd,
              condition: { othersLost: true },
              timing: Timing.passive, duration: untilMissionChange(Mission.smichaels) },
        ],
        note: 'Escolha 2 jogadores: a meta so vale se o Smichaels estiver entre eles.',
    },

    // 69 — Tchouameni
    69: {
        effects: [
            { action: Action.turnSkip, amount: 1, timing: Timing.reaction,
              target: manual('o jogador prestes a jogar') },
        ],
        ritual: 'Dizer "Tchouameni".',
    },

    // 70 — Alelo do Dron
    70: { effects: [
        { action: Action.equip, target: self(), timing: Timing.passive, duration: untilDestroyed() },
        { action: Action.choice, chooser: 'self', optional: true,
          timing: Timing.onTargetTurn, duration: untilDestroyed(), options: [
              { action: Action.drink, target: equipped(), amount: 1 },
              { action: Action.drink, target: choose(1), amount: 1 },
          ]},
    ], note: 'Uma vez por turno, na vez do portador.' },

    // 71 — Argentina Campea
    71: { effects: [
        { action: Action.missionSetGoal, mission: Mission.swelcows, goal: Goal.winAtEnd,
          timing: Timing.passive, duration: untilMissionChange(Mission.swelcows) },
    ]},

    // 72 — Boludos
    72: { effects: [
        { action: Action.drink, amount: 1,
          target: mission([Mission.sjehnsens, Mission.swelcows], { secret: true }) },
    ]},

    // 73 — Pixuco
    73: { effects: [
        { action: Action.equip, target: choose(1), timing: Timing.passive, duration: untilDestroyed() },
        { action: Action.shotsHalve, target: equipped(), rounding: Rounding.up,
          if: { mission: [Mission.sjehnsens, Mission.swelcows] },
          timing: Timing.passive, duration: untilDestroyed(),
          otherwise: { action: Action.drink, target: equipped(), amount: 1,
                       timing: Timing.eachTurn, duration: untilDestroyed() } },
    ]},

    // 74 — Extreme Zero
    74: { effects: [
        { action: Action.drink, target: self(), amount: 1 },
        { action: Action.drink, amount: 1, target: {
            ...manual('quem estiver com uma das 3 missoes escolhidas por quem jogou'),
            secret: true } },
    ]},

    // 75 — Vai Virar Uma Carta
    75: {
        effects: [
            { action: Action.choice, chooser: 'table', options: [
                { action: Action.drink, target: choose(1), amount: 2 },
                { action: Action.drink, target: self(), amount: 2 },
            ]},
        ],
        ritual: 'Inventar uma carta nova e apresenta-la a mesa.',
        note: 'A mesa decide: carta boa, o alvo bebe; carta ruim, bebe quem inventou.',
    },

    // 76 — Divide e Multiplica
    76: { effects: [
        { action: Action.drink, target: self(), amount: 1 },
        { action: Action.drink, target: choose(1), amount: 1,
          then: { action: Action.drink, target: choose(1, { by: 'target' }), amount: 1 } },
    ]},

    // 77 — Atirador de Feijao do Gil
    77: { effects: [
        { action: Action.equip, target: choose(1), timing: Timing.passive, duration: untilDestroyed() },
        { action: Action.drink, target: choose(1), amount: 1, optional: true,
          timing: Timing.onTargetTurn, duration: untilDestroyed() },
    ], note: 'Uma vez por turno, na vez do portador, e e ele quem escolhe o alvo.' },

    // 78 — O Senhor dos Aneis
    78: { effects: [
        { action: Action.shotsIgnore, target: choose(1), timing: Timing.passive, duration: turns(2) },
    ]},

    // 79 — Largando a Medicina
    79: { effects: [
        { action: Action.shotsTransfer, between: choose(2), amount: 'half', rounding: Rounding.up },
    ], note: 'Metade dos shots de um jogador vai para outro; o resto arredonda para cima.' },

    // 80 — Bocejada da Fatima
    80: { effects: [
        { action: Action.equipmentTransfer, between: choose(2) },
    ]},

    // 81 — A Arvore da Berlim
    81: { effects: [
        { action: Action.auraDispel, scope: Scope.prolonged, amount: 'all' },
    ]},

    // 82 — FUDEU
    82: { effects: [
        { action: Action.equipmentDestroy, target: all() },
    ]},
};
