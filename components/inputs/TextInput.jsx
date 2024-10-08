'use client'

import { useState } from 'react';
import { ICONS } from '@/assets/icons';
import { DefaultInput } from '@/components/inputs/DefaultInput';

export function TextInput({ 
    name, 
    type, 
    value, 
    setValue,
    placeholder,
    disabled,
    error,
    maxLength
}){

    const [internalError, setInternalError] = useState('');

    function handleInputChange(e){
        const inputValue = e.target.value;
        if(maxLength && inputValue.length > maxLength){
            setInternalError(`O limite de ${maxLength} caracteres foi excedido.`);
        }else{
            setInternalError('');
            setValue(inputValue);
        }
    };

    return(
        <DefaultInput>
            {name && <span className='name'>
                {name}:
            </span>}
            <input name={name || 'input-label'}
                type={type || 'text'}
                value={value}
                placeholder={placeholder || '...'}
                onChange={handleInputChange}
                disabled={disabled}
            />
            {(error || internalError) && <span className='flexR error'>
                {ICONS.warning}
                {internalError || error}
            </span>}
        </DefaultInput>
    )
};