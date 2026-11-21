// Cenarios do pack 1 (Amigue Secrete 2023), cartas 1 a 63.
//
// Um cenario e uma carta jogada numa mesa montada a mao, e o que tem que ser
// verdade depois. O formato esta descrito em scripts/validate-cards.mjs.
//
// Este arquivo nao importa nada de proposito: o laboratorio de carta
// (app/(auth)/dev/carta) le estas mesas no browser, e um import de Node aqui
// quebraria o bundle dele.
//
// O texto da carta (assets/cards.js) e a fonte: a expectativa diz o que a carta
// *manda*, e nao o que o motor faz hoje. Cenario que falha por bug conhecido do
// motor leva `pendente`, com o motivo — ele roda e mostra o erro, mas nao
// derruba o `npm run validate` ate o conserto.

const MESA_DE_5 = [
    { mission: 'stanley',   shots: 0 },
    { mission: 'swarley',   shots: 0 },
    { mission: 'sauzburg',  shots: 0 },
    { mission: 'sjamals',   shots: 0 },
    { mission: 'smichaels', shots: 0 },
];

const naMesa = (s, idCard) => s.ongoing.some(o => o.idCard === idCard && o.onTable === true);
const noDescarte = (s, idCard) => s.discardPile.some(e => e.idCard === idCard);

export default [
    {
        carta: 1,
        nome: 'A Bebida Infinita: o escolhido bebe 1 na vez dele, tres vezes',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p, { passos }) => [
            // Alvo antes da janela: interferir sem saber em quem a carta bate
            // e adivinhacao.
            ['o alvo e perguntado antes de a janela abrir',
                passos.some(e => e.phase === 'pending' && e.resolution?.declaring === true
                    && !passos.slice(0, passos.indexOf(e)).some(a => a.phase === 'window'))],
            ['a mesa ve em quem a carta bate',
                passos.some(e => e.phase === 'window'
                    && e.stack.at(-1)?.targets?.join() === String(p('swarley').id))],
            ['o efeito fica na mesa, sobre o swarley',
                s.ongoing.length === 1 && s.ongoing[0].targets.join() === String(p('swarley').id)],
            ['a carta nao vai para o descarte enquanto vale',
                !p('stanley').discard.includes(1) && !s.discardPile.some(e => e.idCard === 1)],
            ['ninguem bebeu ainda', s.players.every(x => x.shots === 0)],
        ],
        // Cinco na mesa: quinze viradas dao tres vezes do swarley.
        depois: [{ turnos: 15 }],
        esperaDepois: (s, p) => [
            ['o swarley bebeu uma vez por vez dele, tres vezes', p('swarley').shots === 3],
            ['so ele bebeu', s.players.filter(x => x.mission !== 'swarley').every(x => x.shots === 0)],
            ['quem jogou leva o credito das tres', p('stanley').shotsGiven === 3],
            ['a duracao acaba depois da terceira', s.ongoing.length === 0],
            ['a carta cai no descarte de quem jogou',
                p('stanley').discard.includes(1)
                && s.discardPile.some(e => e.idCard === 1 && e.playerId === p('stanley').id)],
            ['cada cobranca diz quanto falta',
                s.log.filter(e => e.type === 'ongoing.trigger' && e.idCard === 1)
                    .map(e => e.turnsLeft).join() === '2,1,0'],
        ],
    },

    {
        carta: 2,
        nome: 'Festinha de Sexta: todos bebem 1, menos quem jogou',
        mesa: MESA_DE_5,
        joga: 'sauzburg',
        espera: (s, p) => [
            ['os outros quatro bebem 1',
                s.players.filter(x => x.mission !== 'sauzburg').every(x => x.shots === 1)],
            ['quem jogou nao bebe', p('sauzburg').shots === 0],
            ['quem mandou beber leva o credito do Sjamals', p('sauzburg').shotsGiven === 4],
            ['o turno termina depois da jogada', s.phase === 'end'],
            ['a carta vai para o descarte de quem jogou', p('sauzburg').discard.includes(2)],
        ],
    },

    {
        carta: 3,
        nome: 'Um Bom Companheiro: canta e escolhe outra pessoa para beber 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 0: ['sjamals'] },
        espera: (s, p, { passos, log }) => {
            const pergunta = passos.find(e => e.phase === 'pending')?.pending[0];
            const cantou = log.findIndex(e => e.type === 'ritual.done');
            const bebeu = log.findIndex(e => e.type === 'drink.confirmed');
            return [
                ['quem jogou nao e candidato de si mesmo',
                    pergunta && !pergunta.candidates.includes(p('stanley').id)
                    && pergunta.candidates.length === s.players.length - 1],
                ['quem canta e quem jogou',
                    log.some(e => e.type === 'ritual.done' && e.playerId === p('stanley').id)],
                ['canta antes de o shot descer', cantou !== -1 && bebeu !== -1 && cantou < bebeu],
                ['o escolhido bebe 1', p('sjamals').shots === 1],
                ['so ele bebe', s.players.filter(x => x.mission !== 'sjamals').every(x => x.shots === 0)],
            ];
        },
    },

    {
        carta: 4,
        nome: 'Kitumbras: Sauzburg bebe 1 obrigado, os outros se quiserem',
        mesa: MESA_DE_5,
        joga: 'stanley',
        // So o swarley aceita entrar na bebida.
        escolhas: { 1: ['swarley'] },
        espera: (s, p, { passos }) => {
            const rodada = passos.find(e => e.pending?.[0]?.kind === 'optIn')?.pending[0];
            return [
                ['o sauzburg bebe 1', p('sauzburg').shots === 1],
                ['quem aceitou bebe 1', p('swarley').shots === 1],
                ['quem recusou nao bebe',
                    ['stanley', 'sjamals', 'smichaels'].every(m => p(m).shots === 0)],
                // A carta existe para o Sauzburg beber sem se entregar: se ele
                // ficasse fora da rodada, a mesa saberia quem ele e.
                ['o sauzburg entra na rodada como obrigado, e nao como candidato',
                    rodada && rodada.forced.includes(p('sauzburg').id)
                    && !rodada.candidates.includes(p('sauzburg').id)],
                ['a rodada pergunta a mesa inteira, quem jogou inclusive',
                    rodada && rodada.candidates.length === s.players.length - 1],
            ];
        },
    },

    {
        carta: 4,
        nome: 'Kitumbras sem Sauzburg na mesa: ninguem e obrigado',
        mesa: [
            { mission: 'stanley', shots: 0 },
            { mission: 'swarley', shots: 0 },
            { mission: 'sjamals', shots: 0 },
        ],
        joga: 'stanley',
        escolhas: { 1: false },
        espera: (s, p, { passos }) => [
            ['ninguem bebe', s.players.every(x => x.shots === 0)],
            ['a rodada nao tem obrigado',
                passos.some(e => e.pending?.[0]?.kind === 'optIn' && e.pending[0].forced.length === 0)],
        ],
    },

    {
        carta: 5,
        nome: 'Cabeca Rachada: o Sauzburg quer menos shots ate a missao dele trocar',
        // Quem joga e o assento 2 (o swarley do comeco). As trocas mudam quem
        // e o que, entao a carta e conferida pelo id de quem jogou.
        mesa: [
            { mission: 'sauzburg', shots: 1 },
            { mission: 'swarley',  shots: 4 },
            { mission: 'stanley',  shots: 6 },
            { mission: 'sjamals',  shots: 3 },
        ],
        joga: 'swarley',
        espera: (s, p, { apurar }) => [
            ['a meta do sauzburg virou fewestShots na hora', p('sauzburg').goal === 'fewestShots'],
            ['a tela da missao sabe qual carta trocou a meta', p('sauzburg').goalChangedBy === 5],
            ['a missao continua sendo sauzburg', p('sauzburg').mission === 'sauzburg'],
            ['com menos shots, o sauzburg ganha', apurar()[p('sauzburg').id] === true],
            ['a carta fica na mesa', naMesa(s, 5)],
            // Debaixo de uma cadeira ela apontaria o Sauzburg.
            ['a carta nao fica na area de nenhum jogador',
                s.ongoing.filter(o => o.idCard === 5).every(o => o.targets.length === 0)],
            ['a carta nao vai para o descarte', !noDescarte(s, 5)],
            ['ninguem mais teve a meta trocada',
                s.players.filter(x => x.mission !== 'sauzburg').every(x => x.goalChangedBy === null)],
        ],
        depois: [
            // A troca que envolve o Sauzburg: o efeito acaba, a carta fica.
            { carta: 32, joga: 'stanley', escolhas: { 0: ['sauzburg', 'swarley'] },
              espera: (s, p, { log }) => [
                ['quem ficou com o sauzburg quer mais shots de novo', p('sauzburg').goal === 'mostShots'],
                ['a meta dele nao aparece mais como trocada', p('sauzburg').goalChangedBy === null],
                ['o antigo sauzburg virou swarley com a meta do swarley', p('swarley').goal === 'fewestShots'],
                ['a carta continua na mesa', naMesa(s, 5)],
                ['a carta ainda nao foi para o descarte', !noDescarte(s, 5)],
                // O log e publico: "parou de valer" logo depois da troca
                // diria que o Sauzburg e um dos dois.
                ['o log nao conta que o efeito acabou',
                    !log.some(e => e.type === 'ongoing.end' && e.idCard === 5)],
              ] },
            // A missao volta para quem a tinha: o efeito nao volta junto.
            { carta: 32, joga: 'stanley', escolhas: { 0: ['sauzburg', 'swarley'] },
              espera: (s, p) => [
                ['a missao voltou e a meta nao', p('sauzburg').id === 1 && p('sauzburg').goal === 'mostShots'],
                ['ainda falta stanley e sjamals trocarem: a carta fica', naMesa(s, 5)],
              ] },
            // Os dois que faltavam trocam: agora todo mundo trocou.
            { carta: 32, joga: 'swarley', escolhas: { 0: ['stanley', 'sjamals'] } },
        ],
        esperaDepois: (s, p, { log }) => [
            ['com todos trocados, a carta sai da mesa', !naMesa(s, 5)],
            ['ela cai no descarte de quem jogou (assento 2)',
                s.players.find(x => x.id === 2).discard.includes(5)
                && s.discardPile.some(e => e.idCard === 5 && e.playerId === 2)],
            ['so cai uma vez', s.discardPile.filter(e => e.idCard === 5).length === 1],
            ['o sauzburg segue com a meta padrao', p('sauzburg').goal === 'mostShots'],
            ['a saida da mesa entra no log', log.some(e => e.type === 'ongoing.end'
                && e.idCard === 5 && e.onTable && e.returned)],
        ],
    },

    {
        carta: 10,
        nome: 'Cesar: no Swarley, ele passa a querer mais shots ate a missao dele trocar',
        mesa: [
            { mission: 'sauzburg', shots: 5 },
            { mission: 'swarley',  shots: 6 },
            { mission: 'stanley',  shots: 2 },
        ],
        joga: 'sauzburg',
        escolhas: { 0: ['swarley'] },
        espera: (s, p, { apurar }) => [
            ['ninguem troca de missao', p('sauzburg').id === 1 && p('swarley').id === 2],
            ['a meta do swarley virou mostShots', p('swarley').goal === 'mostShots'],
            ['a tela da missao sabe qual carta trocou a meta', p('swarley').goalChangedBy === 10],
            ['com mais shots, o swarley ganha', apurar()[p('swarley').id] === true],
            ['a carta fica na mesa, fora das cadeiras', naMesa(s, 10)
                && s.ongoing.filter(o => o.idCard === 10).every(o => o.targets.length === 0)],
        ],
        depois: [
            { carta: 32, joga: 'stanley', escolhas: { 0: ['swarley', 'stanley'] },
              espera: (s, p) => [
                ['quem ficou com o swarley quer menos shots de novo', p('swarley').goal === 'fewestShots'],
                ['o sauzburg ainda nao trocou: a carta fica', naMesa(s, 10)],
              ] },
            { carta: 32, joga: 'stanley', escolhas: { 0: ['sauzburg', 'stanley'] } },
        ],
        esperaDepois: (s) => [
            ['com todos trocados, a carta vai para o descarte de quem jogou',
                !naMesa(s, 10) && s.players.find(x => x.id === 1).discard.includes(10)],
        ],
    },

    {
        carta: 10,
        nome: 'Cesar: em quem nao e o Swarley, troca de missao e a carta vai embora',
        mesa: [
            { mission: 'sauzburg', shots: 0 },
            { mission: 'swarley',  shots: 0 },
            { mission: 'stanley',  shots: 0 },
        ],
        joga: 'sauzburg',
        escolhas: { 0: ['stanley'] },
        espera: (s, p) => [
            ['quem jogou e o escolhido trocam', p('stanley').id === 1 && p('sauzburg').id === 3],
            ['ninguem tem a meta trocada', s.players.every(x => x.goalChangedBy === null)],
            ['a carta nao fica na mesa', !naMesa(s, 10)],
            ['a carta vai para o descarte de quem jogou', s.players.find(x => x.id === 1).discard.includes(10)],
        ],
    },
];
