import { useState } from 'react';
import { SpinLoader } from '@/components/elements/SpinLoader';

export function ActionButton({ 
    text,
    type, 
    action,
    disabled,
    reverse,
    bg = '#1b5b82', 
    width = '100%',
    icon: Icon
}){

    const [infoDisabled, setInfoDisabled] = useState(disabled);
    const [isLoading, setIsLoading] = useState(false);

    async function handleAction() {
        setInfoDisabled(true);
        setIsLoading(true);
        action && await action();
        setInfoDisabled(false);
        setIsLoading(false);
    }

    return(
        <button type={type || 'button'}
            disabled={infoDisabled}
            onClick={handleAction}
            className={`
                flex items-center justify-center gap-2.5
                rounded h-12 px-2
                hover:brightness-90
                focus:outline-none focus:ring-2
                focus:ring-[#1b5b82] focus:border-[#1b5b82]
            `}
            style={{ 
                background: disabled ? 'gray' : bg,
                cursor: disabled ? 'not-allowed' : 'pointer',
                flexDirection: reverse ? 'row-reverse' : 'row',
                width: width 
            }}
        >
            {!isLoading 
                ? <>
                    {text && <span>{text}</span>}
                    {Icon && <span className='text-2xl'>
                        <Icon />    
                    </span>}
                </> 
                : <SpinLoader color='white' />}
        </button>
    )
}