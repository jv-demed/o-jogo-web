import { PACK_1_EFFECTS } from './pack1.js';

/**
 * Catalogo de efeitos, indexado por `card.id`.
 *
 * Cobre hoje o pack 1. Os packs 2 e 3 ainda nao foram modelados: cada um vira
 * um arquivo irmao e entra aqui. Enquanto isso, `getCardEffects` devolve null
 * para eles — nao lanca, porque a UI ja mostra essas cartas hoje e nao deve
 * quebrar por causa de uma carta que ainda nao virou dado.
 */
export const CARD_EFFECTS = Object.freeze({
    ...PACK_1_EFFECTS,
});

// Packs cuja modelagem esta fechada. scripts/validate-effects.mjs cobra
// cobertura total so destes; o resto e listado como pendente, nao como erro.
export const MODELED_PACKS = Object.freeze([1]);

/** @returns {{ effects: object[], ritual?: string, note?: string } | null} */
export function getCardEffects(id){
    return CARD_EFFECTS[id] ?? null;
}

export function hasCardEffects(id){
    return CARD_EFFECTS[id] !== undefined;
}
