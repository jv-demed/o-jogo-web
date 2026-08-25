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
 * Jogadores da partida, em ordem de turno. O nome vem embutido de
 * o_jogo.users: a policy users_read_opponents libera a leitura de quem
 * divide partida com o jogador atual.
 *
 * @returns {Promise<{id: number, name: string, position: number}[]>}
 */
export async function getMatchPlayers(idMatch){
    const { data, error } = await supabase
        .from('match_players')
        .select('id_user, position, users(name)')
        .eq('id_match', idMatch)
        .order('position', { ascending: true });
    if(error) throw error;
    return (data ?? []).map(row => ({
        id: row.id_user,
        name: row.users?.name ?? '???',
        position: row.position
    }));
}

/**
 * Grava a ordem dos turnos. `ids` precisa ser uma permutacao exata dos
 * jogadores da partida - a RPC recusa lista incompleta ou com estranho.
 */
export async function reorderMatchPlayers(idMatch, ids){
    const { error } = await supabase.rpc('reorder_match_players', {
        p_id_match: idMatch,
        p_ids: ids
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
