-- Auditoria de RLS - somente leitura, seguro rodar a qualquer momento.
--
-- Cole no SQL Editor depois de aplicar as migrations. Cada bloco tem o
-- resultado esperado no comentario; qualquer divergencia e regressao.

-- 1. RLS ligada em todas as tabelas do schema.
--    Esperado: nenhuma linha.
select relname as tabela_sem_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'o_jogo'
  and c.relkind = 'r'
  and not c.relrowsecurity;

-- 2. Tabela com RLS ligada e nenhuma policy fica invisivel para o cliente -
--    as vezes e proposital, as vezes e esquecimento.
--    Esperado: nenhuma linha.
select c.relname as tabela_sem_policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'o_jogo'
  and c.relkind = 'r'
  and c.relrowsecurity
  and not exists (
      select 1 from pg_policy p where p.polrelid = c.oid
  );

-- 3. Nenhuma policy pode se contentar com "tem JWT valido": o auth.users
--    desta instancia e compartilhado com os outros projetinhos.
--    Esperado: nenhuma linha.
select tablename, policyname, qual, with_check
from pg_policies
where schemaname = 'o_jogo'
  and (coalesce(qual, '') || coalesce(with_check, '')) like '%uid() IS NOT NULL%';

-- 4. Economia: o cliente nao pode ter caminho de escrita em users nem em
--    user_cards - so as RPCs mexem em coins e na colecao.
--    Esperado: nenhuma linha.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'o_jogo'
  and tablename in ('users', 'user_cards')
  and cmd <> 'SELECT';

--    Idem no nivel de grant.
--    Esperado: nenhuma linha.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'o_jogo'
  and table_name in ('users', 'user_cards', 'packs', 'cards')
  and privilege_type <> 'SELECT'
  and grantee in ('anon', 'authenticated');

-- 5. O papel anon nao enxerga nada do schema.
--    Esperado: nenhuma linha nas duas.
select table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'o_jogo' and grantee = 'anon';

select has_schema_privilege('anon', 'o_jogo', 'usage') as anon_usa_o_schema;
--    Esperado: false.

-- 6. Funcoes SECURITY DEFINER precisam de search_path fixo, senao um schema
--    plantado no search_path do chamador sequestra a resolucao de nome.
--    Esperado: nenhuma linha.
select p.proname as definer_sem_search_path
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'o_jogo'
  and p.prosecdef
  and not exists (
      select 1 from unnest(coalesce(p.proconfig, '{}')) cfg
      where cfg like 'search_path=%'
  );

-- 7. Nenhuma funcao do schema executavel por public.
--    Esperado: nenhuma linha.
select p.proname as funcao_aberta_para_public
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'o_jogo'
  and has_function_privilege('public', p.oid, 'execute');

-- 8. Panorama, para leitura humana.
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'o_jogo'
order by tablename, cmd, policyname;
