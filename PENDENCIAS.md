# O JOGO — Pendências da base

O que ainda falta. Itens concluídos saem daqui — o histórico está no git.

**Contexto do Supabase:** o projeto Supabase é compartilhado entre vários projetinhos pessoais (limite da conta free). Banco único, `auth.users` único e anon key única para todos. Várias pendências abaixo existem por causa disso.

**Stack:** Next.js 14 (App Router, JS), React 18, Tailwind v4, Supabase (`@supabase/ssr`), react-icons.

---

## Restrições já decididas

Fechadas em 2026-08-24 e aplicadas. Não são pendências — estão aqui porque os itens abaixo dependem delas.

- **Schema dedicado `o_jogo`**, colunas em snake_case. Migrations 0001–0007 aplicadas; nenhuma pendente.
- **Cadastro fechado**: usuários criados manualmente pelo dono, sem fluxo de signup. Policies checam participação no jogo via `o_jogo.current_player_id()`, nunca só `auth.uid() is not null`.
- **`o_jogo.cards` é a fonte única** de id, nível, preço, tipo, pack e efeito, para o servidor validar jogada e preço dentro da RPC. A arte continua estática em `public/cards/{id}.png`.
- **Economia só por RPC** (`buy_pack`, `sell_card`): não existe grant de `UPDATE` em `o_jogo.users` para o cliente.

---

## 🎮 Pré-requisito para o jogo em si

- [ ] **Levar o efeito estruturado para `o_jogo.cards`.** As 116 cartas já estão modeladas como dados — `domain/cards/effects/pack{1,2,3}.js`, vocabulário em `domain/cards/vocabulary.js`, `npm run validate:effects` verde com cobertura 116/116. Falta a outra metade: quem valida a jogada é o servidor, então o efeito precisa de uma coluna (`effect jsonb`) em `o_jogo.cards`, e o `scripts/gen-catalog-seed.mjs` precisa emiti-la junto com o resto do catálogo. O `text` continua sendo a fonte narrativa: quando os dois discordarem, o texto ganha.

  Cartas cuja leitura ficou em aberto e que merecem uma decisão de regra antes de existir resolvedor: **74 Extreme Zero** (a escolha é por missão, não por jogador — virou alvo `manual`), **79 Largando a Medicina** (o texto não diz quem recebe a metade dos shots), **85 Jp da Ganância** ("até a mão se estabilizar" não tem duração equivalente no vocabulário, ficou em nota), **101 Valeu Valeu** e **105 Não é o Momento** (dependem do alvo da jogada em curso, e não do alvo da própria carta).

- [ ] **Definir as regras da partida** (turnos, mão, compra, resolução, condição de vitória) antes de reescrever `lobby`/`game`. `game`, `GameTable` e `Opponent` são esqueleto: têm camada de dados e estilo, mas nenhuma regra por trás.

---

## 🟠 Arquitetura e stack

- [ ] **Adotar TypeScript** (ou no mínimo `checkJs` + JSDoc). Boa parte dos bugs já corrigidos — `useUser()` desestruturado errado, `id` vs `number`, props fantasma, import `Loading` inexistente — seria pega em tempo de compilação. ⚠️ Com o ESLint configurado, sabemos exatamente o que ele **não** cobre, e é justamente essa lista: nenhum dos 4 aparecia no `npm run lint`.
- [ ] **Rodar `npm run build` no CI, não só o lint.** Quem pegou o import inexistente foi o build (`Attempted import error`), não o ESLint — a regra `import/named` não dispara com o parser do Next.
- [ ] **Separar as camadas**: `domain/` (regras puras e testáveis — economia, deck building, resolução de carta), `data/` (Supabase), `presentation/`. Hoje `presenters/` mistura JSX com `insert`. ⚠️ `domain/` já existe com a modelagem de efeitos e é puro (roda em Node sem bundler, via `domain/package.json` com `type: module`); economia e deck building continuam fora.
- [ ] **Consolidar as camadas de dados** — sobraram `supabase/crud.js` (genérico, sem consumidor hoje) e as queries inline no `UserProvider` e nos hooks `useDataObj`/`useDataList`, que ainda seguram a tela de decks. Os últimos `console.log` em `catch` moram justamente aí (`useDataList.jsx:34`, `useDataObj.jsx:35`) mais um em `AuthService.login`, e morrem junto — o resto das telas já mostra erro via `ErrorMessage`.
- [ ] **Deps de `useDataList`/`useDataObj`** (`useDataList.jsx:40`, `useDataObj.jsx:41`) dependem só de `flag`. ⚠️ O `exhaustive-deps` **não** acusa isso — só analisa hooks nativos e não relaciona o corpo do `useEffect` às variáveis externas. Continua sendo revisão manual.
- [ ] **Testes**: nenhum hoje. Começar pelas regras puras (`domain/`) com Vitest. O `scripts/validate-effects.mjs` já é o corpo de um teste esperando um runner — roda sem dependência nenhuma e sai com código 1 se algo quebrar.
- [ ] **`supabase db diff --schema o_jogo`** no fluxo de migration, para não capturar as tabelas dos outros projetinhos. ⚠️ Sem os arquivos SQL versionados (ver abaixo), isto é "recriar o fluxo do zero", não "ajustar".

---

## 🎨 Visual e UX

- [ ] **Recuperação de senha** — não existe. `signOut` já é server action em `services/AuthService.js` e serve de espelho. (`signUp` está fora de escopo: cadastro é manual.)
- [ ] **Tela de perfil** — não existe; o menu do header não tem para onde apontar.
- [ ] **PWA** — o `manifest.json` está comentado em `app/layout.jsx:6`. Se a ideia é rodar no celular (o CSS todo aponta pra isso), fechar o suporte.
- [ ] **`next/font`** para a tipografia. O `font-[verdana]` inline do `Main` saiu na repaginada; hoje a fonte e uma pilha de sistema declarada no `body` em `styles/globals.css`. Falta a fonte propria, com o `next/font` servindo o arquivo e evitando o salto de layout.
- [ ] **Migrar `bugs.txt` para issues** do repositório.

---

## Pegadinhas da instância compartilhada

Coisas que não se descobre lendo o repositório, e que custaram algumas horas em 2026-08-24.

- **`o_jogo` precisa estar em *Project Settings → API → Exposed schemas*.** Sem isso o PostgREST rejeita toda request com **406 / `PGRST106`**, antes de tocar em tabela, RLS ou usuário. O SQL Editor **não** passa pelo PostgREST, então migrations rodam normalmente e escondem o problema. Foi a causa raiz do login quebrado — e o sintoma é idêntico ao de "zero linhas", o que despista.
- **Não há trigger de criação de usuário.** Havia um `on_auth_user_created` em `auth.users`, de outro projetinho, chamando `public.handle_new_user()` para inserir numa tabela que não existia mais — **toda** criação de usuário na instância falhava com `42P01`. Foi removido. Criar jogador é sempre em dois passos: criar em *Authentication → Users* (com **Auto Confirm User**), depois `insert into o_jogo.users (id_auth, name, coins)`. Se virar rotina, vale um trigger próprio apontando para `o_jogo.users`.
- **Cuidado com FK legada `on delete set null`.** `public."oJogo-users"."idAuth"` apontava para `auth.users` assim — apagar usuários no auth **zerou o vínculo** das linhas legadas em vez de bloquear ou cascatear. As nossas FKs usam `cascade`, mas fica o alerta para qualquer tabela antiga que sobre.
- **Nunca usar `service_role` no app.** `supabase/client.js` e `supabase/server.js` usam só `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## SQL: onde mora agora

Os arquivos `supabase/migrations/` e `supabase/manual/` foram **removidos do repositório** em 2026-08-24, depois que o schema já estava aplicado. Continuam recuperáveis pelo git:

```
git show 885c83c:supabase/migrations/20260824000007_rpc_match.sql
git show 885c83c --stat -- supabase/
```

Também vive só no histórico o `audit_rls.sql`, que reexecuta a auditoria de RLS contra o banco.

⚠️ **O backfill não deve ser executado.** Optou-se por resetar: os dados legados foram descartados e o jogador é criado do zero. As tabelas legadas foram renomeadas para `*_legacy` e seus `idAuth` foram zerados pela FK `set null`, então o join do `backfill_from_legacy.sql` não encontraria ninguém.
