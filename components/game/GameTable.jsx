import { useMemo } from 'react';
import { Opponent } from './Opponent';

/**
 * Adversarios em ordem de turno a partir de quem esta jogando: o proximo a
 * jogar aparece primeiro.
 *
 * `player` e a linha do jogador atual em match_players - e de la que vem a
 * `position`, que nao existe no perfil.
 */
export function GameTable({ player, players }){

    const opponents = useMemo(() => {
        if(!player || players.length === 0) return [];
        return players
            .filter(other => other.id !== player.id)
            .sort((a, b) => {
                const relativeA = (a.position - player.position + players.length) % players.length;
                const relativeB = (b.position - player.position + players.length) % players.length;
                return relativeA - relativeB;
            });
    }, [player, players]);

    return (
        <section className='flex flex-1 justify-center w-full'>
            <ul className='flex flex-col items-center gap-1.5'>
                {opponents.map(opponent => (
                    <li key={opponent.id}>
                        <Opponent player={opponent} />
                    </li>
                ))}
            </ul>
        </section>
    );
}
