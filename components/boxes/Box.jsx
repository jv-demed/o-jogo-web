import styled from 'styled-components';

export const Box = styled.div`
    background-color: ${({ theme }) => theme.box};
    border-radius: 5px;
    color: ${({ theme }) => theme.text};
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 15px 20px;
    width: 100%;
    ${({ $fullHeight }) => $fullHeight && `
        flex-grow: 1;
        max-height: 100%;
    `}
`;