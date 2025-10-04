'use client'
import Image from 'next/image'
import { useRef } from 'react'
import { getCardTypeIcon, getCardTypeName } from '@/presenters/cardsPresenter'

export function Card({ 
    card, 
    scale = 1,
    onClick,
    onLongPress,
    longPressDelay = 600 
}) {

    const baseWidth = 300;
    const baseHeight = 440;
    const timeoutRef = useRef(null);
    const pressedRef = useRef(false);

    function startPress() {
        pressedRef.current = false;
        timeoutRef.current = setTimeout(() => {
            pressedRef.current = true;
            onLongPress?.(card);
        }, longPressDelay);
    };

    function cancelPress() {
        clearTimeout(timeoutRef.current);
    };

    function handleRelease() {
        clearTimeout(timeoutRef.current);
        if(!pressedRef.current) onClick?.(card);
    };

    return (
        <div
            className='relative origin-top-left select-none'
            style={{
                width: baseWidth * scale,
                height: baseHeight * scale,
                overflow: 'hidden',
            }}
            onMouseDown={startPress}
            onMouseUp={handleRelease}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={handleRelease}
        >
            <div style={{
                width: baseWidth,
                height: baseHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
            }}>
                <div className='relative' 
                    style={{ 
                        width: baseWidth, 
                        height: baseHeight 
                    }}
                >
                    <Image
                        src='/trap-card.jpg'
                        alt='Card frame'
                        className='object-cover'
                        fill
                    />
                    <div className={`
                        absolute top-[24px] left-[20px] 
                        text-sm font-bold text-black text-center    
                    `}>
                        {card.name}
                    </div>
                    <div className={`
                        absolute top-[56px] right-[42px] 
                        text-black text-xs    
                    `}>
                        {getCardTypeName(card)}
                    </div>
                    <div className={`
                        absolute top-[54px] right-[20px] 
                        text-gray-900    
                    `}>
                        {getCardTypeIcon(card)}
                    </div>
                    <div className={`
                        flex items-center justify-center 
                        absolute top-[80px] left-[33px] 
                        w-[234px] h-[231px] 
                        bg-white overflow-hidden    
                    `}>
                        <Image
                            className='object-contain'
                            src={`/cards/${card.number}.png`}
                            alt={card.name}
                            width={250}
                            height={250}
                        />
                    </div>
                    <div className={`
                        absolute bottom-[26px] left-[25px] right-[25px] 
                        h-[82px] overflow-hidden text-xs text-black    
                    `}>
                        {card.text}
                    </div>
                </div>
            </div>
        </div>
    )
}