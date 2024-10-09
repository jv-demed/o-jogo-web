import styled from 'styled-components';

export const DefaultInput = styled.label`
    color: ${({ theme }) => theme.text};
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    input{
        background: ${({ theme }) => theme.input};
        border: 1px solid gray;
        border-radius: 4px;
        color: ${({ theme }) => theme.text};
        font-size: 1.2rem;
        height: 50px;
        padding: 0 8px;
        width: 100%;
    }
    input:hover{
        border: 1px solid ${({ theme }) => theme.primary};
        outline: 1px solid ${({ theme }) => theme.primary};
    }
    input:focus{
        border: 1px solid ${({ theme }) => theme.primary};
        outline: 2px solid ${({ theme }) => theme.primary};
    }
    .error{
        align-items: center;
        color: ${({ theme }) => theme.error};
        font-size: 0.8rem;
        gap: 4px;
    }
`;