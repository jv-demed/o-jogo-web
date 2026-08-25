// Converte as artes estaticas (public/cards, public/packs) de PNG para WebP.
//
// Os PNGs originais nao estao mais no working tree -- foram removidos quando a
// conversao rodou. Para reexecutar, restaure-os antes num diretorio qualquer e
// aponte --from para ele:
//
//   git archive <commit-antes-da-remocao> public/cards public/packs | tar -x -C /tmp/orig
//   node scripts/optimize-card-art.mjs --from /tmp/orig [--dry]
//
// A arte da carta e desenhada num quadro de 234x231, entao o cap de 1000px
// cobre ate 4x de densidade de tela. Os packs so existem em 300x440 -- e o
// tamanho em que ja sao exibidos, sem margem para tela 2x -- entao vao em
// lossless para nao perder nada do pouco que ha.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const TARGETS = [
    { dir: 'public/cards', encode: img => img
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 }) },
    { dir: 'public/packs', encode: img => img
        .webp({ lossless: true }) },
];

const arg = name => {
    const i = process.argv.indexOf(name);
    return i === -1 ? null : process.argv[i + 1];
};

const dry = process.argv.includes('--dry');
const from = arg('--from');
const mb = bytes => (bytes / 1048576).toFixed(2) + ' MB';

for(const { dir, encode } of TARGETS){
    const srcDir = from ? path.join(from, dir) : dir;
    const pngs = fs.readdirSync(srcDir).filter(f => f.endsWith('.png'));
    let before = 0;
    let after = 0;

    for(const file of pngs){
        const src = path.join(srcDir, file);
        const out = path.join(dir, file.replace(/\.png$/, '.webp'));

        const buffer = await encode(sharp(src)).toBuffer();

        before += fs.statSync(src).size;
        after += buffer.length;

        if(!dry){
            fs.writeFileSync(out, buffer);
            // So apaga o PNG quando ele mora no proprio public/ -- rodando com
            // --from, o diretorio de origem e do chamador.
            if(!from) fs.unlinkSync(src);
        }
    }

    console.log(`${dir}: ${pngs.length} arquivos, ${mb(before)} -> ${mb(after)}${dry ? ' (dry run)' : ''}`);
}
