import styled from 'styled-components';
import { ActionButton } from '@/components/buttons/ActionButton';

const Styled = styled.section`
    border: 1px solid red;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    height: 100%;
    justify-content: space-between;
    max-height: 100%;
`;

export function LobbySection({ match, players }){
    return (
        <Styled>
            <ul>
                {players.map(player => (
                    <li key={player.id}>
                        <span>
                            {player.name}
                        </span>
                    </li>
                ))}
            </ul>
            <ActionButton name='Começar' />
        </Styled>
    );
}