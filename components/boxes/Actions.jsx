'use client'

import styled from 'styled-components';

export const Actions = styled.div`
    border-top: 1px solid gray;
    display: flex;
    gap: 10px;
    justify-content: ${({ $between }) => $between ? 'space-between' : 'flex-end'};
    padding-top: 10px;
    width: '100%';
`;