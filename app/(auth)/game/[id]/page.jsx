'use client'

import styled from 'styled-components';
import { useEffect } from 'react';
import { useDataList } from '@/hooks/useDataList';
import { useUser } from '@/providers/UserProvider';
import { Box } from '@/components/boxes/Box';
import { Main } from '@/components/boxes/Main';
import { GameTable } from '@/components/game/GameTable';

const Styled = styled.div`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    height: 100%;
    justify-content: space-between;
    .hand{
        border: 1px solid blue;
        height: 200px;
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
                    <GameTable 
                        user={user}
                        players={players.list}
                    />
                    <section className='flexC hand'>
                        oi
                    </section>
                </Styled>}
            </Box>
        </Main>
    );
}