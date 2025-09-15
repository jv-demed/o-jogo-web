'use client'

import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDataObj } from '@/hooks/useDataObj';
import { useDataList } from '@/hooks/useDataList';
import { useUser } from '@/providers/UserProvider';
import { getRealtime, removeChannel } from '@/supabase/realtime';
import { startMatch } from '@/actions/controls/matchActions';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { Loading } from '@/components/elements/Loading';
import { ActionButton } from '@/components/buttons/ActionButton';

const Styled = styled.section`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    height: 100%;
    justify-content: space-between;
    max-height: 100%;
    .waiting{
        align-items: center;
        flex-grow: 1;
        gap: 20px;
        height: 100%;
        justify-content: center;
    }
    .content{
        align-items: center;
        display: flex;
        flex-grow: 1;
        height: 100%;
        justify-content: center;
        ul{
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 100%;
            li{
                background-color: ${({ theme }) => theme.content};
                border-radius: 5px;
                cursor: pointer;
                font-size: 1.6rem;
                padding: 8px;
                text-align: center;
                &.selected {
                    border: 2px solid ${({ theme }) => theme.primary};
                }
            }
        }
    }
`;

export default function Lobby(){

    const router = useRouter();
    const user = useUser();

    const match = useDataObj({
        table: 'matches',
        select: '*',
        filter: e => e.eq('status', 'waiting')
    });

    const players = useDataList({
        table: 'users',
        select: '*',
        filter: e => match.obj?.players?.length > 0 ? e.in('id', match.obj.players) : e.is('id', null)
    });
    
    const [playerList, setPlayerList] = useState(null);
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    useEffect(() => {
        const channel = getRealtime({ 
            name: 'matches realtime',
            table: 'matches',
            callback: match.refresh
        });
        return () => removeChannel(channel);
    }, []);

    useEffect(() => {
        players.refresh();
    }, [match.obj]);

    useEffect(() => {
        players.list.length > 0 && setPlayerList(players.list);
    }, [players.list]);

    useEffect(() => {
        match.obj == 'progress' && router.push('/game');
    }, [match.obj]);

    function swapPlayers(index1, index2){
        const newPlayerList = [...playerList];
        [newPlayerList[index1], newPlayerList[index2]] = [newPlayerList[index2], newPlayerList[index1]];
        setPlayerList(newPlayerList);
    };

    function handlePlayerClick(index){
        if(selectedPlayer === null){
            setSelectedPlayer(index);
        }else{
            swapPlayers(selectedPlayer, index);
            setSelectedPlayer(null);
        }
    };

    return (
        <Main>
            <Box $fullHeight>
                <Styled>
                    {!match.obj ? <Loading /> : <>
                        {user.id !== match.obj.host ? <div className='flexC waiting'>
                            <Loading />
                            <span>Aguardando o host...</span>
                        </div> : <>
                            {!playerList ? <Loading /> : <>
                                <div className='content'>
                                    <ul>{playerList.map((player, i) => (
                                        <li key={player.id}
                                            className={selectedPlayer === i ? 'selected' : ''}
                                            onClick={() => handlePlayerClick(i)}
                                        >
                                            <span>{player.name}</span>
                                        </li>
                                    ))}</ul>
                                </div>
                            </>}
                            <ActionButton name='Começar' 
                                action={async () => {
                                    await startMatch({
                                        match: match.obj,
                                        players: playerList,
                                        router: router
                                    });
                                }}
                            />
                        </>}
                    </>}
                </Styled>
            </Box>
        </Main>
    );
}