import styled from 'styled-components';
import { ICONS } from '@/assets/icons';

const Styled = styled.div`
    align-items: center;
    display: flex;
    justify-content: center;
    height: auto;
    width: 100%;
    .icon{
        animation: rotate 0.4s linear infinite;
        color: ${({ $color, theme }) => $color || theme.primary};
        font-size: ${({ $width }) => $width || '1.2rem'};
    }
    @keyframes rotate{
        0%{
            transform: rotate(0deg);
        }100%{
            transform: rotate(360deg);
        }
    }
`;

export function Loading({ color, width }){
    return(
        <Styled $color={color} $width={width}>
            {ICONS.loading}
        </Styled>
    )
}