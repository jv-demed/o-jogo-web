'use client'

import styled from 'styled-components';
import { useState } from 'react';
import { Loading } from '@/components/elements/Loading';

const Styled = styled.button`
    align-items: center;
    background-color: ${({ theme, $bg }) => $bg || theme.primary};
    border: none;
    border-radius: 4px;
    color: ${({ theme }) => theme.textPrimary};
    cursor: pointer;
    display: flex;
    flex-direction: ${({ $reverse }) => $reverse ? 'row-reverse' : 'row'};
    gap: 10px;
    height: 50px;
    justify-content: center;
    padding: 0 8px;
    width: ${props => props.$width || '100%'};
    font-size: 1.2rem;
    .login-icon{
        font-size: 1.5rem;
    }
    ${props => props.disabled && `
        cursor: not-allowed;
    `}
`

export function ActionButton({ 
    name,
    type, 
    icon, 
    bg, 
    width, 
    disabled, 
    action,
    reverse
}){

    const [infoDisabled, setInfoDisabled] = useState(disabled);
    const [isLoading, setIsLoading] = useState(false);

    return(
        <Styled type={type || 'button'}
            disabled={infoDisabled}
            onClick={async () => {
                setInfoDisabled(true);
                setIsLoading(true);
                action && await action();
                setInfoDisabled(false);
                setIsLoading(false);
            }}
            $bg={bg}
            $width={width}
            $reverse={reverse}
        >
            {!isLoading ? <>
                {name && <span>{name}</span>}
                {icon && icon}
            </> : <Loading color={({ theme }) => theme.textPrimary} />}
        </Styled>
    )
}