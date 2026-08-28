-- A fila de comandos vira o log da partida.
--
-- Na 0010 `match_commands` era caixa de correio: o convidado deixava o recado,
-- o host consumia e apagava. Guardava nada — banco de dados fazendo papel de
-- fila, e ainda por cima uma fila que so existe porque o convidado nao pode
-- escrever `matches.state`.
--
-- Aqui ela para de ser apagada e passa a ser o registro do que aconteceu na
-- mesa, com autor e ordem. O que isso destrava vem de uma propriedade que o
-- projeto ja tinha de graca: `apply` e puro e a aleatoriedade e semeada
-- (domain/match/rng.js), entao **estado inicial + lista de comandos reproduz a
-- partida inteira**. Replay do bug com o estado exato, auditoria de em quem a
-- carta bateu, e o convidado podendo reconferir o que o host afirmou em vez de
-- so acreditar. Antes disso, o estado que causou um bug ja tinha sido
-- sobrescrito quando alguem foi olhar.
--
-- A verdade da partida passa a ser `matches.initial_state` + o log. O
-- `matches.state` continua gravado, mas muda de papel: vira cache, para o
-- convidado nao ter que refazer 400 comandos a cada mudanca e para quem chega
-- atrasado (ou recarrega a pagina) comecar na hora.
--
-- O nome fica: a linha guarda literalmente um `command` de
-- domain/match/engine.js — `{ type, playerId, idCard, value, now }` —, e e
-- `apply(state, command)` que a consome. `match_log` seria pior: `state.log` ja
-- existe e e outra coisa (a narracao da mesa, para leitura humana).

-- ---------------------------------------------------- 1. ordem e relogio

alter table o_jogo.match_commands
    add column if not exists seq         integer,
    add column if not exists applied_now bigint,
    add column if not exists refused     text;

comment on column o_jogo.match_commands.seq is
    'Ordem em que o comando foi aplicado, contada por partida. Nulo = ainda nao aplicado.';
comment on column o_jogo.match_commands.applied_now is
    'O relogio que quem aplicou carimbou no comando. Sem ele o replay nao reproduz a janela.';
comment on column o_jogo.match_commands.refused is
    'Por que o motor recusou. Comando recusado nao aconteceu: fica sem seq, e fora do replay.';

-- Quem numera e o host, com o proprio contador — a ordem que vale e a ordem em
-- que ele *aplicou*, e nao a ordem em que as linhas chegaram ao banco. O unique
-- e o que impede duas linhas reivindicarem o mesmo lugar na historia.
create unique index if not exists match_commands_seq
    on o_jogo.match_commands (id_match, seq)
    where seq is not null;

-- O comando do host e o do bot entram por ele. Bot nao tem conta, entao a linha
-- fica sem dono: quem responde por ela e o host, e e isso que a policy de
-- insert abaixo diz.
alter table o_jogo.match_commands alter column id_user drop not null;

-- ------------------------------------------------------------ 2. o estado
--
-- O ponto de partida do replay. Nao da para deduzi-lo do `state` gravado: o
-- `createMatch` devolve a semente *ja adiantada* pelo proprio setup, entao a
-- semente original nao volta de la. Guardar o estado montado resolve isso sem
-- depender de o catalogo ser o mesmo daqui a um mes.

alter table o_jogo.matches
    add column if not exists initial_state jsonb;

comment on column o_jogo.matches.initial_state is
    'A mesa recem-montada, antes do primeiro comando. Com o log, reproduz a partida inteira.';
comment on column o_jogo.matches.state_version is
    'O `seq` do ultimo comando embutido em `state`. 0 = a mesa recem-montada.';

-- ------------------------------------------------------------- 3. policies
--
-- O que muda: ninguem apaga mais, e o host ganha o direito de numerar.

drop policy if exists match_commands_host_consumes on o_jogo.match_commands;

-- Consumir deixa de ser apagar e passa a ser *marcar*. O host so pode mexer nas
-- tres colunas do veredito (o grant abaixo e por coluna, que e o unico jeito de
-- dizer isso — RLS nao fala de coluna): ele nao reescreve o comando que a
-- pessoa mandou, so registra em que ordem ele entrou, com que relogio, ou por
-- que nao entrou.
drop policy if exists match_commands_host_applies on o_jogo.match_commands;
create policy match_commands_host_applies on o_jogo.match_commands
    for update to authenticated
    using      (o_jogo.is_match_host(id_match))
    with check (o_jogo.is_match_host(id_match));

-- Insert: cada um manda o seu, sem numero; o host manda os aplicados, ja
-- numerados (os dele proprio e os dos bots). Exigir `seq is null` de quem nao e
-- host e o que impede um convidado forjar a posicao dele na historia.
drop policy if exists match_commands_push_self on o_jogo.match_commands;
create policy match_commands_push_self on o_jogo.match_commands
    for insert to authenticated
    with check (
        o_jogo.plays_in_match(id_match)
        and (
            (seq is null and refused is null
                and id_user = o_jogo.current_player_id())
            or (seq is not null and o_jogo.is_match_host(id_match))
        )
    );

revoke delete on o_jogo.match_commands from authenticated;
grant update (seq, applied_now, refused) on o_jogo.match_commands to authenticated;

-- ------------------------------------------------- 4. o estado nao se adianta
--
-- Invariante que o banco passa a impor: `state` corresponde a um prefixo do
-- log. Sem isto, uma gravacao de estado que desse certo enquanto o insert do
-- comando falhou deixaria um buraco — o estado teria andado por um comando que
-- nao esta escrito em lugar nenhum, e o replay divergiria em silencio. Que e
-- exatamente o tipo de erro que so aparece meses depois, quando alguem tenta
-- reproduzir uma partida.

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

    if p_version > 0 and not exists (
        select 1 from o_jogo.match_commands
        where id_match = p_id_match and seq = p_version
    ) then
        raise exception 'O estado aponta para o comando % , que nao esta no log.', p_version
            using errcode = '22023';
    end if;

    select state_version into v_current from o_jogo.matches where id = p_id_match;

    -- Gravacao mais velha que a gravada perde. Nao e erro: e uma corrida
    -- perdida, e a rede nao promete ordem.
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
    'Grava o estado. Host apenas, versao mais nova que a gravada, e so ate um comando que existe no log.';

-- ------------------------------------------------- 5. a mesa recem-montada
--
-- Separada do save porque so acontece uma vez e porque grava a coluna que
-- nenhuma outra escrita pode tocar depois: reescrever o `initial_state` de uma
-- partida em andamento invalidaria o log inteiro de uma vez.

create or replace function o_jogo.seed_match_state(p_id_match bigint, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
declare
    v_status o_jogo.match_status;
begin
    perform o_jogo.require_player();
    v_status := o_jogo.lock_match(p_id_match);

    if not o_jogo.is_match_host(p_id_match) then
        raise exception 'Apenas o host monta a mesa.' using errcode = '42501';
    end if;
    if v_status <> 'progress' then
        raise exception 'A partida nao esta em andamento.' using errcode = '22023';
    end if;
    if p_state is null then
        raise exception 'Estado vazio.' using errcode = '22023';
    end if;

    -- Idempotente: dois clientes do host abrindo a mesa junto nao remontam a
    -- partida por baixo de quem ja esta nela.
    update o_jogo.matches
    set initial_state = p_state, state = p_state, state_version = 0
    where id = p_id_match
      and initial_state is null;
end;
$fn$;

comment on function o_jogo.seed_match_state(bigint, jsonb) is
    'Grava a mesa montada, uma vez so. Host apenas; nao reescreve mesa ja montada.';

-- ----------------------------------------------------------------- grants

revoke all on function o_jogo.seed_match_state(bigint, jsonb) from public;
grant execute on function o_jogo.seed_match_state(bigint, jsonb) to authenticated;
