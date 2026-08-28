import { supabase } from '@/supabase/client';

/**
 * Camada de dados da partida. Substitui actions/controls/matchActions.js e
 * actions/database/databaseActions.js, que montavam a partida no browser:
 * o id vinha de generateId() - o ultimo id de um `select` sem `order by`,
 * mais um - e a lista de jogadores era um array reescrito inteiro.
 *
 * Tudo que muda estado passa por RPC (migration 0007). Nao e preciosismo:
 * `match_players` nao tem grant de UPDATE, e sob RLS o jogador nem enxerga a
 * partida antes de entrar nela, entao calcular a propria posicao no cliente
 * seria impossivel mesmo se fosse seguro.
 */

/** @returns {Promise<number>} id da partida criada, ou da que ja estava aberta. */
export async function createMatch(){
    const { data, error } = await supabase.rpc('create_match');
    if(error) throw error;
    return data;
}

/**
 * Entra na partida. Chamado toda vez que o lobby monta, inclusive pelo host:
 * a RPC e idempotente e devolve a posicao atual de quem ja esta dentro.
 *
 * @returns {Promise<number>} posicao do jogador na mesa.
 */
export async function joinMatch(idMatch){
    const { data, error } = await supabase.rpc('join_match', {
        p_id_match: idMatch
    });
    if(error) throw error;
    return data;
}

export async function getMatch(idMatch){
    const { data, error } = await supabase
        .from('matches')
        .select('id, id_host, status')
        .eq('id', idMatch)
        .maybeSingle();
    if(error) throw error;
    return data;
}

/**
 * Os assentos da mesa, em ordem de turno. Assento de bot vem com `idUser`
 * nulo e o nome na propria linha; o de gente traz o nome embutido de
 * o_jogo.users, que a policy users_read_opponents libera para quem divide
 * partida com o jogador atual.
 *
 * O `id` e do assento, e nao do usuario: e a unica identidade que serve para
 * os dois, e e por ela que a reordenacao anda (migration 0009).
 *
 * @returns {Promise<{id: number, idUser: number|null, name: string,
 *                    isBot: boolean, position: number}[]>}
 */
export async function getMatchPlayers(idMatch){
    const { data, error } = await supabase
        .from('match_players')
        .select('id, id_user, bot_name, position, users(name)')
        .eq('id_match', idMatch)
        .order('position', { ascending: true });
    if(error) throw error;
    return (data ?? []).map(row => ({
        id: row.id,
        idUser: row.id_user,
        name: row.bot_name ?? row.users?.name ?? '???',
        isBot: row.id_user === null,
        position: row.position
    }));
}

/**
 * Grava a ordem dos turnos. `ids` sao ids de *assento*, e precisam ser uma
 * permutacao exata dos assentos da partida - a RPC recusa lista incompleta ou
 * com estranho.
 */
export async function reorderMatchSeats(idMatch, ids){
    const { error } = await supabase.rpc('reorder_match_seats', {
        p_id_match: idMatch,
        p_ids: ids
    });
    if(error) throw error;
}

/**
 * Poe um bot na mesa. So o host, so no lobby: bot nao entra sozinho porque
 * nao tem JWT, entao nao ha policy de insert que o cobrisse - e RPC.
 *
 * @returns {Promise<number>} id do assento criado.
 */
export async function addMatchBot(idMatch, name){
    const { data, error } = await supabase.rpc('add_match_bot', {
        p_id_match: idMatch,
        p_name: name
    });
    if(error) throw error;
    return data;
}

/** Tira um bot da mesa. A RPC recusa assento que tenha dono. */
export async function removeMatchBot(idMatch, idSeat){
    const { error } = await supabase.rpc('remove_match_bot', {
        p_id_match: idMatch,
        p_id_seat: idSeat
    });
    if(error) throw error;
}

export async function startMatch(idMatch){
    const { error } = await supabase.rpc('start_match', {
        p_id_match: idMatch
    });
    if(error) throw error;
}

/**
 * Sai da partida. Nao e RPC: a policy match_players_leave_self ja permite o
 * jogador apagar a propria linha, e so enquanto a partida esta no lobby.
 */
export async function leaveMatch(idMatch, idUser){
    const { error } = await supabase
        .from('match_players')
        .delete()
        .eq('id_match', idMatch)
        .eq('id_user', idUser);
    if(error) throw error;
}

/**
 * O host nao "sai": ele encerra. Apagar a partida nao e opcao (matches nao
 * tem policy de DELETE), e o trigger matches_status_flow aceita
 * lobby -> finished.
 */
export async function cancelMatch(idMatch){
    const { error } = await supabase
        .from('matches')
        .update({ status: 'finished' })
        .eq('id', idMatch);
    if(error) throw error;
}
