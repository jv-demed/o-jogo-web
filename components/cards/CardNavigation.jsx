'use client'
import { ICONS } from '@/assets/icons';
import { Card } from '@/components/cards/Card';

export function CardNavigation({
    cards,
    index,
    setIndex
}) {
    return (
        <div className='flex gap-1 h-full'>
            <div className='flex items-center'
                onClick={() => {
                    if(index > 0) setIndex(index - 1);
                }}
            >
                <ICONS.chevronBack 
                    className={`text-3xl ${index == 0 && 'invisible'}`}
                />
            </div>
            <Card card={cards[index]} />
            <div className='flex items-center'
                onClick={() => {
                    if(index < cards.length - 1) setIndex(index + 1);
                }}
            >
                <ICONS.chevronForward 
                    className={`text-3xl ${index == cards.length - 1 && 'invisible'}`}
                />
            </div>
        </div>
    )
}