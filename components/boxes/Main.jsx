import styled from 'styled-components';

export const Main = styled.main`
    align-items: center;
    background: ${({ theme }) => theme.background};
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding: 20px 4%;
`;