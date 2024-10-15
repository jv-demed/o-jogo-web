import styled from 'styled-components';

const Styled = styled.div`
    align-items: center;
    border: 1px solid white;
    border-radius: 4px;
    display: flex;
    height: 40px;
    justify-content: center;
    width: 70px;
`;

export function Opponent({ player }){
    return (
        <Styled>
            {player.name}
        </Styled>
    );
}