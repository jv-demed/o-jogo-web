import { updateRecord } from "@/supabase/crud";

export function userHaveCard(userObj, numberCard) {
    return userObj.cards?.includes(numberCard);
}

export async function addCardsInUser(userObj, newCards) {
    await updateRecord('oJogo-users', userObj.id, {
        ...userObj,
        cards: [...userObj.cards, ...newCards]
    });
}