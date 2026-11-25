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

// Os outros, quem nao e a missao (ou missoes) dada.
const fora = (s, ...missoes) => s.players.filter(x => !missoes.includes(x.mission));
const ninguemMais = (s, ...missoes) => fora(s, ...missoes).every(x => x.shots === 0);
// Uma pergunta que a carta fez no meio do caminho.
const pergunta = (passos, kind) => passos.find(e => e.pending?.[0]?.kind === kind)?.pending[0];

const naMesa = (s, idCard) => s.ongoing.some(o => o.idCard === idCard && o.onTable === true);
const noDescarte = (s, idCard) => s.discardPile.some(e => e.idCard === idCard);

export default [
    {
        carta: 1,
        nome: 'A Bebida Infinita: Você joga em alguém, e a pessoa bebe 1 na vez dela, três vezes',
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
        // O mesmo efeito, visto por quem sofre: no laboratorio, a carta chega
        // na mesa jogada por um bot, e e na sua vez que o shot e cobrado.
        carta: 1,
        nome: 'A Bebida Infinita: Alguém joga em você, e você bebe 1 na sua vez, três vezes',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [
            ['o efeito fica sobre você',
                s.ongoing.length === 1 && s.ongoing[0].targets.join() === String(p('swarley').id)],
            ['você ainda não bebeu', p('swarley').shots === 0],
        ],
        depois: [{ turnos: 15 }],
        esperaDepois: (s, p) => [
            ['você bebeu uma vez por vez sua, três vezes', p('swarley').shots === 3],
            ['só você bebeu', s.players.filter(x => x.mission !== 'swarley').every(x => x.shots === 0)],
        ],
    },

    {
        carta: 2,
        nome: 'Festinha de Sexta: Você joga, e todos os outros bebem 1',
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
        carta: 2,
        nome: 'Festinha de Sexta: Alguém joga, e você bebe 1 com o resto da mesa',
        mesa: MESA_DE_5,
        joga: 'sauzburg',
        voce: 'stanley',
        espera: (s, p) => [
            ['você bebe 1', p('stanley').shots === 1],
            ['os outros que não jogaram também bebem 1',
                ['swarley', 'sjamals', 'smichaels'].every(m => p(m).shots === 1)],
            ['quem jogou não bebe', p('sauzburg').shots === 0],
        ],
    },

    {
        carta: 3,
        nome: 'Um Bom Companheiro: Você canta para alguém, e a pessoa bebe 1',
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
        carta: 3,
        nome: 'Um Bom Companheiro: Alguém canta para você, e você bebe 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'sjamals',
        escolhas: { 0: ['sjamals'] },
        espera: (s, p, { log }) => {
            const cantou = log.findIndex(e => e.type === 'ritual.done');
            const bebeu = log.findIndex(e => e.type === 'drink.confirmed');
            return [
                ['quem canta é quem jogou, e não você',
                    log.some(e => e.type === 'ritual.done' && e.playerId === p('stanley').id)
                    && !log.some(e => e.type === 'ritual.done' && e.playerId === p('sjamals').id)],
                ['a música vem antes do seu shot', cantou !== -1 && bebeu !== -1 && cantou < bebeu],
                ['você bebe 1', p('sjamals').shots === 1],
                ['só você bebe', s.players.filter(x => x.mission !== 'sjamals').every(x => x.shots === 0)],
            ];
        },
    },

    {
        carta: 4,
        nome: 'Kitumbras: Você não é o Sauzburg, e escolhe se entra na bebida',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'swarley',
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
        nome: 'Kitumbras: Você é o Sauzburg, e bebe 1 sem ter escolha',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'sauzburg',
        // Ninguem mais aceita: so o Sauzburg bebe.
        escolhas: { 1: [] },
        espera: (s, p, { passos }) => {
            const rodada = passos.find(e => e.pending?.[0]?.kind === 'optIn')?.pending[0];
            return [
                ['você bebe 1', p('sauzburg').shots === 1],
                ['quem recusou não bebe', s.players.filter(x => x.mission !== 'sauzburg').every(x => x.shots === 0)],
                // Na tela, o obrigado ve so o "beber", e nao o "quer beber?".
                ['você entra na rodada como obrigado, sem pergunta',
                    rodada && rodada.forced.includes(p('sauzburg').id)
                    && !rodada.candidates.includes(p('sauzburg').id)],
            ];
        },
    },

    {
        carta: 4,
        nome: 'Kitumbras: Você joga sendo o Sauzburg, e bebe 1 também',
        mesa: MESA_DE_5,
        joga: 'sauzburg',
        escolhas: { 1: [] },
        espera: (s, p, { passos }) => {
            const rodada = passos.find(e => e.pending?.[0]?.kind === 'optIn')?.pending[0];
            return [
                ['você bebe 1, mesmo tendo jogado', p('sauzburg').shots === 1],
                ['quem recusou não bebe', s.players.filter(x => x.mission !== 'sauzburg').every(x => x.shots === 0)],
                ['você é obrigado na rodada, como qualquer Sauzburg',
                    rodada && rodada.forced.includes(p('sauzburg').id)],
            ];
        },
    },

    {
        carta: 4,
        nome: 'Kitumbras: Sem Sauzburg na mesa, ninguém é obrigado',
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
        nome: 'Cabeça Rachada: O Sauzburg quer menos shots até a missão dele trocar',
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
    // A 6 e defesa: entra na janela de outra jogada, e so contra troca de
    // missao. Quem joga no cenario e o gatilho; a 6 e do swarley.
    {
        carta: 6,
        nome: 'É, Deve Ser: Anula a troca de missão entre outros jogadores',
        mesa: MESA_DE_5,
        joga: 'swarley',
        gatilho: { carta: 32, joga: 'stanley', escolhas: { 0: ['sauzburg', 'sjamals'] } },
        espera: (s, p, { log }) => [
            ['a troca foi cancelada', log.some(e => e.type === 'cancelled' && e.idCard === 32)],
            ['o sauzburg continua sauzburg', p('sauzburg').id === 3],
            ['o sjamals continua sjamals', p('sjamals').id === 4],
            ['ninguem trocou de missao', !log.some(e => e.type === 'mission.swap')],
            // O "e, deve ser" vai ser som, e nao ritual: a mesa nao para.
            ['a 6 nao cobra ritual', !log.some(e => e.type === 'ritual' && e.idCard === 6)],
            ['a 6 saiu da mao do swarley', !p('swarley').hand.includes(6)],
            ['a 6 e a 32 foram para o descarte', noDescarte(s, 6) && noDescarte(s, 32)],
        ],
    },
    {
        carta: 6,
        nome: 'É, Deve Ser: Anula a troca de missão que pega você',
        mesa: MESA_DE_5,
        joga: 'swarley',
        gatilho: { carta: 32, joga: 'stanley', escolhas: { 0: ['swarley', 'sauzburg'] } },
        espera: (s, p, { log }) => [
            ['a troca foi cancelada', log.some(e => e.type === 'cancelled' && e.idCard === 32)],
            ['o swarley continua swarley', p('swarley').id === 2],
            ['o sauzburg continua sauzburg', p('sauzburg').id === 3],
        ],
    },
    {
        // A 64 copia a missao de alguem, ninguem perde a sua: nao e troca.
        carta: 6,
        nome: 'É, Deve Ser: O Bitrix copia a missão, não troca, e a defesa é recusada',
        mesa: MESA_DE_5,
        joga: 'swarley',
        gatilho: { carta: 64, joga: 'stanley', escolhas: { 1: ['sauzburg'] } },
        recusada: true,
        espera: (s, p, { log }) => [
            ['a 6 continua na mao do swarley', p('swarley').hand.includes(6)],
            ['o bitrix nao foi cancelado', !log.some(e => e.type === 'cancelled')],
        ],
    },
    {
        carta: 6,
        nome: 'É, Deve Ser: Contra carta que não troca missão, a defesa é recusada',
        mesa: MESA_DE_5,
        joga: 'swarley',
        gatilho: { carta: 2, joga: 'stanley' },
        recusada: true,
        espera: (s, p, { log }) => [
            ['a 6 continua na mao do swarley', p('swarley').hand.includes(6)],
            ['nada foi cancelado', !log.some(e => e.type === 'cancelled')],
            ['nenhum ritual cobrado', !log.some(e => e.type === 'ritual' || e.type === 'ritual.done')],
            ['a festinha resolveu: o swarley bebeu', log.some(e => e.type === 'drink' && e.playerId === 2)],
        ],
    },

    {
        carta: 10,
        nome: 'César: No Swarley, ele passa a querer mais shots até a missão dele trocar',
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
        nome: 'César: Em quem não é o Swarley, troca de missão e a carta vai embora',
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

    // ------------------------------------------------------------ fase 1: shots

    {
        carta: 7,
        nome: 'Livro do Brasa: Você joga, e a mesa inteira bebe 1, você também',
        mesa: MESA_DE_5,
        joga: 'stanley',
        espera: s => [['todos bebem 1, quem jogou inclusive', s.players.every(x => x.shots === 1)]],
    },
    {
        carta: 7,
        nome: 'Livro do Brasa: Alguém joga, e você bebe 1 com a mesa',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'sjamals',
        espera: (s, p) => [['você bebe 1', p('sjamals').shots === 1], ['a mesa inteira bebe', s.players.every(x => x.shots === 1)]],
    },
    {
        carta: 8,
        nome: 'O Pai do Grupo: Você escolhe três, e cada um bebe 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 0: ['swarley', 'sauzburg', 'sjamals'] },
        espera: (s, p) => [
            ['os três escolhidos bebem 1', ['swarley', 'sauzburg', 'sjamals'].every(m => p(m).shots === 1)],
            ['ninguém mais bebe', ninguemMais(s, 'swarley', 'sauzburg', 'sjamals')],
        ],
    },
    {
        carta: 8,
        nome: 'O Pai do Grupo: Alguém escolhe você entre os três, e você bebe 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'smichaels',
        escolhas: { 0: ['swarley', 'sauzburg', 'smichaels'] },
        espera: (s, p) => [['você bebe 1', p('smichaels').shots === 1], ['quem jogou não bebe', p('stanley').shots === 0]],
    },
    {
        carta: 12,
        nome: 'Renekton de Rei Destruído: Você escolhe quatro, e cada um bebe 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        espera: (s, p) => [
            ['quatro bebem 1', s.players.filter(x => x.shots === 1).length === 4],
            ['quem jogou não precisa beber', p('stanley').shots === 0],
        ],
    },
    {
        carta: 12,
        nome: 'Renekton de Rei Destruído: Numa mesa de 3, todos são escolhidos',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sauzburg' }],
        joga: 'stanley',
        espera: (s, p, { passos }) => [
            ['a escolha pede a mesa inteira', pergunta(passos, 'choose')?.count === 3],
            ['os três bebem 1', s.players.every(x => x.shots === 1)],
        ],
    },
    {
        carta: 13,
        nome: 'Roubando a Jurupinga: Você tira 1 de alguém e faz outro beber 1',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 3 }, { mission: 'sauzburg' }, { mission: 'sjamals' }],
        joga: 'stanley',
        escolhas: { 0: ['swarley'], 1: ['sauzburg'] },
        espera: (s, p, { passos }) => {
            const segunda = passos.filter(e => e.pending?.[0]?.kind === 'choose').map(e => e.pending[0]).find(r => r.slot === '1');
            return [
                ['o primeiro perde 1', p('swarley').shots === 2],
                ['o segundo bebe 1', p('sauzburg').shots === 1],
                ['o segundo não pode ser o primeiro', segunda && !segunda.candidates.includes(p('swarley').id)],
            ];
        },
    },
    {
        carta: 13,
        nome: 'Roubando a Jurupinga: Alguém tira 1 shot da sua conta',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 3 }, { mission: 'sauzburg' }],
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley'], 1: ['sauzburg'] },
        espera: (s, p) => [['você fica com 2', p('swarley').shots === 2], ['você não bebe', !s.drinks.length]],
    },
    {
        carta: 17,
        nome: 'Vão Chegar uns Amigos: Você escolhe três, e cada um bebe 1',
        mesa: MESA_DE_5,
        joga: 'sjamals',
        escolhas: { 0: ['stanley', 'swarley', 'sjamals'] },
        espera: (s, p) => [
            ['os três bebem 1, você inclusive se se escolher', ['stanley', 'swarley', 'sjamals'].every(m => p(m).shots === 1)],
            ['ninguém mais', ninguemMais(s, 'stanley', 'swarley', 'sjamals')],
        ],
    },
    {
        carta: 17,
        nome: 'Vão Chegar uns Amigos: Alguém escolhe você, e você bebe 1',
        mesa: MESA_DE_5,
        joga: 'sjamals',
        voce: 'stanley',
        escolhas: { 0: ['stanley', 'swarley', 'sauzburg'] },
        espera: (s, p) => [['você bebe 1', p('stanley').shots === 1]],
    },
    {
        carta: 18,
        nome: 'Todos a Bordo!: Você joga, e todos bebem 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        espera: s => [['todos bebem 1', s.players.every(x => x.shots === 1)]],
    },
    {
        carta: 18,
        nome: 'Todos a Bordo!: Alguém joga, e você bebe 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'swarley',
        espera: (s, p) => [['você bebe 1', p('swarley').shots === 1]],
    },
    {
        carta: 21,
        nome: 'Dj Vomitado: Você tira 2 shots da conta de alguém',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 3 }, { mission: 'sauzburg', shots: 1 }],
        joga: 'stanley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [['fica com 1', p('swarley').shots === 1], ['ninguém bebe', !s.log.some(e => e.type === 'drink')]],
    },
    {
        carta: 21,
        nome: 'Dj Vomitado: A conta não fica negativa',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 3 }, { mission: 'sauzburg', shots: 1 }],
        joga: 'stanley',
        voce: 'sauzburg',
        escolhas: { 0: ['sauzburg'] },
        espera: (s, p) => [['você fica com 0', p('sauzburg').shots === 0]],
    },
    {
        carta: 24,
        nome: 'Abraço na Árvore: Você escolhe o Smichaels, e os dois bebem 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 0: ['smichaels'] },
        espera: (s, p) => [['o escolhido bebe 1', p('smichaels').shots === 1], ['você bebe 1 também', p('stanley').shots === 1]],
    },
    {
        carta: 24,
        nome: 'Abraço na Árvore: Você é o Smichaels, e bebe junto',
        mesa: MESA_DE_5,
        joga: 'smichaels',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [['o escolhido bebe 1', p('swarley').shots === 1], ['você bebe 1', p('smichaels').shots === 1]],
    },
    {
        carta: 24,
        nome: 'Abraço na Árvore: Sem Smichaels na jogada, só o escolhido bebe',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [['você bebe 1', p('swarley').shots === 1], ['quem jogou não bebe', p('stanley').shots === 0]],
    },
    {
        carta: 27,
        nome: 'Papai Noel: Você presenteia outro jogador com 1 shot',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 0: ['sjamals'] },
        espera: (s, p, { passos }) => [
            ['você não é candidato', !pergunta(passos, 'choose')?.candidates.includes(p('stanley').id)],
            ['o escolhido bebe 1', p('sjamals').shots === 1],
        ],
    },
    {
        carta: 27,
        nome: 'Papai Noel: Alguém presenteia você com 1 shot',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'sjamals',
        escolhas: { 0: ['sjamals'] },
        espera: (s, p) => [['você bebe 1', p('sjamals').shots === 1], ['só você', ninguemMais(s, 'sjamals')]],
    },
    {
        carta: 28,
        nome: 'Luvas no Chão: Você joga, e bebe 1',
        mesa: MESA_DE_5,
        joga: 'swarley',
        espera: (s, p) => [['você bebe 1', p('swarley').shots === 1], ['só você', ninguemMais(s, 'swarley')]],
    },
    {
        carta: 29,
        nome: 'É Aquela Velha História: Os 2 à sua esquerda bebem 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        espera: (s, p) => [
            ['os dois da esquerda bebem 1', p('swarley').shots === 1 && p('sauzburg').shots === 1],
            ['ninguém mais', ninguemMais(s, 'swarley', 'sauzburg')],
        ],
    },
    {
        carta: 29,
        nome: 'É Aquela Velha História: Com a ordem invertida, a esquerda continua a mesma',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'swarley',
        antes: [{ carta: 54, joga: 'stanley' }],
        espera: (s, p) => [
            ['a ordem está invertida', s.direction === -1],
            ['os mesmos dois bebem', p('swarley').shots === 1 && p('sauzburg').shots === 1],
            ['ninguém mais', ninguemMais(s, 'swarley', 'sauzburg')],
        ],
    },
    {
        carta: 30,
        nome: 'Peitos: O mais distante de você bebe 1',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sauzburg' }, { mission: 'sjamals' }],
        joga: 'stanley',
        espera: (s, p) => [['o do outro lado bebe 1', p('sauzburg').shots === 1], ['só ele', ninguemMais(s, 'sauzburg')]],
    },
    {
        carta: 30,
        nome: 'Peitos: Empatados na distância, todos bebem',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'sauzburg',
        espera: (s, p) => [
            ['os dois mais distantes bebem 1', p('sauzburg').shots === 1 && p('sjamals').shots === 1],
            ['ninguém mais', ninguemMais(s, 'sauzburg', 'sjamals')],
        ],
    },
    {
        carta: 31,
        nome: 'Bêbado de Shoyu: No Sjamals, ele bebe 2',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 0: ['sjamals'] },
        espera: (s, p) => [['o sjamals bebe 2', p('sjamals').shots === 2], ['ninguém mais', ninguemMais(s, 'sjamals')]],
    },
    {
        carta: 31,
        nome: 'Bêbado de Shoyu: Em quem não é o Sjamals, bebe 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [['você bebe 1', p('swarley').shots === 1]],
    },
    {
        carta: 37,
        nome: 'Caipa Dupla do Céu: Você e outro jogador bebem 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 1: ['swarley'] },
        espera: (s, p, { passos }) => [
            ['você bebe 1', p('stanley').shots === 1],
            ['o escolhido bebe 1', p('swarley').shots === 1],
            ['você não é candidato', !pergunta(passos, 'choose')?.candidates.includes(p('stanley').id)],
        ],
    },
    {
        carta: 37,
        nome: 'Caipa Dupla do Céu: Alguém chama você, e os dois bebem 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 1: ['swarley'] },
        espera: (s, p) => [['você bebe 1', p('swarley').shots === 1], ['quem jogou também', p('stanley').shots === 1]],
    },
    {
        carta: 42,
        nome: 'Client Perfeito: Você escolhe alguém para beber 2',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 0: ['sauzburg'] },
        espera: (s, p) => [['o escolhido bebe 2', p('sauzburg').shots === 2], ['ninguém mais', ninguemMais(s, 'sauzburg')]],
    },
    {
        carta: 42,
        nome: 'Client Perfeito: Alguém escolhe você, e você bebe 2',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'sauzburg',
        escolhas: { 0: ['sauzburg'] },
        espera: (s, p) => [['você bebe 2', p('sauzburg').shots === 2]],
    },
    {
        carta: 43,
        nome: 'Piada do Milton: O jogador anterior conta a piada e não bebe',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { '0:option': 0 },
        espera: (s, p, { passos }) => [
            ['quem escolhe é o anterior', pergunta(passos, 'option')?.chooserId === p('smichaels').id],
            ['as opções têm nome', pergunta(passos, 'option')?.labels?.every(Boolean)],
            ['ninguém bebe', s.players.every(x => x.shots === 0)],
            ['a piada fica no log', s.log.some(e => e.type === 'manual')],
        ],
    },
    {
        carta: 43,
        nome: 'Piada do Milton: Você é o anterior e prefere beber 2',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'smichaels',
        escolhas: { '0:option': 1 },
        espera: (s, p) => [['você bebe 2', p('smichaels').shots === 2], ['só você', ninguemMais(s, 'smichaels')]],
    },
    {
        carta: 44,
        nome: 'Vamo virar? Vamo!: Todos bebem 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        espera: s => [['todos bebem 1', s.players.every(x => x.shots === 1)]],
    },
    {
        carta: 44,
        nome: 'Vamo virar? Vamo!: Alguém joga, e você bebe 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'sauzburg',
        espera: (s, p) => [['você bebe 1', p('sauzburg').shots === 1]],
    },
    {
        carta: 45,
        nome: 'Promoshare: Você e mais dois bebem 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 1: ['swarley', 'sauzburg'] },
        espera: (s, p, { passos }) => [
            ['os três bebem 1', ['stanley', 'swarley', 'sauzburg'].every(m => p(m).shots === 1)],
            ['você não é candidato', !pergunta(passos, 'choose')?.candidates.includes(p('stanley').id)],
        ],
    },
    {
        carta: 45,
        nome: 'Promoshare: Alguém leva você de acompanhante, e você bebe 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'sjamals',
        escolhas: { 1: ['sjamals', 'sauzburg'] },
        espera: (s, p) => [['você bebe 1', p('sjamals').shots === 1]],
    },
    {
        carta: 46,
        nome: 'Mãozinha: O último a tocar na mão bebe 2',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 0: ['swarley', 'sauzburg', 'sjamals'] },
        espera: (s, p, { passos }) => {
            const corrida = pergunta(passos, 'race');
            return [
                ['todos menos quem jogou correm', corrida?.racers.length === 4 && !corrida.racers.includes(p('stanley').id)],
                ['o último bebe 2', p('smichaels').shots === 2],
                ['ninguém mais bebe', ninguemMais(s, 'smichaels')],
            ];
        },
    },
    {
        carta: 46,
        nome: 'Mãozinha: Você é o último a tocar, e bebe 2',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['sauzburg', 'sjamals', 'smichaels'] },
        espera: (s, p) => [['você bebe 2', p('swarley').shots === 2], ['só você', ninguemMais(s, 'swarley')]],
    },
    {
        carta: 47,
        nome: 'Ventilador Assassino: O próximo a jogar bebe 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        espera: (s, p) => [['o próximo bebe 1', p('swarley').shots === 1], ['só ele', ninguemMais(s, 'swarley')]],
    },
    {
        carta: 47,
        nome: 'Ventilador Assassino: Quem vai perder a vez é pulado, e você bebe',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', pula: 1 }, { mission: 'sauzburg' }, { mission: 'sjamals' }],
        joga: 'stanley',
        voce: 'sauzburg',
        espera: (s, p) => [['você bebe 1', p('sauzburg').shots === 1], ['quem perde a vez não bebe', p('swarley').shots === 0]],
    },
    {
        carta: 55,
        nome: 'A Queda: Você tira 2 shots de alguém',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 5 }],
        joga: 'stanley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [['fica com 3', p('swarley').shots === 3]],
    },
    {
        carta: 55,
        nome: 'A Queda: Alguém tira 2 shots da sua conta',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', shots: 1 }],
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [['você fica com 0', p('swarley').shots === 0]],
    },
    {
        carta: 63,
        nome: 'Bênção de Gladstone: Você troca os shots de dois jogadores',
        mesa: [{ mission: 'stanley', shots: 1 }, { mission: 'swarley', shots: 6 }, { mission: 'sauzburg', shots: 2 }],
        joga: 'stanley',
        escolhas: { 0: ['swarley', 'sauzburg'] },
        espera: (s, p) => [['trocaram', p('swarley').shots === 2 && p('sauzburg').shots === 6], ['quem jogou fica igual', p('stanley').shots === 1]],
    },
    {
        carta: 63,
        nome: 'Bênção de Gladstone: Alguém troca os seus shots com os dele',
        mesa: [{ mission: 'stanley', shots: 1 }, { mission: 'swarley', shots: 6 }],
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['stanley', 'swarley'] },
        espera: (s, p) => [['você fica com 1', p('swarley').shots === 1], ['ele fica com 6', p('stanley').shots === 6]],
    },

    {
        carta: 53,
        nome: 'Xis do Gelson: O próximo a jogar fica 2 vezes sem jogar',
        mesa: MESA_DE_5,
        joga: 'stanley',
        espera: (s, p) => [['o próximo perde 2 vezes', p('swarley').skipTurns === 2], ['ninguém mais', fora(s, 'swarley').every(x => x.skipTurns === 0)]],
        depois: [{ turnos: 1 }],
        esperaDepois: (s, p) => [
            ['a vez pula o swarley e cai no seguinte', s.order[s.turnIndex] === p('sauzburg').id],
            ['ainda falta uma', p('swarley').skipTurns === 1],
        ],
    },
    {
        carta: 53,
        nome: 'Xis do Gelson: Quem já ia perder a vez é pulado, e você come o xis',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', pula: 1 }, { mission: 'sauzburg' }, { mission: 'sjamals' }],
        joga: 'stanley',
        voce: 'sauzburg',
        espera: (s, p) => [['você perde 2 vezes', p('sauzburg').skipTurns === 2], ['o pulado fica como estava', p('swarley').skipTurns === 1]],
    },

    // ------------------------------------------------- fase 2: turno, mao e baralho

    {
        carta: 14,
        nome: 'Cortador de Unhas: No Sjehnsens, ele perde 1 vez',
        mesa: [{ mission: 'stanley' }, { mission: 'sjehnsens' }, { mission: 'sauzburg' }],
        joga: 'stanley',
        escolhas: { 0: ['sjehnsens'] },
        espera: (s, p) => [['perde 1 vez', p('sjehnsens').skipTurns === 1]],
        depois: [{ turnos: 1 }],
        esperaDepois: (s, p) => [['a vez pula ele', s.order[s.turnIndex] === p('sauzburg').id]],
    },
    {
        carta: 14,
        nome: 'Cortador de Unhas: Em você, que não é o Sjehnsens, nada acontece',
        mesa: [{ mission: 'stanley' }, { mission: 'sjehnsens' }, { mission: 'sauzburg' }],
        joga: 'stanley',
        voce: 'sauzburg',
        escolhas: { 0: ['sauzburg'] },
        espera: (s, p) => [['você não perde a vez', p('sauzburg').skipTurns === 0]],
    },
    {
        carta: 15,
        nome: 'O Guerreiro Entregue: Alguém dorme e perde 2 vezes',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sauzburg' }],
        joga: 'stanley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [['perde 2 vezes', p('swarley').skipTurns === 2]],
        depois: [{ turnos: 4 }],
        esperaDepois: (s, p) => [['as duas vezes dele foram puladas', s.log.filter(e => e.type === 'turn.skipped' && e.playerId === p('swarley').id).length === 2]],
    },
    {
        carta: 15,
        nome: 'O Guerreiro Entregue: Você dorme e perde 2 vezes',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }],
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p) => [['você perde 2 vezes', p('swarley').skipTurns === 2]],
    },
    {
        carta: 16,
        nome: 'Não Dá Pra Tetudo: Você descarta a mão e compra uma nova do mesmo tamanho',
        mesa: [{ mission: 'stanley', mao: [7, 8, 12] }, { mission: 'swarley' }],
        joga: 'stanley',
        espera: (s, p) => {
            const eu = p('stanley');
            return [
                ['a mão velha foi para o descarte', [7, 8, 12].every(c => eu.discard.includes(c))],
                ['a mão nova tem o mesmo tamanho', eu.hand.length === 4],
                ['a troca fica no log', s.log.some(e => e.type === 'hand.redraw' && e.size === 4)],
            ];
        },
    },
    {
        carta: 22,
        nome: 'Jogos Desnecessários: Duas cartas do seu descarte voltam ao baralho',
        mesa: [{ mission: 'stanley', descarte: [7, 8, 12] }, { mission: 'swarley' }],
        joga: 'stanley',
        escolhas: { '0:return': [7, 12] },
        espera: (s, p, { passos }) => {
            const eu = p('stanley');
            return [
                ['a escolha é do seu descarte', pergunta(passos, 'cards')?.source === 'discard'
                    && pergunta(passos, 'cards')?.chooserId === eu.id],
                ['as duas voltaram ao baralho', eu.deck.includes(7) && eu.deck.includes(12)],
                ['saíram do descarte', !eu.discard.includes(7) && !eu.discard.includes(12) && eu.discard.includes(8)],
                ['o baralho foi embaralhado', !(eu.deck.at(-1) === 12 && eu.deck.at(-2) === 7)],
            ];
        },
    },
    {
        carta: 25,
        nome: 'Viagem no Porta-Malas: Você compra 1 carta extra',
        mesa: [{ mission: 'stanley', mao: [7] }, { mission: 'swarley' }],
        joga: 'stanley',
        espera: (s, p) => [['a mão ficou com 3 (1 + compra da vez + extra)', p('stanley').hand.length === 3]],
    },
    {
        carta: 34,
        nome: 'Vamos pra Baleia: Você escolhe quem viaja e arruma os lugares',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 0: ['swarley', 'sauzburg', 'sjamals'], '0:order': ['sjamals', 'swarley', 'sauzburg'] },
        espera: (s, p, { passos }) => [
            ['quem arruma é quem jogou', pergunta(passos, 'order')?.chooserId === p('stanley').id],
            ['os lugares mudaram', s.order.join() === [1, 4, 2, 3, 5].join()],
            ['a vez continua com quem estava', s.order[s.turnIndex] === p('stanley').id],
        ],
    },
    {
        carta: 34,
        nome: 'Vamos pra Baleia: Alguém troca o seu lugar',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'smichaels',
        escolhas: { 0: ['swarley', 'smichaels'], '0:order': ['smichaels', 'swarley'] },
        espera: (s, p) => [['você foi para o lugar 2', s.order[1] === p('smichaels').id]],
    },
    {
        carta: 35,
        nome: 'Disco de Duelo: Você vê a última do baralho e compra ela',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }],
        joga: 'stanley',
        escolhas: { '0.then:option': 0 },
        espera: (s, p, { passos }) => {
            const antes = passos.find(e => e.phase === 'window');
            const ultima = antes?.players.find(x => x.id === p('stanley').id).deck.at(-1);
            return [
                ['só quem jogou viu a carta', p('stanley').peeked?.cards?.[0] === ultima && p('swarley').peeked === null],
                ['comprou a do fundo', p('stanley').hand.includes(ultima)],
            ];
        },
    },
    {
        carta: 35,
        nome: 'Disco de Duelo: Você prefere a do topo',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }],
        joga: 'stanley',
        escolhas: { '0.then:option': 1 },
        espera: (s, p, { passos }) => {
            const antes = passos.find(e => e.phase === 'window')?.players.find(x => x.id === p('stanley').id);
            return [['comprou a do topo', p('stanley').hand.includes(antes?.deck[0])],
                ['a do fundo ficou', p('stanley').deck.at(-1) === antes?.deck.at(-1)]];
        },
    },
    {
        carta: 52,
        nome: 'Cigarro no Olho: Você rouba uma carta e ela é jogada na hora',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', mao: [2] }, { mission: 'sauzburg' }],
        joga: 'stanley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p, { log }) => [
            ['a carta roubada entrou na pilha', log.some(e => e.type === 'play.now' && e.idCard === 2)],
            ['a festinha resolveu: os outros bebem', p('swarley').shots === 1 && p('sauzburg').shots === 1],
            ['quem roubou não bebe', p('stanley').shots === 0],
            ['sem jogada extra', p('stanley').extraPlays === 0 && s.phase === 'end'],
            ['a roubada caiu no descarte do ladrão', p('stanley').discard.includes(2)],
        ],
    },
    {
        carta: 52,
        nome: 'Cigarro no Olho: A carta roubada de você é de reação, e é queimada',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', mao: [11] }],
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley'] },
        espera: (s, p, { log }) => [
            ['a sua carta saiu da mão', !p('swarley').hand.includes(11)],
            ['ela foi queimada', log.some(e => e.type === 'burned' && e.idCard === 11)],
        ],
    },
    {
        carta: 54,
        nome: 'Peido do Exequiel: A ordem de jogo inverte',
        mesa: MESA_DE_5,
        joga: 'stanley',
        espera: s => [['a direção inverteu', s.direction === -1]],
        depois: [{ turnos: 1 }],
        esperaDepois: (s, p) => [['a vez vai para o anterior', s.order[s.turnIndex] === p('smichaels').id]],
    },
    {
        carta: 58,
        nome: 'Tábua do Joaquim: Três escolhidos descartam, cada um a sua carta',
        mesa: [
            { mission: 'stanley' },
            { mission: 'swarley', mao: [7, 8] },
            { mission: 'sauzburg', mao: [12, 17] },
            { mission: 'sjamals', mao: [] },
        ],
        joga: 'stanley',
        escolhas: { 0: ['swarley', 'sauzburg', 'sjamals'], '0:handPick': { swarley: [8], sauzburg: [12] } },
        espera: (s, p, { passos }) => [
            ['a rodada é dos três com mão, ao mesmo tempo', pergunta(passos, 'handPick')?.players.length === 2],
            ['mão vazia não responde', !pergunta(passos, 'handPick')?.players.includes(p('sjamals').id)],
            ['cada um descartou a sua', p('swarley').hand.join() === '7' && p('sauzburg').hand.join() === '17'],
            ['as cartas caíram no descarte', p('swarley').discard.includes(8) && p('sauzburg').discard.includes(12)],
        ],
    },
    {
        carta: 58,
        nome: 'Tábua do Joaquim: Você escolhe qual carta descartar',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', mao: [7, 8, 18] }, { mission: 'sauzburg', mao: [12] }, { mission: 'sjamals', mao: [17] }],
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley', 'sauzburg', 'sjamals'], '0:handPick': { swarley: [18] } },
        espera: (s, p) => [['você ficou com as outras', p('swarley').hand.join() === '7,8']],
    },

    // ------------------------------------------------------------ fase 3: missoes

    {
        carta: 9,
        nome: 'Brasa Negrão: O Swarley é revelado, bebe 1 e aponta outro para beber',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { '1.then': ['sauzburg'] },
        espera: (s, p, { passos }) => [
            ['o swarley é revelado para a mesa', p('swarley').missionRevealed
                && s.players.every(x => x.knownMissions[p('swarley').id] === 'swarley')],
            ['quem aponta é o swarley, e não pode se apontar', pergunta(passos, 'choose')?.chooserId === p('swarley').id
                && !pergunta(passos, 'choose')?.candidates.includes(p('swarley').id)],
            ['os dois bebem 1', p('swarley').shots === 1 && p('sauzburg').shots === 1],
        ],
    },
    {
        carta: 9,
        nome: 'Brasa Negrão: Você é o Swarley, bebe e aponta quem bebe junto',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { '1.then': ['stanley'] },
        espera: (s, p) => [['você bebe 1', p('swarley').shots === 1], ['quem você apontou também', p('stanley').shots === 1]],
    },
    {
        carta: 19,
        nome: 'Cebola Amiga: O Stanley se revela e bebe 2',
        mesa: MESA_DE_5,
        joga: 'swarley',
        espera: (s, p) => [['revelado', p('stanley').missionRevealed], ['bebe 2', p('stanley').shots === 2], ['só ele', ninguemMais(s, 'stanley')]],
    },
    {
        carta: 19,
        nome: 'Cebola Amiga: Você é o Stanley, se revela e bebe 2',
        mesa: MESA_DE_5,
        joga: 'swarley',
        voce: 'stanley',
        espera: (s, p) => [['você bebe 2', p('stanley').shots === 2]],
    },
    {
        carta: 20,
        nome: 'Dia do Legume: Depois de 3 rodadas, o Stanley depende de mais 2 ganharem',
        mesa: [{ mission: 'sauzburg' }, { mission: 'stanley' }, { mission: 'swarley' }],
        joga: 'sauzburg',
        espera: (s, p) => [
            ['a carta fica na mesa, fora das cadeiras', s.ongoing.some(o => o.idCard === 20 && o.global)],
            ['ainda nada mudou', p('stanley').goal === 'soleWinner'],
        ],
        depois: [
            { turnos: 8, espera: (s, p) => [['ainda não', p('stanley').goal === 'soleWinner']] },
            { turnos: 1, espera: (s, p) => [
                ['na terceira volta, o stanley muda de meta', p('stanley').goal === 'alliesWin'],
                ['a carta segue na mesa', s.ongoing.some(o => o.idCard === 20)],
            ] },
            { carta: 32, joga: 'swarley', escolhas: { 0: ['stanley', 'sauzburg'] } },
        ],
        esperaDepois: (s, p) => [
            ['a meta anda com a missão na troca', p('stanley').goal === 'alliesWin' && p('stanley').id === 1],
            ['quem saiu do stanley volta à meta da missão nova', p('sauzburg').goal === 'mostShots'],
        ],
    },
    {
        carta: 20,
        nome: 'Dia do Legume: Você é o Stanley quando a carta dispara',
        mesa: [{ mission: 'sauzburg' }, { mission: 'stanley' }],
        joga: 'sauzburg',
        voce: 'stanley',
        depois: [{ turnos: 6 }],
        esperaDepois: (s, p) => [['a sua meta mudou', p('stanley').goal === 'alliesWin' && p('stanley').goalChangedBy === 20]],
    },
    {
        carta: 32,
        nome: 'Quando Eu Fui pra Austrália: Dois jogadores trocam de missão',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 0: ['swarley', 'sauzburg'] },
        espera: (s, p) => [['trocaram', p('swarley').id === 3 && p('sauzburg').id === 2], ['quem jogou fica', p('stanley').id === 1]],
    },
    {
        carta: 32,
        nome: 'Quando Eu Fui pra Austrália: Você troca de missão com alguém',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { 0: ['swarley', 'sjamals'] },
        espera: (s, p) => [['você virou sjamals', p('sjamals').id === 2]],
    },
    {
        carta: 38,
        nome: 'Rolê: Swarley, Smichaels e Sauzburg bebem 1, sem se revelar',
        mesa: MESA_DE_5,
        joga: 'stanley',
        espera: (s, p, { log }) => {
            const ordem = log.filter(e => e.type === 'drink').map(e => e.playerId);
            return [
                ['os três bebem 1', ['swarley', 'smichaels', 'sauzburg'].every(m => p(m).shots === 1)],
                ['ninguém mais', ninguemMais(s, 'swarley', 'smichaels', 'sauzburg')],
                ['ninguém é revelado', s.players.every(x => !x.missionRevealed)],
                ['a conta sai na ordem dos assentos', ordem.join() === [...ordem].sort((a, b) => a - b).join()],
            ];
        },
    },
    {
        carta: 38,
        nome: 'Rolê: Você é um dos três e bebe 1',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'smichaels',
        espera: (s, p) => [['você bebe 1', p('smichaels').shots === 1]],
    },
    {
        carta: 39,
        nome: 'A Luta do Século: Todos bebem 1, menos o Sauzburg e o Swarley',
        mesa: MESA_DE_5,
        joga: 'stanley',
        espera: (s, p) => [
            ['os dois de fora não bebem', p('sauzburg').shots === 0 && p('swarley').shots === 0],
            ['o resto bebe 1, quem jogou inclusive', ['stanley', 'sjamals', 'smichaels'].every(m => p(m).shots === 1)],
        ],
    },
    {
        carta: 39,
        nome: 'A Luta do Século: Você é o Swarley e assiste sem beber',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'swarley',
        espera: (s, p) => [['você não bebe', p('swarley').shots === 0]],
    },
    {
        carta: 40,
        nome: 'Filtro do Snapchat: Swarley e Sauzburg trocam de missão',
        mesa: MESA_DE_5,
        joga: 'stanley',
        espera: (s, p) => [['trocaram', p('swarley').id === 3 && p('sauzburg').id === 2], ['ninguém revelado', s.players.every(x => !x.missionRevealed)]],
    },
    {
        carta: 40,
        nome: 'Filtro do Snapchat: Sem as duas missões na mesa, nada acontece',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sjamals' }],
        joga: 'stanley',
        voce: 'swarley',
        espera: (s, p) => [['ninguém trocou', p('stanley').id === 1 && p('swarley').id === 2], ['sem troca no log', !s.log.some(e => e.type === 'mission.swap')]],
    },
    {
        carta: 40,
        nome: 'Filtro do Snapchat: A boina tranca a missão, e a troca é barrada',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley', equipamento: [108] }, { mission: 'sauzburg' }],
        joga: 'stanley',
        voce: 'swarley',
        espera: (s, p) => [['você continua swarley', p('swarley').id === 2], ['o log diz que barrou', s.log.some(e => e.type === 'mission.swap.blocked')]],
    },
    {
        carta: 41,
        nome: 'Show das Drags: Sauzburg, Stanley e Sjehnsens trocam entre si',
        mesa: [{ mission: 'stanley' }, { mission: 'sauzburg' }, { mission: 'sjehnsens' }, { mission: 'swarley' }],
        joga: 'swarley',
        espera: (s, p, { log }) => [
            ['os três mudaram de missão', [1, 2, 3].every(id => s.players.find(x => x.id === id).mission !== ['stanley', 'sauzburg', 'sjehnsens'][id - 1])],
            ['quem não está na roda fica', p('swarley').id === 4],
            ['a roda vai no log em ordem de assento', log.some(e => e.type === 'mission.rotate' && e.ring.join() === '1,2,3')],
        ],
    },
    {
        carta: 41,
        nome: 'Show das Drags: Com só dois deles na mesa, os dois trocam',
        mesa: [{ mission: 'stanley' }, { mission: 'sauzburg' }, { mission: 'swarley' }],
        joga: 'swarley',
        voce: 'stanley',
        espera: (s, p) => [['você virou sauzburg', p('sauzburg').id === 1 && p('stanley').id === 2]],
    },
    {
        carta: 41,
        nome: 'Show das Drags: Com um só na mesa, nada acontece',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sjamals' }],
        joga: 'swarley',
        espera: (s, p) => [['ninguém trocou', p('stanley').id === 1], ['sem rotação no log', !s.log.some(e => e.type === 'mission.rotate')]],
    },
    {
        carta: 41,
        nome: 'Show das Drags: Quem está com a boina fica fora da roda',
        mesa: [{ mission: 'stanley', equipamento: [108] }, { mission: 'sauzburg' }, { mission: 'sjehnsens' }, { mission: 'swarley' }],
        joga: 'swarley',
        voce: 'stanley',
        espera: (s, p) => [['você continua stanley', p('stanley').id === 1], ['os outros dois trocam', p('sauzburg').id === 3 && p('sjehnsens').id === 2]],
    },
    {
        carta: 50,
        nome: 'Modo Deus: Você vê a missão de alguém e decide trocar',
        mesa: MESA_DE_5,
        joga: 'stanley',
        escolhas: { 0: ['sauzburg'], '1:option': 0 },
        espera: (s, p, { passos }) => [
            ['quem decide é quem jogou', pergunta(passos, 'option')?.chooserId === 1],
            ['você viu a missão', s.players.find(x => x.id === 1).knownMissions[3] === 'sauzburg'],
            ['trocaram', p('sauzburg').id === 1 && p('stanley').id === 3],
            ['o alvo é público', passos.some(e => e.phase === 'window' && e.stack.at(-1)?.targets?.join() === '3')],
        ],
    },
    {
        carta: 50,
        nome: 'Modo Deus: Alguém espia você e prefere não trocar',
        mesa: MESA_DE_5,
        joga: 'stanley',
        voce: 'sauzburg',
        escolhas: { 0: ['sauzburg'], '1:option': 1 },
        espera: (s, p) => [
            ['ninguém trocou', p('sauzburg').id === 3],
            ['só quem jogou sabe a sua missão', s.players.filter(x => x.knownMissions[3]).map(x => x.id).join() === '1'],
        ],
    },
    {
        carta: 56,
        nome: 'O Político: Todos passam a missão para o seguinte',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sauzburg' }, { mission: 'sjamals' }],
        joga: 'stanley',
        escolhas: { '0:option': 1 },
        espera: s => [['cada um recebeu a do anterior', s.players.map(x => x.mission).join() === 'sjamals,stanley,swarley,sauzburg']],
    },
    {
        carta: 56,
        nome: 'O Político: Todos passam a missão para o anterior, e o resultado é outro',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sauzburg' }, { mission: 'sjamals' }],
        joga: 'stanley',
        voce: 'swarley',
        escolhas: { '0:option': 0 },
        espera: s => [['cada um recebeu a do seguinte', s.players.map(x => x.mission).join() === 'swarley,sauzburg,sjamals,stanley']],
    },
    {
        carta: 56,
        nome: 'O Político: Com a ordem invertida, o seguinte é o outro lado',
        mesa: [{ mission: 'stanley' }, { mission: 'swarley' }, { mission: 'sauzburg' }, { mission: 'sjamals' }],
        joga: 'stanley',
        antes: [{ carta: 54, joga: 'stanley' }],
        escolhas: { '0:option': 1 },
        espera: s => [['o seguinte, no sentido de agora, é o da direita', s.players.map(x => x.mission).join() === 'swarley,sauzburg,sjamals,stanley']],
    },
];
