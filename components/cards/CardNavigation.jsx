'use client'
import { ICONS } from '@/assets/icons';
import { Card } from '@/components/cards/Card';

export function CardNavigation({
    cards,
    index,
    setIndex
}) {

    const isFirst = index == 0;
    const isLast = index == cards.length - 1;

    return (
        <div className='flex flex-col items-center gap-3'>
            {/* A carta tem 300px fixos. Com as setas ao lado (o layout
                anterior) o conjunto passava de 390px e nao cabia em nenhum
                celular; embaixo, a carta cabe inteira e as setas viram alvos
                de 48px ao alcance do polegar. Abaixo de 360px de tela a carta
                ainda encolhe um pouco para nao vazar. */}
            <div className={`
                origin-top rounded-lg overflow-hidden
                shadow-2xl shadow-black/60
                max-[359px]:scale-[0.86]
            `}>
                <Card card={cards[index]} />
            </div>
            {cards.length > 1 && <div className={`
                flex items-center justify-between gap-2
                w-full max-w-[300px]
            `}>
                <button type='button'
                    aria-label='Carta anterior'
                    disabled={isFirst}
                    onClick={() => setIndex(index - 1)}
                    className={`
                        flex items-center justify-center
                        h-12 w-14 rounded-xl text-2xl
                        border border-line bg-surface
                        transition-transform
                        disabled:opacity-30
                        enabled:active:scale-95
                        focus:outline-none focus-visible:ring-2
                        focus-visible:ring-brand-light
                    `}
                >
                    <ICONS.chevronBack />
                </button>
                <span className='text-sm text-cream-dim tabular-nums'>
                    {index + 1} / {cards.length}
                </span>
                <button type='button'
                    aria-label='Próxima carta'
                    disabled={isLast}
                    onClick={() => setIndex(index + 1)}
                    className={`
                        flex items-center justify-center
                        h-12 w-14 rounded-xl text-2xl
                        border border-line bg-surface
                        transition-transform
                        disabled:opacity-30
                        enabled:active:scale-95
                        focus:outline-none focus-visible:ring-2
                        focus-visible:ring-brand-light
                    `}
                >
                    <ICONS.chevronForward />
                </button>
            </div>}
        </div>
    )
}
