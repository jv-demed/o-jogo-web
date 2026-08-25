import { getCardTypeIcon } from '@/types/CardType';
import { userHaveCard } from '@/presenters/usersPresenter';

export function ListCollection({ user, cards, onPressCard }) {
    return (
        <ul className='flex flex-col gap-2'>
            {cards.map(card => {
                const haveCard = userHaveCard(user, card.id);
                return (
                    <li key={`card-${card.id}`}>
                        <button type='button'
                            disabled={!haveCard}
                            onClick={() => onPressCard(card)}
                            className={`
                                flex items-center
                                border-2 border-gray-500 rounded-4xl
                                px-4 py-3 w-full min-h-12
                                enabled:cursor-pointer disabled:cursor-default
                                focus:outline-none focus-visible:ring-2
                                focus-visible:ring-cream
                                ${haveCard 
                                    ? card.isShot 
                                        ? 'border-rose-300' 
                                        : 'border-green-300'
                                    : 'border-gray-500'
                                }
                            `}
                        >
                            <span className='id'>
                                {card.number}
                            </span>
                            <div className={`
                                flex ${haveCard ? 'justify-start' : 'justify-center'}
                                w-full 
                            `}>
                                <span className={haveCard ? 'pl-4' : ''}>
                                    {haveCard ? card.name : '???'}
                                </span>
                            </div>
                            {haveCard && getCardTypeIcon(card.type)}
                        </button>
                    </li>
                )
            })}
            {cards.length == 0 && <span>
                Nenhum carta encontrada
            </span>}
        </ul>
    )
}