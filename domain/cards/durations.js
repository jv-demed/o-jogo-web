import { DurationKind } from './vocabulary.js';

// Atalhos para `duration`, pelo mesmo motivo dos alvos em targets.js.

export const turns = n => ({ kind: DurationKind.turns, turns: n });

// Sem argumento, e a missao do proprio alvo do efeito que serve de gatilho —
// o caso do "ate uma troca de missao deste jogador", em que a identidade nao e
// conhecida na hora de escrever a carta.
export const untilMissionChange = which => (which === undefined
    ? { kind: DurationKind.untilMissionChange }
    : { kind: DurationKind.untilMissionChange, mission: which });

export const untilDrinks = n => ({ kind: DurationKind.untilDrinks, amount: n });

export const untilDestroyed = () => ({ kind: DurationKind.untilDestroyed });

export const permanent = () => ({ kind: DurationKind.permanent });
