-- A partida passa a viver no banco.
--
-- O motor e JS e o servidor e Postgres, e essa distancia e o que segurava a
-- partida multijogador (ver PENDENCIAS.md). As duas saidas eram reescrever o
-- motor em plpgsql — duas implementacoes da mesma regra, que e exatamente o
-- que a camada pura foi feita para evitar — ou levar o `apply` para um
-- servidor que fale JS.
--
-- Esta migration escolhe o caminho do meio, e escolhe de proposito: **o host e a
-- autoridade**. O browser do host roda o mesmo `apply` que o solo ja roda,
-- grava o estado inteiro aqui, e os outros leem por realtime e mandam comandos
-- por uma fila. Nao e o desenho final — o host pode fechar a aba e ve a mao de
-- todo mundo — mas e o desenho que poe uma mesa mista de pe hoje, com bancada
-- de teste de verdade, e que sai do caminho limpo quando o servidor
-- autoritativo (Edge Function em Deno, importando domain/match/) existir: o
-- `apply` continua sendo a unica porta, so muda quem a atravessa.

-- ------------------------------------------------------ 1. o estado da mesa

alter table o_jogo.matches
    add column if not exists state         jsonb,
    add column if not exists state_version integer not null default 0;

comment on column o_jogo.matches.state is
    'O estado da partida, como domain/match/ o produz. Escrito so pelo host, via save_match_state.';
comment on column o_jogo.matches.state_version is
    'Contador monotonico. A gravacao mais velha que a gravada perde, em vez de voltar a mesa no tempo.';

-- ------------------------------------------------------- 2. quem e o host
--
-- Mesmo motivo do match_is_open da 0006: um exists() sobre matches dentro de
-- uma policy esbarraria na policy de leitura da propria tabela.
create or replace function o_jogo.is_match_host(p_id_match bigint)
returns boolean
language sql
stable
security definer
set search_path = o_jogo, pg_catalog
as $$
    select exists (
        select 1
        from o_jogo.matches
        where id      = p_id_match
          and id_host = o_jogo.current_player_id()
    );
$$;

comment on function o_jogo.is_match_host(bigint) is
    'Se o jogador atual e o host da partida. SECURITY DEFINER para nao reaplicar RLS.';

-- ------------------------------------------------------- 3. gravar o estado
--
-- E RPC, e nao um update do cliente, por causa do `p_version`: sem ele, duas
-- gravacoes fora de ordem (a rede nao promete ordem) fariam a mesa voltar no
-- tempo, e a mesa voltando no tempo e uma carta jogada duas vezes. O host
-- numera o que manda; aqui, gravacao mais velha que a gravada e descartada em
-- silencio — nao e erro, e uma corrida perdida.

create or replace function o_jogo.save_match_state(
    p_id_match bigint,
    p_state    jsonb,
    p_version  integer
)
returns integer
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
declare
    v_status  o_jogo.match_status;
    v_current integer;
begin
    perform o_jogo.require_player();
    v_status := o_jogo.lock_match(p_id_match);

    if not o_jogo.is_match_host(p_id_match) then
        raise exception 'Apenas o host grava o estado da partida.' using errcode = '42501';
    end if;
    if v_status <> 'progress' then
        raise exception 'A partida nao esta em andamento.' using errcode = '22023';
    end if;
    if p_state is null then
        raise exception 'Estado vazio.' using errcode = '22023';
    end if;

    select state_version into v_current from o_jogo.matches where id = p_id_match;

    if p_version <= v_current then
        return v_current;
    end if;

    update o_jogo.matches
    set state = p_state, state_version = p_version
    where id = p_id_match;

    return p_version;
end;
$fn$;

comment on function o_jogo.save_match_state(bigint, jsonb, integer) is
    'Grava o estado da partida. Host apenas, e so se a versao for mais nova que a gravada.';

-- --------------------------------------------------- 4. a fila de comandos
--
-- Por onde quem nao e host joga. O comando nao e aplicado aqui: quem aplica e
-- o `apply` no browser do host, que le a fila, roda o comando e regrava o
-- estado. A fila existe para o comando nao se perder enquanto o host nao o
-- consome, e para o servidor guardar de quem ele veio.

create table if not exists o_jogo.match_commands (
    id         bigint generated always as identity primary key,
    id_match   bigint not null references o_jogo.matches(id) on delete cascade,
    id_user    bigint not null references o_jogo.users(id),
    command    jsonb  not null,
    created_at timestamptz not null default now()
);

create index if not exists match_commands_queue
    on o_jogo.match_commands (id_match, id);

comment on table o_jogo.match_commands is
    'Comandos de quem nao e host, esperando o host aplica-los. Consumida e apagada por ele.';

alter table o_jogo.match_commands enable row level security;

-- Ler a fila e coisa da mesa: quem participa ve o que foi pedido. E o host que
-- age sobre ela, mas esconder o resto nao protege nada — o estado, que e o que
-- importa, ja e publico para a mesa.
drop policy if exists match_commands_read_participant on o_jogo.match_commands;
create policy match_commands_read_participant on o_jogo.match_commands
    for select to authenticated
    using (o_jogo.plays_in_match(id_match));

-- O jogador so enfileira comando dele, e so em partida de que participa. Que o
-- comando seja *legal* nao se decide aqui: quem decide e o `apply`, do lado do
-- host, que recusa o ilegal e nem por isso deixa de apagar a linha.
drop policy if exists match_commands_push_self on o_jogo.match_commands;
create policy match_commands_push_self on o_jogo.match_commands
    for insert to authenticated
    with check (
        id_user = o_jogo.current_player_id()
        and o_jogo.plays_in_match(id_match)
    );

-- Consumir e apagar, e quem consome e o host.
drop policy if exists match_commands_host_consumes on o_jogo.match_commands;
create policy match_commands_host_consumes on o_jogo.match_commands
    for delete to authenticated
    using (o_jogo.is_match_host(id_match));

grant select, insert, delete on o_jogo.match_commands to authenticated;

-- --------------------------------------------------------------- realtime
--
-- Dois canais para a partida: `matches` (ja publicada na 0007) leva o estado
-- novo para a mesa, e `match_commands` avisa o host de que alguem jogou.
do $pub$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'o_jogo' and tablename = 'match_commands'
    ) then
        alter publication supabase_realtime add table o_jogo.match_commands;
    end if;
end
$pub$;

-- ----------------------------------------------------------------- grants

revoke all on function o_jogo.is_match_host(bigint)                        from public;
revoke all on function o_jogo.save_match_state(bigint, jsonb, integer)     from public;

grant execute on function o_jogo.is_match_host(bigint)                     to authenticated;
grant execute on function o_jogo.save_match_state(bigint, jsonb, integer)  to authenticated;
