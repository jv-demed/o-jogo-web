-- Corrige recursao infinita nas policies (42P17).
--
-- match_players_read_participant consultava o_jogo.match_players dentro do
-- proprio USING. A subquery e avaliada sob RLS, entao a policy se chamava
-- de novo, indefinidamente.
--
-- Efeito colateral que quebrava o login: users_read_opponents, em
-- o_jogo.users, faz join com match_players. Policies da mesma tabela sao
-- avaliadas em OR, entao TODO select em users - inclusive o do login, que
-- so precisava de users_read_self - entrava na recursao.
--
-- A saida e mover a consulta para funcoes SECURITY DEFINER: elas rodam com
-- privilegio do dono, que nao esta sujeito a RLS, entao a leitura interna
-- nao reaplica a policy.

create or replace function o_jogo.plays_in_match(p_id_match bigint)
returns boolean
language sql
stable
security definer
set search_path = o_jogo, pg_catalog
as $$
    select exists (
        select 1
        from o_jogo.match_players
        where id_match = p_id_match
          and id_user  = o_jogo.current_player_id()
    );
$$;

comment on function o_jogo.plays_in_match(bigint) is
    'Se o jogador atual participa da partida. SECURITY DEFINER para nao reaplicar RLS.';

create or replace function o_jogo.shares_match_with(p_id_user bigint)
returns boolean
language sql
stable
security definer
set search_path = o_jogo, pg_catalog
as $$
    select exists (
        select 1
        from o_jogo.match_players meu
        join o_jogo.match_players dele using (id_match)
        where meu.id_user  = o_jogo.current_player_id()
          and dele.id_user = p_id_user
    );
$$;

comment on function o_jogo.shares_match_with(bigint) is
    'Se o jogador atual divide alguma partida com p_id_user.';

-- Reescreve as tres policies que consultavam as tabelas diretamente.

drop policy if exists match_players_read_participant on o_jogo.match_players;
create policy match_players_read_participant on o_jogo.match_players
    for select to authenticated
    using (o_jogo.plays_in_match(id_match));

drop policy if exists matches_read_participant on o_jogo.matches;
create policy matches_read_participant on o_jogo.matches
    for select to authenticated
    using (o_jogo.plays_in_match(id));

drop policy if exists users_read_opponents on o_jogo.users;
create policy users_read_opponents on o_jogo.users
    for select to authenticated
    using (o_jogo.shares_match_with(id));

revoke all on function o_jogo.plays_in_match(bigint)     from public;
revoke all on function o_jogo.shares_match_with(bigint)  from public;
grant execute on function o_jogo.plays_in_match(bigint)    to authenticated;
grant execute on function o_jogo.shares_match_with(bigint) to authenticated;
