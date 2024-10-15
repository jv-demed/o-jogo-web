'use client'

import styled from 'styled-components';
import { useEffect } from 'react';
import { useDataList } from '@/hooks/useDataList';
import { useUser } from '@/providers/UserProvider';
import { Box } from '@/components/boxes/Box';
import { Main } from '@/components/boxes/Main';

const Styled = styled.div`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    height: 100%;
    justify-content: space-between;
    .table{
        border: 1px solid red;
        flex-grow: 2;
    }
    .hand{
        border: 1px solid blue;
        flex-grow: 1;
    }
`;

export default function Game(){

    const user = useUser();

    const players = useDataList({
        table: 'game-players',
        select: '*',
        order: 'position'
    });

    console.log(players);

    return (
        <Main>
            <Box $fullHeight>
                {!players.loading && <Styled>
                    <section className='flexC table'>
                        <ul>
                            {players.list.map(player => (
                                <li key={player.id}>
                                    {player.name}
                                </li>
                            ))}
                        </ul>
                    </section>
                    <section className='flexC hand'>
                        oi
                    </section>
                </Styled>}
            </Box>
        </Main>
    );
}