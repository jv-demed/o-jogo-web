// Um cenario de teste por carta: a carta faz o que o texto manda?
//
// O validate-match joga as 116 cartas, mas o que ele confere e "nao estourou e
// nao caiu em `unhandled`". Isso deixou passar carta que nao faz nada (a 5, a
// 64, a 108) e carta que acerta o lado errado (a 89). Aqui cada carta e jogada
// numa mesa montada a mao, e o que tem que ser verdade depois e escrito.
//
//   npm run validate:cards           todos
//   npm run validate:cards -- 5      so a carta 5 (aceita varias: -- 4 5)
//   npm run validate:cards -- pack2  so um pack
//
// Mesmo papel dos outros validates: Node puro, sem dependencia, sai com codigo
// 1 se algo quebrar. A mesa de mentira e a de scripts/lib/mesa.mjs.
//
// Forma de um cenario (scripts/scenarios/packN.mjs):
//
//   {
//     carta: 5,
//     nome: 'Carta: O que acontece',// aparece no laboratorio, com acento e
//                                   // maiuscula depois dos dois pontos. Fala de
//                                   // "voce" e "alguem", e nao da missao do
//                                   // alvo: na mesa ninguem sabe quem e quem.
//                                   // Missao so quando a carta fala dela.
//     mesa: [{ mission: 'sauzburg', shots: 1, mao?: [ids], dados?: 3, pula?: 2,
//              equipamento?: [ids ou { idCard, mission }] }, ...],  // ids 1..N
//     antes: [{ carta, joga, escolhas? }],  // jogadas antes da carta testada (103)
//     joga: 2 | 'swarley',          // assento (id) ou missao de quem joga
//     voce: 'stanley',              // so do laboratorio: quem e voce, quando a
//                                   // carta e jogada por outro ("joga em voce").
//                                   // Sem, voce e quem joga. O motor ignora.
//     escolhas: { 0: ['sauzburg'] },// respostas por slot; sem, responde o simples.
//                                   // Pedido que nao e de alvo pode vir em
//                                   // `slot:tipo` ('0:option', '0:vote'), e o
//                                   // de chave propria em `slot:chave` ('0:to').
//     espera: (s, p, ctx) => [['rotulo', booleano], ...],
//     depois: [                     // opcional, em ordem
//       { carta: 32, joga?: 'stanley', escolhas?: {...}, espera?: (s, p, ctx) => [...] },
//       { turnos: 3, escolhas? },   // passa a vez 3 vezes sem jogar
//     ],
//     esperaDepois: (s, p, ctx) => [...],
//     gatilho: { carta: 32, joga: 'stanley', escolhas?: {...} },
//                                   // a 69 usa `gatilho: { joga }` sem carta:
//                                   // entra antes de o jogador da vez jogar
//                                   // carta de defesa: quem joga e o gatilho, e
//                                   // a carta testada entra na janela dele,
//                                   // jogada por `joga`
//     recusada: true,               // com gatilho: o motor tem que recusar a defesa
//     pendente: 'motivo',           // bug conhecido do motor: roda, mostra, nao derruba
//   }
//
// `p('sauzburg')` acha o jogador pela missao na mesa *de agora*. `ctx` traz
// `passos` (cada estado intermediario), `log` (o log da partida) e `apurar()`
// (quem ganharia se a partida acabasse ali, por id).

import { destiny } from '../domain/match/engine.js';
import { Phase } from '../domain/match/state.js';
import { beber, daVez, jogar, montarMesa, passarVez, tchouameni } from './lib/mesa.mjs';
import { SCENARIOS } from './scenarios/index.mjs';

const ULTIMAS_DO_LOG = 15;

// ---------------------------------------------------------------- filtro

const argumentos = process.argv.slice(2);
const cartas = argumentos.filter(a => /^\d+$/.test(a)).map(Number);
const packs = argumentos.filter(a => /^pack\d+$/.test(a));
const desconhecidos = argumentos.filter(a => !/^\d+$/.test(a) && !/^pack\d+$/.test(a));
if(desconhecidos.length){
    console.error(`argumento que nao entendi: ${desconhecidos.join(' ')} (use um numero de carta ou packN)`);
    process.exit(1);
}

const escolhidos = SCENARIOS.filter(c =>
    (cartas.length === 0 || cartas.includes(c.carta))
    && (packs.length === 0 || packs.includes(c.pack)));

if(escolhidos.length === 0){
    // Nada a rodar nao e falha: o pack 2 ainda nao tem cenario nenhum, e a
    // carta que a revisao nao alcancou tambem nao.
    console.log(`ainda nao ha cenario para ${argumentos.join(' ') || 'nada'}.`);
    process.exit(0);
}

// ---------------------------------------------------------------- rodar

const finder = state => mission => {
    const player = state.players.find(x => x.mission === mission);
    if(!player) throw new Error(`ninguem na mesa tem a missao ${mission}`);
    return player;
};

const contexto = (state, passos) => ({
    passos,
    log: state.log,
    // Quem ganharia se a partida acabasse agora, com o destino final inteiro
    // (missao, derrota forcada, 99, 109, Gladsxodia).
    apurar: () => {
        const { final } = destiny(state);
        return Object.fromEntries(state.players.map(p => [p.id, final.has(p.id)]));
    },
});

/** Roda as expectativas e devolve as que quebraram. Excecao dentro conta como quebra. */
function conferir(espera, state, passos, onde){
    if(!espera) return [];
    let lista;
    try{
        lista = espera(state, finder(state), contexto(state, passos));
    }catch(err){
        return [`${onde}: a expectativa estourou: ${err.message}`];
    }
    return lista.filter(([, ok]) => !ok).map(([rotulo]) => `${onde}: ${rotulo}`);
}

/** Um passo do `depois`: jogar outra carta ou so deixar a mesa girar. */
function passo(state, etapa, passos){
    let current = beber(state, 0, passos);
    if(etapa.turnos){
        for(let i = 0; i < etapa.turnos; i++) current = passarVez(current, 0, passos, etapa.escolhas);
        return beber(current, 0, passos);
    }
    // Depois de uma jogada a vez esta no fim: passa, e se o cenario disse quem
    // joga, gira ate ser a vez dele. Girar de verdade, e nao pular a vez na
    // marra, porque o efeito que esta na mesa cobra na virada.
    if(current.phase === Phase.end) current = passarVez(current, 0, passos, etapa.escolhas);
    if(etapa.joga !== undefined){
        const quem = typeof etapa.joga === 'string'
            ? finder(current)(etapa.joga).id
            : etapa.joga;
        let voltas = 0;
        while(daVez(current).id !== quem){
            if(voltas++ > current.order.length) throw new Error(`a vez nunca chega em ${etapa.joga}`);
            current = passarVez(current, 0, passos, etapa.escolhas);
        }
    }
    if(etapa.carta === null) return current;
    current = jogar(current, etapa.carta, { escolhas: etapa.escolhas, passos, reacoes: etapa.reacoes });
    return beber(current, 0, passos);
}

function rodar(cenario){
    const passos = [];
    const { gatilho } = cenario;
    const primeiro = cenario.antes?.[0]?.joga ?? gatilho?.joga ?? cenario.joga;
    let state = montarMesa(cenario.mesa, { joga: primeiro, seed: cenario.semente ?? cenario.carta });
    passos.push(state);
    const quebras = [];

    try{
        // Jogadas antes da carta testada, cada uma na vez de quem joga.
        for(const etapa of cenario.antes ?? []) state = passo(state, etapa, passos);
        if(cenario.antes?.length && !gatilho){
            state = passo(state, { joga: cenario.joga, carta: null }, passos);
        }
        state = gatilho && gatilho.carta === undefined
            ? tchouameni(state, cenario.joga, { escolhas: cenario.escolhas, passos, reacoes: cenario.reacoes })
            : gatilho
                ? jogar(state, gatilho.carta, { escolhas: gatilho.escolhas, passos, reacoes: [
                    { joga: cenario.joga, carta: cenario.carta, recusada: cenario.recusada },
                    ...(cenario.reacoes ?? []),
                ]})
                : jogar(state, cenario.carta, { escolhas: cenario.escolhas, passos, reacoes: cenario.reacoes });
        state = beber(state, 0, passos);
        quebras.push(...conferir(cenario.espera, state, passos, 'espera'));

        for(const [i, etapa] of (cenario.depois ?? []).entries()){
            state = passo(state, etapa, passos);
            quebras.push(...conferir(etapa.espera, state, passos, `depois[${i}]`));
        }
        quebras.push(...conferir(cenario.esperaDepois, state, passos, 'esperaDepois'));

        const semHandler = state.log.filter(e => e.type === 'unhandled');
        for(const e of semHandler) quebras.push(`acao sem handler "${e.action}"`);
    }catch(err){
        quebras.push(`a partida estourou: ${err.message}`);
        // O log que interessa e o do ultimo estado que a mesa chegou a ter.
        state = passos.at(-1) ?? state;
    }
    return { quebras, state };
}

// ---------------------------------------------------------------- saida

/** O log da partida em uma linha por fato, sem o `turn` repetido em cada uma. */
function linhaDoLog(entry){
    const { turn, type, ...resto } = entry;
    const corpo = Object.keys(resto).length ? ' ' + JSON.stringify(resto) : '';
    return `t${turn ?? '?'} ${type}${corpo}`;
}

let problemas = 0;
let pendentes = 0;

for(const cenario of escolhidos){
    const inicio = performance.now();
    const { quebras, state } = rodar(cenario);
    const ms = (performance.now() - inicio).toFixed(0);
    const titulo = `#${cenario.carta} ${cenario.nome} (${ms} ms)`;

    if(quebras.length === 0 && !cenario.pendente){
        console.log(`ok    ${titulo}`);
        continue;
    }
    if(quebras.length === 0 && cenario.pendente){
        // O bug foi consertado e ninguem tirou a marca: o cenario passaria a
        // esconder uma regressao futura atras do "pendente".
        console.error(`ERRO  ${titulo}\n      passou, mas esta marcado pendente: tire o \`pendente\``);
        problemas++;
        continue;
    }

    if(cenario.pendente){
        console.log(`PEND  ${titulo}\n      pendente: ${cenario.pendente}`);
        pendentes++;
    }else{
        console.error(`ERRO  ${titulo}`);
        problemas++;
    }
    const saida = cenario.pendente ? console.log : console.error;
    for(const quebra of quebras) saida(`      x ${quebra}`);
    saida(`      log (ultimas ${ULTIMAS_DO_LOG}):`);
    for(const entry of state.log.slice(-ULTIMAS_DO_LOG)) saida(`        ${linhaDoLog(entry)}`);
}

const total = escolhidos.length;
console.log(`\n${total} cenario(s), ${total - problemas - pendentes} ok`
    + (pendentes ? `, ${pendentes} pendente(s) de conserto no motor` : '')
    + (problemas ? `, ${problemas} com erro` : '') + '.');

if(problemas) process.exit(1);
