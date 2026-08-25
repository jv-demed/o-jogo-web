# O JOGO — Pendências da base

Levantamento completo dos problemas da base existente, feito antes de retomar o projeto para construir o jogo jogável. O objetivo é zerar esta lista.

**Contexto do Supabase:** o projeto Supabase é compartilhado entre vários projetinhos pessoais (limite da conta free). Isso significa banco único, `auth.users` único e anon key única para todos eles. Várias pendências abaixo existem por causa disso.

**Stack:** Next.js 14 (App Router, JS), React 18, Tailwind v4, styled-components (legado), Supabase (`@supabase/ssr`), react-icons.

---

## Decisões fechadas (2026-08-24)

Estavam bloqueando o trabalho de banco. Fechadas; tudo abaixo depende delas.

- [x] **Namespace: schema dedicado `o_jogo`.** `o_jogo.users`, `o_jogo.decks`, `o_jogo.matches`, `o_jogo.cards`. Permite `supabase db diff --schema o_jogo` sem capturar os outros projetinhos, e isola RLS/grants. ⚠️ Exige expor o schema em *API Settings → Exposed schemas* no painel do Supabase, e passar `{ db: { schema: 'o_jogo' } }` na criação do client.
- [x] **Colunas em snake_case.** `idAuth` → `id_auth`, `idUser` → `id_user`, `dateRealease` → `date_release` (corrige o typo de quebra). Feito junto com a migração das tabelas, enquanto é barato.
- [x] **Cadastro: fechado, usuários criados manualmente pelo dono.** Não existe fluxo de signup no app. **Consequência:** o item "falta `signUp`" mais abaixo sai de escopo — só `signOut` e recuperação de senha continuam necessários. As policies precisam checar participação no jogo (linha em `o_jogo.users`), nunca só `auth.uid() is not null`, já que o `auth.users` é compartilhado.
- [x] **Cartas: tabela `o_jogo.cards` como fonte única.** Id, nível, preço, tipo, pack e efeito no Postgres, para o servidor validar jogada e preço de venda dentro da RPC. A arte **continua estática** em `public/cards/{id}.png` via `next/image` — nunca passou pelo banco e não passa a passar, então isso não afeta o tempo de exibição da carta. `assets/cards.js` deixa de ser fonte de verdade.
  - *Nota:* a lentidão ao abrir a carta não vinha daqui — vem dos PNGs em tamanho cheio renderizados a `scale={0.24}`, item da seção Visual e UX.

### Renomeações implicadas

Nomes atuais → destino. Os três últimos hoje **não têm prefixo nenhum**, o que num banco compartilhado é um risco real de colidir com tabela de outro projetinho:

| Hoje | Destino |
|---|---|
| `oJogo-users` | `o_jogo.users` |
| `oJogo-decks` | `o_jogo.decks` |
| `oJogo-users:packs` | `o_jogo.user_packs` |
| `matches` (sem prefixo) | `o_jogo.matches` |
| `users` (sem prefixo, no lobby) | `o_jogo.users` |
| `game-players` (sem prefixo) | `o_jogo.match_players` |

O nome `oJogo-users:packs` tem hífen **e** dois-pontos, exigindo aspas duplas em toda referência SQL — some com a migração.

---

## 🔴 Bloqueadores críticos

### 1. Economia roda inteira no cliente

Qualquer jogador abre o DevTools e roda `supabase.from('...').update({ coins: 999999 })` com a anon key que já está no bundle.

- [x] ~~**Sorteio do pack acontece no navegador**~~ — virou `o_jogo.buy_pack`.- [x] ~~**Validação de saldo só no cliente**~~ — a conferência saiu do modal; quem recusa é a RPC, e `coins` tem `check (coins >= 0)`.
- [x] ~~**`buyPack` e `sellCard` fazem UPDATE direto do browser**~~ — os dois viraram `supabase.rpc(...)`. O preço mora em `o_jogo.card_sell_price`; `cardSellPrice()` no cliente é só rótulo de botão.
- [x] ~~**Auditar RLS**~~ — auditadas as 8 tabelas. `coins` e `user_cards` são select-only de fato: não existe policy nem grant de `UPDATE` em `o_jogo.users`, então toda mutação de economia só entra por RPC. Os 4 furos achados viraram `supabase/migrations/20260824000006_rls_audit_fixes.sql`, **aplicada**. `supabase/manual/audit_rls.sql` reexecuta a auditoria contra o banco a qualquer momento.
- [x] ~~**Policies precisam checar participação no jogo**~~ — confirmado: nenhuma das 12 policies usa `auth.uid() is not null`; todas passam por `o_jogo.current_player_id()`, que exige linha em `o_jogo.users`. O bloco 3 do `audit_rls.sql` vigia isso.
- [x] ~~**Não usar `service_role` no app**~~ — confirmado: a string não aparece em nenhum arquivo do repositório fora de um comentário de migration. `supabase/client.js` e `supabase/server.js` usam só `NEXT_PUBLIC_SUPABASE_ANON_KEY`, e o `.env.example` documenta as duas chaves como públicas.

### 2. ~~Middleware de autenticação não protege nada~~ ✅ resolvido

- [x] `supabase/middleware.js` — a condição sempre-falsa `!pathname.startsWith('/')` virou `!isPublicPath(pathname)`.
- [x] Lista de rotas públicas explícita: `PUBLIC_PATHS = ['/']` (a tela de login). Todo o resto vive em `app/(auth)` e agora é redirecionado de verdade. Assets já eram excluídos pelo `matcher` do `middleware.js` da raiz.

### 3. Race condition de leitura-modificação-escrita

- [x] ~~Lost update em `buyPack`/`sellCard`~~ — não há mais snapshot: as RPCs usam `select ... for update` na linha do jogador, e a coleção virou linhas `(id_card, quantity)` em vez de array reescrito inteiro.
- [x] ~~**`generateId` gera id no cliente**~~ — a pasta `actions/` inteira foi apagada. `matches` e `decks` já nasciam com `identity` no schema novo; quem cria a partida agora é a RPC `create_match`, que devolve o id gerado pelo Postgres.

### 4. Deck editor grava dados corrompidos

Confirmado nos dados: **`id` e `number` divergem em 53 das 116 cartas** — o `number` reinicia a cada pack (a carta `id: 64` tem `number: 1`).

- [x] ~~Deck salvo por `number`~~ — `deck_cards` guarda `id_card`, e o editor cruza por id. `saveDeck` em `presenters/decksPresenter.js`.
- [x] ~~Padronizar **`id` como chave única global**~~ — feito no schema: `cards.id` é PK, `number` só tem `unique (id_pack, number)` e está comentado como rótulo.
- [x] ~~Teste de integridade sobre `assets/cards.js`~~ — `scripts/gen-catalog-seed.mjs` gera o seed e valida na mesma passada: 116 ids únicos, nenhuma carta sem arte, packs 1–3 válidos, os 7 tipos batendo com o enum. Confirmou também as 53 divergências `id`/`number` e a órfã `Gladsxódia.png`.

---

## 🟠 Bugs de lógica e React

- [x] ~~**`usePersistentState` quebra no SSR**~~ — o estado nasce com `initialValue` e a leitura do `localStorage` foi para um `useEffect`; um `useRef` de hidratação impede que o primeiro render sobrescreva o valor salvo. Leitura e escrita em `try/catch` (modo privativo bloqueia storage).
- [x] ~~**`useUser()` desestruturado errado em lobby e game**~~ — corrigido para `const { user } = useUser()` nos dois arquivos.- [x] ~~**Comparação de objeto com string**~~ — some com a reescrita do lobby: o efeito observa `match?.status` e navega para `/game/${idMatch}`.
- [x] ~~**Import inexistente**~~ — o lobby importava `{ Loading }` de `SpinLoader`, que exporta `SpinLoader`. Crash na renderização. **Corrigido**: import e os 3 usos passaram a `SpinLoader`. ⚠️ **O ESLint não pega isso** (tentamos `import/named`: a regra não dispara com o parser do Next). Quem pega é o `npm run build`: `Attempted import error: 'Loading' is not exported`. Rodar o build no CI, não só o lint.
- [x] ~~**`CardDetailsModal` sem `user` no editor de deck**~~ — passa `user` e `refresh` agora.
- [x] ~~**Loading eterno**~~ — `providers/UserProvider.jsx`: `setIsLoading(false)` agora roda em `.finally()`, e o caminho de falha renderiza `ErrorMessage` em vez de spinner infinito. O erro do Supabase é guardado em estado (`setError`) nos dois pontos de saída de `getUser()`.
- [x] ~~**Dois `useEffect` disputando `userCards`**~~ — viraram um só, que reparte a coleção entre "no deck" e "disponível". A lista filtrada virou `useMemo`.
- [ ] **Cartas repetidas não são suportadas no deck** — `handleAddCard`/`handleRemoveCard` usam `findIndex(c => c.id === card.id)`, apesar de a coleção permitir repetição.
- [x] ~~**Filtro por índice em vez de id**~~ — as 4 ocorrências de `idPack == i+1` viraram `idPack == pack.id`, e o índice do `map` saiu da assinatura.
- [x] ~~**Loja não ordena os packs**~~ — `ORDERED_PACKS` ordena por data de lançamento (mais recente primeiro). O typo `dateRealease` virou `dateRelease` em `assets/packs.js` e em `scripts/gen-catalog-seed.mjs` — o seed continua gerando idêntico.
- [x] ~~**`insertRecord` estoura em erro**~~ — `insertRecord` e `updateRecord` agora dão `throw error` em vez de `console.log` + `data[0]` sobre `null`.
- [x] ~~**Login não funciona no Enter**~~ — `app/page.jsx` passa `onSubmit={handleSubmit}` ao `Form`; o `action=` do `ActionButton` saiu, senão o submit e o `onClick` disparariam o login duas vezes.
- [ ] **Não existe logout no header** — `services/AuthService.js` só tem `login`. Falta expor `signOut` como serviço e a recuperação de senha. Já existe um `supabase.auth.signOut()` inline na tela de "sem perfil de jogador" do `UserProvider`, que era um beco sem saída; consolidar no `AuthService` quando o header ganhar navegação. ~~`signUp`~~ saiu de escopo: os usuários são criados manualmente pelo dono. ~~`signUp`~~ saiu de escopo: os usuários são criados manualmente pelo dono (decisão de 2026-08-24).
- [x] ~~**Realtime sem filtro e vazando entre projetos**~~ — `getRealtime` passou a receber `filter` e a escutar `schema: 'o_jogo'`, com nome de canal derivado de `(tabela, filtro)` em vez de fixo. O lobby abre dois canais, ambos presos a esta partida (`id_match=eq.{id}` e `id=eq.{id}`).
- [x] ~~**Adicionar as tabelas à publication do realtime**~~ — `matches` e `match_players` entram na `supabase_realtime` na migration 0007, num bloco idempotente (não existe `add table if not exists`). `match_players` ganhou `replica identity full`, senão o evento de saída não diz quem saiu.
- [x] ~~Índice errado após vender a última cópia~~ — vender a última passou a ser permitido (`disabled={repetitions == 0}`) e fecha o modal, em vez de deixar o índice órfão.
- [ ] **1 warning de `exhaustive-deps`** no lint — `AutoFitText.jsx:20` (`maxHeight`). Os 3 do lobby morreram com a reescrita, como previsto; os loaders agora são `useCallback` e entram nas dependências de verdade. Este último sai junto da reescrita do `AutoFitText` (seção *Visual e UX*).
- [x] ~~**`no-undef` não enxergava os globais de ES2015+**~~ — achado durante a reescrita: `Promise`, `Map` e `Set` eram erro de lint, porque o `.eslintrc.json` ligava `no-undef` sem declarar `env`. `"env": { "browser": true, "node": true, "es2022": true }` resolve. Estava mascarado porque nenhum arquivo usava esses nomes diretamente.

---

## 🟡 Código legado / dívida técnica

- [x] ~~**Apagar `presenters/cardsPresenter.js`**~~ — apagado.- [ ] **Consolidar as camadas de dados** — `actions/` foi apagada e a partida virou `presenters/matchesPresenter.js`, junto de `usersPresenter` e `decksPresenter`. Sobraram `supabase/crud.js` (genérico, sem consumidor hoje) e as queries inline no `UserProvider` e nos hooks `useDataObj`/`useDataList`, que ainda seguram a tela de decks.
- [x] ~~**Reescrever `lobby`, `game`, `GameTable` e `Opponent`**~~ — os quatro passaram para Tailwind e `styled-components` saiu do `package.json`. O `lobby` foi reescrito de verdade (entrar pelo link, realtime filtrado, host reordena e começa); `game`, `GameTable` e `Opponent` **continuam esqueleto** — trocaram a camada de dados e o estilo, mas regra de partida não existe ainda.
- [x] ~~**Props fantasma**~~: `<Box $fullHeight>` e `ActionButton name=` sumiram na reescrita do lobby e do game — os dois arquivos eram os únicos que erravam o nome. ~~`<Main $justifyContent>` no `UserProvider`~~ ✅ removida — `Main` só aceita `between` como booleano (`justify-between`/`justify-start`), não existe valor `'center'`.
- [x] ~~**Remover `console.log` de debug**~~ — os dois removidos. Os que sobram são de tratamento de erro (`databaseActions`, hooks), que morrem junto com a consolidação das camadas de dados.
- [x] ~~**Descomentar ou remover o matchmaking morto**~~ — removido, e o botão *Jogar* voltou a funcionar por outro caminho. O bloco antigo procurava *a* partida em espera, uma só e global; isso não sobrevive à RLS, porque `matches_read_participant` só mostra partida de que o jogador já participa. Agora *Jogar* cria a partida (`create_match`, idempotente) e quem entra, entra pelo link `/lobby/{id}`.
- [x] ~~**`PACK_CATEGORIES`, `insertPurchase` e `incPurchase`**~~ — o arquivo inteiro foi apagado. Ninguém importava, e apontava para `oJogo-users:packs`, que não existe no schema novo. Se o histórico de compras voltar, nasce como tabela `o_jogo.purchases` com RPC.
- [ ] **Migrar `bugs.txt` para issues** do repositório.
- [x] ~~**Imagem órfã** `public/cards/Gladsxódia.png`~~ — apagada. `scripts/gen-catalog-seed.mjs` agora reporta `arquivos orfaos: []`.

---

## 🟢 Arquitetura e stack

- [ ] **Adotar TypeScript** (ou no mínimo `checkJs` + JSDoc). Boa parte dos bugs acima — `useUser()` desestruturado errado, `id` vs `number`, props fantasma, `Loading` inexistente — seria pega em tempo de compilação. ⚠️ **Com o ESLint já configurado, sabemos exatamente o que ele *não* cobre**, e é justamente essa lista: nenhum desses 4 aparece no `npm run lint`. O argumento pró-TS ficou mais forte, não mais fraco.
- [ ] **Deps de `useDataList`/`useDataObj`** (`useDataList.jsx:40`, `useDataObj.jsx:41`) dependem só de `flag`. ⚠️ O `exhaustive-deps` **não** acusa isso — só analisa hooks nativos e não relaciona o corpo do `useEffect` às variáveis externas ali. Continua sendo revisão manual.
- [ ] **Separar as camadas**: `domain/` (regras puras e testáveis — economia, deck building, resolução de carta), `data/` (Supabase), `presentation/`. Hoje `presenters/` mistura JSX com `insert`.
  - *Bônus:* com `domain/` puro, extrair um serviço separado depois vira mover uma pasta — por isso a decisão de não criar repo de API agora é barata de reverter.
- [x] ~~**Regras de economia para o Postgres**~~ — `buy_pack` e `sell_card` escritas em `supabase/migrations/20260824000004_rpc_economy.sql`, e o schema agora está versionado em `supabase/migrations/`. ⚠️ **Ainda não aplicadas ao banco** — falta rodar (ver *Como aplicar*).
- [ ] **`supabase db diff --schema o_jogo`** no fluxo de migration, para não capturar as tabelas dos outros projetinhos.
- [ ] **Design tokens no Tailwind v4** — `#1b5b82`, `#e2d4b8`, `#171717`, `#212121` hardcoded em ~10 arquivos. Bloco `@theme` em `styles/globals.css`.
- [ ] **Tratamento de erro visível** — todo `catch` faz `console.log`; a loja usa `alert()`. Criar padrão de toast/estado de erro usando o `ErrorMessage` existente (já consumido por `TextInput` e `PasswordInput`).
- [x] ~~**`.env.example`**~~ — criado com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, mais o lembrete do *Exposed schemas*.
- [x] ~~**`next.config.mjs` está vazio**~~ — `reactStrictMode: true` e `images.formats: ['image/avif','image/webp']`. Converter as artes e passar `sizes` continua pendente na seção *Visual e UX*.
- [ ] **Testes**: nenhum hoje. Começar pelas regras puras (`domain/`) com Vitest.

### Decisão registrada: sem repo de API separado

O problema de segurança não é falta de API, é lógica de negócio no browser. Server Actions + RPC `SECURITY DEFINER` + RLS resolvem dentro deste repo. Um serviço separado exigiria service-role key, que no banco compartilhado é chave mestra de todos os projetinhos — seria *menos* seguro.

Revisitar apenas se aparecer: (1) timers autoritativos na partida, (2) WebSocket com estado quente, ou (3) cliente nativo além do PWA.

---

## 🎨 Visual e UX

- [ ] **`100vh` no mobile** — `components/containers/Main.jsx:10` usa `max-h-[100vh] min-h-[100vh]`; a barra de endereço corta conteúdo. Usar `100dvh`.
- [ ] **`AutoFitText` força reflow em loop** — `components/elements/AutoFitText.jsx:15`, até 6 medições síncronas de `scrollHeight` por carta. Na grid com 116 cartas trava a rolagem no celular. Alternativas: `clamp()`, container queries, ou memoizar o tamanho por carta. Resolve junto o warning de `maxHeight` na linha 20.
- [ ] **Otimizar as artes** — 116 PNGs em tamanho cheio mesmo renderizados a `scale={0.24}`. Converter para WebP e passar `sizes` no `next/image`.
- [ ] **Alvos de toque e semântica** — vários `onClick` em `<div>`/`<span>` sem `role`/`tabIndex` (`PageHeader.jsx:17`, `CardNavigation.jsx:14`, cards da loja e da coleção). Trocar por `<button>`.
- [ ] **Interação inconsistente** — long-press abre o detalhe na grid (`GridCollection.jsx:21`) mas a lista usa clique simples. E não há feedback visual durante os 450ms do press.
- [ ] **Modais sem fechar por backdrop nem `Esc`**, sem trap de foco e sem travar o scroll do body (`CardDetailsModal`, `PackDetailsModal`).
- [ ] **`next/font`** em vez de `font-[verdana]` inline em `Main.jsx:11`.
- [ ] **Header sem navegação** — só nome e coins; falta logout/perfil.
- [ ] **Sem estado de erro nem empty state** na compra de pack (só o `alert`).
- [ ] **PWA** — o `manifest.json` está comentado em `app/layout.jsx:6`. Se a ideia é rodar no celular (o CSS todo aponta pra isso), fechar o suporte.

---

## 🎮 Pré-requisito para o jogo em si

- [ ] **Modelar os efeitos das cartas como dados estruturados.** Hoje `text` em `assets/cards.js` é prosa em português, nada executável. Exemplo real — *"Escolha 1 jogador para beber 1 shot, na vez dele, pelos próximos 3 turnos"* precisa virar algo como:

  ```js
  { target: 'choose_player', effect: 'drink', amount: 1, duration: 3, timing: 'on_their_turn' }
  ```

- [ ] **Definir as regras da partida** (turnos, mão, compra, resolução, condição de vitória) antes de reescrever `lobby`/`game` — hoje são esqueleto sem regra nenhuma por trás.

---

## Ordem sugerida de ataque

1. ~~**ESLint**~~ — ✅ feito. Sobrou o **TypeScript**, que é o item caro e o que realmente fecha os buracos que o lint não cobre.
2. ~~**Fechar as decisões em aberto**~~ — ✅ feito em 2026-08-24: schema `o_jogo`, snake_case, cadastro fechado, cartas no Postgres. Ver a seção *Decisões fechadas*.
3. **Migrations + RLS + RPCs** de economia — resolve segurança e races de uma vez.
4. **Padronizar `id`** e consertar o deck editor.
5. **Limpar o legado** (`cardsPresenter`, `databaseActions`, styled-components, lobby/game).
6. **Modelar os efeitos das cartas** — é o que destrava o jogo.

---

## Estado da migração para `o_jogo`

Migrations **aplicadas** ao banco em 2026-08-24, incluindo a `0006` da auditoria de RLS. ⚠️ **Pendente: `20260824000007_rpc_match.sql`** — as RPCs de partida (`create_match`, `join_match`, `reorder_match_players`, `start_match`) e a entrada das tabelas na publication do realtime. Sem ela o botão *Jogar* e o lobby não funcionam. A `0005` corrigiu um `42P17` (recursão infinita) nas policies da 0003, que derrubava até o login. O cliente já fala com o schema novo em: perfil, coleção, loja/compra, venda e decks.

**Nenhuma tela aponta mais para tabela legada.** `lobby` e `game` foram reescritos sobre `o_jogo.matches`/`o_jogo.match_players`, e `actions/controls/matchActions.js` foi apagado junto de `actions/database/databaseActions.js`.

✅ **O backfill não será usado.** Optou-se por resetar: os dados legados foram descartados e o jogador é criado do zero. `supabase/manual/backfill_from_legacy.sql` fica no repositório como registro do que existia, mas não deve ser executado — as tabelas legadas foram renomeadas para `*_legacy` e seus `idAuth` foram zerados pela FK `set null`, então o join dele não encontraria ninguém.

---

## Pegadinhas da instância compartilhada

Coisas que não se descobre lendo o repositório, e que custaram algumas horas em 2026-08-24.

- **`o_jogo` precisa estar em *Project Settings → API → Exposed schemas*.** Sem isso o PostgREST rejeita toda request com **406 / `PGRST106`**, antes de tocar em tabela, RLS ou usuário. O SQL Editor **não** passa pelo PostgREST, então migrations rodam normalmente e escondem o problema. Foi a causa raiz do login quebrado — e o sintoma é idêntico ao de "zero linhas", o que despista.
- **Havia um trigger `on_auth_user_created` em `auth.users`**, de outro projetinho, chamando `public.handle_new_user()` para inserir em `public.users (id, display_name)`. A tabela não existia mais, então **toda** criação de usuário na instância falhava com `42P01` → 500 "Database error creating new user". O trigger foi removido; a função `public.handle_new_user()` ficou. Nenhum projeto perdeu comportamento: sem a tabela, ele já não funcionava para ninguém.
- **Criar jogador é sempre em dois passos**, justamente porque não há mais trigger: criar em *Authentication → Users* (com **Auto Confirm User**), depois `insert into o_jogo.users (id_auth, name, coins)`. Se isso virar rotina, vale um trigger próprio apontando para `o_jogo.users`.
- **FK legada com `on delete set null`.** `public."oJogo-users"."idAuth"` apontava para `auth.users` com `SET NULL` — apagar usuários no auth **zerou o vínculo** de todas as linhas legadas em vez de bloquear ou cascatear. As nossas FKs usam `cascade`, mas fica o alerta para qualquer tabela antiga que sobre.

---

## Como aplicar as migrations

Nada foi executado contra o banco ainda — os arquivos existem, mas o Supabase segue com o schema antigo.

1. No painel: *API Settings → Exposed schemas*, adicionar `o_jogo`.
2. `npx supabase link` e depois `npx supabase db push` (ou colar os 4 arquivos no SQL Editor, na ordem do nome).
3. Passar `{ db: { schema: 'o_jogo' } }` em `supabase/client.js` e `supabase/server.js`.
4. Só então rodar `supabase/manual/backfill_from_legacy.sql`, **depois de conferir os nomes de coluna** contra a base real — eles foram deduzidos do código, não lidos do banco.
5. Trocar `buyPack`/`sellCard` de `presenters/usersPresenter.js` por `supabase.rpc('buy_pack', ...)` / `rpc('sell_card', ...)`, e a leitura de `user.cards` por `o_jogo.user_cards`.

⚠️ Os passos 3 e 5 são o **corte**: até eles, o app continua falando com as tabelas antigas. As migrations não quebram nada sozinhas, mas também não resolvem nada sozinhas.

---

## Já resolvido

- **Reescrita do lobby (2026-08-24)** — fecha o último bloqueador 🔴 (`generateId`), o realtime vazando entre projetinhos, as tabelas legadas nas telas de partida, as props fantasma, o matchmaking morto do home e 3 dos 4 warnings de `exhaustive-deps`. `styled-components` saiu do projeto. `game` continua esqueleto de propósito: falta regra de partida.

- **Auditoria de RLS (2026-08-24)** — as 8 tabelas do `o_jogo` conferidas policy a policy. O desenho da 0003/0005 se sustentou: economia fechada para escrita do cliente, nenhuma policy contente com JWT válido, nenhum `service_role` no repositório. Os 4 furos achados estão na migration 0006, aplicada em 2026-08-24. Auditoria repetível em `supabase/manual/audit_rls.sql`.

- **Faxina de bugs de cliente (2026-08-24)** — 9 itens fechados de uma vez, todos locais e sem dependência do painel do Supabase: `usePersistentState` no SSR, login no Enter, filtro por índice na coleção, ordenação da loja (+ typo `dateRealease`), `insertRecord` sem checar `error`, `console.log` de debug, imagem órfã, `.env.example` e `next.config.mjs`. `npm run lint` em exit 0 com os mesmos 4 warnings; `npm run build` passa.

- **Bugs de crash em runtime** — middleware sem proteção, `useUser()` desestruturado errado no lobby e no game, import `{ Loading }` inexistente e loading eterno do `UserProvider`. Detalhes marcados como `[x]` nas seções acima. `npm run lint` continua em exit 0 com os mesmos 4 warnings de `exhaustive-deps`.

- **ESLint configurado** (`eec8a83`) — `eslint` + `eslint-config-next` nas devDependencies, `.eslintrc.json` e `.eslintignore`. `npm run lint` sai com **exit 0** (4 warnings de `exhaustive-deps`, listados acima).
- **Erros do lint corrigidos** (`28cccae`):
  - Rules of Hooks no `PackDetailsModal` — os `useState` subiram para antes do `if (pack == null) return null`.
  - `ErrorMessage` usado sem import em `PasswordInput.jsx` → crash na tela de erro de login. **Bug que não estava nesta lista**, achado pelo lint.
  - 7 imports mortos removidos (`home`, `game`, `app/page.jsx`).
