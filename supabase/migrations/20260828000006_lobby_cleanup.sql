-- Sala vazia nao fica no banco.
--
-- Criar partida e um toque, e desistir dela tambem: o lobby que ninguem
-- preencheu ficava la para sempre, com os assentos de bot junto, porque sair
-- so apagava a *sua* linha e cancelar so escrevia `status = 'finished'`. Nada
-- disso e historia: partida que nao comecou nao tem log, nao tem
-- `initial_state` e nao reproduz nada — e um registro que existe so porque
-- ninguem o apagou.
--
-- A regra, em uma frase: **saiu o ultimo humano de uma partida que nunca
-- comecou, a partida vai embora** — e os bots dela junto, que sozinhos nao sao
-- mesa nenhuma.
--
-- O que essa mesma regra *nao* apaga, de proposito: partida que chegou a ser
-- montada. `initial_state is null` e exatamente o "nunca comecou", e e o que
-- protege o replay da 0011 — o log de uma partida jogada continua valendo
-- depois que todo mundo foi embora da tela.

-- --------------------------------------------------------- 1. sair de vez
--
-- Sair era DELETE direto do cliente, coberto pela policy
-- match_players_leave_self. Vira RPC por causa do host: o clique dele precisa
-- avisar a mesa (`status = 'finished'`, que e o que tira os convidados do
-- lobby pelo realtime) e soltar o assento dele na mesma transacao. Em duas
-- chamadas, a aba fechada no meio deixaria a sala meio cancelada.

create or replace function o_jogo.leave_match(p_id_match bigint)
returns void
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
declare
    v_id_user bigint;
    v_status  o_jogo.match_status;
begin
    v_id_user := o_jogo.require_player();
    v_status  := o_jogo.lock_match(p_id_match);

    -- Da partida em andamento ninguem "sai": fechar a aba nao devolve o shot
    -- que a carta mandou beber, e o assento continua na mesa.
    if v_status = 'progress' then
        raise exception 'A partida ja comecou.' using errcode = '22023';
    end if;

    if v_status = 'lobby' and o_jogo.is_match_host(p_id_match) then
        update o_jogo.matches set status = 'finished' where id = p_id_match;
    end if;

    delete from o_jogo.match_players
    where id_match = p_id_match and id_user = v_id_user;
end;
$fn$;

comment on function o_jogo.leave_match(bigint) is
    'Solta o assento do jogador. Sendo ele o host, encerra a sala antes - e o que tira os convidados de la.';

-- ------------------------------------------------------ 2. a sala se apaga

create or replace function o_jogo.drop_empty_match()
returns trigger
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
begin
    -- O delete dos bots, logo abaixo, dispara este mesmo trigger. Sem esta
    -- linha ele se chamaria uma vez por bot, cada uma tentando apagar a
    -- partida que a primeira ja apagou.
    if pg_trigger_depth() > 1 then
        return old;
    end if;

    if exists (
        select 1 from o_jogo.match_players
        where id_match = old.id_match and id_user is not null
    ) then
        return old;
    end if;

    -- Bot nao segura sala. Apagados a mao, e nao por cascade, porque o cascade
    -- de `match_players -> matches` nao esta declarado no schema e depender de
    -- ordem de FK aqui seria depender de algo que nao esta escrito.
    delete from o_jogo.match_players
    where id_match = old.id_match
      and exists (
          select 1 from o_jogo.matches
          where id = old.id_match
            and initial_state is null
            and status <> 'progress'
      );

    delete from o_jogo.matches
    where id = old.id_match
      and initial_state is null
      and status <> 'progress';

    return old;
end;
$fn$;

comment on function o_jogo.drop_empty_match() is
    'Apaga a partida que nunca comecou quando sai dela o ultimo humano. Partida montada fica: o log dela reproduz a partida.';

drop trigger if exists match_players_drop_empty on o_jogo.match_players;
create trigger match_players_drop_empty
    after delete on o_jogo.match_players
    for each row execute function o_jogo.drop_empty_match();

-- ----------------------------------------------------------------- grants

revoke all on function o_jogo.leave_match(bigint)      from public;
revoke all on function o_jogo.drop_empty_match()       from public;

grant execute on function o_jogo.leave_match(bigint)   to authenticated;
