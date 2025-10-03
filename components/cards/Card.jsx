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
            <div className='absolute top-[50px] left-[25px] w-[250px] h-[250px] bg-white flex items-center justify-center overflow-hidden'>
                <Image
                    src={`/cards/${card.number}.png`}
                    alt={card.name}
                    width={250}
                    height={250}
                    className='object-contain'
                />
            </div>

        {/* Descrição */}
        <div className='absolute bottom-[20px] left-[25px] right-[25px] h-[90px] overflow-hidden text-xs text-black'>
            {card.description}
        </div>
        </div>
    )
}