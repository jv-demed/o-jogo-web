import { supabase } from '@/supabase/client';

/**
 * Escuta mudancas de uma tabela do jogo.
 *
 * Antes isto era `{ event: '*', schema: 'public' }` com nome de canal fixo.
 * Numa instancia compartilhada com os outros projetinhos, `public` significa
 * *toda mudanca de toda tabela de todos eles* chegando no browser - e o nome
 * fixo fazia duas telas disputarem o mesmo canal.
 *
 * @param {string} params.table   tabela dentro do schema o_jogo.
 * @param {string} [params.filter] filtro do Realtime, ex.: `id_match=eq.12`.
 *                                 Sem ele, chega mudanca de partida alheia.
 * @param {string} [params.event] INSERT, UPDATE, DELETE ou '*'.
 */
export function getRealtime({ table, filter, event = '*', callback }){
    // Nome unico por (tabela, filtro): dois canais com o mesmo nome no mesmo
    // client se atrapalham.
    const name = `o_jogo:${table}:${filter ?? 'all'}`;

    return supabase
        .channel(name)
        .on('postgres_changes', {
            event,
            schema: 'o_jogo',
            table,
            ...(filter ? { filter } : {})
        }, callback)
        .subscribe();
}

export function removeChannel(channel){
    supabase.removeChannel(channel);
}
