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
];
