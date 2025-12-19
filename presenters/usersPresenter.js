import { updateRecord } from '@/supabase/crud';

export function userHaveCard(userObj, numberCard) {
    return userObj.cards?.includes(numberCard);
}

export async function buyPack({ userObj, newCardsIds, price }) {
    await updateRecord('oJogo-users', userObj.id, {
        ...userObj,
        cards: [...userObj.cards, ...newCardsIds].sort((a, b) => a - b),
        coins: userObj.coins - price
    });
}

export async function sellCard(userObj, card) {
    const index = userObj.cards?.indexOf(card.id);
    if(index === -1 || index == null) return;
    const updatedCards = [
        ...userObj.cards.slice(0, index),
        ...userObj.cards.slice(index + 1)
    ];
    await updateRecord('oJogo-users', userObj.id, {
        ...userObj,
        cards: updatedCards,
        coins: userObj.coins + (card.level * 10)
    });
}