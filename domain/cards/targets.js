import { TargetKind } from './vocabulary.js';

// Atalhos para montar `target`/`between`. Existem porque o catalogo tem 116
// cartas: escrever `{ kind: 'choose', count: 1 }` cem vezes esconde a carta
// atras do boilerplate, e e no alvo que mora a diferenca entre uma carta e outra.
// Cada um so devolve o objeto literal — nenhuma logica, nenhum default escondido.

export const self = () => ({ kind: TargetKind.self });

export const choose = (count = 1, extra) => ({ kind: TargetKind.choose, count, ...extra });

export const all = extra => ({ kind: TargetKind.all, ...extra });

export const others = () => ({ kind: TargetKind.all, except: 'self' });

export const random = (count = 1) => ({ kind: TargetKind.random, count });

export const mission = (which, extra) => ({ kind: TargetKind.mission, mission: which, ...extra });

export const neighbors = (direction, count = 1) => ({ kind: TargetKind.relative, direction, count });

export const previousPlayer = () => ({ kind: TargetKind.relative, offset: -1 });

export const nextPlayer = () => ({ kind: TargetKind.relative, offset: 1 });

export const farthest = () => ({ kind: TargetKind.farthest });

export const rank = (by, order = 'desc', count = 1) => ({ kind: TargetKind.rank, by, order, count });

export const filter = where => ({ kind: TargetKind.filter, where });

export const played = () => ({ kind: TargetKind.played });

export const equipped = () => ({ kind: TargetKind.equipped });

// O alvo ja resolvido antes na mesma carta — "escolha 1 jogador... e, se este
// jogador for o Sjamals, ele bebe 2".
export const sameTarget = () => ({ kind: TargetKind.sameTarget });

// A mesa aponta quem e. Ultimo recurso, para criterio que so um humano julga.
export const manual = description => ({ kind: TargetKind.manual, description });
