-- Assentos de bot na mesa.
--
-- O motor nunca soube o que e um bot: `createMatch({ players })` so quer
-- { id, name, deck }, e `botCommand(state, playerId)` devolve um comando que
-- qualquer jogador poderia ter mandado. O modo solo e o caso particular
-- "1 humano + N bots"; o que faltava era o banco aceitar a mesa mista, para o
-- lobby poder juntar 2+ humanos e completar com bots na hora de testar.
--
-- Nao e modo novo, e um assento sem dono: `match_players.id_user` vira
-- opcional, e o assento sem dono carrega `bot_name`. Tudo que ja existia
-- continua valendo — `plays_in_match`, `shares_match_with` e as policies de
-- entrar/sair filtram por `id_user`, e assento de bot tem `id_user` nulo,
-- entao nenhuma delas casa com bot. Isso e o que se quer: bot nao le partida,
-- nao entra sozinho e nao sai sozinho. Quem o poe e o tira e o host, por RPC.

-- ------------------------------------------------- 1. o assento sem dono
--
-- A PK era (id_match, id_user), o que so descreve mesa de humanos: dois bots
-- na mesma partida seriam duas linhas com id_user nulo, e nulo nao serve de
-- chave. Entra um id proprio de assento, que passa a ser como o cliente se
-- refere a linha (a reordenacao, abaixo, e a primeira a precisar disso).

alter table o_jogo.match_players
    add column if not exists id       bigint generated always as identity,
    add column if not exists bot_name text;

do $mig$
begin
    if exists (
        select 1
        from pg_constraint c
        where c.conrelid = 'o_jogo.match_players'::regclass
          and c.conname  = 'match_players_pkey'
          and c.conkey <> array[(
              select a.attnum
              from pg_attribute a
              where a.attrelid = 'o_jogo.match_players'::regclass
                and a.attname  = 'id'
          )]::smallint[]
    ) then
        alter table o_jogo.match_players drop constraint match_players_pkey;
        alter table o_jogo.match_players add primary key (id);
    end if;
end
$mig$;

alter table o_jogo.match_players alter column id_user drop not null;

-- O que a PK antiga garantia continua verdade: um humano nao ocupa dois
-- assentos na mesma mesa. Indice parcial, e nao unique simples, porque a regra
-- so vale para quem tem dono — a mesa pode ter varios bots.
create unique index if not exists match_players_user_once
    on o_jogo.match_players (id_match, id_user)
    where id_user is not null;

-- Assento e de gente ou de bot, nunca dos dois e nunca de nenhum.
do $mig$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'o_jogo.match_players'::regclass
          and conname  = 'match_players_seat_owner'
    ) then
        alter table o_jogo.match_players
            add constraint match_players_seat_owner check (
                (id_user is not null and bot_name is null)
                or (id_user is null and bot_name is not null
                    and length(btrim(bot_name)) between 1 and 24)
            );
    end if;
end
$mig$;

comment on column o_jogo.match_players.id is
    'Identidade do assento. E por ela que o cliente reordena a mesa, ja que bot nao tem id_user.';
comment on column o_jogo.match_players.bot_name is
    'Nome do bot, quando o assento nao tem dono. Nulo para humano.';

-- ----------------------------------------------------- 2. por e tirar bot
--
-- RPC, e nao insert do cliente, pelo mesmo motivo do join_match: a policy
-- match_players_join_self exige `id_user = current_player_id()`, entao o
-- cliente nao consegue inserir linha que nao seja a dele — nem deveria. E a
-- position, como no join, precisa do `for update` na partida para dois toques
-- rapidos nao colidirem no unique (id_match, position).

-- Teto da mesa: sao 7 missoes, sorteadas sem reposicao, uma por jogador
-- (domain/match/state.js recusa mesa maior). Ate hoje nenhuma RPC checava
-- isso, porque juntar 8 humanos num lobby nao era acidente provavel; com botao
-- de adicionar bot, e um toque a mais.
create or replace function o_jogo.match_seat_count(p_id_match bigint)
returns integer
language sql
stable
security definer
set search_path = o_jogo, pg_catalog
as $$
    select count(*)::integer from o_jogo.match_players where id_match = p_id_match;
$$;

comment on function o_jogo.match_seat_count(bigint) is
    'Quantos assentos a mesa tem, bots inclusos. SECURITY DEFINER para nao reaplicar RLS.';

-- Host, e so no lobby. Repetido nas tres RPCs abaixo.
create or replace function o_jogo.require_match_host(p_id_match bigint)
returns void
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
declare
    v_id_user bigint;
    v_status  o_jogo.match_status;
    v_host    bigint;
begin
    v_id_user := o_jogo.require_player();
    v_status  := o_jogo.lock_match(p_id_match);

    select id_host into v_host from o_jogo.matches where id = p_id_match;
    if v_host <> v_id_user then
        raise exception 'Apenas o host mexe na mesa.' using errcode = '42501';
    end if;
    if v_status <> 'lobby' then
        raise exception 'A partida ja comecou.' using errcode = '22023';
    end if;
end;
$fn$;

create or replace function o_jogo.add_match_bot(p_id_match bigint, p_name text)
returns bigint
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
declare
    v_position smallint;
    v_id_seat  bigint;
begin
    perform o_jogo.require_match_host(p_id_match);

    if p_name is null or length(btrim(p_name)) = 0 then
        raise exception 'O bot precisa de um nome.' using errcode = '22023';
    end if;

    if o_jogo.match_seat_count(p_id_match) >= 7 then
        raise exception 'A mesa comporta no maximo 7 jogadores.' using errcode = '22023';
    end if;

    select coalesce(max(position) + 1, 0) into v_position
    from o_jogo.match_players
    where id_match = p_id_match;

    insert into o_jogo.match_players (id_match, id_user, position, bot_name)
    values (p_id_match, null, v_position, left(btrim(p_name), 24))
    returning id into v_id_seat;

    return v_id_seat;
end;
$fn$;

comment on function o_jogo.add_match_bot(bigint, text) is
    'Poe um bot na proxima posicao livre. Host apenas, so no lobby, mesa de ate 7.';

create or replace function o_jogo.remove_match_bot(p_id_match bigint, p_id_seat bigint)
returns void
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
begin
    perform o_jogo.require_match_host(p_id_match);

    -- `id_user is null` e o que impede esta RPC de virar "host expulsa
    -- jogador": so assento de bot sai por aqui. Humano continua saindo por
    -- conta propria, pela policy match_players_leave_self.
    delete from o_jogo.match_players
    where id       = p_id_seat
      and id_match = p_id_match
      and id_user  is null;

    if not found then
        raise exception 'Assento % nao e um bot desta partida.', p_id_seat
            using errcode = '22023';
    end if;
end;
$fn$;

comment on function o_jogo.remove_match_bot(bigint, bigint) is
    'Tira um bot da mesa. Host apenas, so no lobby, e nunca um humano.';

-- -------------------------------------------------- 3. reordenar por assento
--
-- reorder_match_players recebia ids de usuario, o que deixa de descrever a
-- mesa no instante em que ela tem assento sem dono. A nova recebe ids de
-- assento; o corpo e o mesmo, inclusive as duas passadas com posicoes
-- negativas de estacionamento (o unique (id_match, position) e checado linha a
-- linha, entao trocar dois de lugar numa passada so colide).

create or replace function o_jogo.reorder_match_seats(p_id_match bigint, p_ids bigint[])
returns void
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
declare
    v_total integer;
begin
    perform o_jogo.require_match_host(p_id_match);

    -- p_ids precisa ser uma permutacao exata dos assentos da partida: nem
    -- deixar assento de fora (ficaria sem position), nem incluir estranho.
    v_total := o_jogo.match_seat_count(p_id_match);

    if v_total <> coalesce(array_length(p_ids, 1), 0)
       or (select count(distinct u.id) from unnest(p_ids) u(id)) <> v_total
       or exists (
           select 1 from unnest(p_ids) u(id)
           where not exists (
               select 1 from o_jogo.match_players
               where id_match = p_id_match and id = u.id
           )
       )
    then
        raise exception 'A ordem enviada nao corresponde aos assentos da partida.'
            using errcode = '22023';
    end if;

    update o_jogo.match_players mp
    set position = (-1 - u.ord)::smallint
    from unnest(p_ids) with ordinality u(id, ord)
    where mp.id_match = p_id_match and mp.id = u.id;

    update o_jogo.match_players mp
    set position = (u.ord - 1)::smallint
    from unnest(p_ids) with ordinality u(id, ord)
    where mp.id_match = p_id_match and mp.id = u.id;
end;
$fn$;

comment on function o_jogo.reorder_match_seats(bigint, bigint[]) is
    'Reescreve as posicoes na ordem recebida, por id de assento. Host apenas, e so no lobby.';

drop function if exists o_jogo.reorder_match_players(bigint, bigint[]);

-- ------------------------------------------------- 4. comecar conta os bots
--
-- O minimo de 2 passa a incluir bot: host + 1 bot ja e mesa valida, e e
-- exatamente a mesa que se quer para testar. O maximo entra aqui tambem porque
-- a checagem do add_match_bot nao cobre a mesa que encheu de humanos.

create or replace function o_jogo.start_match(p_id_match bigint)
returns void
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
declare
    v_total integer;
begin
    perform o_jogo.require_match_host(p_id_match);

    v_total := o_jogo.match_seat_count(p_id_match);

    if v_total < 2 then
        raise exception 'Sao necessarios ao menos 2 jogadores.' using errcode = '22023';
    end if;
    if v_total > 7 then
        raise exception 'A mesa comporta no maximo 7 jogadores.' using errcode = '22023';
    end if;

    update o_jogo.matches set status = 'progress' where id = p_id_match;
end;
$fn$;

comment on function o_jogo.start_match(bigint) is
    'Muda o status para progress. Host apenas, mesa de 2 a 7 assentos, bots inclusos.';

-- ----------------------------------------------------------------- grants

revoke all on function o_jogo.match_seat_count(bigint)              from public;
revoke all on function o_jogo.require_match_host(bigint)            from public;
revoke all on function o_jogo.add_match_bot(bigint, text)           from public;
revoke all on function o_jogo.remove_match_bot(bigint, bigint)      from public;
revoke all on function o_jogo.reorder_match_seats(bigint, bigint[]) from public;
revoke all on function o_jogo.start_match(bigint)                   from public;

-- match_seat_count e require_match_host sao internas, como require_player e
-- lock_match: nao vao para authenticated.
grant execute on function o_jogo.add_match_bot(bigint, text)           to authenticated;
grant execute on function o_jogo.remove_match_bot(bigint, bigint)      to authenticated;
grant execute on function o_jogo.reorder_match_seats(bigint, bigint[]) to authenticated;
grant execute on function o_jogo.start_match(bigint)                   to authenticated;
