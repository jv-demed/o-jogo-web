-- O id da partida passa a vir do relogio.
--
-- Era `generated always as identity`, e sequence tem uma propriedade ruim para
-- um numero que **a pessoa le e digita**: ela nao volta. Toda partida criada e
-- desfeita — e no lobby isso e a maioria — deixa um buraco permanente na
-- contagem, e o proximo id anuncia quantas tentativas houve antes dele.
--
-- O novo id e o instante em que a partida nasceu, no fuso de quem joga
-- (America/Sao_Paulo, porque o numero e para ler, e UTC diria outra hora):
--
--     AAMMDDHHMM  ++  dois digitos de desempate
--     26 08 28 20 43        17      ->  260828204317
--
-- Doze digitos, ainda bigint: nenhuma FK muda de tipo, nenhuma RPC muda de
-- assinatura, e as partidas antigas continuam validas com os ids pequenos que
-- ja tinham. O que muda e so de onde vem o numero de uma partida nova.
--
-- Nao e id sequencial disfarcado: dentro do mesmo minuto o desempate e
-- sorteado, entao duas partidas seguidas nao saem vizinhas.

create or replace function o_jogo.new_match_id()
returns bigint
language plpgsql
volatile
security definer
set search_path = o_jogo, pg_catalog
as $fn$
declare
    v_base   bigint;
    v_offset integer;
    v_id     bigint;
begin
    v_base := to_char(now() at time zone 'America/Sao_Paulo', 'YYMMDDHH24MI')::bigint * 100;

    -- Comeca num ponto sorteado e percorre os cem lugares do minuto a partir
    -- dele: sorteio puro repetido ate achar vaga demoraria justamente quando o
    -- minuto estivesse cheio, que e quando ele precisa terminar.
    v_offset := floor(random() * 100)::integer;

    for i in 0..99 loop
        v_id := v_base + ((v_offset + i) % 100);
        if not exists (select 1 from o_jogo.matches where id = v_id) then
            return v_id;
        end if;
    end loop;

    -- Cem partidas no mesmo minuto. Nao ha id valido para dar, e inventar um
    -- fora do formato seria pior do que dizer que nao deu.
    raise exception 'Muitas partidas neste minuto. Tente de novo em instantes.'
        using errcode = '22023';
end;
$fn$;

comment on function o_jogo.new_match_id() is
    'Um id AAMMDDHHMM + 2 digitos de desempate, no fuso de Sao Paulo. SECURITY DEFINER: sob RLS o criador nao enxerga as partidas alheias, e nao veria a colisao.';

-- Executada como default do INSERT, entao quem insere precisa poder chama-la.
revoke all on function o_jogo.new_match_id() from public;
grant execute on function o_jogo.new_match_id() to authenticated;

alter table o_jogo.matches alter column id drop identity if exists;
alter table o_jogo.matches alter column id set default o_jogo.new_match_id();

comment on column o_jogo.matches.id is
    'AAMMDDHHMM + 2 digitos, do relogio de Sao Paulo. E o numero que o jogador ve e compartilha.';
