-- Backfill das tabelas antigas para o schema o_jogo.
--
-- ATENCAO: este arquivo NAO esta em supabase/migrations/ de proposito.
-- Ele nao roda sozinho. Motivo: o schema antigo nunca foi versionado, entao
-- os nomes de coluna abaixo foram DEDUZIDOS do codigo do app, nao lidos do
-- banco. Confira contra a base real antes de executar:
--
--   select table_name, column_name, data_type
--   from information_schema.columns
--   where table_name in ('oJogo-users', 'oJogo-decks', 'oJogo-users:packs')
--   order by table_name, ordinal_position;
--
-- Deduzido de providers/UserProvider.jsx e presenters/:
--   "oJogo-users"  -> id, "idAuth", name, coins, cards (int[])
--   "oJogo-decks"  -> id, "idUser", name, cards (int[] de NUMBER, corrompido)
--
-- Rode dentro de uma transacao e confira os totais antes do commit.

begin;

-- ------------------------------------------------------------------ users
-- id e generated always as identity no destino, entao nao carregamos o id
-- antigo: as FKs abaixo religam por id_auth, que e estavel.
insert into o_jogo.users (id_auth, name, coins)
select u."idAuth", u.name, greatest(coalesce(u.coins, 0), 0)
from public."oJogo-users" u
on conflict (id_auth) do nothing;

-- ------------------------------------------------------------- user_cards
-- O array cards vira uma linha por carta, com a repeticao virando quantity.
-- Cartas do array que nao existem em o_jogo.cards sao descartadas pelo join.
insert into o_jogo.user_cards (id_user, id_card, quantity)
select novo.id, c.id, count(*)
from public."oJogo-users" antigo
join o_jogo.users novo on novo.id_auth = antigo."idAuth"
cross join lateral unnest(coalesce(antigo.cards, '{}')) as arr(id_card)
join o_jogo.cards c on c.id = arr.id_card
group by novo.id, c.id
on conflict (id_user, id_card) do nothing;

-- ------------------------------------------------------------------ decks
insert into o_jogo.decks (id_user, name)
select novo.id, d.name
from public."oJogo-decks" d
join public."oJogo-users" antigo on antigo.id = d."idUser"
join o_jogo.users novo on novo.id_auth = antigo."idAuth";

-- ------------------------------------------------------------- deck_cards
--
-- NAO ha backfill automatico de deck_cards, e isso e proposital.
--
-- O editor gravava `cards: selectedCards.map(c => c.number)`, mas number
-- reinicia a cada pack: 53 das 116 cartas tem id != number. Nao da para
-- saber, olhando so o array salvo, se um 1 ali era a carta de id 1, 64 ou 83.
-- O dado esta ambiguo na origem; qualquer conversao seria chute.
--
-- Decks com carta de pack 1 apenas (onde id == number) poderiam ser
-- recuperados, mas os demais nao. Como sao poucos usuarios, o caminho
-- honesto e os jogadores remontarem os decks.
--
-- Se preferir tentar a recuperacao parcial, o criterio seria:
--     join o_jogo.cards c on c.number = arr.n and c.id_pack = 1

commit;

-- Conferencia depois do commit:
--   select (select count(*) from o_jogo.users)      as usuarios,
--          (select count(*) from o_jogo.user_cards) as linhas_colecao,
--          (select sum(quantity) from o_jogo.user_cards) as cartas_totais,
--          (select count(*) from o_jogo.decks)      as decks;
