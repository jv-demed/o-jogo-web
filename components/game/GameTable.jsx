import { useMemo } from 'react';
import { Opponent } from './Opponent';

/**
 * Adversarios em ordem de turno a partir de quem esta jogando: o proximo a
 * jogar aparece primeiro.
 *
 * A ordem vem de `state.order`, e nao do array de jogadores: carta que
 * rearranja a mesa mexe numa e nao na outra.
 */
export function GameTable({
    state,
    you,
    selectable = [],
    selected = [],
    onSelect
}){

    const opponents = useMemo(() => {
        if(!state || !you) return [];
        const size = state.order.length;
        const mine = state.order.indexOf(you.id);
        return state.order
            .map((id, index) => ({
                player: state.players.find(p => p.id === id),
                seat: (index - mine + size) % size
            }))
            .filter(entry => entry.player && entry.player.id !== you.id)
            .sort((a, b) => a.seat - b.seat)
            .map(entry => entry.player);
    }, [state, you]);

    const currentId = state?.order[state.turnIndex];

    return (
        <section className='flex flex-col gap-1.5 w-full'>
            {opponents.map(opponent => (
                <Opponent key={opponent.id}
                    player={opponent}
                    isCurrent={opponent.id === currentId}
                    isSelectable={selectable.includes(opponent.id)}
                    isSelected={selected.includes(opponent.id)}
                    onSelect={onSelect}
                />
            ))}
        </section>
    );
}
