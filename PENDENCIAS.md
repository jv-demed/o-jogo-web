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

- [ ] **Sorteio do pack acontece no navegador** — `components/cards/PackDetailsModal.jsx:31` faz `sort(() => Math.random() - 0.5)` e manda os ids escolhidos pro banco. O jogador escolhe as cartas que quiser. Virar RPC `SECURITY DEFINER` que sorteia, debita e grava atomicamente.
- [ ] **Validação de saldo só no cliente** — `PackDetailsModal.jsx:26`. Nada impede coins negativos.
- [ ] **`buyPack` e `sellCard` fazem UPDATE direto do browser** — `presenters/usersPresenter.js`. O preço de venda (`card.level * 10`) também é calculado no cliente.
- [ ] **Auditar RLS** em todas as tabelas do jogo: `SELECT` só do próprio registro; `UPDATE` bloqueado nas colunas `coins`/`cards` — mutação só via RPC.
- [ ] **Policies precisam checar participação no jogo**, não só `auth.uid() is not null` — o pool de usuários é compartilhado entre projetos.
- [ ] **Não usar `service_role` no app.** No banco compartilhado essa chave é mestra de *todos* os projetinhos. Só RPC `SECURITY DEFINER` com anon key.

### 2. ~~Middleware de autenticação não protege nada~~ ✅ resolvido

- [x] `supabase/middleware.js` — a condição sempre-falsa `!pathname.startsWith('/')` virou `!isPublicPath(pathname)`.
- [x] Lista de rotas públicas explícita: `PUBLIC_PATHS = ['/']` (a tela de login). Todo o resto vive em `app/(auth)` e agora é redirecionado de verdade. Assets já eram excluídos pelo `matcher` do `middleware.js` da raiz.

### 3. Race condition de leitura-modificação-escrita

- [ ] `buyPack`/`sellCard` fazem `{ ...userObj, cards: [...] }` a partir de um snapshot do `UserProvider`. Duas abas, ou compra logo após venda, sobrescrevem uma à outra (lost update). Só resolve com RPC atômica.
- [ ] **`generateId` gera id no cliente** (`actions/database/databaseActions.js:29`) pegando o último item de um `select` **sem `order by`**. Não determinístico e colide com concorrência. Substituir por `identity`/`uuid` no banco e apagar a função. É a causa raiz do que estava no `bugs.txt`.

### 4. Deck editor grava dados corrompidos

Confirmado nos dados: **`id` e `number` divergem em 53 das 116 cartas** — o `number` reinicia a cada pack (a carta `id: 64` tem `number: 1`).

- [ ] `app/(auth)/decks/[id]/page.jsx:101` salva `cards: selectedCards.map(c => c.number)`, mas `user.cards` armazena **`id`**. Na releitura, a linha 48 cruza id com number e traz a carta errada. Qualquer deck com carta de pack 2 ou 3 volta errado.
- [ ] Padronizar **`id` como chave única global**; `number` vira só o rótulo impresso na arte.
- [x] ~~Teste de integridade sobre `assets/cards.js`~~ — `scripts/gen-catalog-seed.mjs` gera o seed e valida na mesma passada: 116 ids únicos, nenhuma carta sem arte, packs 1–3 válidos, os 7 tipos batendo com o enum. Confirmou também as 53 divergências `id`/`number` e a órfã `Gladsxódia.png`.

---

## 🟠 Bugs de lógica e React

- [ ] **`usePersistentState` quebra no SSR** — `hooks/usePersistentState.jsx:6` lê `localStorage` no inicializador do `useState`, que roda no server durante o prerender. `ReferenceError` ou hydration mismatch.
- [x] ~~**`useUser()` desestruturado errado em lobby e game**~~ — corrigido para `const { user } = useUser()` nos dois arquivos.- [ ] **Comparação de objeto com string** — `lobby/[id]/page.jsx:88`: `match.obj == 'progress'` (deveria ser `match.obj?.status`); e o push é pra `/game` sem id.
- [x] ~~**Import inexistente**~~ — o lobby importava `{ Loading }` de `SpinLoader`, que exporta `SpinLoader`. Crash na renderização. **Corrigido**: import e os 3 usos passaram a `SpinLoader`. ⚠️ **O ESLint não pega isso** (tentamos `import/named`: a regra não dispara com o parser do Next). Quem pega é o `npm run build`: `Attempted import error: 'Loading' is not exported`. Rodar o build no CI, não só o lint.
- [ ] **`CardDetailsModal` sem `user` no editor de deck** — `decks/[id]/page.jsx:216` não passa `user` nem `refresh`, e o modal faz `user.cards.filter(...)` → crash ao abrir detalhe de carta ali.
- [x] ~~**Loading eterno**~~ — `providers/UserProvider.jsx`: `setIsLoading(false)` agora roda em `.finally()`, e o caminho de falha renderiza `ErrorMessage` em vez de spinner infinito. O erro do Supabase é guardado em estado (`setError`) nos dois pontos de saída de `getUser()`.
- [ ] **Dois `useEffect` disputando `userCards`** no editor de deck (linhas 28 e 45) — um sobrescreve o outro, causando flicker e ordem imprevisível.
- [ ] **Cartas repetidas não são suportadas no deck** — `handleAddCard`/`handleRemoveCard` usam `findIndex(c => c.id === card.id)`, apesar de a coleção permitir repetição.
- [ ] **Filtro por índice em vez de id** — `app/(auth)/colecao/page.jsx:73` usa `cards.idPack == i+1` (índice do `map`) em vez de `pack.id`.
- [ ] **Loja não ordena os packs** — `app/(auth)/loja/page.jsx:26` itera `PACKS` na ordem literal do array. `dateRealease` (typo) não é usado.
- [ ] **`insertRecord` estoura em erro** — `supabase/crud.js:9` faz `return data[0]` sem checar `error`.
- [ ] **Login não funciona no Enter** — `components/containers/Form.jsx` recebe `onSubmit`, mas `app/page.jsx` não passa nenhum; o botão `type='submit'` dispara via `onClick`.
- [ ] **Não existe logout** — `services/AuthService.js` só tem `login`. Falta `signOut` e recuperação de senha. ~~`signUp`~~ saiu de escopo: os usuários são criados manualmente pelo dono (decisão de 2026-08-24).
- [ ] **Realtime sem filtro e vazando entre projetos** — `supabase/realtime.js` escuta `{ event: '*', schema: 'public' }` com nome de canal fixo. No banco compartilhado, isso é *toda mudança em toda tabela de todos os projetinhos*. Filtrar por schema e por partida.
- [ ] **Adicionar as tabelas à publication do realtime** — `ALTER PUBLICATION supabase_realtime ADD TABLE o_jogo.matches`.
- [ ] Após vender a última cópia de uma carta, o `selectedCardIndex` do modal fica apontando pro índice errado (hoje mascarado pelo `disabled={repetitions == 1}`).
- [ ] **4 warnings de `exhaustive-deps` sobraram** no lint — `lobby/[id]/page.jsx:83,87,95` (`match.refresh`, `players`, `router`) e `AutoFitText.jsx:20` (`maxHeight`). Não corrigidos de propósito: mexer em array de dependência muda comportamento em runtime, e os 3 do lobby morrem junto com a reescrita do lobby.

---

## 🟡 Código legado / dívida técnica

- [ ] **Apagar `presenters/cardsPresenter.js`** — duplica `getCardTypeName`/`getCardTypeIcon` de `types/CardType.js` usando **id numérico** de tipo, enquanto o resto do projeto usa string. Ninguém importa.
- [ ] **Consolidar as 3 camadas de dados concorrentes**: `actions/database/databaseActions.js` (antiga), `supabase/crud.js` (nova) e queries inline no `UserProvider`/hooks. Escolher uma: repositórios por entidade.
- [ ] **Reescrever `lobby`, `game`, `GameTable` e `Opponent`** — usam styled-components com `theme.content`/`theme.primary`, mas **não existe `ThemeProvider`** no projeto, então todas as cores saem `undefined`. Depois, remover styled-components do `package.json`.
- [ ] **Props fantasma**: `<Box $fullHeight>` (o componente aceita `fullH`) e `ActionButton name=` no lobby (aceita `text`). ~~`<Main $justifyContent>` no `UserProvider`~~ ✅ removida — `Main` só aceita `between` como booleano (`justify-between`/`justify-start`), não existe valor `'center'`.
- [ ] **Remover `console.log` de debug** — `components/game/GameTable.jsx:30` e `app/(auth)/game/[id]/page.jsx:32`.
- [ ] **Descomentar ou remover o matchmaking morto** em `app/(auth)/home/page.jsx:10-23`. ⚠️ Os 5 imports que alimentavam esse bloco (`useEffect`, `useDataObj`, `useUser`, `getRealtime`/`removeChannel`, `createMatch`) **já foram removidos** na limpeza do lint — se for descomentar, precisa readicioná-los.
- [ ] **`PACK_CATEGORIES`, `insertPurchase` e `incPurchase`** em `presenters/packsPresenter.js` são dead code — decidir se o histórico de compras entra de verdade ou some.
- [ ] **Migrar `bugs.txt` para issues** do repositório.
- [ ] **Imagem órfã** `public/cards/Gladsxódia.png` — não corresponde a nenhuma carta (o loader espera `{id}.png`).

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
- [ ] **`.env.example`** com as duas chaves públicas (o `.env.local` já está fora do git).
- [ ] **`next.config.mjs` está vazio** — configurar `images` (webp/avif) e `reactStrictMode`.
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

- **Bugs de crash em runtime** — middleware sem proteção, `useUser()` desestruturado errado no lobby e no game, import `{ Loading }` inexistente e loading eterno do `UserProvider`. Detalhes marcados como `[x]` nas seções acima. `npm run lint` continua em exit 0 com os mesmos 4 warnings de `exhaustive-deps`.

- **ESLint configurado** (`eec8a83`) — `eslint` + `eslint-config-next` nas devDependencies, `.eslintrc.json` e `.eslintignore`. `npm run lint` sai com **exit 0** (4 warnings de `exhaustive-deps`, listados acima).
- **Erros do lint corrigidos** (`28cccae`):
  - Rules of Hooks no `PackDetailsModal` — os `useState` subiram para antes do `if (pack == null) return null`.
  - `ErrorMessage` usado sem import em `PasswordInput.jsx` → crash na tela de erro de login. **Bug que não estava nesta lista**, achado pelo lint.
  - 7 imports mortos removidos (`home`, `game`, `app/page.jsx`).
