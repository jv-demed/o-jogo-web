import { insertRecord, updateRecord } from '@/supabase/crud';

export async function insertDeck(deck) {
    return await insertRecord('oJogo-decks', deck);
}

export async function updateDeck(idDeck, updatedCards) {
    await updateRecord('oJogo-decks', idDeck, updatedCards);
}