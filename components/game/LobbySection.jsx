import styled from 'styled-components';
import { useState, useEffect } from 'react';
import { Loading } from '@/components/elements/Loading';
import { ActionButton } from '@/components/buttons/ActionButton';

const Styled = styled.section`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    height: 100%;
    justify-content: space-between;
    max-height: 100%;
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

export function LobbySection({ match, players }){

    const [playerList, setPlayerList] = useState(null);
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    useEffect(() => {
        players.length > 0 && setPlayerList(players);
    }, [players]);

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
        <Styled>
            {!playerList ? <Loading /> : <>
                <div className='content'>
                    <ul>
                        {playerList.map((player, i) => (
                            <li key={player.id}
                                className={selectedPlayer === i ? 'selected' : ''}
                                onClick={() => handlePlayerClick(i)}
                            >
                                <span>
                                    {player.name}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </>}
            <ActionButton name='Começar' />
        </Styled>
    );
}