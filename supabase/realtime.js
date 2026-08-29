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
 * @param {string} [params.scope] quem esta escutando. Duas telas podem querer
 *        a mesma tabela com o mesmo filtro — o lobby e a mesa escutam as duas
 *        `matches:id=eq.X` —, e uma delas monta enquanto a outra desmonta. Com
 *        o mesmo nome, o canal novo nasce enquanto o velho ainda esta se
 *        desinscrevendo, e o convidado ficava esperando um evento que nunca ia
 *        chegar (so um F5 resolvia).
 * @param {Function} [params.onReady] chamada quando a inscricao esta de pe.
 *        Serve para reler: entre a leitura inicial e o canal ficar pronto ha
 *        uma janela, e o que mudar ali dentro nao vira evento para ninguem.
 */
export function getRealtime({ table, filter, event = '*', scope, callback, onReady }){
    // Nome unico por (escopo, tabela, filtro): dois canais com o mesmo nome no
    // mesmo client se atrapalham.
    const name = `o_jogo:${scope ? `${scope}:` : ''}${table}:${filter ?? 'all'}`;

    return supabase
        .channel(name)
        .on('postgres_changes', {
            event,
            schema: 'o_jogo',
            table,
            ...(filter ? { filter } : {})
        }, callback)
        .subscribe(status => {
            if(status === 'SUBSCRIBED') onReady?.();
        });
}

export function removeChannel(channel){
    supabase.removeChannel(channel);
}
