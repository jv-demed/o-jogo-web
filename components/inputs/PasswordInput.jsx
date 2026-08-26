'use client'
import { useState } from 'react';
import { ICONS } from '@/assets/icons';
import { ErrorMessage } from '@/components/elements/ErrorMessage';

export function PasswordInput({
    name,
    value,
    setValue,
    placeholder,
    disabled,
    error,
    icon: Icon
}){

    const [passMode, setPassMode] = useState(true);

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
                <input id={name}
                    name={name || 'input-label'}
                    type={passMode ? 'password' : 'text'}
                    placeholder={placeholder || '...'}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    disabled={disabled}
                    className={`
                        w-full h-12 rounded-xl text-base
                        ${Icon ? 'pl-10 pr-12' : 'pl-3.5 pr-12'}
                        border bg-surface text-cream
                        placeholder:text-cream-dim/60
                        transition-colors
                        disabled:opacity-50
                        focus:outline-none focus:ring-2
                        focus:ring-brand-light/60 focus:border-brand-light
                        ${error
                            ? 'border-danger/60'
                            : 'border-line hover:border-brand'}
                    `}
                />
                <button type='button'
                    aria-label={passMode ? 'Mostrar senha' : 'Ocultar senha'}
                    onClick={() => setPassMode(!passMode)}
                    className={`
                        absolute right-1 top-1/2 -translate-y-1/2
                        flex items-center justify-center
                        h-10 w-10 rounded-lg text-lg
                        text-cream-dim cursor-pointer
                        active:bg-elevated
                        focus:outline-none focus-visible:ring-2
                        focus-visible:ring-brand-light
                    `}
                >
                    {passMode ? <ICONS.eyeOff /> : <ICONS.eye />}
                </button>
            </div>
            {error && <ErrorMessage
                error={{ message: error }}
            />}
        </div>
    )
};
