// Cenarios do pack 3 (Amigue Secrete 2025), cartas 83 a 116. Formato e regras
// em scripts/validate-cards.mjs. Nao importa nada: o laboratorio le no browser.

const MESA_DE_5 = [
    { mission: 'stanley',   shots: 0 },
    { mission: 'swarley',   shots: 0 },
    { mission: 'sauzburg',  shots: 0 },
    { mission: 'sjamals',   shots: 0 },
    { mission: 'smichaels', shots: 0 },
];

const fora = (s, ...missoes) => s.players.filter(x => !missoes.includes(x.mission));
const ninguemMais = (s, ...missoes) => fora(s, ...missoes).every(x => x.shots === 0);
const pergunta = (passos, kind) => passos.find(e => e.pending?.[0]?.kind === kind)?.pending[0];
const noDescarte = (s, idCard) => s.discardPile.some(e => e.idCard === idCard);
const valendo = (s, idCard) => s.ongoing.some(o => o.idCard === idCard);
const INFINITO = Number.MAX_SAFE_INTEGER;

export default [
    // ------------------------------------------------------------ fase 1: shots

    {
        carta: 83,
        nome: 'Pó de Pirlimpimpim: Você escolhe alguém para beber 5',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [['bebe 5', p('swarley').shots === 5], ['só ele', ninguemMais(s, 'swarley')]],
    },
    {
        carta: 83,
        nome: 'Pó de Pirlimpimpim: Alguém joga o pó em você, e você bebe 5',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [['você bebe 5', p('swarley').shots === 5]],
    },
    {
        carta: 86,
        nome: 'Caipirinha de Banana: Quem mais deu shots bebe 2',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', dados: 4 }, { mission: 'sauzburg', dados: 2 }],
        joga: 'stanley',
        espera: (s, p) => [['quem mais deu bebe 2', p('swarley').shots === 2], ['só ele', ninguemMais(s, 'swarley')]],
    },
    {
        carta: 86,
        nome: 'Caipirinha de Banana: Empatados no topo, você bebe junto',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', dados: 4 }, { mission: 'sauzburg', dados: 4 }],
        joga: 'stanley',
        voce: 'sauzburg',
        espera: (s, p) => [['os dois bebem 2', p('swarley').shots === 2 && p('sauzburg').shots === 2]],
    },
    {
        carta: 86,
        nome: 'Caipirinha de Banana: Ninguém deu shot, ninguém bebe',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sauzburg' }],
        joga: 'stanley',
        espera: s => [['ninguém bebe', s.players.every(x => x.shots === 0)]],
    },
    {
        carta: 91,
        nome: '#CriseNaDiretoria: Quem tem 5 ou mais bebe 1',
        mesa: [{ mission: 'stanley', shots: 5 }, { mission: 'swarley', shots: 7 }, { mission: 'sauzburg', shots: 4 }],
        joga: 'stanley',
        espera: (s, p) => [
            ['quem tem 5 bebe 1', p('stanley').shots === 6 && p('swarley').shots === 8],
            ['quem tem 4 não', p('sauzburg').shots === 4],
        ],
    },
    {
        carta: 91,
        nome: '#CriseNaDiretoria: Você com 5 shots bebe mais 1',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 5 }],
        joga: 'stanley',
        voce: 'swarley',
        espera: (s, p) => [['você vai a 6', p('swarley').shots === 6], ['quem jogou não', p('stanley').shots === 0]],
    },
    {
        carta: 95,
        nome: 'Tatuagem de Shuriken: O Swelcows e mais um sorteado bebem 1',
        mesa: [{ mission: 'stanley' }, { mission: 'swelcows' }, { mission: 'sauzburg' }, { mission: 'sjamals' }],
        joga: 'stanley',
        espera: (s, p) => [
            ['o swelcows bebe 1, e não 2', p('swelcows').shots === 1],
            ['mais um bebe 1', fora(s, 'swelcows').filter(x => x.shots === 1).length === 1],
        ],
    },
    {
        carta: 95,
        nome: 'Tatuagem de Shuriken: O sorteio nunca cai no Swelcows',
        mesa: [{ mission: 'stanley' }, { mission: 'swelcows' }],
        joga: 'stanley',
        voce: 'swelcows',
        espera: (s, p) => [['o swelcows bebe só 1', p('swelcows').shots === 1], ['o sorteado é o outro', p('stanley').shots === 1]],
    },
    {
        carta: 95,
        nome: 'Tatuagem de Shuriken: Sem Swelcows na mesa, só o sorteado bebe',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sauzburg' }],
        joga: 'stanley',
        espera: s => [['um só bebe 1', s.players.filter(x => x.shots === 1).length === 1 && s.players.every(x => x.shots <= 1)]],
    },
    {
        carta: 100,
        nome: 'Uvas para Ressaca: Alguém fica com metade, arredondando para cima',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 3 }],
        joga: 'stanley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [['3 vira 2', p('swarley').shots === 2]],
    },
    {
        carta: 100,
        nome: 'Uvas para Ressaca: Você fica com metade dos seus 6',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 6 }],
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [['6 vira 3', p('swarley').shots === 3]],
    },
    {
        carta: 106,
        nome: 'Eu Sou o Lucas: Um sorteado bebe 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        espera: s => [['um só bebe 1', s.players.filter(x => x.shots === 1).length === 1 && s.players.every(x => x.shots <= 1)]],
    },
    {
        carta: 107,
        nome: 'Vendedor de Drogas: Você faz alguém beber 1',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 2 }],
        joga: 'stanley',
        escolhas: { '0:option': 0, '0.0': ['swarley'] },
        espera: (s, p, { passos }) => [
            ['as opções têm nome', pergunta(passos, 'option')?.labels?.every(Boolean)],
            ['bebe 1', p('swarley').shots === 3],
        ],
    },
    {
        carta: 107,
        nome: 'Vendedor de Drogas: Alguém tira 1 shot da sua conta',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 2 }],
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { '0:option': 1, '0.1': ['swarley'] },
        espera: (s, p) => [['você fica com 1', p('swarley').shots === 1], ['ninguém bebe', !s.log.some(e => e.type === 'drink')]],
    },
    {
        carta: 110,
        nome: 'Petricor: Você zera os shots de alguém',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 7 }],
        joga: 'stanley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [['zerado', p('swarley').shots === 0]],
    },
    {
        carta: 110,
        nome: 'Petricor: Alguém zera os seus shots',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 7 }],
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [['você zera', p('swarley').shots === 0]],
    },

    // ------------------------------------------------- fase 2: turno, mao e baralho

    {
        carta: 85,
        nome: 'Jp da Ganância: Você compra 2 e passa a arriscar a compra',
        mesa: [{ mission: 'stanley', mao: [] }, { mission: 'swarley' }],
        joga: 'stanley',
        espera: (s, p) => [
            ['comprou 2, além da compra da vez', p('stanley').hand.length === 3],
            ['a ganância ficou valendo', valendo(s, 85)],
        ],
        depois: [{ turnos: 1 }, { carta: 7, joga: 'stanley' }, { turnos: 1 }],
        esperaDepois: s => [
            ['terminou a vez seguinte com 5 ou menos: a ganância acaba', !valendo(s, 85)],
            ['a carta foi para o descarte', noDescarte(s, 85)],
        ],
    },
    {
        carta: 85,
        nome: 'Jp da Ganância: Com a mão cheia, a compra da vez segue arriscada',
        mesa: [{ mission: 'stanley', mao: [7, 8, 12, 17, 18, 21] }, { mission: 'swarley' }],
        joga: 'stanley',
        semente: 7,
        depois: [{ carta: 2, joga: 'stanley' }, { turnos: 2 }],
        esperaDepois: (s, p, { log }) => [
            ['ainda valendo depois de uma vez com mão cheia', valendo(s, 85)],
            ['a compra da vez foi sorteada', log.some(e => e.type === 'draw.failed') || p('stanley').hand.length >= 7],
        ],
    },
    {
        carta: 89,
        nome: 'Foto do Frango: Alguém escolhe uma carta da mão e te entrega, e você joga outra',
        mesa: [{ mission: 'stanley', mao: [] }, { mission: 'swarley', mao: [7, 2] }],
        joga: 'stanley',
        escolhas: { 0: ['swarley'], '0:give': [2] },
        espera: (s, p, { passos }) => [
            ['quem escolhe a carta é o alvo', pergunta(passos, 'cards')?.chooserId === p('swarley').id],
            ['a carta veio para você', p('stanley').hand.includes(2) && !p('swarley').hand.includes(2)],
            ['você joga de novo', s.phase === 'play' && s.order[s.turnIndex] === p('stanley').id],
        ],
    },
    {
        carta: 89,
        nome: 'Foto do Frango: Você entrega a carta que quiser',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', mao: [7, 2, 8] }],
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley'], '0:give': [8] },
        espera: (s, p) => [['você ficou com as outras', p('swarley').hand.join() === '7,2']],
    },
    {
        carta: 92,
        nome: 'Slides?: Todos mostram uma carta sorteada da mão',
        mesa: [{ mission: 'stanley', mao: [7, 8] }, { mission: 'swarley', mao: [12, 17, 18] }, { mission: 'sauzburg', mao: [] }],
        joga: 'stanley',
        espera: (s, p) => [
            ['cada um com mão mostrou 1', p('stanley').revealed.length === 1 && p('swarley').revealed.length === 1],
            ['a mostrada estava na mão', p('swarley').hand.includes(p('swarley').revealed[0])],
            ['mão vazia não mostra', p('sauzburg').revealed.length === 0],
        ],
    },
    {
        carta: 94,
        nome: 'Cama Embaixo da Mesa: Você dorme 1 vez e volta jogando 2',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sauzburg' }],
        joga: 'stanley',
        espera: (s, p) => [['perde a próxima vez', p('stanley').skipTurns === 1], ['nada de jogada extra agora', s.phase === 'end']],
        // swarley, sauzburg, (stanley dorme) swarley, sauzburg, stanley
        depois: [{ turnos: 5 }],
        esperaDepois: (s, p) => [
            ['a vez é sua', s.order[s.turnIndex] === p('stanley').id],
            ['com 2 jogadas', s.playsLeft === 2],
        ],
    },
];
