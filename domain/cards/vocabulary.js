// Vocabulario fechado dos efeitos de carta.
//
// O `text` em assets/cards.js e prosa: serve de sabor para a arte e para o
// modal, mas nada ali e executavel. Este arquivo e a outra metade — o conjunto
// minimo de acoes, alvos e duracoes capaz de descrever as 116 cartas sem
// inventar um verbo novo por carta.
//
// Foi derivado lendo as 116, entao e deliberadamente fechado: se uma carta nao
// couber aqui, ou o vocabulario cresce de proposito (com o verbo novo servindo
// mais de uma carta) ou a carta vira `manual`. Nada de string solta.
//
// Camada pura: nao importa React, nem Supabase, nem os assets. Roda em Node sem
// bundler, que e o que scripts/validate-effects.mjs faz.

// As identidades secretas. Cada uma carrega uma missao (condicao de vitoria) e
// anda junto com ela: "trocar de missao" move o par identidade+missao de um
// jogador para outro, e e por isso que existe um conceito so, e nao dois.
export const Mission = Object.freeze({
    sauzburg:  'sauzburg',
    swarley:   'swarley',
    smichaels: 'smichaels',
    stanley:   'stanley',
    sjehnsens: 'sjehnsens',
    swelcows:  'swelcows',
    sjamals:   'sjamals',
});

// Como o efeito escolhe quem ele atinge.
export const TargetKind = Object.freeze({
    self:       'self',       // quem jogou a carta
    choose:     'choose',     // escolha de `count` jogadores (`upTo` deixa escolher menos)
    all:        'all',        // todos; `except` tira quem nao entra
    random:     'random',     // sorteio na mesa
    relative:   'relative',   // vizinhanca: `direction` + `count`, ou `offset` (-1 = anterior)
    farthest:   'farthest',   // o mais distante de quem jogou
    mission:    'mission',    // quem estiver com a missao X (`mission` aceita lista)
    rank:       'rank',       // extremo de uma metrica: `by`, `order`, `count`
    filter:     'filter',     // todos que satisfazem `where`
    played:     'played',     // quem jogou a carta que disparou a reacao
    equipped:   'equipped',   // o portador do equipamento
    sameTarget: 'sameTarget', // o alvo ja resolvido antes, na mesma carta
    manual:     'manual',     // a mesa aponta quem e; `description` diz o criterio
});

// O que o efeito faz. Prefixo = recurso tocado, para o resolvedor despachar por
// familia em vez de uma tabela gigante de casos.
export const Action = Object.freeze({
    // Shots: `drink` e beber de verdade (entra na contagem); o resto so mexe no numero.
    drink:              'drink',
    shotsAdd:           'shots.add',
    shotsRemove:        'shots.remove',
    shotsSet:           'shots.set',        // amount 0 ou 'infinity'
    shotsHalve:         'shots.halve',
    shotsSwap:          'shots.swap',
    shotsTransfer:      'shots.transfer',
    shotsIgnore:        'shots.ignore',     // bebe, mas nao conta

    // Turno.
    turnSkip:           'turn.skip',
    turnExtraPlay:      'turn.extraPlay',

    // Mao e baralho.
    handDraw:           'hand.draw',
    handDiscard:        'hand.discard',
    handRedraw:         'hand.redraw',
    handSteal:          'hand.steal',
    handGive:           'hand.give',
    handReveal:         'hand.reveal',
    deckPeek:           'deck.peek',
    deckReturn:         'deck.return',

    // Missoes.
    missionSwap:        'mission.swap',
    missionRotate:      'mission.rotate',
    missionPeek:        'mission.peek',     // ve em segredo
    missionReveal:      'mission.reveal',   // abre para a mesa
    missionSetGoal:     'mission.setGoal',
    missionTake:        'mission.take',
    missionLock:        'mission.lock',
    missionChain:       'mission.chain',    // troca em cadeia ate uma condicao de parada

    // Reacoes.
    negate:             'negate',
    redirect:           'redirect',

    // Equipamentos.
    equip:              'equip',
    equipmentDestroy:   'equipment.destroy',
    equipmentTransfer:  'equipment.transfer',

    // Mesa.
    orderReverse:       'order.reverse',
    orderRearrange:     'order.rearrange',

    // Fim de jogo.
    gameEndIn:          'game.endIn',
    gameEndWhen:        'game.endWhen',
    gameWin:            'game.win',
    gameLose:           'game.lose',

    // Vinculos entre jogadores.
    linkShots:          'link.shots',
    linkFate:           'link.fate',

    // Meta.
    auraDispel:         'aura.dispel',
    copy:               'copy',
    choice:             'choice',           // `options` + `chooser`
    manual:             'manual',           // exige juiz humano; `instruction` explica
});

// Quando o efeito resolve.
export const Timing = Object.freeze({
    immediate:    'immediate',    // ao jogar (padrao)
    onTargetTurn: 'onTargetTurn', // na vez do alvo
    eachTurn:     'eachTurn',     // todo turno, enquanto durar
    delayed:      'delayed',      // depois de `duration`
    reaction:     'reaction',     // fora da vez, respondendo a uma jogada
    passive:      'passive',      // enquanto a carta estiver em jogo (equipamentos)
    endgame:      'endgame',      // na apuracao final
});

// Ate quando o efeito vale. Sem `duration`, o efeito e pontual.
export const DurationKind = Object.freeze({
    turns:              'turns',              // `turns: N`
    untilMissionChange: 'untilMissionChange', // ate a missao em `mission` trocar de dono
    untilDrinks:        'untilDrinks',        // ate o alvo beber `amount`
    untilDestroyed:     'untilDestroyed',     // ate outra carta remover
    permanent:          'permanent',
});

// Alvos de `negate` e `redirect`: o que exatamente a carta cancela ou desvia.
export const Negatable = Object.freeze({
    drink:       'drink',
    effectCard:  'effectCard',
    equipment:   'equipment',
    divine:      'divine',
    missionSwap: 'mission.swap',
    play:        'play',        // a jogada inteira, seja qual for
    nonShotPlay: 'nonShotPlay', // qualquer jogada que nao envolva shots
});

// Escopo de `copy` e `aura.dispel`.
export const Scope = Object.freeze({
    lastPlayed: 'lastPlayed',
    anyPlayed:  'anyPlayed',
    prolonged:  'prolonged',  // efeitos de acao prolongada ativos
    equipment:  'equipment',  // equipamentos em jogo
    one:        'one',        // um alvo, escolhido
    all:        'all',
});

// Metas que uma carta pode impor a uma missao.
export const Goal = Object.freeze({
    fewestShots: 'fewestShots',
    mostShots:   'mostShots',
    alliesWin:   'alliesWin',   // depende da vitoria de `amount` outros jogadores
    winAtEnd:    'winAtEnd',
    loseAtEnd:   'loseAtEnd',
});

// Quem decide, quando a carta oferece uma escolha.
export const Chooser = Object.freeze({
    self:   'self',   // quem jogou
    target: 'target', // o alvo
    table:  'table',  // a mesa, no voto
});

// Sobre quem a condicao `if` pergunta.
export const ConditionWho = Object.freeze({
    target:       'target',       // padrao
    self:         'self',
    selfOrTarget: 'selfOrTarget',
});

// De onde a carta sai, em acoes de mao e baralho.
export const Pile = Object.freeze({
    top:     'top',
    bottom:  'bottom',
    hand:    'hand',
    discard: 'discard',
});

// Metricas que o alvo `rank` compara. Fechada pelo mesmo motivo do resto: o
// resolvedor precisa saber de qual contador esta falando.
export const Metric = Object.freeze({
    shots:      'shots',      // shots bebidos
    shotsGiven: 'shotsGiven', // shots distribuidos a outros
});

export const Rounding = Object.freeze({ up: 'up', down: 'down' });

export const Direction = Object.freeze({ left: 'left', right: 'right' });

// `amount` aceita numero ou uma destas palavras. `perOpponent` existe porque
// a quantidade so e conhecida na mesa: "beber 1 shot para cada adversario
// jogando" muda com o numero de jogadores.
export const AMOUNT_KEYWORDS = Object.freeze(['half', 'all', 'infinity', 'perOpponent']);
