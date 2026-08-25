import fs from 'node:fs';

const q = s => "'" + String(s).replace(/'/g, "''") + "'";

// Le os assets sem passar pelo bundler: strip do import e do alias @/.
function loadArray(file, name){
    let src = fs.readFileSync(file, 'utf8')
        .replace(/^import .*$/gm, '')
        .replace(/export const/g, 'const');
    src += `\n;globalThis.__out = ${name};`;
    const CardType = {
        defense:'defesa', divine:'divino', effect:'efeito', equip:'equipamento',
        investigation:'investigacao', quick:'rápido', shot:'shot',
    };
    new Function('CardType', src)(CardType);
    return globalThis.__out;
}

const PACKS = loadArray('assets/packs.js', 'PACKS');
const CARDS = loadArray('assets/cards.js', 'CARDS');

const lines = [];
lines.push(`-- Seed do catalogo, gerado a partir de assets/packs.js e assets/cards.js.`);
lines.push(`-- Nao editar a mao: rode scripts/gen-catalog-seed.mjs.`);
lines.push(`-- Gerado em ${new Date().toISOString().slice(0,10)}. ${PACKS.length} packs, ${CARDS.length} cartas.`);
lines.push('');
lines.push('-- Upsert, e nao insert puro: este arquivo e regerado toda vez que uma');
lines.push('-- carta muda, entao precisa rodar sobre um banco que ja tem o catalogo.');
lines.push('-- Rodar duas vezes deixa o mesmo estado que rodar uma.');
lines.push('');
lines.push('insert into o_jogo.packs (id, name, date_release, quantity, price) values');
lines.push(PACKS.map(p =>
    `    (${p.id}, ${q(p.name)}, ${q(p.dateRelease.toISOString().slice(0,10))}, ${p.quantity}, ${p.price})`
).join(',\n'));
lines.push([
    'on conflict (id) do update set',
    '    name         = excluded.name,',
    '    date_release = excluded.date_release,',
    '    quantity     = excluded.quantity,',
    '    price        = excluded.price;',
].join('\n'));
lines.push('');
lines.push('insert into o_jogo.cards (id, id_pack, number, name, type, is_shot, text, level) values');
lines.push(CARDS.map(c => {
    // O text no bundle e template literal indentado; colapsa em uma linha.
    const text = c.text.replace(/\s+/g, ' ').trim();
    return `    (${c.id}, ${c.idPack}, ${c.number}, ${q(c.name)}, ${q(c.type)}, ${!!c.isShot}, ${q(text)}, ${c.level})`;
}).join(',\n'));
lines.push([
    'on conflict (id) do update set',
    '    id_pack = excluded.id_pack,',
    '    number  = excluded.number,',
    '    name    = excluded.name,',
    '    type    = excluded.type,',
    '    is_shot = excluded.is_shot,',
    '    text    = excluded.text,',
    '    level   = excluded.level;',
].join('\n'));
lines.push('');

fs.writeFileSync('supabase/migrations/20260824000002_seed_catalog.sql', lines.join('\n'), 'utf8');

// Sanidade
const ids = CARDS.map(c => c.id);
console.log('cartas:', CARDS.length, '| ids unicos:', new Set(ids).size);
console.log('packs referenciados:', [...new Set(CARDS.map(c=>c.idPack))].sort());
const semArte = CARDS.filter(c => !fs.existsSync(`public/cards/${c.id}.png`));
console.log('sem arte em public/cards:', semArte.map(c=>`${c.id} ${c.name}`));
const arquivos = fs.readdirSync('public/cards');
const orfas = arquivos.filter(f => !ids.includes(Number(f.replace('.png',''))));
console.log('arquivos orfaos:', orfas);
// A constraint unique (id_pack, number) do 0001: number so e unico por pack.
const pares = new Map(); const dups = [];
for(const c of CARDS){
    const k = `${c.idPack}/${c.number}`;
    if(pares.has(k)) dups.push(`${k}: ids ${pares.get(k)} e ${c.id}`);
    else pares.set(k, c.id);
}
console.log('duplicatas (id_pack, number):', dups.length ? dups : 'nenhuma');
const divergentes = CARDS.filter(c => c.id !== c.number).length;
console.log('id != number:', divergentes);
const tipos = [...new Set(CARDS.map(c=>c.type))].sort();
console.log('tipos usados:', tipos);
