import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { Opponent } from './Opponent';

const Styled = styled.section`
    border: 1px solid red;
    display: flex;
    flex-grow: 1;
    .list{
        gap: 5px;
    }
`;

export function GameTable({ user, players }){

    const [opponents, setOpponents] = useState([]);

    useEffect(() => {
        const userPosition = user.position;
        const sortedOpponents = players
            .filter(p => p.id !== user.id)
            .sort((a, b) => {
                const relativePositionA = (a.position - userPosition + players.length) % players.length;
                const relativePositionB = (b.position - userPosition + players.length) % players.length;
                return relativePositionA - relativePositionB;
            });
        setOpponents(sortedOpponents);
    }, [user, players]);

    console.log(opponents);

    return (
        <Styled>
            <ul className='flexC list'>
                {opponents.map(op => (
                    <li key={op.id}>
                        <Opponent player={op} />
                    </li>
                ))}
            </ul>
        </Styled>
    );
}