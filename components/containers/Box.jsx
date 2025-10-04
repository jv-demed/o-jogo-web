'use client'
import { useMedia } from '@/hooks/useMedia';
import { SCREENS } from '@/assets/screens';

export function Box({ 
    children, 
    fullH,
    height
}){

    const isMobile = useMedia(SCREENS.mobile);

    const computedHeight = fullH ? '100%' : height; 

    return (
        <div 
            className={`
                flex flex-col gap-2.5
                px-5 py-4 w-full rounded-2xl 
                bg-[#171717]
                overflow-x-hidden
                scrollbar-custom
            `}
            style={{ 
                height: computedHeight,
                width: isMobile ? '100%' : '400px' 
            }}
        >
            {children}
        </div>
    )
}