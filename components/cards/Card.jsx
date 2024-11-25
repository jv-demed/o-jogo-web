import { CARD_TYPES, getBackground } from '@/actions/controls/cardActions';
import styled from 'styled-components';

const Styled = styled.div`
    background-image: ${({ $bg }) => $bg};
    border: 3px solid white;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    height: ${({ $width }) => `${$width*1.4}px`};
    padding: 10px;
    width: ${({ $width }) => `${$width}px`};
    header{
        border: 2px solid white;
        border-radius: 3px;
        color: white;
        font-weight: bold;
        padding: 7px 5px;
        width: 100%;
    }
    .type-info{
        align-items: center;
        gap: 5px;
        font-size: 0.8rem;
        justify-content: flex-end;
        margin-top: 3px;
    }
`;

export function Card({ 
    card,
    width 
}){
    return (
        <Styled
            $bg={() => getBackground(card)} 
            $width={width}
        >
            <header className='flexR'>
                <span>
                    {card.name}
                </span>
            </header>
            <div className='flexR type-info'>
                {CARD_TYPES.find(t => t.id == card.type).name}
                {CARD_TYPES.find(t => t.id == card.type).icon}
            </div>
        </Styled>
    );
}