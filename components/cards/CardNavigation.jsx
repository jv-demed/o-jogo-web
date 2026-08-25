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
            {/* Nas pontas o botao fica disabled com o icone invisible, e nao
                removido: some da ordem de foco sem a carta pular de lugar. */}
            <button type='button'
                aria-label='Carta anterior'
                disabled={index == 0}
                onClick={() => setIndex(index - 1)}
                className={`
                    flex items-center justify-center
                    w-12 shrink-0
                    focus:outline-none focus-visible:ring-2
                    focus-visible:ring-cream
                `}
            >
                <ICONS.chevronBack 
                    className={`text-3xl ${index == 0 && 'invisible'}`}
                />
            </button>
            <Card card={cards[index]} />
            <button type='button'
                aria-label='Proxima carta'
                disabled={index == cards.length - 1}
                onClick={() => setIndex(index + 1)}
                className={`
                    flex items-center justify-center
                    w-12 shrink-0
                    focus:outline-none focus-visible:ring-2
                    focus-visible:ring-cream
                `}
            >
                <ICONS.chevronForward 
                    className={`text-3xl ${index == cards.length - 1 && 'invisible'}`}
                />
            </button>
        </div>
    )
}