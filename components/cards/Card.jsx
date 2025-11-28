'use client'
import Image from 'next/image'
import { useRef } from 'react'
import { getCardTypeIcon, getCardTypeName } from '@/types/CardType';
import { AutoFitText } from '@/components/elements/AutoFitText';
import { ICONS } from '@/assets/icons';

export function Card({ 
    card, 
    scale = 1,
    onClick,
    onLongPress,
    longPressDelay = 450 
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
            onContextMenu={e => e.preventDefault()}
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
                        src={`/cards-models/${card?.isShot ? 'trap' : 'spell'}-card.jpg`}
                        alt='Card frame'
                        className='object-cover'
                        fill
                    />
                    <AutoFitText 
                        className={`
                            absolute top-[25px] left-[20px] right-[20px] 
                             text-left text-black
                        `}
                    >
                        {card.name}
                    </AutoFitText>
                    <div className={`
                        absolute top-[56px] left-[20px] 
                        flex text-black text-xs    
                    `}>
                        {Array.from({ length: card.level }).map((_, i) => (
                            <ICONS.star key={i} />
                        ))}
                    </div>
                    <div className={`
                        absolute top-[56px] right-[42px] 
                        text-black text-xs    
                    `}>
                        {getCardTypeName(card.type)}
                    </div>
                    <div className={`
                        absolute top-[54px] right-[20px] 
                        text-gray-900    
                    `}>
                        {getCardTypeIcon(card.type)}
                    </div>
                    <div className={`
                        flex items-center justify-center 
                        absolute top-[80px] left-[33px] 
                        w-[234px] h-[231px] 
                        bg-white overflow-hidden    
                    `}>
                        <Image
                            className='object-contain'
                            src={`/cards/${card.id}.png`}
                            alt={card.name}
                            width={250}
                            height={250}
                        />
                    </div>
                    <AutoFitText 
                        maxHeight={82}
                        className={`
                            absolute bottom-[29px] left-[25px] right-[26px] 
                            h-[78px] overflow-hidden 
                            text-black text-justify leading-tight
                        `}
                    >
                        {card.text}
                    </AutoFitText>
                    <span className={`
                        absolute bottom-[7px] right-[9px]
                        text-gray-800 text-[0.56rem]
                    `}>
                        {card.number}
                    </span>
                </div>
            </div>
        </div>
    )
}