import { Action, Goal, Mission, Negatable, Pile, Scope, Timing } from '../vocabulary.js';
import {
    all, choose, farthest, manual, mission, neighbors, nextPlayer,
    others, previousPlayer, sameTarget, self,
} from '../targets.js';
import { permanent, turns, untilDrinks, untilMissionChange } from '../durations.js';

/**
 * Efeitos das cartas do pack 1 (Amigue Secrete 2023), ids 1 a 63.
 *
 * Chave = `card.id`. O `text` da carta continua sendo a fonte da verdade
 * narrativa; aqui esta a leitura mecanica dele, e quando as duas discordarem o
 * `text` ganha e esta entrada e que esta errada.
 *
 * `ritual` guarda a parte que o jogo nao resolve: cantar a musiquinha, dizer a
 * frase. Nao vira regra, mas some se ficar so na cabeca de quem jogou.
 */
export const PACK_1_EFFECTS = {
    // 1 — A Bebida Infinita
    1: { effects: [
        { action: Action.drink, target: choose(1), amount: 1,
          timing: Timing.onTargetTurn, duration: turns(3) },
    ]},

    // 2 — Festinha de Sexta
    2: { effects: [
        { action: Action.drink, target: others(), amount: 1 },
    ]},

    // 3 — Um Bom Companheiro
    3: {
        effects: [{ action: Action.drink, target: choose(1), amount: 1 }],
        ritual: 'Cantar a musiquinha antes de escolher.',
    },

    // 4 — Kitumbras
    4: { effects: [
        { action: Action.drink, target: mission(Mission.sauzburg), amount: 1 },
        { action: Action.drink, target: all({ except: { mission: Mission.sauzburg } }),
          amount: 1, optional: true },
    ]},

    // 5 — Cabeca Rachada
    5: { effects: [
        { action: Action.missionSetGoal, mission: Mission.sauzburg, goal: Goal.fewestShots,
          timing: Timing.passive, duration: untilMissionChange(Mission.sauzburg) },
    ]},

    // 6 — E, Deve Ser
    6: {
        effects: [
            { action: Action.negate, what: Negatable.missionSwap, timing: Timing.reaction },
        ],
        ritual: 'Dizer "e, deve ser".',
        note: 'Vale para troca com voce ou entre terceiros.',
    },

    // 7 — Livro do Brasa
    7: { effects: [
        { action: Action.drink, target: all(), amount: 1 },
    ]},

    // 8 — O Pai do Grupo
    8: { effects: [
        { action: Action.drink, target: choose(3), amount: 1 },
    ]},

    // 9 — Brasa Negrao
    9: { effects: [
        { action: Action.missionReveal, target: mission(Mission.swarley) },
        { action: Action.drink, target: mission(Mission.swarley), amount: 1,
          then: { action: Action.drink, target: choose(1, { by: 'target' }), amount: 1 } },
    ]},

    // 10 — Cesar que Destruiu o Imperio
    10: { effects: [
        { action: Action.missionSwap, between: choose(1),
          if: { mission: Mission.swarley, not: true },
          otherwise: { action: Action.missionSetGoal, mission: Mission.swarley,
                       goal: Goal.mostShots, timing: Timing.passive,
                       duration: untilMissionChange(Mission.swarley) } },
    ]},

    // 11 — Nao Posso, Tenho que Codar
    11: { effects: [
        { action: Action.negate, what: Negatable.drink, target: self(), amount: 1,
          timing: Timing.reaction },
    ]},

    // 12 — Renekton de Rei Destruido
    12: { effects: [
        { action: Action.drink, target: choose(4), amount: 1 },
    ]},

    // 13 — Roubando a Jurupinga
    13: { effects: [
        { action: Action.shotsRemove, target: choose(1), amount: 1 },
        { action: Action.drink, target: choose(1), amount: 1 },
    ]},

    // 14 — Cortador de Unhas
    14: { effects: [
        { action: Action.turnSkip, target: choose(1), amount: 1,
          if: { mission: Mission.sjehnsens } },
    ]},

    // 15 — O Guerreiro Entregue
    15: { effects: [
        { action: Action.turnSkip, target: choose(1), amount: 2 },
    ]},

    // 16 — Nao Da Pra Tetudo
    16: { effects: [
        { action: Action.handRedraw, target: self() },
    ]},

    // 17 — Vao Chegar uns Amigos Aqui em Casa
    17: { effects: [
        { action: Action.drink, target: choose(3), amount: 1 },
    ]},

    // 18 — Todos a Bordo!
    18: { effects: [
        { action: Action.drink, target: all(), amount: 1 },
    ]},

    // 19 — Cebola Amiga
    19: { effects: [
        { action: Action.missionReveal, target: mission(Mission.stanley) },
        { action: Action.drink, target: mission(Mission.stanley), amount: 2 },
    ]},

    // 20 — Dia do Legume
    20: { effects: [
        { action: Action.missionSetGoal, mission: Mission.stanley, goal: Goal.alliesWin,
          amount: 2, timing: Timing.delayed, duration: turns(3) },
    ]},

    // 21 — Dj Vomitado
    21: { effects: [
        { action: Action.shotsRemove, target: choose(1), amount: 2 },
    ]},

    // 22 — Jogos Desnecessarios
    22: { effects: [
        { action: Action.deckReturn, target: self(), amount: 2, from: Pile.discard,
          note: 'O baralho e embaralhado depois da escolha.' },
    ]},

    // 23 — To Out
    23: { effects: [
        { action: Action.redirect, what: Negatable.drink, target: choose(1), amount: 1,
          timing: Timing.reaction },
    ]},

    // 24 — Abraco na Arvore
    24: { effects: [
        { action: Action.drink, target: choose(1), amount: 1 },
        { action: Action.drink, target: self(), amount: 1,
          if: { mission: Mission.smichaels, who: 'selfOrTarget' } },
    ]},

    // 25 — Viagem no Porta-Malas
    25: { effects: [
        { action: Action.handDraw, target: self(), amount: 1 },
    ]},

    // 26 — Que Mentira!
    26: { effects: [
        { action: Action.negate, what: Negatable.nonShotPlay, target: self(),
          timing: Timing.reaction },
    ]},

    // 27 — Papai Noel
    27: { effects: [
        { action: Action.drink, target: choose(1), amount: 1 },
    ]},

    // 28 — Luvas no Chao
    28: { effects: [
        { action: Action.drink, target: self(), amount: 1 },
    ]},

    // 29 — E Aquela Velha Historia
    29: { effects: [
        { action: Action.drink, target: neighbors('left', 2), amount: 1 },
    ]},

    // 30 — Peitos
    30: { effects: [
        { action: Action.drink, target: farthest(), amount: 1 },
    ]},

    // 31 — Bebado de Shoyu
    31: { effects: [
        { action: Action.drink, target: choose(1), amount: 1 },
        { action: Action.drink, target: sameTarget(), amount: 1,
          if: { mission: Mission.sjamals },
          note: 'Somado ao shot anterior, fecha os 2 do texto.' },
    ]},

    // 32 — Quando Eu Fui pra Australia...
    32: { effects: [
        { action: Action.missionSwap, between: choose(2) },
    ]},

    // 33 — O Robin Brasileiro
    33: { effects: [
        { action: Action.copy, scope: Scope.anyPlayed },
    ]},

    // 34 — Vamos pra Baleia
    34: { effects: [
        { action: Action.orderRearrange, target: choose(4, { upTo: true }) },
    ]},

    // 35 — Disco de Duelo
    35: { effects: [
        { action: Action.deckPeek, target: self(), amount: 1, from: Pile.bottom,
          then: { action: Action.choice, chooser: 'self', options: [
              { action: Action.handDraw, target: self(), amount: 1, from: Pile.bottom },
              { action: Action.handDraw, target: self(), amount: 1, from: Pile.top },
          ]} },
    ]},

    // 36 — Cuidadron
    36: { effects: [
        { action: Action.negate, what: Negatable.effectCard, target: self(),
          timing: Timing.reaction },
    ]},

    // 37 — Caipa Dupla do Ceu
    37: { effects: [
        { action: Action.drink, target: self(), amount: 1 },
        { action: Action.drink, target: choose(1), amount: 1 },
    ]},

    // 38 — Role
    38: { effects: [
        { action: Action.drink, amount: 1,
          target: mission([Mission.swarley, Mission.smichaels, Mission.sauzburg], { secret: true }) },
    ]},

    // 39 — A Luta do Seculo
    39: { effects: [
        { action: Action.drink, amount: 1,
          target: all({ except: { mission: [Mission.sauzburg, Mission.swarley] } }) },
    ]},

    // 40 — Filtro do Snapchat
    40: { effects: [
        { action: Action.missionSwap,
          between: mission([Mission.swarley, Mission.sauzburg], { secret: true }) },
    ]},

    // 41 — Show das Drags
    41: { effects: [
        { action: Action.missionRotate,
          between: mission([Mission.sauzburg, Mission.stanley, Mission.sjehnsens], { secret: true }) },
    ]},

    // 42 — Client Perfeito
    42: { effects: [
        { action: Action.drink, target: choose(1), amount: 2 },
    ]},

    // 43 — Piada do Milton
    43: { effects: [
        { action: Action.choice, chooser: 'target', target: previousPlayer(), options: [
            { action: Action.manual, instruction: 'Contar uma piada para a mesa.' },
            { action: Action.drink, target: sameTarget(), amount: 2 },
        ]},
    ]},

    // 44 — Vamo virar? Vamo!
    44: { effects: [
        { action: Action.drink, target: all(), amount: 1 },
    ]},

    // 45 — Promoshare
    45: { effects: [
        { action: Action.drink, target: self(), amount: 1 },
        { action: Action.drink, target: choose(2), amount: 1 },
    ]},

    // 46 — Maozinha
    46: { effects: [
        { action: Action.drink, amount: 2,
          target: manual('o ultimo jogador desatento, no julgamento da mesa') },
    ]},

    // 47 — Ventilador Assassino
    47: { effects: [
        { action: Action.drink, target: nextPlayer(), amount: 1 },
    ]},

    // 48 — Prisao
    48: { effects: [
        { action: Action.turnSkip, target: choose(1), amount: 3, duration: untilDrinks(2),
          note: 'Sai antes dos 3 turnos se beber os 2 shots.' },
    ]},

    // 49 — Gemidinha
    49: {
        effects: [
            { action: Action.negate, what: Negatable.play, timing: Timing.reaction },
        ],
        ritual: 'Dar um gemidinho.',
        note: 'Usada fora da sua vez, o jogo segue pelo jogador seguinte a voce.',
    },

    // 50 — Modo Deus
    50: { effects: [
        { action: Action.missionPeek, target: choose(1) },
        { action: Action.missionSwap, between: sameTarget(), optional: true },
    ]},

    // 51 — Sou Louca Sim!
    51: { effects: [
        { action: Action.gameEndIn, amount: 2 },
    ]},

    // 52 — Cigarro no Olho
    52: { effects: [
        { action: Action.handSteal, target: choose(1), amount: 1, blind: true,
          then: { action: Action.turnExtraPlay, target: self(), amount: 1,
                  note: 'A carta roubada e jogada na hora.' } },
    ]},

    // 53 — Xis do Gelson
    53: { effects: [
        { action: Action.turnSkip, target: nextPlayer(), amount: 2 },
    ]},

    // 54 — Peido do Exequiel
    54: { effects: [
        { action: Action.orderReverse },
    ]},

    // 55 — A Queda
    55: { effects: [
        { action: Action.shotsRemove, target: choose(1), amount: 2 },
    ]},

    // 56 — O Politico
    56: { effects: [
        { action: Action.choice, chooser: 'self', options: [
            { action: Action.missionRotate, between: all(), direction: 'left' },
            { action: Action.missionRotate, between: all(), direction: 'right' },
        ]},
    ]},

    // 57 — A Prova Comida
    57: { effects: [
        { action: Action.gameLose, target: choose(1), duration: turns(2),
          note: 'Perde mesmo cumprindo a missao, ate a marca expirar.' },
    ]},

    // 58 — Tabua do Joaquim
    58: { effects: [
        { action: Action.handDiscard, target: choose(3), amount: 1 },
    ]},

    // 59 — O Que?
    59: { effects: [
        { action: Action.negate, what: Negatable.drink, target: self(), amount: 2,
          upTo: true, timing: Timing.reaction },
    ]},

    // 60 — Ah Meu, Para!
    60: { effects: [
        { action: Action.negate, what: Negatable.drink, target: choose(1), amount: 1,
          timing: Timing.reaction },
    ]},

    // 61 — O Fio Vermelho
    61: { effects: [
        { action: Action.linkShots, between: choose(2),
          timing: Timing.passive, duration: permanent() },
    ]},

    // 62 — Quinta Dimensao
    62: { effects: [
        { action: Action.gameEndWhen, condition: { shots: { gte: 5 } },
          note: 'Encerra quando qualquer jogador chegar a 5 shots.' },
    ]},

    // 63 — Bencao de Gladstone
    63: { effects: [
        { action: Action.shotsSwap, between: choose(2) },
    ]},
};
