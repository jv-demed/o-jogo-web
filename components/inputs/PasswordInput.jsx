'use client'
import { useState } from 'react';
import { ICONS } from '@/assets/icons';

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
        <div className={`
            flex flex-col gap-0.5
            w-full relative
        `}>
            {name && <span>{name}:</span>}
            <div className='relative'>
                <input name={name || 'input-label'}
                    type={passMode ? 'password' : 'text'}
                    placeholder={placeholder || '...'}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    disabled={disabled}
                    className={`
                        flex items-center
                        w-full h-12 px-2 text-xl
                        border border-gray-500 rounded   
                        hover:border-[#1b5b82]
                        focus:outline-none focus:ring-2
                        focus:ring-[#1b5b82] focus:border-[#1b5b82]
                    `}
                />
                <button type='button' 
                    onClick={() => setPassMode(!passMode)}
                    className={`
                        absolute right-2 top-1/2 
                        transform -translate-y-1/2 
                        rounded cursor-pointer p-1 text-xl
                        hover:text-[#1b5b82] 
                        focus:outline-none focus:ring-2 focus:ring-[#1b5b82]
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