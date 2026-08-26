import { PACK_1_EFFECTS } from './pack1.js';
import { PACK_2_EFFECTS } from './pack2.js';
import { PACK_3_EFFECTS } from './pack3.js';

/**
 * Catalogo de efeitos, indexado por `card.id`.
 *
 * Cobre as 116 cartas dos tres packs. Um pack novo vira um arquivo irmao e
 * entra aqui. `getCardEffects` continua devolvendo null para id desconhecido —
 * nao lanca, porque a UI mostra a carta antes de ela virar dado.
 */
export const CARD_EFFECTS = Object.freeze({
    ...PACK_1_EFFECTS,
    ...PACK_2_EFFECTS,
    ...PACK_3_EFFECTS,
});

// Packs cuja modelagem esta fechada. scripts/validate-effects.mjs cobra
// cobertura total so destes; o resto e listado como pendente, nao como erro.
export const MODELED_PACKS = Object.freeze([1, 2, 3]);

/** @returns {{ effects: object[], ritual?: string, note?: string } | null} */
export function getCardEffects(id){
    return CARD_EFFECTS[id] ?? null;
}

export function hasCardEffects(id){
    return CARD_EFFECTS[id] !== undefined;
}
