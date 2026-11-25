// Cenarios do pack 2 (Amigue Secrete 2024), cartas 64 a 82. Formato e regras
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

export default [
    // ------------------------------------------------------------ fase 1: shots

    {
        carta: 65,
        nome: 'Baguga ou Morte?: Alguém escolhe baguga e bebe 1 por adversário',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 0: ['swarley'], '0:option': 0 },
        espera: (s, p, { passos }) => [
            ['quem escolhe é o alvo', pergunta(passos, 'option')?.chooserId === p('swarley').id],
            ['bebe 4, um por adversário', p('swarley').shots === 4],
            ['não perde vez', p('swarley').skipTurns === 0],
        ],
    },
    {
        carta: 65,
        nome: 'Baguga ou Morte?: Você escolhe morte, bebe a baguga e perde 2 vezes',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley'], '0:option': 1 },
        espera: (s, p) => [['você bebe 4', p('swarley').shots === 4], ['e perde 2 vezes', p('swarley').skipTurns === 2]],
    },
    {
        carta: 75,
        nome: 'Vai Virar Uma Carta: A mesa aprova, e você escolhe quem bebe 2',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { '0:vote': true, '0.0': ['sauzburg'] },
        espera: (s, p, { passos, log }) => {
            const inventou = log.findIndex(e => e.type === 'ritual.done');
            const votou = log.findIndex(e => e.type === 'vote');
            return [
                ['o alvo não é perguntado antes da janela',
                    !passos.some(e => e.resolution?.declaring && e.pending?.[0]?.kind === 'choose')],
                ['votam todos menos quem jogou', pergunta(passos, 'vote')?.voters.length === 4],
                ['o ritual vem antes do voto', inventou !== -1 && votou !== -1 && inventou < votou],
                ['o log diz quantos em cada lado', log.some(e => e.type === 'vote' && e.yes === 4 && e.no === 0)],
                ['o escolhido bebe 2', p('sauzburg').shots === 2],
                ['quem jogou não bebe', p('stanley').shots === 0],
            ];
        },
    },
    {
        carta: 75,
        nome: 'Vai Virar Uma Carta: A mesa reprova, e quem inventou bebe 2',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { '0:vote': false },
        espera: (s, p, { passos }) => [
            ['quem jogou bebe 2', p('stanley').shots === 2],
            ['ninguém mais', ninguemMais(s, 'stanley')],
            ['ninguém foi escolhido', !pergunta(passos, 'choose')],
        ],
    },
    {
        carta: 75,
        nome: 'Vai Virar Uma Carta: Empate no voto é carta boa',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { '0:vote': ['swarley', 'sauzburg'], '0.0': ['sjamals'] },
        espera: (s, p, { log }) => [
            ['dois a dois', log.some(e => e.type === 'vote' && e.yes === 2 && e.no === 2)],
            ['o escolhido bebe 2', p('sjamals').shots === 2],
        ],
    },
    {
        carta: 76,
        nome: 'Divide e Multiplica: Você bebe, outro bebe, e ele escolhe mais um',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 1: ['swarley'], '1.then': ['sauzburg'] },
        espera: (s, p, { passos }) => {
            const escolhas = passos.filter(e => e.pending?.[0]?.kind === 'choose').map(e => e.pending[0]);
            const segunda = escolhas.find(r => r.slot === '1.then');
            return [
                ['os três bebem 1', ['stanley', 'swarley', 'sauzburg'].every(m => p(m).shots === 1)],
                ['quem jogou não é candidato do primeiro', !escolhas.find(r => r.slot === '1')?.candidates.includes(p('stanley').id)],
                ['o segundo é escolhido pelo primeiro, sem se escolher',
                    segunda?.chooserId === p('swarley').id && !segunda.candidates.includes(p('swarley').id)],
            ];
        },
    },
    {
        carta: 76,
        nome: 'Divide e Multiplica: Alguém escolhe você, e você escolhe o próximo',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 1: ['swarley'], '1.then': ['stanley'] },
        espera: (s, p) => [['você bebe 1', p('swarley').shots === 1], ['quem jogou bebe 2', p('stanley').shots === 2]],
    },
    {
        carta: 79,
        nome: 'Largando a Medicina: Alguém perde metade, e o que sobra arredonda para cima',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 3 }, { mission: 'sauzburg', shots: 5 }],
        joga: 'stanley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [['3 vira 2', p('swarley').shots === 2], ['ninguém recebe', p('stanley').shots === 0 && p('sauzburg').shots === 5]],
    },
    {
        carta: 79,
        nome: 'Largando a Medicina: Você perde metade dos seus 5',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 3 }, { mission: 'sauzburg', shots: 5 }],
        joga: 'stanley',
        voce: 'sauzburg',
        escolhas: { 0: ['sauzburg'] },
        espera: (s, p) => [['5 vira 3', p('sauzburg').shots === 3]],
    },

    // ------------------------------------------------------------ fase 3: missoes

    {
        carta: 68,
        nome: 'Uma Noite de Fúria: Com o Smichaels entre os escolhidos, ele ganha se todos perderem',
        mesa: [{ mission: 'sauzburg', shots: 9 }, { mission: 'smichaels', shots: 3 }, { mission: 'swelcows' }],
        joga: 'sauzburg',
        escolhas: { 0: ['smichaels', 'swelcows'] },
        espera: (s, p, { apurar }) => [
            ['a meta do smichaels mudou', p('smichaels').goal === 'soleWinner' && p('smichaels').goalChangedBy === 68],
            ['a carta fica na mesa', s.ongoing.some(o => o.idCard === 68 && o.onTable)],
            ['o sauzburg ganha, então o smichaels perde', apurar()[p('smichaels').id] === false],
        ],
        depois: [{ carta: 32, joga: 'sauzburg', escolhas: { 0: ['smichaels', 'swelcows'] } }],
        esperaDepois: (s, p) => [['a troca do smichaels encerra o efeito', p('smichaels').goal === 'alliesWin']],
    },
    {
        carta: 68,
        nome: 'Uma Noite de Fúria: Você é o Smichaels, e ganha se todo o resto perder',
        mesa: [{ mission: 'swelcows' }, { mission: 'smichaels' }],
        joga: 'swelcows',
        voce: 'smichaels',
        escolhas: { 0: ['smichaels', 'swelcows'] },
        espera: (s, p, { apurar }) => [['o swelcows nunca ganha, e você ganha', apurar()[p('smichaels').id] === true]],
    },
    {
        carta: 68,
        nome: 'Uma Noite de Fúria: Sem o Smichaels, nada muda, e a carta fica na mesa mesmo assim',
        mesa: [{ mission: 'stanley' }, { mission: 'smichaels' }, { mission: 'swarley' }, { mission: 'sauzburg' }],
        joga: 'stanley',
        voce: 'smichaels',
        escolhas: { 0: ['swarley', 'sauzburg'] },
        espera: (s, p) => [
            ['a sua meta não mudou', p('smichaels').goal === 'alliesWin'],
            ['a carta fica na mesa, para não contar quem é quem', s.ongoing.some(o => o.idCard === 68 && o.onTable && !o.active)],
        ],
    },
    {
        carta: 71,
        nome: 'Argentina Campeã: O Swelcows vence no fim',
        mesa: [{ mission: 'stanley' }, { mission: 'swelcows' }],
        joga: 'stanley',
        espera: (s, p, { apurar }) => [
            ['o swelcows ganha', apurar()[p('swelcows').id] === true],
            ['a carta fica na mesa', s.ongoing.some(o => o.idCard === 71 && o.onTable)],
        ],
        depois: [{ carta: 32, joga: 'stanley', escolhas: { 0: ['stanley', 'swelcows'] } }],
        esperaDepois: (s, p, { apurar }) => [['trocou, acabou', apurar()[p('swelcows').id] === false]],
    },
    {
        carta: 71,
        nome: 'Argentina Campeã: Você é o Swelcows e vai ganhar',
        mesa: [{ mission: 'stanley' }, { mission: 'swelcows' }],
        joga: 'stanley',
        voce: 'swelcows',
        espera: (s, p) => [['a sua meta mudou', p('swelcows').goalChangedBy === 71]],
    },
    {
        carta: 72,
        nome: 'Boludos: Sjehnsens e Swelcows bebem 1, sem se revelar',
        mesa: [{ mission: 'stanley' }, { mission: 'sjehnsens' }, { mission: 'swelcows' }, { mission: 'swarley' }],
        joga: 'stanley',
        espera: (s, p) => [
            ['os dois bebem 1', p('sjehnsens').shots === 1 && p('swelcows').shots === 1],
            ['ninguém mais', ninguemMais(s, 'sjehnsens', 'swelcows')],
            ['ninguém revelado', s.players.every(x => !x.missionRevealed)],
        ],
    },
    {
        carta: 72,
        nome: 'Boludos: Você é o Swelcows e bebe 1',
        mesa: [{ mission: 'stanley' }, { mission: 'sjehnsens' }, { mission: 'swelcows' }],
        joga: 'stanley',
        voce: 'swelcows',
        espera: (s, p) => [['você bebe 1', p('swelcows').shots === 1]],
    },
    {
        carta: 74,
        nome: 'Extreme Zero: Você escolhe 3 missões, bebe 1, e quem tem elas bebe 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { '1:missions': ['swarley', 'swelcows', 'sjamals'] },
        espera: (s, p, { passos }) => [
            ['as missões são declaradas antes da janela', passos.some(e => e.phase === 'window'
                && e.stack.at(-1)?.choices?.['1:missions']?.length === 3)],
            ['dá para escolher entre as 7', pergunta(passos, 'missions')?.options.length === 7],
            ['você bebe 1', p('stanley').shots === 1],
            ['quem tem as escolhidas bebe 1', p('swarley').shots === 1 && p('sjamals').shots === 1],
            ['ninguém mais', ninguemMais(s, 'stanley', 'swarley', 'sjamals')],
        ],
    },
    {
        carta: 74,
        nome: 'Extreme Zero: Você tem uma das escolhidas e bebe só o seu',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { '1:missions': ['stanley', 'swarley', 'sauzburg'] },
        espera: (s, p) => [['você bebe só 1', p('stanley').shots === 1], ['os outros dois bebem 1', p('swarley').shots === 1 && p('sauzburg').shots === 1]],
    },
    {
        carta: 74,
        nome: 'Extreme Zero: Alguém escolhe a sua missão, e você bebe 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'smichaels',
        escolhas: { '1:missions': ['smichaels', 'sjehnsens', 'swelcows'] },
        espera: (s, p) => [['você bebe 1', p('smichaels').shots === 1]],
    },

    // ------------------------------------------------------ fase 4: o que dura

    {
        carta: 78,
        nome: 'O Senhor dos Anéis: Por 2 rodadas, o que alguém bebe não conta',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sauzburg' }],
        joga: 'stanley',
        escolhas: { 0: ['swarley'] },
        depois: [
            { carta: 42, joga: 'sauzburg', escolhas: { 0: ['swarley'] }, espera: (s, p) => [
                ['bebeu sem contar', p('swarley').shots === 0 && p('swarley').shotsIgnored === 2],
            ] },
            { turnos: 4 },
            { carta: 42, joga: 'sauzburg', escolhas: { 0: ['swarley'] } },
        ],
        esperaDepois: (s, p) => [['depois de 2 rodadas volta a contar', p('swarley').shots === 2], ['a carta saiu', !valendo(s, 78)]],
    },
    {
        carta: 78,
        nome: 'O Senhor dos Anéis: Você bebe e não conta',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }],
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley'] },
        depois: [{ carta: 83, joga: 'stanley', escolhas: { 0: ['swarley'] } }],
        esperaDepois: (s, p) => [['a sua conta não muda', p('swarley').shots === 0], ['mas você bebeu', p('swarley').shotsIgnored === 5]],
    },
    {
        carta: 81,
        nome: 'A Árvore da Berlim: Tudo o que está valendo é apagado, menos equipamento',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', equipamento: [108] }, { mission: 'sauzburg', shots: 9 }],
        joga: 'sauzburg',
        antes: [
            { carta: 57, joga: 'stanley', escolhas: { 0: ['sauzburg'] } },
            { carta: 61, joga: 'swarley', escolhas: { 0: ['stanley', 'sauzburg'] } },
            { carta: 5, joga: 'sauzburg' },
        ],
        espera: (s, p, { apurar }) => [
            ['nada mais valendo', s.ongoing.length === 0],
            ['as cartas voltaram ao descarte', [57, 61, 5].every(id => noDescarte(s, id))],
            ['a meta trocada foi desfeita', p('sauzburg').goal === 'mostShots'],
            ['a derrota forçada foi embora', apurar()[p('sauzburg').id] === true],
            ['o equipamento ficou', p('swarley').equipment.length === 1],
        ],
    },
    {
        carta: 81,
        nome: 'A Árvore da Berlim: O que estava sobre você é apagado',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }],
        joga: 'stanley',
        voce: 'swarley',
        antes: [{ carta: 78, joga: 'stanley', escolhas: { 0: ['swarley'] } }],
        espera: (s, p) => [['nada valendo sobre você', !s.ongoing.some(o => o.targets.includes(p('swarley').id))]],
    },

    // ------------------------------------------------------------ fase 5: reacoes

    {
        carta: 67,
        nome: 'Ricardo Goleiro 1: Você defende a carta divina jogada em você',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 6 }],
        joga: 'swarley',
        gatilho: { carta: 110, joga: 'stanley', escolhas: { 0: ['swarley'] } },
        espera: (s, p, { log }) => [['anulada', log.some(e => e.type === 'cancelled' && e.idCard === 110)], ['os seus shots ficam', p('swarley').shots === 6]],
    },
    {
        carta: 67,
        nome: 'Ricardo Goleiro 1: Contra carta que não é divina, a defesa é recusada',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 6 }],
        joga: 'swarley',
        gatilho: { carta: 21, joga: 'stanley', escolhas: { 0: ['swarley'] } },
        recusada: true,
        espera: (s, p) => [['a 67 continua na mão', p('swarley').hand.includes(67)]],
    },
    {
        carta: 67,
        nome: 'Ricardo Goleiro 1: Contra divina em outro, a defesa é recusada',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sauzburg', shots: 4 }],
        joga: 'swarley',
        gatilho: { carta: 110, joga: 'stanley', escolhas: { 0: ['sauzburg'] } },
        recusada: true,
        espera: (s, p) => [['a 67 continua na mão', p('swarley').hand.includes(67)]],
    },
    {
        carta: 69,
        nome: 'Tchouameni: Você pula a jogada de quem está prestes a jogar',
        mesa: MESA_DE_5,
        joga: 'swarley',
        gatilho: { joga: 'stanley' },
        espera: (s, p, { log }) => [
            ['quem ia jogar perdeu a jogada', s.phase === 'end' && s.order[s.turnIndex] === p('stanley').id],
            ['e ficou com a carta', p('stanley').hand.length === 6],
            ['você disse Tchouameni', log.some(e => e.type === 'ritual.done' && e.playerId === p('swarley').id)],
        ],
    },
    {
        carta: 69,
        nome: 'Tchouameni: Alguém pula a sua jogada, e a mesa pode responder',
        mesa: MESA_DE_5,
        joga: 'swarley',
        voce: 'stanley',
        gatilho: { joga: 'stanley' },
        reacoes: [{ joga: 'stanley', carta: 49 }],
        espera: (s, p, { log }) => [
            ['você cancelou a Tchouameni', log.some(e => e.type === 'cancelled' && e.idCard === 69)],
            ['e ainda pode jogar', s.phase === 'play' && s.order[s.turnIndex] === p('stanley').id],
        ],
    },

    // ------------------------------------------------------- fase 6: equipamentos

    {
        carta: 64,
        nome: 'Bitrix: Você escolhe em segredo o objetivo de outra missão',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 9 }, { mission: 'sauzburg', shots: 5 }],
        joga: 'swarley',
        escolhas: { '0:missions': ['sauzburg'] },
        espera: (s, p, { passos, log, apurar }) => [
            ['a escolha é do portador, entre as missões da partida', pergunta(passos, 'missions')?.chooserId === 2
                && pergunta(passos, 'missions')?.options.length === 3],
            ['o relógio fica no seu pulso', p('swarley').equipment.some(e => e.idCard === 64 && e.mission === 'sauzburg')],
            ['a sua missão continua a mesma', p('swarley').id === 2],
            ['com mais shots, você ganha pelo objetivo do Sauzburg', apurar()[2] === true && apurar()[3] === false],
            ['o log não conta a missão escolhida', !JSON.stringify(log).includes('"mission":"sauzburg"')],
        ],
        depois: [{ carta: 82, joga: 'stanley' }],
        esperaDepois: (s, p, { apurar }) => [
            ['destruído, volta ao objetivo da sua missão', apurar()[2] === false],
            ['a carta vai para o seu descarte', p('swarley').discard.includes(64)],
        ],
    },
    {
        carta: 64,
        nome: 'Bitrix: A sua carta de missão ainda pode ser trocada',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 9 }, { mission: 'sauzburg', shots: 5 }],
        joga: 'swarley',
        escolhas: { '0:missions': ['sauzburg'] },
        depois: [{ carta: 32, joga: 'stanley', escolhas: { 0: ['swarley', 'stanley'] } }],
        esperaDepois: (s, p, { apurar }) => [
            ['trocou de missão', p('stanley').id === 2],
            ['e segue com o objetivo do Bitrix', apurar()[2] === true],
        ],
    },
    {
        carta: 66,
        nome: 'Que Papinho: Você nega o equipamento de outro, e ele vai para o descarte',
        mesa: MESA_DE_5,
        joga: 'swarley',
        gatilho: { carta: 108, joga: 'stanley', escolhas: { 0: ['sauzburg'] } },
        espera: (s, p, { log }) => [
            ['negado', log.some(e => e.type === 'cancelled' && e.idCard === 108)],
            ['ninguém está de boina', s.players.every(x => x.equipment.length === 0)],
            ['a boina está no descarte de quem jogou', p('stanley').discard.includes(108)],
            ['você disse que papinho', log.some(e => e.type === 'ritual.done' && e.playerId === p('swarley').id)],
        ],
    },
    {
        carta: 66,
        nome: 'Que Papinho: Contra carta que não é equipamento, a defesa é recusada',
        mesa: MESA_DE_5,
        joga: 'swarley',
        gatilho: { carta: 2, joga: 'stanley' },
        recusada: true,
        espera: (s, p) => [['a 66 continua na mão', p('swarley').hand.includes(66)]],
    },
    {
        carta: 70,
        nome: 'Alelo do Dron: Na sua vez, você manda outro beber 1',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sauzburg' }],
        joga: 'stanley',
        espera: (s, p) => [['equipado em você', p('stanley').equipment.some(e => e.idCard === 70)], ['nada agora', s.players.every(x => x.shots === 0)]],
        depois: [{ turnos: 3, escolhas: { '0:option': 0, '0.0': ['swarley'] } }],
        esperaDepois: (s, p, { passos }) => {
            const opcao = passos.find(e => e.pending?.[0]?.kind === 'option')?.pending[0];
            return [
                ['a pergunta é sua, na sua vez', opcao?.chooserId === p('stanley').id && s.order[s.turnIndex] === p('stanley').id],
                ['três opções: outro bebe, beber, pular', opcao?.options === 3],
                ['o outro bebeu 1, uma vez só', p('swarley').shots === 1],
            ];
        },
    },
    {
        carta: 70,
        nome: 'Alelo do Dron: Você pode beber o extra ou pular',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }],
        joga: 'stanley',
        depois: [
            { turnos: 2, escolhas: { '0:option': 1 }, espera: (s, p) => [['bebeu 1', p('stanley').shots === 1]] },
            { turnos: 2, escolhas: { '0:option': 2 } },
        ],
        esperaDepois: (s, p) => [['pulou: segue com 1', p('stanley').shots === 1]],
    },
    {
        carta: 73,
        nome: 'Pixuco: Em quem não é Sjehnsens nem Swelcows, bebe 1 a cada vez dele',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sauzburg' }],
        joga: 'stanley',
        escolhas: { 0: ['swarley'] },
        depois: [{ turnos: 1 }],
        esperaDepois: (s, p) => [['bebeu 1 na vez dele', p('swarley').shots === 1], ['só na vez dele', ninguemMais(s, 'swarley')]],
    },
    {
        carta: 73,
        nome: 'Pixuco: Você é o Sjehnsens, e os seus shots caem pela metade',
        mesa: [{ mission: 'stanley' }, { mission: 'sjehnsens' }],
        joga: 'stanley',
        voce: 'sjehnsens',
        escolhas: { 0: ['sjehnsens'] },
        depois: [{ carta: 83, joga: 'stanley', escolhas: { 0: ['sjehnsens'] } }, { carta: 27, joga: 'stanley', escolhas: { 0: ['sjehnsens'] } }],
        esperaDepois: (s, p) => [['5 viram 3 e 1 fica 1', p('sjehnsens').shots === 4]],
    },
    {
        carta: 77,
        nome: 'Atirador de Feijão do Gil: Na vez dele, o portador escolhe quem bebe 1',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sauzburg' }],
        joga: 'stanley',
        escolhas: { 0: ['swarley'] },
        depois: [{ turnos: 1, escolhas: { '0:option': 0, '0.0': ['sauzburg'] } }],
        esperaDepois: (s, p, { passos }) => [
            ['quem escolhe é o portador', passos.find(e => e.pending?.[0]?.kind === 'option')?.pending[0].chooserId === p('swarley').id],
            ['o escolhido bebe 1', p('sauzburg').shots === 1],
        ],
    },
    {
        carta: 77,
        nome: 'Atirador de Feijão do Gil: Você carrega o atirador e pula',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }],
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley'] },
        depois: [{ turnos: 1, escolhas: { '0:option': 1 } }],
        esperaDepois: s => [['ninguém bebe', s.players.every(x => x.shots === 0)]],
    },
    {
        carta: 80,
        nome: 'Bocejada da Fátima: Você escolhe de quem, qual equipamento e para quem',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', equipamento: [108, 70] }, { mission: 'sauzburg' }],
        joga: 'stanley',
        escolhas: { 0: ['swarley'], '0:equipment': [70], '0:to': ['sauzburg'] },
        espera: (s, p, { passos }) => [
            ['só quem tem equipamento é candidato', pergunta(passos, 'choose')?.candidates.join() === '2'],
            ['tudo declarado antes da janela', passos.some(e => e.phase === 'window' && e.stack.at(-1)?.choices?.['0:to'])],
            ['o alelo mudou de cadeira', p('sauzburg').equipment.some(e => e.idCard === 70)],
            ['a boina ficou', p('swarley').equipment.map(e => e.idCard).join() === '108'],
        ],
        depois: [{ turnos: 2, escolhas: { '0:option': 1 } }],
        esperaDepois: (s, p) => [['o novo portador usa na vez dele', p('sauzburg').shots === 1]],
    },
    {
        carta: 80,
        nome: 'Bocejada da Fátima: A boina vai para você, e trava a sua missão',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', equipamento: [108] }, { mission: 'sauzburg' }],
        joga: 'stanley',
        voce: 'sauzburg',
        escolhas: { 0: ['swarley'], '0:equipment': [108], '0:to': ['sauzburg'] },
        depois: [{ carta: 32, joga: 'stanley', escolhas: { 0: ['sauzburg', 'swarley'] } }],
        esperaDepois: (s, p) => [['a troca com você foi barrada', p('sauzburg').id === 3]],
    },
    {
        carta: 82,
        nome: 'FUDEU: Todos os equipamentos de todos são destruídos',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', equipamento: [108, 70] }, { mission: 'sauzburg', equipamento: [93] }],
        joga: 'stanley',
        espera: (s, p) => [
            ['ninguém tem mais nada', s.players.every(x => x.equipment.length === 0)],
            ['cada um vai para o descarte de quem jogou', p('swarley').discard.includes(108) && p('swarley').discard.includes(70)
                && p('sauzburg').discard.includes(93)],
        ],
    },
    {
        carta: 82,
        nome: 'FUDEU: A sua boina é destruída, e a missão destrava',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', equipamento: [108] }],
        joga: 'stanley',
        voce: 'swarley',
        depois: [{ carta: 32, joga: 'stanley', escolhas: { 0: ['stanley', 'swarley'] } }],
        esperaDepois: (s, p) => [['agora você troca', p('swarley').id === 1]],
    },
];
