-- Row Level Security.
--
-- Premissa que muda tudo: o auth.users desta instancia e compartilhado
-- entre varios projetinhos. Ter JWT valido NAO significa ser jogador.
-- Por isso nenhuma policy aqui usa `auth.uid() is not null` como criterio;
-- todas exigem uma linha correspondente em o_jogo.users.
--
-- Regra geral: o cliente LE o que e dele e nunca ESCREVE em coins nem na
-- colecao. Toda mutacao de economia passa pelas RPCs da migration seguinte.

-- Resolve o id do jogador a partir do JWT. stable: mesmo resultado dentro
-- da query, entao o planner pode cachear em vez de reexecutar por linha.
create or replace function o_jogo.current_player_id()
returns bigint
language sql
stable
security definer
set search_path = o_jogo, pg_catalog
as $$
    select id from o_jogo.users where id_auth = auth.uid();
$$;

alter table o_jogo.packs         enable row level security;
alter table o_jogo.cards         enable row level security;
alter table o_jogo.users         enable row level security;
alter table o_jogo.user_cards    enable row level security;
alter table o_jogo.decks         enable row level security;
alter table o_jogo.deck_cards    enable row level security;
alter table o_jogo.matches       enable row level security;
alter table o_jogo.match_players enable row level security;

-- --------------------------------------------------------------- catalogo
-- Publico para jogadores, e somente leitura. O catalogo muda por migration.

create policy catalog_read_packs on o_jogo.packs
    for select to authenticated
    using (o_jogo.current_player_id() is not null);

create policy catalog_read_cards on o_jogo.cards
    for select to authenticated
    using (o_jogo.current_player_id() is not null);

-- --------------------------------------------------------------- jogadores

-- O jogador le o proprio perfil.
create policy users_read_self on o_jogo.users
    for select to authenticated
    using (id = o_jogo.current_player_id());

-- E le o nome dos adversarios das partidas de que participa - senao o
-- lobby nao consegue montar a lista de jogadores.
create policy users_read_opponents on o_jogo.users
    for select to authenticated
    using (exists (
        select 1
        from o_jogo.match_players meu
        join o_jogo.match_players dele using (id_match)
        where meu.id_user = o_jogo.current_player_id()
          and dele.id_user = o_jogo.users.id
    ));

-- Nao ha policy de INSERT (perfis sao criados manualmente pelo dono),
-- de DELETE, nem de UPDATE: coins e a colecao so mudam via RPC.

create policy user_cards_read_self on o_jogo.user_cards
    for select to authenticated
    using (id_user = o_jogo.current_player_id());

-- Idem: sem INSERT/UPDATE/DELETE pelo cliente.

-- ------------------------------------------------------------------- decks
-- Aqui o cliente escreve mesmo: deck nao vale dinheiro, e o dono e o unico
-- afetado. O unico invariante e nao montar deck com carta que nao possui,
-- garantido pelo trigger abaixo.

create policy decks_own on o_jogo.decks
    for all to authenticated
    using      (id_user = o_jogo.current_player_id())
    with check (id_user = o_jogo.current_player_id());

create policy deck_cards_own on o_jogo.deck_cards
    for all to authenticated
    using (exists (
        select 1 from o_jogo.decks d
        where d.id = deck_cards.id_deck
          and d.id_user = o_jogo.current_player_id()
    ))
    with check (exists (
        select 1 from o_jogo.decks d
        where d.id = deck_cards.id_deck
          and d.id_user = o_jogo.current_player_id()
    ));

-- Impede montar deck com carta que o jogador nao tem, ou em quantidade
-- maior que a colecao. RLS sozinha nao expressa isso.
create or replace function o_jogo.check_deck_card_owned()
returns trigger
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $$
declare
    dono   bigint;
    possui integer;
begin
    select id_user into dono from o_jogo.decks where id = new.id_deck;

    select coalesce(quantity, 0) into possui
    from o_jogo.user_cards
    where id_user = dono and id_card = new.id_card;

    if coalesce(possui, 0) < new.quantity then
        raise exception
            'Carta % nao esta na colecao do jogador % na quantidade pedida (tem %, pediu %)',
            new.id_card, dono, coalesce(possui, 0), new.quantity;
    end if;

    return new;
end;
$$;

create trigger deck_cards_owned
    before insert or update on o_jogo.deck_cards
    for each row execute function o_jogo.check_deck_card_owned();

-- ---------------------------------------------------------------- partidas

create policy matches_read_participant on o_jogo.matches
    for select to authenticated
    using (exists (
        select 1 from o_jogo.match_players mp
        where mp.id_match = matches.id
          and mp.id_user = o_jogo.current_player_id()
    ));

create policy matches_host_creates on o_jogo.matches
    for insert to authenticated
    with check (id_host = o_jogo.current_player_id());

create policy matches_host_updates on o_jogo.matches
    for update to authenticated
    using      (id_host = o_jogo.current_player_id())
    with check (id_host = o_jogo.current_player_id());

create policy match_players_read_participant on o_jogo.match_players
    for select to authenticated
    using (exists (
        select 1 from o_jogo.match_players meu
        where meu.id_match = match_players.id_match
          and meu.id_user = o_jogo.current_player_id()
    ));

-- O jogador entra e sai por conta propria; o host nao arrasta ninguem.
create policy match_players_join_self on o_jogo.match_players
    for insert to authenticated
    with check (id_user = o_jogo.current_player_id());

create policy match_players_leave_self on o_jogo.match_players
    for delete to authenticated
    using (id_user = o_jogo.current_player_id());
