-- A sala aberta que o menu oferece.
--
-- Mora em manual/ porque supabase/migrations/ e ignorado pelo git (as
-- migrations sao rodadas a mao e descartadas). Este arquivo descreve schema,
-- entao precisa sobreviver: e o unico registro versionado do que a tela
-- inicial espera encontrar no banco. Roda no SQL Editor, e rodar duas vezes
-- deixa o mesmo estado que rodar uma.
--
-- Por que RPC: `matches_read_participant` so mostra partida de que o jogador
-- ja participa, entao nao existe `select` do cliente capaz de descobrir a sala
-- de outra pessoa. A funcao e SECURITY DEFINER e devolve o minimo para o
-- convite existir na tela — id, nome e cara do host, quantos ja estao na mesa.
-- Nada de estado, nada de quem sao os outros.
--
-- Uma sala, ou nenhuma. Havendo duas ou mais abertas ao mesmo tempo, a funcao
-- devolve vazio de proposito: escolher por conta propria mandaria gente para a
-- mesa errada, e quem tem duas salas no ar tem o link para desempatar. E a
-- mesma decisao do convite: entrar as cegas so vale quando nao ha duvida.

create or replace function o_jogo.open_lobby()
returns table(
    id_match   bigint,
    host_name  text,
    host_avatar text,
    seat_count int
)
language plpgsql
security definer
set search_path = o_jogo, public
as $$
declare
    v_player o_jogo.users.id%type;
begin
    -- A instancia do Supabase e compartilhada com outros projetinhos: estar
    -- logado nao basta, e preciso ter jogador em O Jogo.
    select u.id into v_player
    from o_jogo.users u
    where u.id_auth = auth.uid();

    if v_player is null then
        return;
    end if;

    return query
    with abertas as (
        select m.id,
               m.id_host,
               (select count(*)
                from o_jogo.match_players p
                where p.id_match = m.id) as n_seats
        from o_jogo.matches m
        where m.status not in ('progress', 'finished')
          -- Partida montada nunca mais e lobby (migration 0014 usa o mesmo
          -- corte para decidir o que pode ser apagado).
          and m.initial_state is null
          -- Sala sem nenhum humano e restinho de faxina, nao convite.
          and exists (
              select 1
              from o_jogo.match_players p
              where p.id_match = m.id
                and p.id_user is not null
          )
          -- O id carrega o relogio de quando a sala nasceu (migration 0012:
          -- AAMMDDHHMM + dois digitos, em Sao Paulo). Sala velha e quase
          -- sempre aba fechada sem soltar assento, e oferecer isso ao menu
          -- seria mandar a pessoa esperar por um host que ja foi embora. As
          -- partidas antigas, de quando o id vinha de sequence, tem menos
          -- digitos e caem fora por aqui.
          and length(m.id::text) = 12
          and (to_timestamp(left(m.id::text, 10), 'YYMMDDHH24MI')::timestamp
               at time zone 'America/Sao_Paulo') > now() - interval '2 hours'
    ),
    convidaveis as (
        -- Mesa cheia nao e convite: `join_match` recusaria, e o menu teria
        -- oferecido uma porta fechada. Sao 7 missoes, 7 assentos.
        select * from abertas where n_seats < 7
    )
    select c.id,
           u.name,
           u.avatar,
           c.n_seats::int
    from convidaveis c
    join o_jogo.users u on u.id = c.id_host
    -- Duas salas no ar, nenhuma resposta.
    where (select count(*) from convidaveis) = 1;
end;
$$;

revoke all on function o_jogo.open_lobby() from public;
grant execute on function o_jogo.open_lobby() to authenticated;
