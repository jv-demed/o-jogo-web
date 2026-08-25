-- RPCs de partida, para a reescrita do lobby.
--
-- Substituem actions/controls/matchActions.js, que criava a partida no
-- browser com generateId() - o ultimo id de um select SEM order by, mais um.
-- Nao deterministico e colidindo sob concorrencia.
--
-- Por que RPC e nao insert direto do cliente: sob RLS o jogador nao enxerga
-- match_players de uma partida em que ainda nao esta (match_players_read_
-- participant), entao ele nao tem como calcular a propria position ao entrar.
-- E mesmo que tivesse, dois jogadores entrando junto colidiriam no
-- unique (id_match, position). Quem serializa isso e o `for update` na linha
-- da partida, aqui dentro.
--
-- Mesmo desenho da 0004: SECURITY DEFINER, search_path fixo, jogador sempre
-- derivado do JWT e nunca aceito por parametro.

-- Repetido em toda RPC daqui; extrair vale a pena.
create or replace function o_jogo.require_player()
returns bigint
language plpgsql
stable
security definer
set search_path = o_jogo, pg_catalog
as $fn$
declare
    v_id_user bigint;
begin
    v_id_user := o_jogo.current_player_id();
    if v_id_user is null then
        raise exception 'Esta conta nao tem perfil de jogador em O Jogo.'
            using errcode = '42501';
    end if;
    return v_id_user;
end;
$fn$;

-- Trava a partida e devolve o status. Erra se nao existe.
create or replace function o_jogo.lock_match(p_id_match bigint)
returns o_jogo.match_status
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
declare
    v_status o_jogo.match_status;
begin
    select status into v_status
    from o_jogo.matches where id = p_id_match
    for update;

    if not found then
        raise exception 'Partida % nao existe.', p_id_match using errcode = '22023';
    end if;
    return v_status;
end;
$fn$;

-- ----------------------------------------------------------------- criar
--
-- Idempotente de proposito: dois toques no botao Jogar devolvem a mesma
-- partida em vez de abrir dois lobbies orfaos.

create or replace function o_jogo.create_match()
returns bigint
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
declare
    v_id_user  bigint;
    v_id_match bigint;
begin
    v_id_user := o_jogo.require_player();

    select m.id into v_id_match
    from o_jogo.matches m
    join o_jogo.match_players mp on mp.id_match = m.id
    where mp.id_user = v_id_user
      and m.status = 'lobby'
    order by m.created_at desc
    limit 1;

    if found then
        return v_id_match;
    end if;

    insert into o_jogo.matches (id_host)
    values (v_id_user)
    returning id into v_id_match;

    insert into o_jogo.match_players (id_match, id_user, position)
    values (v_id_match, v_id_user, 0);

    return v_id_match;
end;
$fn$;

comment on function o_jogo.create_match() is
    'Cria a partida com o jogador atual como host na posicao 0, ou devolve a que ele ja tem aberta.';

-- ---------------------------------------------------------------- entrar

create or replace function o_jogo.join_match(p_id_match bigint)
returns smallint
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
declare
    v_id_user  bigint;
    v_status   o_jogo.match_status;
    v_position smallint;
begin
    v_id_user := o_jogo.require_player();
    v_status  := o_jogo.lock_match(p_id_match);

    -- Reentrar na propria partida e no-op: o lobby chama join ao montar,
    -- entao um F5 nao pode virar erro nem linha duplicada.
    select position into v_position
    from o_jogo.match_players
    where id_match = p_id_match and id_user = v_id_user;

    if found then
        return v_position;
    end if;

    if v_status <> 'lobby' then
        raise exception 'A partida % nao aceita mais jogadores.', p_id_match
            using errcode = '22023';
    end if;

    select coalesce(max(position) + 1, 0) into v_position
    from o_jogo.match_players
    where id_match = p_id_match;

    insert into o_jogo.match_players (id_match, id_user, position)
    values (p_id_match, v_id_user, v_position);

    return v_position;
end;
$fn$;

comment on function o_jogo.join_match(bigint) is
    'Entra na partida na proxima posicao livre. Reentrar devolve a posicao atual.';

-- ------------------------------------------------------------- reordenar
--
-- A ordem das posicoes e a ordem dos turnos, e o host arruma antes de comecar.
-- O cliente nao pode fazer isso sozinho: match_players nao tem policy nem
-- grant de UPDATE, justamente para a ordem nao ser editavel do browser.

create or replace function o_jogo.reorder_match_players(p_id_match bigint, p_ids bigint[])
returns void
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
declare
    v_id_user bigint;
    v_status  o_jogo.match_status;
    v_host    bigint;
    v_total   integer;
begin
    v_id_user := o_jogo.require_player();
    v_status  := o_jogo.lock_match(p_id_match);

    select id_host into v_host from o_jogo.matches where id = p_id_match;
    if v_host <> v_id_user then
        raise exception 'Apenas o host reordena os jogadores.' using errcode = '42501';
    end if;

    if v_status <> 'lobby' then
        raise exception 'A partida ja comecou.' using errcode = '22023';
    end if;

    -- p_ids precisa ser uma permutacao exata de quem esta na partida: nem
    -- deixar alguem de fora (ficaria sem position), nem incluir estranho.
    select count(*) into v_total
    from o_jogo.match_players where id_match = p_id_match;

    if v_total <> coalesce(array_length(p_ids, 1), 0)
       or (select count(distinct u.id) from unnest(p_ids) u(id)) <> v_total
       or exists (
           select 1 from unnest(p_ids) u(id)
           where not exists (
               select 1 from o_jogo.match_players
               where id_match = p_id_match and id_user = u.id
           )
       )
    then
        raise exception 'A ordem enviada nao corresponde aos jogadores da partida.'
            using errcode = '22023';
    end if;

    -- Duas passadas: unique (id_match, position) e checado linha a linha, e
    -- nao no fim do comando, entao trocar dois jogadores de lugar numa
    -- passada so colide. As posicoes negativas sao o estacionamento.
    update o_jogo.match_players mp
    set position = (-1 - u.ord)::smallint
    from unnest(p_ids) with ordinality u(id, ord)
    where mp.id_match = p_id_match and mp.id_user = u.id;

    update o_jogo.match_players mp
    set position = (u.ord - 1)::smallint
    from unnest(p_ids) with ordinality u(id, ord)
    where mp.id_match = p_id_match and mp.id_user = u.id;
end;
$fn$;

comment on function o_jogo.reorder_match_players(bigint, bigint[]) is
    'Reescreve as posicoes na ordem recebida. Host apenas, e so no lobby.';

-- --------------------------------------------------------------- comecar

create or replace function o_jogo.start_match(p_id_match bigint)
returns void
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
declare
    v_id_user bigint;
    v_status  o_jogo.match_status;
    v_host    bigint;
    v_total   integer;
begin
    v_id_user := o_jogo.require_player();
    v_status  := o_jogo.lock_match(p_id_match);

    select id_host into v_host from o_jogo.matches where id = p_id_match;
    if v_host <> v_id_user then
        raise exception 'Apenas o host comeca a partida.' using errcode = '42501';
    end if;

    if v_status <> 'lobby' then
        raise exception 'A partida ja comecou.' using errcode = '22023';
    end if;

    select count(*) into v_total
    from o_jogo.match_players where id_match = p_id_match;

    if v_total < 2 then
        raise exception 'Sao necessarios ao menos 2 jogadores.' using errcode = '22023';
    end if;

    update o_jogo.matches set status = 'progress' where id = p_id_match;
end;
$fn$;

comment on function o_jogo.start_match(bigint) is
    'Muda o status para progress. Host apenas, minimo de 2 jogadores.';

-- ----------------------------------------------------------------- grants

revoke all on function o_jogo.require_player()                        from public;
revoke all on function o_jogo.lock_match(bigint)                      from public;
revoke all on function o_jogo.create_match()                          from public;
revoke all on function o_jogo.join_match(bigint)                      from public;
revoke all on function o_jogo.reorder_match_players(bigint, bigint[])  from public;
revoke all on function o_jogo.start_match(bigint)                     from public;

-- require_player e lock_match sao internas: nao vao para authenticated.
grant execute on function o_jogo.create_match()                         to authenticated;
grant execute on function o_jogo.join_match(bigint)                     to authenticated;
grant execute on function o_jogo.reorder_match_players(bigint, bigint[]) to authenticated;
grant execute on function o_jogo.start_match(bigint)                    to authenticated;

-- --------------------------------------------------------------- realtime
--
-- Sem isto o lobby nao recebe evento nenhum: a publication e opt-in por
-- tabela. Nao existe `add table if not exists`, dai o bloco.
do $pub$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'o_jogo' and tablename = 'matches'
    ) then
        alter publication supabase_realtime add table o_jogo.matches;
    end if;

    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'o_jogo' and tablename = 'match_players'
    ) then
        alter publication supabase_realtime add table o_jogo.match_players;
    end if;
end
$pub$;

-- Sem replica identity full o evento de DELETE carrega so a PK, e o lobby
-- nao consegue nem dizer quem saiu.
--
-- Pegadinha conhecida do Realtime: RLS filtra INSERT e UPDATE, mas nao
-- DELETE - esse evento vai para todo mundo inscrito no canal. O que vaza
-- aqui e (id_match, id_user, position), nada sensivel.
alter table o_jogo.match_players replica identity full;
