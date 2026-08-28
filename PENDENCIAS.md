# O JOGO — Pendências da base

O que ainda falta. Itens concluídos saem daqui — o histórico está no git.

**Contexto do Supabase:** o projeto Supabase é compartilhado entre vários projetinhos pessoais (limite da conta free). Banco único, `auth.users` único e anon key única para todos. Várias pendências abaixo existem por causa disso.

**Stack:** Next.js 14 (App Router, JS), React 18, Tailwind v4, Supabase (`@supabase/ssr`), react-icons.

---

## Restrições já decididas

Fechadas em 2026-08-24 e aplicadas. Não são pendências — estão aqui porque os itens abaixo dependem delas.

- **Schema dedicado `o_jogo`**, colunas em snake_case. Migrations 0001–0007 aplicadas. A 0009 (assentos de bot) já está aplicada. Falta aplicar, na ordem: a 0008 (`users.is_dev`, para as ferramentas de dev — depois de rodá-la, marque o seu jogador com `update o_jogo.users set is_dev = true where name = '<você>'`) e a **0010** (`matches.state` e a fila `match_commands`, abaixo).
- **Cadastro fechado**: usuários criados manualmente pelo dono, sem fluxo de signup. Policies checam participação no jogo via `o_jogo.current_player_id()`, nunca só `auth.uid() is not null`.
- **`o_jogo.cards` é a fonte única** de id, nível, preço, tipo, pack e efeito, para o servidor validar jogada e preço dentro da RPC. A arte continua estática em `public/cards/{id}.png`.
- **Economia só por RPC** (`buy_pack`, `sell_card`): não existe grant de `UPDATE` em `o_jogo.users` para o cliente.

---

## 🎮 Pré-requisito para o jogo em si

- [ ] **Levar o efeito estruturado para `o_jogo.cards`.** As 116 cartas já estão modeladas como dados — `domain/cards/effects/pack{1,2,3}.js`, vocabulário em `domain/cards/vocabulary.js`, `npm run validate:effects` verde com cobertura 116/116. Falta a outra metade: quem valida a jogada é o servidor, então o efeito precisa de uma coluna (`effect jsonb`) em `o_jogo.cards`, e o `scripts/gen-catalog-seed.mjs` precisa emiti-la junto com o resto do catálogo. O `text` continua sendo a fonte narrativa: quando os dois discordarem, o texto ganha.

  Cartas cuja leitura ficou em aberto e que merecem uma decisão de regra antes de existir resolvedor: **74 Extreme Zero** (a escolha é por missão, não por jogador — virou alvo `manual`), **79 Largando a Medicina** (o texto não diz quem recebe a metade dos shots), **85 Jp da Ganância** ("até a mão se estabilizar" não tem duração equivalente no vocabulário, ficou em nota), **101 Valeu Valeu** e **105 Não é o Momento** (dependem do alvo da jogada em curso, e não do alvo da própria carta).

- [ ] **Servidor autoritativo.** A partida já vive no banco (migration 0010): `matches.state` guarda o estado, `matches.state_version` ordena as gravações e `match_commands` é a fila por onde joga quem não é host. Mas **quem aplica o `apply` é o browser do host** — é ele que roda o motor, comanda os bots e regrava o estado; os outros leem por realtime.

  Isso é deliberado e é o que pôs a mesa de pé sem duplicar a regra em plpgsql, mas cobra três coisas que valem estar escritas: **o host vê a mão de todo mundo** (o estado inteiro passa pela aba dele), **o host pode trapacear** (nada confere o que ele grava) e **se o host fecha a aba, a mesa para** — ela não se perde, o estado está gravado, mas ninguém a conduz até ele voltar.

  A saída é a mesma de sempre, e agora com o caminho pronto: uma Edge Function em Deno importando `domain/match/`, com a RPC aplicando o comando do lado do servidor. O que muda quando ela existir é pouco — `useTableMatch` para de chamar `apply` e passa a enfileirar como o convidado já faz, e `match_commands` deixa de ser fila do host para ser fila do servidor. O `apply` continua sendo a única porta, que é o que a camada pura sempre foi feita para permitir.

- [ ] **Baralho da mesa é sorteado, não escolhido.** Todo assento da partida do lobby entra com 20 cartas sorteadas do catálogo, humano ou bot (`createSeatedMatch`). O deck montado em `/decks` não entra ainda por um motivo de RLS e não de UI: `decks_own` só libera o dono, então o host — que é quem monta a mesa — não consegue ler o deck de mais ninguém. Resolver exige uma RPC `match_decks(p_id_match)` em SECURITY DEFINER, e antes disso uma decisão: qual dos decks do jogador é *o* deck da partida, já que não existe deck ativo no schema.

- **Mesa mista, fechada.** O lobby monta a mesa com humanos e bots juntos (migration 0009: assento sem dono em `match_players`, com `add_match_bot` / `remove_match_bot` e `reorder_match_seats`), e `/game/[id]` joga essa mesa de verdade (migration 0010).

  Não é um terceiro modo, e essa é a decisão: o motor nunca soube o que é um bot — `createMatch({ players })` só quer `{ id, name, deck }` e `botCommand()` devolve um comando que qualquer jogador poderia mandar. O que varia entre solo e mesa do lobby é **quem comanda cada assento** e **onde o estado mora**, nada mais. Por isso `BOT_NAMES`/`isBot` vivem em `bot.js`, montar mesa virou `setup.js` (`createSeatedMatch`, que o solo também usa), os bots e o relógio da janela viraram `useMatchDriver` (com `active`, que é como o convidado não dirige a mesa junto) e a tela virou `components/game/MatchScreen.jsx`, desenhada igual pelos dois.

- [ ] **Missões como carta.** Hoje a missão é sorteada direto no `createMatch` e vive só no estado. Virar carta (com arte, como as outras) é o próximo passo — o motor já trata identidade e missão como um par só, então é trabalho de catálogo e de UI, não de regra.

---

## 🤖 Modo solo

Jogável em `/solo`: você contra 1 a 6 bots, tudo no browser, sem passar pelo Supabase. Nasceu porque o motor é puro e dava para jogar antes de a partida existir no banco; continua existindo depois disso por outro motivo — é a única partida que começa em um toque, sem sala, sem link e sem ninguém do outro lado, que é o que se quer para provar uma carta. Nada é salvo: recarregar recomeça. A mesa desenhada é a mesma da partida do lobby (`components/game/MatchScreen.jsx`), então o que se testa aqui é a tela de verdade.

- **Bots** (`domain/match/bot.js`): não são adversário esperto e não tentam ser. Guardam carta de reação para a janela, só reagem quando a carta na pilha ia fazer eles beberem, e miram quem tem menos shots — sem saber as missões, espalhar é o único palpite razoável. O que importa é que jogam sempre e jogam legal.
- **Baralho aleatório** de 20 cartas por jogador (`DECK_SIZE`, em `domain/match/setup.js`), sorteado do catálogo inteiro ou só da sua coleção.
- **Ritmo**: `useMatchDriver` dá 900ms de "pensamento" por comando de bot e toca o relógio da janela a cada 200ms — sem o atraso, a partida inteira resolveria num frame. É o mesmo motor de ritmo da mesa do lobby, onde só o host o liga (`active`): se o convidado também dirigisse, cada bot jogaria uma vez por aba aberta.

- **Ferramentas de dev** (`domain/match/dev.js`, `components/dev/`): quem tem `o_jogo.users.is_dev` vê a alça **DEV** no canto da mesa e um botão ao lado de "Comprar carta" para escolher a carta que vem. Hoje dá para escolher a compra, pôr carta direto na mão, revelar missões e mãos dos bots, pausar os bots (com passo a passo) e fechar a janela de interferência na marra.

  ⚠️ **Poder de dev nunca vira comando do motor, e não sai do solo.** Não existe `Command.devDraw`: um comando de dev aceito pelo `apply` seria trapaça de verdade no multijogador. E o painel não aparece na mesa do lobby (`MatchScreen` só o monta com a prop `dev`, que só o solo passa): os poderes mudam o estado por fora do `apply`, e por fora do `apply` nada é gravado — na mesa do host isso dessincronizaria a tela dele da dos outros. Os poderes são funções puras em `domain/match/dev.js` que recebem o estado e devolvem outro — chamadas só pelo `useSoloMatch`, que roda em memória. Por isso `domain/match/index.js` **não** reexporta esse arquivo. Pelo mesmo motivo, escolher a compra *empilha o baralho* e deixa o `Command.draw` normal acontecer, em vez de inventar uma compra especial: a jogada de teste percorre o caminho real. Toda cirurgia entra no `state.log` como `dev.*` e aparece narrada no log da partida.

Pendências do solo:

- [ ] **Nada é persistido.** Fechar a aba perde a partida. O `usePersistentState` já existe e resolveria, mas só vale a pena se o solo virar mais que bancada de teste.
- [ ] **Escolha de carta** (`kind: 'cards'` — descartar, dar, roubar escolhendo) ainda cai no default do resolvedor: as primeiras da mão. O motor já sabe pedir; falta a tela oferecer.
- [ ] **Ferramentas de dev, segunda leva.** Falta o que encurta teste de *partida*, e não de carta: semente fixa no setup (o `rng.js` já foi escrito para isso) e visível na mesa, ajustar shots e trocar missão de qualquer um, esvaziar baralho / encerrar agora para cair direto na apuração, e copiar/colar o `state` em JSON — que sai quase de graça, já que o estado é JSON puro por decisão de projeto.
- [ ] **`chooser: 'table'`** (voto da mesa) decide como se fosse quem jogou. Voto de verdade precisa de mecânica que não existe.

---

## 🎲 Regras da partida — fechadas em 2026-08-26

Decididas e implementadas em `domain/match/`. Não são pendências; estão aqui porque os itens acima dependem delas e porque nenhuma se deduz do código sozinha.

- **Turno:** o jogador da vez compra 1 (fica com 6) e joga 1. Mão inicial de 5, baralho próprio por jogador.
- **Todo shot para a mesa.** Quando alguém tem que beber, a partida congela até essa pessoa confirmar (`Command.drank`): o shot acontece na mesa de verdade, e o jogo não segue sem que tenha acontecido. A fila é `state.drinks` e vive no estado, não num aviso do cliente — é regra, e quem a impõe é o `apply`, que recusa qualquer outro comando enquanto houver alguém devendo (o `tick` é a única exceção, e sai sem fazer nada: ele é chamado a cada 200ms e recusar cada um encheria a tela de erro). Quem confirma por último devolve os 10s inteiros da janela, senão a carta resolveria no instante seguinte porque alguém demorou para beber. Bot bebe na hora — do lado dele não há ninguém para beber.
- **Alvo antes da janela.** Quem joga uma carta que manda escolher jogador escolhe *antes* de a janela abrir: a jogada é declarada (carta + alvos), e só então a mesa tem os 10s para interferir. Interferir sem saber em quem a carta bate não é decisão, é adivinhação. Quem pergunta é a *declaração* (`engine.js`), que ensaia os efeitos numa cópia descartável — a pergunta seguinte de uma carta pode depender do efeito da anterior (`sameTarget`, `then`), então não dá para descobrir o que ela pergunta sem deixá-la rodar. Nada do ensaio vale: o estado só muda quando a janela fecha. Só o que aponta jogador (`choose`, `manual`) é declarado; `optIn`, `option` e `cards` são decisão de quem sofre o efeito e continuam esperando a resolução.
- **Carta de efeito prolongado fica na mesa.** Ela não vai para o descarte quando resolve: fica na área do jogador sob o efeito (a pilha na cadeira, em `Seat`), e só cai no descarte quando a duração acaba (`releaseOngoingCard`). Vários efeitos podem estar ativos no mesmo jogador ao mesmo tempo, e o toque na pilha abre o que ainda vale e por quanto tempo.
- **Duração de `onTargetTurn` conta as vezes do alvo**, e não os turnos da mesa: "na vez dele, pelos próximos 3 turnos" (carta 1) são três vezes *dele*. Contando turno de mesa, numa mesa de cinco a carta pegaria o alvo uma vez só. Quem vence essa duração é o disparo do efeito; as outras (`eachTurn`, `delayed`) continuam vencendo no relógio do turno.
- **Janela de interferência:** toda carta jogada fica na pilha por 10s antes de resolver. Quem tem carta de reação (qualquer efeito com `timing: reaction` — os tipos *defesa* e *rápido* do catálogo) pode entrar; todo mundo passando fecha a janela antes do tempo. A pilha resolve do topo para a base, então a reação resolve antes da carta que ela responde — é assim que cancelar chega a tempo de cancelar.
- **Fim da partida:** quando um baralho acaba. Sem reembaralhar o descarte: com reembaralho nenhuma mesa termina sozinha, só por carta de fim de jogo, e o tamanho do deck deixa de significar alguma coisa. Assim quem monta o deck escolhe o comprimento da partida.
- **Missões:** uma por jogador, secreta, sorteada sem reposição. Mesa de 2 a 7; com menos de 7, sobram missões fora do jogo, e carta que fala de missão ausente simplesmente não acha alvo. Empate no extremo (mais/menos shots) dá vitória a todos os empatados.
- **Sjehnsens:** a partida para em `guessing` antes de apurar, para ele apontar quem é quem. Palpite faltando conta como erro.
- **Stanley × Smichaels:** as duas missões perguntam pelo resultado alheio, então a apuração tem duas passadas e a segunda não se lê a si mesma — senão as duas ficam em referência circular. O corte é arbitrário; é o mesmo que a mesa faz no olho.
- **Aleatoriedade com semente** (`domain/match/rng.js`), nunca `Math.random`: é o que permite o cliente reconferir o que o servidor sorteou, e o que torna teste de mesa reproduzível.

Cartas cuja modelagem ficou aproximada no resolvedor, e que valem uma segunda passada quando forem jogadas na prática: `negate` de `divine`/`effectCard` cancela qualquer carta, porque distinguir exige o `type` de `o_jogo.cards`, que não vive em `domain/`; e `copy` só copia quando o motor tem o que copiar na pilha.

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
