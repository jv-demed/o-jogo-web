-- Avatar do jogador: a coluna e a RPC que a escreve.
--
-- Mora em manual/ porque supabase/migrations/ e ignorado pelo git (as
-- migrations sao rodadas a mao e descartadas). Este arquivo descreve schema,
-- entao precisa sobreviver: e o unico registro versionado do que a tela de
-- perfil espera encontrar no banco. Roda no SQL Editor, e rodar duas vezes
-- deixa o mesmo estado que rodar uma.
--
-- Guarda o *id* do avatar (uma string curta do catalogo de assets/avatars.js),
-- e nao um caminho de imagem: a arte e catalogo do cliente e vai mudar quando
-- as imagens definitivas entrarem. O banco so precisa lembrar a escolha.
--
-- Nulo e um valor valido: significa "nunca escolheu", e o cliente cai no
-- primeiro avatar do catalogo.

alter table o_jogo.users
    add column if not exists avatar text;

-- A troca passa por RPC, como buy_pack e sell_card, e nao por um UPDATE do
-- browser: dar UPDATE na tabela users para o jogador abriria coins e is_dev
-- junto. Aqui a funcao escreve uma coluna so, na linha de quem chamou.
create or replace function o_jogo.set_avatar(p_avatar text)
returns text
language plpgsql
security definer
set search_path = o_jogo, public
as $$
declare
    v_id o_jogo.users.id%type;
begin
    -- O formato e conferido aqui porque o catalogo vive no cliente: o banco
    -- nao sabe quais ids existem, mas sabe que um id nao e texto livre.
    if p_avatar is not null and p_avatar !~ '^[a-z0-9-]{1,32}$' then
        raise exception 'Avatar inválido: %', p_avatar;
    end if;

    select id into v_id
    from o_jogo.users
    where id_auth = auth.uid();

    if v_id is null then
        raise exception 'Esta conta não tem perfil de jogador em O Jogo.';
    end if;

    update o_jogo.users
    set avatar = p_avatar
    where id = v_id;

    return p_avatar;
end;
$$;

revoke all on function o_jogo.set_avatar(text) from public;
grant execute on function o_jogo.set_avatar(text) to authenticated;
