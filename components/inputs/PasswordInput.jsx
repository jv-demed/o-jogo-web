'use client'

import styled from 'styled-components';
import { useState } from 'react';
import { ICONS } from '@/assets/icons';
import { DefaultInput } from '@/components/inputs/DefaultInput';

const Styled = styled(DefaultInput)`
    display: flex;
    flex-direction: column;
    width: 100%;
    .box{
        align-items: center;
        background-color: ${({ theme }) => theme.input};
        border: 1px solid gray;
        border-radius: 4px;
        display: flex;
        input{
            border: none;
            font-size: 1.2rem;
            height: 30px;
            padding: 0 8px;
            width: 100%;
        }
        input:hover, input:focus{
            outline: none;
        }
        .icon{
            color: gray;
            cursor: pointer;
            display: flex;
            font-size: 1.8rem;
            padding: 0 5px;
        }
    }
    .box:hover{
        border: 1px solid ${({ theme }) => theme.primary};
        outline: 1px solid ${({ theme }) => theme.primary};
    }
    .box:focus-within{
        border: 1px solid ${({ theme }) => theme.primary};
        outline: 2px solid ${({ theme }) => theme.primary};
    }
`;

export function PasswordInput({ 
    name, 
    value, 
    setValue,
    placeholder,
    disabled,
    error
}){

    const [passMode, setPassMode] = useState(true);

    return(
        <Styled>
            {name && <span className='name'>
                {name}:
            </span>}
            <div className='box'>
                <input name={name || 'input-label'}
                    type={passMode ? 'password' : 'text'}
                    placeholder={placeholder || '...'}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    disabled={disabled}
                />
                <div className='icon' onClick={() => setPassMode(!passMode)}>
                    {passMode ? ICONS.eye : ICONS.eyeOff}
                </div>
            </div>
            {error && <span className='flexR error'>
                {ICONS.warning}
                {error}
            </span>}
        </Styled>
    )
};