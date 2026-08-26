import { DurationKind } from './vocabulary.js';

// Atalhos para `duration`, pelo mesmo motivo dos alvos em targets.js.

export const turns = n => ({ kind: DurationKind.turns, turns: n });

export const untilMissionChange = which => ({ kind: DurationKind.untilMissionChange, mission: which });

export const untilDrinks = n => ({ kind: DurationKind.untilDrinks, amount: n });

export const untilDestroyed = () => ({ kind: DurationKind.untilDestroyed });

export const permanent = () => ({ kind: DurationKind.permanent });
