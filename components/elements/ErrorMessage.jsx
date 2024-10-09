import styled from 'styled-components';
import { ICONS } from '@/assets/icons';

const Styled = styled.span`
    align-items: center;
    color: ${({ theme }) => theme.error};
    display: flex;
    gap: 5px;
`;

export function ErrorMessage({ message }){
    return (
        <Styled>
            {ICONS.warning} {message}  
        </Styled>
    );
}