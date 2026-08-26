// Valida o catalogo de efeitos contra o vocabulario e contra assets/cards.js.
//
// Roda sem dependencia nenhuma: `node scripts/validate-effects.mjs`. Quando o
// Vitest entrar (pendencia aberta), o corpo daqui vira um teste — a validacao
// em si ja mora em domain/, que e puro de proposito.
//
// Sai com codigo 1 se algo estiver invalido, para poder ir pro CI direto.

import { loadCards } from './lib/loadAssets.mjs';
import { validateCardEffects } from '../domain/cards/validateEffect.js';
import { CARD_EFFECTS, MODELED_PACKS } from '../domain/cards/effects/index.js';

const CARDS = loadCards();
const byId = new Map(CARDS.map(c => [c.id, c]));

let problemas = 0;

// 1. Todo efeito modelado tem que ser valido.
for(const [id, entry] of Object.entries(CARD_EFFECTS)){
    const carta = byId.get(Number(id));
    const label = carta ? `#${id} ${carta.name}` : `#${id}`;
    if(!carta){
        console.error(`ERRO ${label}: id nao existe em assets/cards.js`);
        problemas++;
        continue;
    }
    const erros = validateCardEffects(entry, label);
    for(const erro of erros) console.error(`ERRO ${erro}`);
    problemas += erros.length;
}

// 2. Pack fechado nao pode ter buraco.
for(const pack of MODELED_PACKS){
    const faltando = CARDS
        .filter(c => c.idPack === pack && CARD_EFFECTS[c.id] === undefined)
        .map(c => `#${c.id} ${c.name}`);
    if(faltando.length){
        console.error(`ERRO pack ${pack} declarado modelado, mas faltam: ${faltando.join(', ')}`);
        problemas += faltando.length;
    }
}

// 3. Panorama.
const total = CARDS.length;
const modeladas = CARDS.filter(c => CARD_EFFECTS[c.id] !== undefined).length;
const porPack = {};
for(const c of CARDS){
    porPack[c.idPack] ??= { total: 0, feitas: 0 };
    porPack[c.idPack].total++;
    if(CARD_EFFECTS[c.id] !== undefined) porPack[c.idPack].feitas++;
}

console.log(`cobertura: ${modeladas}/${total} cartas`);
for(const [pack, { total: t, feitas }] of Object.entries(porPack)){
    const marca = MODELED_PACKS.includes(Number(pack)) ? 'fechado' : 'pendente';
    console.log(`  pack ${pack}: ${feitas}/${t} (${marca})`);
}

// 4. Cartas de defesa/rapida deveriam reagir fora da vez: se nenhuma reacao
//    aparecer, quase sempre e modelagem faltando, nao carta esquisita.
const semReacao = CARDS.filter(c =>
    CARD_EFFECTS[c.id] !== undefined
    && ['defesa', 'rápido'].includes(c.type)
    && !CARD_EFFECTS[c.id].effects.some(e => e.timing === 'reaction')
).map(c => `#${c.id} ${c.name}`);
if(semReacao.length){
    console.log(`aviso: carta de defesa/rapida sem efeito de reacao: ${semReacao.join(', ')}`);
}

if(problemas){
    console.error(`\n${problemas} problema(s).`);
    process.exit(1);
}
console.log('\ntudo valido.');
