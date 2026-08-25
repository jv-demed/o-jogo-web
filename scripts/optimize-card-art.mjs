// Converte as artes estaticas (public/cards, public/packs) de PNG para WebP.
//
// A arte da carta e desenhada num quadro de 234x231 dentro do Card e o proprio
// card ainda leva `scale`, entao 250px e o maior tamanho de exibicao real: o cap
// de 500px cobre tela 2x com folga. Os packs ja saem em 300x440, do tamanho em
// que sao exibidos, e so trocam de formato.
//
// Os PNGs originais sao apagados -- continuam no historico do git se algum dia
// precisar reexportar em resolucao maior.
//
//   node scripts/optimize-card-art.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const TARGETS = [
    { dir: 'public/cards', maxSize: 500 },
    { dir: 'public/packs', maxSize: 600 },
];
const QUALITY = 82;

const dry = process.argv.includes('--dry');
const mb = bytes => (bytes / 1048576).toFixed(1) + ' MB';

for(const { dir, maxSize } of TARGETS){
    const pngs = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
    let before = 0;
    let after = 0;

    for(const file of pngs){
        const src = path.join(dir, file);
        const out = src.replace(/\.png$/, '.webp');

        const buffer = await sharp(src)
            // `withoutEnlargement` mantem intacto o que ja e menor que o cap --
            // metade das artes de carta esta entre 250 e 430px.
            .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: QUALITY })
            .toBuffer();

        before += fs.statSync(src).size;
        after += buffer.length;

        if(!dry){
            fs.writeFileSync(out, buffer);
            fs.unlinkSync(src);
        }
    }

    console.log(`${dir}: ${pngs.length} arquivos, ${mb(before)} -> ${mb(after)}${dry ? ' (dry run)' : ''}`);
}
