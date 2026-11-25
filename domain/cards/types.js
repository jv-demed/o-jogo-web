/**
 * O tipo de cada carta, do lado puro.
 *
 * O tipo mora em assets/cards.js (e em o_jogo.cards), que importa o alias `@/`
 * e o React — nada disso roda em Node sem bundler. Mas tres defesas so entram
 * contra um tipo de carta: a 36 contra carta de efeito, a 67 contra carta
 * divina, a 66 contra equipamento. Sem o tipo aqui, o motor so conseguia
 * adivinhar pelo efeito. scripts/validate-effects.mjs confere esta lista contra
 * assets/cards.js, para as duas nao discordarem em silencio.
 */
export const CardKind = Object.freeze({
    shot:          'shot',
    investigation: 'investigation',
    effect:        'effect',
    defense:       'defense',
    quick:         'quick',
    divine:        'divine',
    equip:         'equip',
});

const BY_KIND = {
    shot: [1, 2, 3, 7, 8, 12, 17, 18, 27, 28, 29, 30, 37, 42, 43, 44, 45, 46, 47, 65, 75, 76, 83, 86, 91, 106,
        111, 112, 113, 114, 115, 116],
    investigation: [4, 9, 10, 14, 19, 24, 31, 38, 39, 40, 41, 68, 72, 74, 88, 95, 98],
    effect: [5, 13, 15, 16, 20, 21, 22, 25, 32, 33, 34, 35, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58, 71, 78, 79,
        80, 84, 85, 87, 89, 92, 94, 96, 97, 99, 100, 102, 103, 104, 107],
    defense: [6, 11, 23, 26, 36, 59, 60, 66, 67, 69, 90, 105],
    quick: [49, 101],
    divine: [61, 62, 63, 81, 82, 109, 110],
    equip: [64, 70, 73, 77, 93, 108],
};

export const CARD_KINDS = Object.freeze(Object.fromEntries(
    Object.entries(BY_KIND).flatMap(([kind, ids]) => ids.map(id => [id, kind]))));

/** O tipo da carta, ou null para id desconhecido. */
export const cardKind = idCard => CARD_KINDS[idCard] ?? null;
