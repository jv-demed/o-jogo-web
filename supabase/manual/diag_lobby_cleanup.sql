-- Por que a sala nao sumiu. Tudo leitura; nao muda nada.

-- 1. O trigger existe e esta ligado? ('O' = ligado, 'D' = desabilitado.)
select tgname, tgenabled
from pg_trigger
where tgrelid = 'o_jogo.match_players'::regclass
  and not tgisinternal;

-- 2. O que sobrou, e por que cada uma sobrou.
--
--    humanos > 0        -> tem gente com assento ainda: o trigger esta certo,
--                          e quem nao saiu foi a outra ponta (aba fechada
--                          nao avisa ninguem).
--    humanos = 0        -> o delete nao aconteceu. Ai e o item 3.
--    nunca_comecou = f  -> partida montada: essa fica mesmo, de proposito.
select m.id,
       m.status,
       m.initial_state is null as nunca_comecou,
       count(p.id)                                        as assentos,
       count(p.id) filter (where p.id_user is not null)    as humanos
from o_jogo.matches m
left join o_jogo.match_players p on p.id_match = m.id
group by m.id, m.status, m.initial_state
order by m.id desc
limit 10;

-- 3. RLS forcada na tabela? Com `force`, nem o dono escapa das policies - e
--    `matches` nao tem policy de DELETE, entao o delete do trigger sairia
--    zerado, em silencio, que e exatamente este sintoma.
select relname, relrowsecurity as rls, relforcerowsecurity as rls_forcada
from pg_class
where oid in ('o_jogo.matches'::regclass, 'o_jogo.match_players'::regclass);

-- ---------------------------------------------------------------------------
-- Limpar as que ja encalharam (precisa da migration 0015 aplicada).
--
-- Cuidado com o intervalo: `sweep_stale_lobbies('0 seconds')` apaga tambem a
-- sala que alguem abriu agora e esta olhando neste instante. Para uma faxina
-- pontual, prefira algo como '10 minutes'.
--
--   select o_jogo.sweep_stale_lobbies('10 minutes');   -- devolve quantas foram
