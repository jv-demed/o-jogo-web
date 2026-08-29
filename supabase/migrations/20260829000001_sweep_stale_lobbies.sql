-- A faxina das salas encalhadas.
--
-- O trigger da 0014 apaga a sala quando alguem *sai* dela, e por isso nao
-- cobre quem simplesmente some: aba fechada, celular que dormiu, F5 no meio.
-- O assento fica ocupado por uma pessoa que nao esta mais la, a sala nao
-- esvazia, e o trigger nunca chega a ser chamado. Isto aqui e o outro lado
-- dessa moeda: um lobby que nunca comecou e esta parado ha horas esta morto,
-- tenha assento ocupado ou nao.
--
-- Continua valendo o mesmo corte de sempre, e pelo mesmo motivo: so
-- `initial_state is null`. Partida montada tem log, e log reproduz partida.
--
-- **A idade sai do proprio id** (migration 0012), e nao de uma coluna de data:
-- o id ja e o instante em que a sala nasceu, entao nao ha o que manter em
-- sincronia. Id curto e de antes da 0012 — tratado como antigo, que e o que
-- ele e.

create or replace function o_jogo.match_created_at(p_id bigint)
returns timestamptz
language sql
immutable
as $$
    select case
        -- Menos de 12 digitos: id de sequence, de antes de o id vir do
        -- relogio. Nao da para ler data nenhuma dele, e todos sao antigos.
        when p_id < 100000000000 then '-infinity'::timestamptz
        else (to_timestamp(lpad((p_id / 100)::text, 10, '0'), 'YYMMDDHH24MI')::timestamp)
             at time zone 'America/Sao_Paulo'
    end;
$$;

comment on function o_jogo.match_created_at(bigint) is
    'Quando a partida nasceu, lido do proprio id (AAMMDDHHMM + 2 digitos, fuso de Sao Paulo).';

create or replace function o_jogo.sweep_stale_lobbies(p_older_than interval default '6 hours')
returns integer
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $fn$
declare
    v_ids bigint[];
begin
    select array_agg(m.id) into v_ids
    from o_jogo.matches m
    where m.initial_state is null
      and m.status <> 'progress'
      and o_jogo.match_created_at(m.id) < now() - p_older_than;

    if v_ids is null then
        return 0;
    end if;

    -- Os assentos primeiro: a FK de match_players para matches nao declara
    -- cascade. Isto dispara o trigger da 0014, que pode apagar a partida antes
    -- da linha de baixo — dai ela ser `delete ... where id = any`, que nao se
    -- importa com quantas ainda estavam la.
    delete from o_jogo.match_players where id_match = any(v_ids);
    delete from o_jogo.matches       where id       = any(v_ids);

    return array_length(v_ids, 1);
end;
$fn$;

comment on function o_jogo.sweep_stale_lobbies(interval) is
    'Apaga lobbies que nunca comecaram e estao parados ha mais que o intervalo. Manutencao: nao vai para authenticated.';

-- Sem grant para `authenticated`, de proposito: isto e faxina, nao acao de
-- jogador. Quem chama e o pg_cron (como postgres) ou voce, no SQL Editor.
revoke all on function o_jogo.match_created_at(bigint)     from public;
revoke all on function o_jogo.sweep_stale_lobbies(interval) from public;

-- Para agendar, com a extensao pg_cron habilitada em Database -> Extensions:
--
--   select cron.schedule(
--       'o_jogo_sweep_lobbies', '17 * * * *',
--       $$select o_jogo.sweep_stale_lobbies('6 hours')$$
--   );
--
-- Sem pg_cron, chamar a mao de vez em quando resolve o mesmo problema — nada
-- aqui depende de pontualidade.
