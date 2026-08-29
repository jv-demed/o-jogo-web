-- Partida com cheats: o painel de dev sai do solo e entra na mesa.
--
-- Ate aqui o painel (`domain/match/dev.js`) so existia no solo, e o motivo
-- estava escrito em PENDENCIAS.md: poder de dev muda o estado *por fora* do
-- `apply`, e por fora do `apply` nada e gravado — numa mesa com outra gente, a
-- tela do host andaria para um lado e a dos convidados para outro.
--
-- O que destrava a mesa nao e afrouxar isso, e o log da 0011. Poder de dev
-- passa a ser um comando como qualquer outro: entra em `match_commands` com
-- `seq`, `applied_now` e autor, o host o aplica com `applyDev` em vez de
-- `apply`, e o replay o refaz. A cirurgia deixa de ser silenciosa e passa a
-- estar escrita na historia da partida, que e a unica forma dela nao ser
-- trapaca.
--
-- Duas travas, as duas no banco, porque gate no bundle nao autoriza nada:
--
--   1. a partida precisa estar marcada `cheats`, e so o host marca — e so
--      quando ha **dois ou mais devs** na mesa. Um dev sozinho com poder de
--      cirurgia sobre a mesa dos outros e exatamente o que nao se quer; a
--      partir de dois, os poderes sao publicos entre pares que sabem o que
--      estao testando.
--   2. o comando `dev.*` so entra na fila se a partida tem cheats e o autor e
--      dev. Um convidado que forjasse o JSON esbarra no trigger, nao na UI.

alter table o_jogo.matches
    add column if not exists cheats boolean not null default false;

comment on column o_jogo.matches.cheats is
    'Libera os comandos dev.* nesta partida. So o host marca, e so com 2+ devs na mesa.';

-- ------------------------------------------------------- 1. quantos devs

create or replace function o_jogo.match_dev_count(p_id_match bigint)
returns integer
language sql
stable
security definer
set search_path = o_jogo, pg_catalog
as $$
    select count(*)::integer
    from o_jogo.match_players mp
    join o_jogo.users u on u.id = mp.id_user
    where mp.id_match = p_id_match
      and u.is_dev;
$$;

comment on function o_jogo.match_dev_count(bigint) is
    'Quantos devs estao sentados na mesa. SECURITY DEFINER: is_dev do vizinho nao e leitura do cliente.';

-- --------------------------------------------------------- 2. ligar/desligar

create or replace function o_jogo.set_match_cheats(p_id_match bigint, p_on boolean)
returns boolean
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
begin
    -- Host, e so no lobby: partida em andamento nao vira partida com cheats no
    -- meio, senao a metade ja jogada teria sido jogada com outra regra.
    perform o_jogo.require_match_host(p_id_match);

    if p_on and o_jogo.match_dev_count(p_id_match) < 2 then
        raise exception 'Cheats exigem ao menos 2 devs na mesa.' using errcode = '42501';
    end if;

    update o_jogo.matches set cheats = p_on where id = p_id_match;
    return p_on;
end;
$fn$;

comment on function o_jogo.set_match_cheats(bigint, boolean) is
    'Marca a partida como partida com cheats. Host apenas, so no lobby, so com 2+ devs.';

-- ------------------------------------------------ 3. quem pode mandar dev.*

create or replace function o_jogo.check_dev_command()
returns trigger
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
begin
    if new.command->>'type' not like 'dev.%' then
        return new;
    end if;

    if not exists (
        select 1 from o_jogo.matches
        where id = new.id_match and cheats
    ) then
        raise exception 'Esta partida nao aceita cheats.' using errcode = '42501';
    end if;

    -- `id_user` e nulo quando o host escreve o comando de um bot. Bot nao faz
    -- cirurgia: se a linha nao tem autor, ela nao pode ser dev.
    if new.id_user is null or not exists (
        select 1 from o_jogo.users where id = new.id_user and is_dev
    ) then
        raise exception 'Poder de dev e so para dev.' using errcode = '42501';
    end if;

    return new;
end;
$fn$;

comment on function o_jogo.check_dev_command() is
    'Recusa comando dev.* fora de partida com cheats, ou de quem nao e dev. A UI esconde; aqui e que fecha.';

drop trigger if exists match_commands_check_dev on o_jogo.match_commands;
create trigger match_commands_check_dev
    before insert on o_jogo.match_commands
    for each row execute function o_jogo.check_dev_command();

-- ----------------------------------------------------------------- grants

revoke all on function o_jogo.match_dev_count(bigint)              from public;
revoke all on function o_jogo.set_match_cheats(bigint, boolean)    from public;
revoke all on function o_jogo.check_dev_command()                  from public;

grant execute on function o_jogo.match_dev_count(bigint)           to authenticated;
grant execute on function o_jogo.set_match_cheats(bigint, boolean) to authenticated;
