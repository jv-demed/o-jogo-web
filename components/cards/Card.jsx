'use client'
import Image from 'next/image'

export function Card({ card }) {
    return (
        <div className='relative w-[300px] h-[440px]'>
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
                flex items-center justify-center 
                absolute top-[80px] left-[33px] 
                w-[234px] h-[231px] bg-white 
                overflow-hidden    
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
    )
}