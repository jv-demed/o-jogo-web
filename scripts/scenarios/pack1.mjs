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
        nome: 'Cabeca Rachada: o Sauzburg passa a querer menos shots',
        pendente: 'efeito passive nunca roda: vai para draft.ongoing e applyTurnEffects ignora',
        mesa: [
            { mission: 'sauzburg', shots: 1 },
            { mission: 'swarley',  shots: 4 },
            { mission: 'stanley',  shots: 6 },
        ],
        joga: 'swarley',
        espera: (s, p, { apurar }) => [
            ['a meta do sauzburg virou fewestShots', p('sauzburg').goal === 'fewestShots'],
            ['a missao continua sendo sauzburg', p('sauzburg').mission === 'sauzburg'],
            ['a carta fica na mesa enquanto vale', s.ongoing.some(o => o.idCard === 5)],
            ['com menos shots, o sauzburg ganha', apurar()[p('sauzburg').id] === true],
        ],
        // "A carta perde o efeito apos uma troca de missao de Sauzburg."
        depois: [
            { carta: 32, joga: 'stanley', escolhas: { 0: ['sauzburg', 'swarley'] } },
        ],
        esperaDepois: (s, p) => [
            ['quem ficou com o sauzburg quer mais shots de novo', p('sauzburg').goal === 'mostShots'],
            ['a carta 5 sai da mesa', !s.ongoing.some(o => o.idCard === 5)],
            ['a carta 5 cai no descarte de quem jogou',
                s.discardPile.some(e => e.idCard === 5)],
        ],
    },
];
