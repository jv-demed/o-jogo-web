'use client'

import styled from 'styled-components';
import { useState } from 'react';
import { Loading } from '@/components/elements/Loading';


export const Styled = styled.form`
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
`;

export function Form({ children, action }){

    const [isLoading, setIsLoading] = useState(false);

    return(
        <Styled onSubmit={async e => {
            e.preventDefault();
            setIsLoading(true);
            action && await action();
            setIsLoading(false);
        }}>
            {isLoading ? <Loading /> : children}
        </Styled>
    )
}