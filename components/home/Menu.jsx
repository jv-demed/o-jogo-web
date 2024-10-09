'use client'

import styled from 'styled-components';
import { ActionButton } from '../buttons/ActionButton';

const Styled = styled.nav`
    
`;

export function Menu(){
    return (
        <Styled>
            <ActionButton name='Jogar'/>
        </Styled>
    );
}