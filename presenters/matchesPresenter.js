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
        .select('id, id_host, status, cheats')
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
 * A partida com o estado dentro. Separada de `getMatch` porque o `state` e o
 * documento inteiro da mesa: o lobby, que so quer saber de host e status, nao
 * tem por que arrasta-lo em toda leitura.
 *
 * @returns {Promise<{id: number, id_host: number, status: string,
 *                    cheats: boolean, state: object|null, state_version: number}>}
 */
export async function getMatchRow(idMatch){
    const { data, error } = await supabase
        .from('matches')
        .select('id, id_host, status, cheats, state, state_version')
        .eq('id', idMatch)
        .maybeSingle();
    if(error) throw error;
    return data;
}

/**
 * Grava o estado da partida. So o host consegue: a RPC confere, e tambem
 * descarta gravacao mais velha que a gravada - a rede nao promete ordem, e a
 * mesa voltando no tempo seria uma carta jogada duas vezes.
 *
 * @returns {Promise<number>} a versao que ficou valendo.
 */
export async function saveMatchState(idMatch, state, version){
    const { data, error } = await supabase.rpc('save_match_state', {
        p_id_match: idMatch,
        p_state: state,
        p_version: version
    });
    if(error) throw error;
    return data;
}

/**
 * Grava a mesa recem-montada. Uma vez so por partida: a RPC nao reescreve
 * partida ja montada, senao o log de comandos dela perderia o ponto de partida.
 */
export async function seedMatchState(idMatch, state){
    const { error } = await supabase.rpc('seed_match_state', {
        p_id_match: idMatch,
        p_state: state
    });
    if(error) throw error;
}

/**
 * Manda um comando sem aplica-lo. E assim que joga quem nao e o host: a linha
 * entra sem `seq`, e fica esperando o host aplica-la.
 *
 * `now` nao viaja: o relogio que vale e o de quem aplica, e mandar o proprio
 * seria deixar o cliente adiantar a janela de interferencia. Quem carimba e o
 * host, e o carimbo dele e que fica gravado (`applied_now`).
 */
export async function pushMatchCommand(idMatch, idUser, command){
    const { now, ...rest } = command;
    const { error } = await supabase
        .from('match_commands')
        .insert({ id_match: idMatch, id_user: idUser, command: rest, seq: null });
    if(error) throw error;
}

/**
 * Escreve no log um comando que o host acabou de aplicar - o dele proprio ou o
 * de um bot. Ja entra numerado, porque a ordem que vale e a ordem em que ele
 * *aplicou*, e nao a ordem em que as linhas chegaram ao banco.
 *
 * `idUser` vem nulo quando o comando e de bot: bot nao tem conta, e quem
 * responde pela linha e o host.
 */
export async function logMatchCommand({ idMatch, idUser, command, seq, now }){
    const { now: _ignored, ...rest } = command;
    const { error } = await supabase
        .from('match_commands')
        .insert({
            id_match: idMatch,
            id_user: idUser ?? null,
            command: rest,
            seq,
            applied_now: now
        });
    if(error) throw error;
}

/**
 * O que ainda nao foi aplicado, na ordem em que chegou. Quem le e o host.
 *
 * @returns {Promise<{id: number, idUser: number, command: object}[]>}
 */
export async function getPendingCommands(idMatch){
    const { data, error } = await supabase
        .from('match_commands')
        .select('id, id_user, command')
        .eq('id_match', idMatch)
        .is('seq', null)
        .is('refused', null)
        .order('id', { ascending: true });
    if(error) throw error;
    return (data ?? []).map(row => ({
        id: row.id,
        idUser: row.id_user,
        command: row.command
    }));
}

/**
 * O veredito do host sobre um comando que estava esperando: onde ele entrou na
 * historia e com que relogio, ou por que nao entrou.
 *
 * Substitui o `delete` da 0010. Comando recusado tambem para de esperar - ele
 * ja foi respondido, e deixa-lo pendente o faria ser recusado de novo a cada
 * volta -, mas fica escrito: sem seq, fora do replay, e com o motivo.
 */
export async function markCommandApplied(id, seq, now){
    const { error } = await supabase
        .from('match_commands')
        .update({ seq, applied_now: now })
        .eq('id', id);
    if(error) throw error;
}

export async function markCommandRefused(id, reason){
    const { error } = await supabase
        .from('match_commands')
        .update({ refused: reason })
        .eq('id', id);
    if(error) throw error;
}

/**
 * Sai da partida, seja quem for.
 *
 * Virou RPC na 0014, e o motivo e o host: o clique dele precisa encerrar a
 * sala (`status = 'finished'`, que e o que tira os convidados do lobby pelo
 * realtime) e soltar o assento dele na mesma transacao. Em duas chamadas, a
 * aba fechada no meio deixaria a sala meio cancelada.
 *
 * Saindo o ultimo humano de uma partida que nunca comecou, o trigger
 * `match_players_drop_empty` apaga a sala e os bots dela. Nao ha o que chamar
 * daqui: a sala vazia se apaga.
 */
export async function leaveMatch(idMatch){
    const { error } = await supabase.rpc('leave_match', {
        p_id_match: idMatch
    });
    if(error) throw error;
}

/**
 * Quantos devs estao sentados na mesa. E RPC porque `users.is_dev` do vizinho
 * nao e leitura do cliente: o lobby precisa do numero (2+ libera o cheque de
 * cheats), nao de quem e quem.
 *
 * @returns {Promise<number>}
 */
export async function getMatchDevCount(idMatch){
    const { data, error } = await supabase.rpc('match_dev_count', {
        p_id_match: idMatch
    });
    if(error) throw error;
    return data ?? 0;
}

/**
 * Marca a partida como partida com cheats. Host apenas, so no lobby, e a RPC
 * recusa se nao houver 2+ devs na mesa - a UI esconde o cheque, mas quem
 * autoriza e o banco.
 */
export async function setMatchCheats(idMatch, on){
    const { error } = await supabase.rpc('set_match_cheats', {
        p_id_match: idMatch,
        p_on: on
    });
    if(error) throw error;
}
