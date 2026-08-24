import { supabase } from '@/supabase/client';

export function userHaveCard(userObj, idCard) {
    return userObj.cards?.includes(idCard);
}

/**
 * Compra um pack. O sorteio, o debito e o credito acontecem todos dentro da
 * RPC, numa transacao so: o cliente nao escolhe as cartas nem confere o
 * saldo. Antes isto era um UPDATE direto do browser com a anon key.
 *
 * @returns {Promise<number[]>} ids das cartas sorteadas pelo servidor.
 */
export async function buyPack(idPack) {
    const { data, error } = await supabase.rpc('buy_pack', {
        p_id_pack: idPack
    });
    if(error) throw error;
    return data ?? [];
}

/**
 * Espelha o_jogo.card_sell_price no banco, que e quem decide de verdade.
 * Aqui serve so para o rotulo do botao: se as duas divergirem, quem manda
 * e a do Postgres, e o jogador vai receber o valor de la.
 */
export function cardSellPrice(level) {
    return level * 10;
}

/**
 * Vende uma copia da carta. O preco vem de card_sell_price no banco; era
 * card.level * 10 calculado no cliente.
 *
 * @returns {Promise<number>} saldo de coins depois da venda.
 */
export async function sellCard(idCard) {
    const { data, error } = await supabase.rpc('sell_card', {
        p_id_card: idCard
    });
    if(error) throw error;
    return data;
}
