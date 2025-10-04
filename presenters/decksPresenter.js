import { insertRecord } from '@/supabase/crud';

export async function insertDeck(deck) {
    await insertRecord('oJogo-decks', deck);
}