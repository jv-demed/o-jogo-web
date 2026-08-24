import { supabase } from '@/supabase/client';

/**
 * Converte a lista plana de cartas do editor, onde a repeticao aparece como
 * entradas duplicadas, nas linhas (id_card, quantity) que deck_cards espera.
 */
function toDeckCardRows(idDeck, cards) {
    const counts = new Map();
    for(const card of cards) {
        counts.set(card.id, (counts.get(card.id) ?? 0) + 1);
    }
    return [...counts].map(([id_card, quantity]) => ({
        id_deck: idDeck,
        id_card,
        quantity
    }));
}

/**
 * Cria ou atualiza um deck e substitui suas cartas.
 *
 * As cartas sao gravadas por `id`, nunca por `number`: era essa troca que
 * corrompia o deck, porque `number` reinicia a cada pack e 53 das 116 cartas
 * tem id != number.
 *
 * Nao e atomico - sao ate tres chamadas. Diferente da economia, aqui isso e
 * aceitavel: o unico afetado e o dono do deck, o trigger deck_cards_owned
 * barra carta fora da colecao, e nao ha dinheiro envolvido.
 *
 * @returns {Promise<number>} id do deck salvo.
 */
export async function saveDeck({ idDeck, idUser, name, cards }) {
    let deckId = idDeck;

    if(deckId) {
        const { error } = await supabase
            .from('decks')
            .update({ name })
            .eq('id', deckId);
        if(error) throw error;
    } else {
        const { data, error } = await supabase
            .from('decks')
            .insert({ id_user: idUser, name })
            .select('id')
            .single();
        if(error) throw error;
        deckId = data.id;
    }

    const { error: deleteError } = await supabase
        .from('deck_cards')
        .delete()
        .eq('id_deck', deckId);
    if(deleteError) throw deleteError;

    const rows = toDeckCardRows(deckId, cards);
    if(rows.length) {
        const { error: insertError } = await supabase
            .from('deck_cards')
            .insert(rows);
        if(insertError) throw insertError;
    }

    return deckId;
}
