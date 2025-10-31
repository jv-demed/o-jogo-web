import { insertRecord, updateRecord } from '@/supabase/crud';

export const PACK_CATEGORIES = [
    {
        id: 1,
        name: 'Amigues Secretes',
    },{
        id: 0,
        name: 'Jogadores',
    }
];

export async function insertPurchase(purchase) {
    return await insertRecord('oJogo-users:packs', purchase);
}

export async function incPurchase(purchase) {
    await updateRecord('oJogo-users:packs', purchase.id, {
        ...purchase,
        amount: purchase.amount + 1
    });
}