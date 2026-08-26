import fs from 'node:fs';

// Le os assets sem passar pelo bundler: strip do import e do alias @/.
// Vive aqui, e nao dentro de um script so, porque tanto o gen-catalog-seed
// quanto o validate-effects precisam do mesmo truque.
export function loadArray(file, name){
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

export const loadCards = () => loadArray('assets/cards.js', 'CARDS');
export const loadPacks = () => loadArray('assets/packs.js', 'PACKS');
