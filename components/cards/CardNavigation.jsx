'use client'
import { ICONS } from '@/assets/icons';
import { Card } from '@/components/cards/Card';

export function CardNavigation({
    cards,
    index,
    setIndex
}) {
    return (
        <div className='flex items-center gap-1'>
            <ICONS.chevronBack className='text-3xl' 
                onClick={() => {
                    if(index > 0) {
                        setIndex(index - 1);
                    }
                }}
            />
            <Card card={cards[index]} />
            <ICONS.chevronForward className='text-3xl'
                onClick={() => {
                    if(index < cards.length - 1) {
                        setIndex(index + 1);
                    }
                }}
            />
        </div>
    )
}