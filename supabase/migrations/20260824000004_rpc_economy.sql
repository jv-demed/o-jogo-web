-- Regras de economia no servidor.
--
-- Substituem buyPack/sellCard de presenters/usersPresenter.js, que rodavam
-- no browser com a anon key. Tres problemas de uma vez:
--
--   1. o sorteio do pack acontecia no navegador (Math.random no cliente),
--      entao o jogador escolhia as cartas que quisesse;
--   2. o saldo era conferido so no cliente;
--   3. o update mandava o objeto inteiro a partir de um snapshot, entao
--      duas abas se sobrescreviam (lost update).
--
-- SECURITY DEFINER com search_path fixo: rodam com privilegio do dono,
-- ignorando RLS, e por isso nao aceitam o id do jogador como parametro -
-- derivam sempre do JWT. Nunca usar service_role no app: nesta instancia
-- compartilhada, essa chave e mestra de todos os projetinhos.

-- ------------------------------------------------------------- comprar pack

-- setof integer, e nao table(id_card integer), de proposito: um OUT chamado
-- id_card viraria variavel plpgsql e tornaria ambiguo o `on conflict
-- (id_user, id_card)` la embaixo, que e referencia a coluna.
create or replace function o_jogo.buy_pack(p_id_pack integer)
returns setof integer
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $$
declare
    v_id_user  bigint;
    v_price    integer;
    v_quantity smallint;
    v_coins    integer;
begin
    v_id_user := o_jogo.current_player_id();
    if v_id_user is null then
        raise exception 'Apenas jogadores podem comprar packs.'
            using errcode = '42501';
    end if;

    select price, quantity into v_price, v_quantity
    from o_jogo.packs where id = p_id_pack;

    if not found then
        raise exception 'Pack % nao existe.', p_id_pack using errcode = '22023';
    end if;

    -- Trava a linha do jogador ate o fim da transacao. E isto que serializa
    -- duas compras simultaneas em vez de deixar uma sobrescrever a outra.
    select coins into v_coins
    from o_jogo.users where id = v_id_user
    for update;

    if v_coins < v_price then
        raise exception 'Saldo insuficiente: tem %, o pack custa %.', v_coins, v_price
            using errcode = '22023';
    end if;

    update o_jogo.users
    set coins = coins - v_price
    where id = v_id_user;

    -- O sorteio acontece aqui, no servidor. O cliente recebe o resultado.
    return query
    with sorteadas as (
        select c.id
        from o_jogo.cards c
        where c.id_pack = p_id_pack
        order by random()
        limit v_quantity
    ), creditadas as (
        -- O alias uc e obrigatorio: dentro de ON CONFLICT DO UPDATE a tabela
        -- alvo nao pode ser referenciada com o nome qualificado por schema.
        insert into o_jogo.user_cards as uc (id_user, id_card, quantity)
        select v_id_user, s.id, 1 from sorteadas s
        on conflict (id_user, id_card)
            do update set quantity = uc.quantity + 1
        returning uc.id_card
    )
    select c.id_card from creditadas c;
end;
$$;

comment on function o_jogo.buy_pack(integer) is
    'Debita, sorteia e credita atomicamente. Retorna os ids sorteados.';

-- -------------------------------------------------------------- vender carta

-- Preco de venda centralizado: era card.level * 10 calculado no cliente.
create or replace function o_jogo.card_sell_price(p_level smallint)
returns integer
language sql
immutable
as $$
    select p_level * 10;
$$;

create or replace function o_jogo.sell_card(p_id_card integer)
returns integer
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $$
declare
    v_id_user  bigint;
    v_level    smallint;
    v_quantity integer;
    v_price    integer;
    v_coins    integer;
begin
    v_id_user := o_jogo.current_player_id();
    if v_id_user is null then
        raise exception 'Apenas jogadores podem vender cartas.'
            using errcode = '42501';
    end if;

    select level into v_level from o_jogo.cards where id = p_id_card;
    if not found then
        raise exception 'Carta % nao existe.', p_id_card using errcode = '22023';
    end if;

    select quantity into v_quantity
    from o_jogo.user_cards
    where id_user = v_id_user and id_card = p_id_card
    for update;

    if v_quantity is null then
        raise exception 'Voce nao possui a carta %.', p_id_card
            using errcode = '22023';
    end if;

    -- Vender a ultima copia apaga a linha, em vez de deixar quantity = 0.
    if v_quantity = 1 then
        delete from o_jogo.user_cards
        where id_user = v_id_user and id_card = p_id_card;
    else
        update o_jogo.user_cards
        set quantity = quantity - 1
        where id_user = v_id_user and id_card = p_id_card;
    end if;

    v_price := o_jogo.card_sell_price(v_level);

    update o_jogo.users
    set coins = coins + v_price
    where id = v_id_user
    returning coins into v_coins;

    return v_coins;
end;
$$;

comment on function o_jogo.sell_card(integer) is
    'Vende uma copia e retorna o saldo novo. Preco vem de card_sell_price.';

-- Vender uma carta pode deixar um deck invalido: o trigger de deck_cards so
-- valida na escrita do deck. Aparar aqui mantem o invariante.
create or replace function o_jogo.trim_decks_to_collection()
returns trigger
language plpgsql
security definer
set search_path = o_jogo, pg_catalog
as $$
declare
    v_id_user bigint;
    v_id_card integer;
    v_possui  integer;
begin
    -- Ramificar por TG_OP em vez de coalesce(new.*, old.*): num trigger de
    -- DELETE o registro NEW nao esta atribuido, e le-lo levanta erro.
    if tg_op = 'DELETE' then
        v_id_user := old.id_user;
        v_id_card := old.id_card;
        v_possui  := 0;
    else
        v_id_user := new.id_user;
        v_id_card := new.id_card;
        v_possui  := new.quantity;
    end if;

    delete from o_jogo.deck_cards dc
    using o_jogo.decks d
    where dc.id_deck = d.id
      and d.id_user  = v_id_user
      and dc.id_card = v_id_card
      and v_possui   = 0;

    update o_jogo.deck_cards dc
    set quantity = v_possui
    from o_jogo.decks d
    where dc.id_deck = d.id
      and d.id_user  = v_id_user
      and dc.id_card = v_id_card
      and dc.quantity > v_possui
      and v_possui > 0;

    return null;
end;
$$;

create trigger user_cards_trim_decks
    after update or delete on o_jogo.user_cards
    for each row execute function o_jogo.trim_decks_to_collection();

-- Apenas as RPCs sao chamaveis; nada de acesso direto as tabelas de economia.
revoke all on function o_jogo.buy_pack(integer)  from public;
revoke all on function o_jogo.sell_card(integer) from public;
grant execute on function o_jogo.buy_pack(integer)  to authenticated;
grant execute on function o_jogo.sell_card(integer) to authenticated;
grant execute on function o_jogo.current_player_id() to authenticated;

grant select on o_jogo.packs, o_jogo.cards, o_jogo.users, o_jogo.user_cards to authenticated;
grant select, insert, update, delete on o_jogo.decks, o_jogo.deck_cards to authenticated;
grant select, insert, update on o_jogo.matches to authenticated;
grant select, insert, delete on o_jogo.match_players to authenticated;
grant usage on all sequences in schema o_jogo to authenticated;
