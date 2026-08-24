-- Schema inicial do jogo.
--
-- Ate aqui o banco era conhecimento tacito: nao havia nenhum registro do
-- schema no repositorio. Este arquivo passa a ser a fonte de verdade.
--
-- Decisoes que este arquivo materializa (ver PENDENCIAS.md):
--   * schema dedicado o_jogo, para isolar dos outros projetinhos que
--     dividem esta instancia do Supabase e permitir db diff --schema o_jogo
--   * colunas em snake_case
--   * id como chave unica global das cartas; number e so o rotulo impresso
--   * colecao e deck viram linhas com quantity, nao array int[], para que
--     compra e venda sejam atomicas no Postgres

create schema if not exists o_jogo;

-- O anon key so enxerga o schema se ele estiver em API Settings > Exposed
-- schemas no painel, e o client precisa de { db: { schema: 'o_jogo' } }.
grant usage on schema o_jogo to anon, authenticated;

-- ---------------------------------------------------------------- catalogo

-- Valores iguais aos de types/CardType.js, para nao quebrar o cliente.
-- Nota: 'rapido' tem acento e 'investigacao' nao. A inconsistencia vem do
-- codigo atual; padronizar exige tocar o cliente junto.
create type o_jogo.card_type as enum (
    'defesa',
    'divino',
    'efeito',
    'equipamento',
    'investigacao',
    'rápido',
    'shot'
);

create table o_jogo.packs (
    id           integer primary key,
    name         text        not null,
    date_release date        not null,
    quantity     smallint    not null check (quantity > 0),
    price        integer     not null check (price >= 0)
);

comment on column o_jogo.packs.quantity is 'Quantas cartas o pack entrega por compra.';
comment on column o_jogo.packs.date_release is 'Era dateRealease (typo) no bundle JS.';

create table o_jogo.cards (
    id      integer primary key,
    id_pack integer not null references o_jogo.packs(id),
    number  smallint not null,
    name    text     not null,
    type    o_jogo.card_type not null,
    is_shot boolean  not null default false,
    text    text     not null,
    level   smallint not null check (level > 0),

    -- number reinicia a cada pack, entao so e unico junto do pack.
    unique (id_pack, number)
);

comment on column o_jogo.cards.id is 'Chave unica global. A arte vive em public/cards/{id}.png.';
comment on column o_jogo.cards.number is 'Apenas o rotulo impresso na arte. Reinicia a cada pack.';

-- ---------------------------------------------------------------- jogadores

create table o_jogo.users (
    id         bigint generated always as identity primary key,
    id_auth    uuid not null unique references auth.users(id) on delete cascade,
    name       text not null,
    coins      integer not null default 0 check (coins >= 0),
    created_at timestamptz not null default now()
);

-- O auth.users e compartilhado entre os projetinhos: ter JWT valido nao
-- significa ser jogador. Ser jogador e ter linha aqui.
comment on table o_jogo.users is
    'Perfil de jogador. Criado manualmente pelo dono; nao ha fluxo de signup.';

-- Substitui a coluna cards int[]. Uma linha por carta possuida, com
-- quantidade, para que a compra seja um upsert atomico em vez de um
-- read-modify-write do array inteiro.
create table o_jogo.user_cards (
    id_user  bigint  not null references o_jogo.users(id) on delete cascade,
    id_card  integer not null references o_jogo.cards(id),
    quantity integer not null check (quantity > 0),
    primary key (id_user, id_card)
);

-- ------------------------------------------------------------------- decks

create table o_jogo.decks (
    id         bigint generated always as identity primary key,
    id_user    bigint not null references o_jogo.users(id) on delete cascade,
    name       text   not null,
    created_at timestamptz not null default now()
);

-- Guarda id_card, nao number: era essa a troca que corrompia o editor de
-- deck, porque number reinicia a cada pack e id nao.
create table o_jogo.deck_cards (
    id_deck  bigint  not null references o_jogo.decks(id) on delete cascade,
    id_card  integer not null references o_jogo.cards(id),
    quantity integer not null check (quantity > 0),
    primary key (id_deck, id_card)
);

-- ---------------------------------------------------------------- partidas

create type o_jogo.match_status as enum ('lobby', 'progress', 'finished');

create table o_jogo.matches (
    id         bigint generated always as identity primary key,
    id_host    bigint not null references o_jogo.users(id),
    status     o_jogo.match_status not null default 'lobby',
    created_at timestamptz not null default now()
);

-- Era a tabela game-players, sem prefixo nenhum num banco compartilhado.
create table o_jogo.match_players (
    id_match bigint   not null references o_jogo.matches(id) on delete cascade,
    id_user  bigint   not null references o_jogo.users(id),
    position smallint not null,
    primary key (id_match, id_user),
    unique (id_match, position)
);

create index on o_jogo.user_cards (id_user);
create index on o_jogo.decks (id_user);
create index on o_jogo.deck_cards (id_deck);
create index on o_jogo.match_players (id_user);
