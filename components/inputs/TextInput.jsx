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
    maxLength,
    icon: Icon
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
            flex flex-col gap-1.5 w-full
        `}>
            {name && <label htmlFor={name}
                className={`
                    text-xs font-semibold uppercase tracking-[0.14em]
                    text-cream-dim
                `}
            >
                {name}
            </label>}
            <div className='relative'>
                {Icon && <span className={`
                    absolute left-3.5 top-1/2 -translate-y-1/2
                    text-cream-dim pointer-events-none
                `}>
                    <Icon />
                </span>}
                {/* text-base (16px) e proposital: abaixo disso o iOS da zoom
                    no campo ao focar e a tela sai do lugar. */}
                <input id={name}
                    name={name || 'input-label'}
                    type={type || 'text'}
                    value={value}
                    placeholder={placeholder || '...'}
                    onChange={handleInputChange}
                    disabled={disabled}
                    className={`
                        w-full h-12 rounded-xl text-base
                        ${Icon ? 'pl-10 pr-3' : 'px-3.5'}
                        border bg-surface text-cream
                        placeholder:text-cream-dim/60
                        transition-colors
                        disabled:opacity-50
                        focus:outline-none focus:ring-2
                        focus:ring-brand-light/60 focus:border-brand-light
                        ${(error || internalError)
                            ? 'border-danger/60'
                            : 'border-line hover:border-brand'}
                    `}
                />
            </div>
            {(error || internalError) && <ErrorMessage
                error={{ message: internalError || error }}
            />}
        </div>
    )
};
