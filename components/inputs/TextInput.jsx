'use client'
import { useState } from 'react';
import { ErrorMessage } from '@/components/elements/ErrorMessage';

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
        <div className={`
            flex flex-col gap-0.5
            w-full text-text
        `}>
            {name && <span>{name}:</span>}
            <input name={name || 'input-label'}
                type={type || 'text'}
                value={value}
                placeholder={placeholder || '...'}
                onChange={handleInputChange}
                disabled={disabled}
                className={`
                    w-full h-12 px-2 text-xl
                    border border-gray-500 rounded   
                    hover:border-[#1b5b82]
                    focus:outline-none focus:ring-2
                    focus:ring-[#1b5b82] focus:border-[#1b5b82]
                `}
            />
            {(error || internalError) && <ErrorMessage 
                error={{ message: internalError || error }}
            />}
        </div>
    )
};