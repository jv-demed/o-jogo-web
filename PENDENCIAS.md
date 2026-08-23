# O JOGO — Pendências da base

Levantamento completo dos problemas da base existente, feito antes de retomar o projeto para construir o jogo jogável. O objetivo é zerar esta lista.

**Contexto do Supabase:** o projeto Supabase é compartilhado entre vários projetinhos pessoais (limite da conta free). Isso significa banco único, `auth.users` único e anon key única para todos eles. Várias pendências abaixo existem por causa disso.

**Stack:** Next.js 14 (App Router, JS), React 18, Tailwind v4, styled-components (legado), Supabase (`@supabase/ssr`), react-icons.

---

## Decisões em aberto

Precisam ser fechadas antes de mexer no banco, porque tudo depois depende delas.

- [ ] **Namespace das tabelas.** Recomendado: schema dedicado (`o_jogo.users`, `o_jogo.decks`, ...), que permite `supabase db diff --schema o_jogo` e isola dos outros projetinhos. Alternativa: prefixo no `public` — nesse caso usar `o_jogo_users` (underscore) em vez de `o_jogo-users`, para evitar aspas duplas em toda referência SQL.
- [ ] **Colunas em snake_case?** Hoje são camelCase (`idAuth`, `idUser`, `dateRealease` — com typo). Mesma dor de aspas do hífen. A renomeação sai barata agora, junto com a migração das tabelas.
- [ ] **Cadastro aberto ou por convite?** Como o `auth.users` é compartilhado, qualquer pessoa cadastrada em outro projetinho já tem JWT válido aqui.
- [ ] **Onde as cartas moram** — bundle JS (hoje) ou tabela no Postgres. O servidor precisa conhecê-las para validar jogadas.

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

### 2. Middleware de autenticação não protege nada

- [ ] `supabase/middleware.js:35` — `!request.nextUrl.pathname.startsWith('/')` é **sempre falso**, porque todo pathname começa com `/`. O redirect nunca dispara; o middleware só renova o cookie. A única proteção real hoje é o redirect client-side do `UserProvider`.
- [ ] Definir a lista de rotas públicas de verdade (`/` e assets) e redirecionar o resto.

### 3. Race condition de leitura-modificação-escrita

- [ ] `buyPack`/`sellCard` fazem `{ ...userObj, cards: [...] }` a partir de um snapshot do `UserProvider`. Duas abas, ou compra logo após venda, sobrescrevem uma à outra (lost update). Só resolve com RPC atômica.
- [ ] **`generateId` gera id no cliente** (`actions/database/databaseActions.js:29`) pegando o último item de um `select` **sem `order by`**. Não determinístico e colide com concorrência. Substituir por `identity`/`uuid` no banco e apagar a função. É a causa raiz do que estava no `bugs.txt`.

### 4. Deck editor grava dados corrompidos

Confirmado nos dados: **`id` e `number` divergem em 53 das 116 cartas** — o `number` reinicia a cada pack (a carta `id: 64` tem `number: 1`).

- [ ] `app/(auth)/decks/[id]/page.jsx:101` salva `cards: selectedCards.map(c => c.number)`, mas `user.cards` armazena **`id`**. Na releitura, a linha 48 cruza id com number e traz a carta errada. Qualquer deck com carta de pack 2 ou 3 volta errado.
- [ ] Padronizar **`id` como chave única global**; `number` vira só o rótulo impresso na arte.
- [ ] Teste de integridade sobre `assets/cards.js` (id único, imagem existente, pack válido).

---

## 🟠 Bugs de lógica e React

- [ ] **`usePersistentState` quebra no SSR** — `hooks/usePersistentState.jsx:6` lê `localStorage` no inicializador do `useState`, que roda no server durante o prerender. `ReferenceError` ou hydration mismatch.
- [ ] **`useUser()` desestruturado errado em lobby e game** — `app/(auth)/lobby/[id]/page.jsx:56` e `app/(auth)/game/[id]/page.jsx:24` fazem `const user = useUser()`, mas o hook retorna `{ user, refreshUser }`. `user.id` e `user.position` são sempre `undefined` → **todo mundo fica preso em "Aguardando o host..."**.
- [ ] **Comparação de objeto com string** — `lobby/[id]/page.jsx:88`: `match.obj == 'progress'` (deveria ser `match.obj?.status`); e o push é pra `/game` sem id.
- [ ] **Import inexistente** — o lobby importa `{ Loading }` de `SpinLoader`, que exporta `SpinLoader`. Crash na renderização. ⚠️ **O ESLint não pega isso** (tentamos `import/named`: a regra não dispara com o parser do Next). Quem pega é o `npm run build`: `Attempted import error: 'Loading' is not exported`. Rodar o build no CI, não só o lint.
- [ ] **`CardDetailsModal` sem `user` no editor de deck** — `decks/[id]/page.jsx:216` não passa `user` nem `refresh`, e o modal faz `user.cards.filter(...)` → crash ao abrir detalhe de carta ali.
- [ ] **Loading eterno** — `providers/UserProvider.jsx:47`: `setIsLoading(false)` só é chamado no caminho de sucesso. Se `getUser()` falhar, o spinner nunca sai.
- [ ] **Dois `useEffect` disputando `userCards`** no editor de deck (linhas 28 e 45) — um sobrescreve o outro, causando flicker e ordem imprevisível.
- [ ] **Cartas repetidas não são suportadas no deck** — `handleAddCard`/`handleRemoveCard` usam `findIndex(c => c.id === card.id)`, apesar de a coleção permitir repetição.
- [ ] **Filtro por índice em vez de id** — `app/(auth)/colecao/page.jsx:73` usa `cards.idPack == i+1` (índice do `map`) em vez de `pack.id`.
- [ ] **Loja não ordena os packs** — `app/(auth)/loja/page.jsx:26` itera `PACKS` na ordem literal do array. `dateRealease` (typo) não é usado.
- [ ] **`insertRecord` estoura em erro** — `supabase/crud.js:9` faz `return data[0]` sem checar `error`.
- [ ] **Login não funciona no Enter** — `components/containers/Form.jsx` recebe `onSubmit`, mas `app/page.jsx` não passa nenhum; o botão `type='submit'` dispara via `onClick`.
- [ ] **Não existe logout nem cadastro** — `services/AuthService.js` só tem `login`. Falta `signOut`, `signUp` e recuperação de senha.
- [ ] **Realtime sem filtro e vazando entre projetos** — `supabase/realtime.js` escuta `{ event: '*', schema: 'public' }` com nome de canal fixo. No banco compartilhado, isso é *toda mudança em toda tabela de todos os projetinhos*. Filtrar por schema e por partida.
- [ ] **Adicionar as tabelas à publication do realtime** — `ALTER PUBLICATION supabase_realtime ADD TABLE o_jogo.matches`.
- [ ] Após vender a última cópia de uma carta, o `selectedCardIndex` do modal fica apontando pro índice errado (hoje mascarado pelo `disabled={repetitions == 1}`).
- [ ] **4 warnings de `exhaustive-deps` sobraram** no lint — `lobby/[id]/page.jsx:83,87,95` (`match.refresh`, `players`, `router`) e `AutoFitText.jsx:20` (`maxHeight`). Não corrigidos de propósito: mexer em array de dependência muda comportamento em runtime, e os 3 do lobby morrem junto com a reescrita do lobby.

---

## 🟡 Código legado / dívida técnica

- [ ] **Apagar `presenters/cardsPresenter.js`** — duplica `getCardTypeName`/`getCardTypeIcon` de `types/CardType.js` usando **id numérico** de tipo, enquanto o resto do projeto usa string. Ninguém importa.
- [ ] **Consolidar as 3 camadas de dados concorrentes**: `actions/database/databaseActions.js` (antiga), `supabase/crud.js` (nova) e queries inline no `UserProvider`/hooks. Escolher uma: repositórios por entidade.
- [ ] **Reescrever `lobby`, `game`, `GameTable` e `Opponent`** — usam styled-components com `theme.content`/`theme.primary`, mas **não existe `ThemeProvider`** no projeto, então todas as cores saem `undefined`. Depois, remover styled-components do `package.json`.
- [ ] **Props fantasma**: `<Box $fullHeight>` (o componente aceita `fullH`), `<Main $justifyContent>` em `UserProvider.jsx:58` (aceita `between`), `ActionButton name=` no lobby (aceita `text`).
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
- [ ] **Regras de economia para o Postgres** (`buy_pack`, `sell_card`) com as migrations versionadas em `supabase/migrations/`. Hoje não há **nenhum** registro do schema no repo — o banco é conhecimento tácito.
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
2. **Fechar as decisões em aberto** (namespace, snake_case).
3. **Migrations + RLS + RPCs** de economia — resolve segurança e races de uma vez.
4. **Padronizar `id`** e consertar o deck editor.
5. **Limpar o legado** (`cardsPresenter`, `databaseActions`, styled-components, lobby/game).
6. **Modelar os efeitos das cartas** — é o que destrava o jogo.

---

## Já resolvido

- **ESLint configurado** (`eec8a83`) — `eslint` + `eslint-config-next` nas devDependencies, `.eslintrc.json` e `.eslintignore`. `npm run lint` sai com **exit 0** (4 warnings de `exhaustive-deps`, listados acima).
- **Erros do lint corrigidos** (`28cccae`):
  - Rules of Hooks no `PackDetailsModal` — os `useState` subiram para antes do `if (pack == null) return null`.
  - `ErrorMessage` usado sem import em `PasswordInput.jsx` → crash na tela de erro de login. **Bug que não estava nesta lista**, achado pelo lint.
  - 7 imports mortos removidos (`home`, `game`, `app/page.jsx`).
