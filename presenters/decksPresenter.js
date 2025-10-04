import { insertRecord } from '@/actions/database/databaseActions';

export async function insertDeck(deck) {
    await insertRecord('oJogo-decks', deck);
}