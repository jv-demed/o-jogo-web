'use client'
import { SCREENS } from '@/assets/screens';
import { useMedia } from '@/hooks/useMedia';

export function Box({ 
    children, 
    fullH
}){

    const isMobile = useMedia(SCREENS.mobile);

    return (
        <div 
            className={`
                flex flex-col gap-2.5
                px-5 py-4 w-full rounded-2xl 
                bg-[#171717]
                overflow-y-auto overflow-x-hidden
                scrollbar-custom   
                ${fullH && 'grow-1 h-full'}
            `}
            style={{ width: isMobile ? '100%' : '400px' }}
        >
            {children}
        </div>
    )
}