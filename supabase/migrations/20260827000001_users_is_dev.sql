-- Ferramentas de teste: marca quem enxerga o painel de dev.
--
-- Vive no banco, e nao numa env var, porque a mesma verdade precisa servir aos
-- dois lados: hoje a UI le para mostrar o painel no solo, e amanha — quando a
-- partida for para o banco (ver PENDENCIAS.md) — a RPC le para deixar ou nao
-- semear uma mesa de teste. Gate no bundle nao serve para autorizar nada.
--
-- Sem policy nova: RLS aqui e por linha, e o jogador ja le a propria linha.

alter table o_jogo.users
    add column if not exists is_dev boolean not null default false;

comment on column o_jogo.users.is_dev is
    'Libera as ferramentas de dev. Poder de servidor confere esta coluna, nunca o cliente.';

-- Promova o seu jogador (cadastro e fechado, criado a mao — isto tambem e).
-- update o_jogo.users set is_dev = true where name = '<seu nome>';
