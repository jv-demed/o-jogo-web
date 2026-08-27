-- Colecao completa para um jogador: uma copia de cada carta do catalogo.
--
-- Bancada de teste, nao presente: serve para abrir qualquer carta na colecao
-- e montar deck com o que se quiser avaliar, sem depender do sorteio de
-- buy_pack. Por isso e script manual e nao migration — nao descreve o schema,
-- so mexe em dado de um jogador, e nao deve reexecutar sozinho em outro banco.
--
-- Roda no SQL Editor (que nao passa por RLS nem pelos grants do cliente).
-- Do lado do app nao ha caminho para isto: nao existe grant de INSERT em
-- o_jogo.user_cards, e a colecao so cresce por buy_pack.

-- 1. Troque pelo nome do seu jogador (o_jogo.users.name).
-- 2. COPIES e quantas copias de cada carta voce quer na colecao. Uma ja
--    permite montar deck com qualquer carta; suba se quiser repetir a mesma
--    carta dentro de um deck.
with alvo as (
    select id from o_jogo.users where name = '<seu nome>'
), copies as (
    select 1 as quantity
)
insert into o_jogo.user_cards (id_user, id_card, quantity)
select alvo.id, cards.id, copies.quantity
from alvo, copies, o_jogo.cards as cards
on conflict (id_user, id_card) do update
    set quantity = greatest(o_jogo.user_cards.quantity, excluded.quantity);

-- Confere: deve bater com o total do catalogo (116 hoje).
select u.name,
       count(*)          as cartas_distintas,
       sum(uc.quantity)  as copias,
       (select count(*) from o_jogo.cards) as catalogo
from o_jogo.user_cards uc
join o_jogo.users u on u.id = uc.id_user
where u.name = '<seu nome>'
group by u.name;
