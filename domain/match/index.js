/**
 * A partida, em um import so.
 *
 * A camada e pura: nao importa React, nem Supabase, nem os assets. Roda em Node
 * sem bundler, que e o que scripts/validate-match.mjs faz — e e o que vai
 * permitir a mesma regra valer dentro da RPC (o servidor e quem manda) e no
 * cliente (para a UI prever a jogada antes da resposta chegar).
 *
 * Quem consome:
 *   - `createSeatedMatch` monta o estado a partir dos assentos do lobby, e
 *     `createMatch` a partir dos jogadores ja com baralho;
 *   - `apply(state, command)` e a unica porta de entrada para mudar a partida;
 *   - `legalCommands(state, playerId)` diz a UI o que habilitar;
 *   - `evaluateMissions(state)` apura, e `MISSIONS` descreve cada uma.
 */

export { Command, RuleError, apply, isReaction, legalCommands } from './engine.js';
export { MISSIONS, MissionGoal, ALL_MISSIONS, evaluateMissions } from './missions.js';
export { DECK_SIZE, createSeatedMatch, randomDeck } from './setup.js';
export {
    HAND_SIZE, MatchStatus, PLAYS_PER_TURN, Phase, REACTION_WINDOW_MS,
    createMatch, currentPlayer, ongoingFor, playerById, playersAfter,
} from './state.js';
export { INFINITE_SHOTS } from './resolve.js';
