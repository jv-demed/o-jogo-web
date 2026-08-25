-- Correcoes da auditoria de RLS (PENDENCIAS.md, secao 1).
--
-- A auditoria confirmou o essencial da 0003/0005: coins e user_cards sao
-- select-only para o cliente (nao ha policy nem grant de UPDATE em
-- o_jogo.users), toda mutacao de economia passa por RPC SECURITY DEFINER, e
-- nenhuma policy usa `auth.uid() is not null` - todas exigem linha em
-- o_jogo.users via current_player_id(). Sobraram quatro furos.

-- ------------------------------------------------- 1. entrar em partida alheia
--
-- match_players_join_self so exigia `id_user = current_player_id()`: o jogador
-- podia se inserir em QUALQUER id_match, inclusive uma partida em andamento ou
-- ja encerrada, e escolher a propria position.
--
-- A checagem nao pode ser um `exists (select 1 from o_jogo.matches ...)` dentro
-- do WITH CHECK: matches_read_participant so enxerga partida de que o jogador
-- ja participa, entao a subquery daria falso justamente para quem esta
-- entrando, e ninguem conseguiria entrar. Dai a funcao SECURITY DEFINER.

create or replace function o_jogo.match_is_open(p_id_match bigint)
returns boolean
language sql
stable
security definer
set search_path = o_jogo, pg_catalog
as $$
    select exists (
        select 1
        from o_jogo.matches
        where id = p_id_match
          and status = 'lobby'
    );
$$;

comment on function o_jogo.match_is_open(bigint) is
    'Se a partida existe e ainda aceita jogadores. SECURITY DEFINER para nao reaplicar RLS.';

drop policy if exists match_players_join_self on o_jogo.match_players;
create policy match_players_join_self on o_jogo.match_players
    for insert to authenticated
    with check (
        id_user = o_jogo.current_player_id()
        and o_jogo.match_is_open(id_match)
    );

-- Sair tambem so faz sentido no lobby: abandonar partida em andamento apagando
-- a propria linha bagunca as positions de quem ficou.
drop policy if exists match_players_leave_self on o_jogo.match_players;
create policy match_players_leave_self on o_jogo.match_players
    for delete to authenticated
    using (
        id_user = o_jogo.current_player_id()
        and o_jogo.match_is_open(id_match)
    );

-- ---------------------------------------------- 2. status da partida so avanca
--
-- matches_host_updates deixava o host mandar a partida para qualquer status,
-- inclusive de 'finished' de volta para 'lobby'.

create or replace function o_jogo.check_match_status_flow()
returns trigger
language plpgsql
as $$
begin
    if old.status = new.status then
        return new;
    end if;

    if not (
        (old.status = 'lobby'    and new.status in ('progress', 'finished')) or
        (old.status = 'progress' and new.status = 'finished')
    ) then
        raise exception 'Transicao de status invalida: % -> %', old.status, new.status
            using errcode = '22023';
    end if;

    return new;
end;
$$;

drop trigger if exists matches_status_flow on o_jogo.matches;
create trigger matches_status_flow
    before update on o_jogo.matches
    for each row execute function o_jogo.check_match_status_flow();

-- O host tambem nao troca de dono a partida no meio do caminho.
drop policy if exists matches_host_updates on o_jogo.matches;
create policy matches_host_updates on o_jogo.matches
    for update to authenticated
    using      (id_host = o_jogo.current_player_id())
    with check (id_host = o_jogo.current_player_id());

-- --------------------------------------------------------- 3. o papel anon
--
-- A 0001 deu `grant usage on schema o_jogo to anon`. Hoje isso e inofensivo
-- porque nenhuma tabela ou funcao do schema tem grant para anon - mas numa
-- instancia compartilhada o default e fechar, nao contar com a ausencia de
-- grant. Requisicao sem JWT chega como anon; requisicao logada vira
-- authenticated, entao o app nao perde nada.

revoke all on all tables    in schema o_jogo from anon;
revoke all on all functions in schema o_jogo from anon;
revoke all on all sequences in schema o_jogo from anon;
revoke usage on schema o_jogo from anon;

-- ------------------------------------------- 4. execute default para public
--
-- Toda funcao nasce com EXECUTE para public. A 0004 lembrou de revogar
-- buy_pack e sell_card, mas as funcoes auxiliares ficaram abertas.

revoke all on function o_jogo.current_player_id()        from public;
revoke all on function o_jogo.card_sell_price(smallint)  from public;
revoke all on function o_jogo.match_is_open(bigint)      from public;

grant execute on function o_jogo.current_player_id()       to authenticated;
grant execute on function o_jogo.card_sell_price(smallint) to authenticated;
grant execute on function o_jogo.match_is_open(bigint)     to authenticated;

-- Novas tabelas e sequences nascem sem grant nenhum para anon.
alter default privileges in schema o_jogo revoke all on tables    from anon;
alter default privileges in schema o_jogo revoke all on sequences from anon;
alter default privileges in schema o_jogo revoke all on functions from anon;
