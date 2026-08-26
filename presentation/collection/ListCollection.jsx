import { getCardTypeIcon, getCardTypeName } from '@/types/CardType';
import { userHaveCard } from '@/presenters/usersPresenter';
import { ICONS } from '@/assets/icons';

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
                                flex items-center gap-3
                                px-3 py-2.5 w-full min-h-14 rounded-2xl
                                border text-left transition-transform
                                ${haveCard
                                    ? `bg-surface enabled:cursor-pointer
                                       enabled:active:scale-[0.99]
                                       ${card.isShot
                                            ? 'border-danger/40'
                                            : 'border-success/35'}`
                                    : 'border-line bg-surface/40 cursor-default'}
                                focus:outline-none focus-visible:ring-2
                                focus-visible:ring-brand-light
                            `}
                        >
                            {/* O numero num selo fixo alinha todas as linhas,
                                mesmo com nome de tamanhos diferentes. */}
                            <span className={`
                                flex items-center justify-center shrink-0
                                h-9 w-9 rounded-lg
                                border border-line bg-elevated
                                text-xs tabular-nums
                                ${haveCard ? 'text-cream' : 'text-cream-dim'}
                            `}>
                                {card.number}
                            </span>
                            <span className='flex flex-col min-w-0 flex-1'>
                                <span className={`
                                    truncate
                                    ${haveCard ? 'text-cream' : 'text-cream-dim'}
                                `}>
                                    {haveCard ? card.name : '???'}
                                </span>
                                {haveCard && <span className='text-xs text-cream-dim'>
                                    {getCardTypeName(card.type)} · nível {card.level}
                                </span>}
                            </span>
                            <span className={`
                                shrink-0 text-lg
                                ${haveCard
                                    ? card.isShot ? 'text-danger' : 'text-success'
                                    : 'text-cream-dim/50'}
                            `}>
                                {haveCard ? getCardTypeIcon(card.type) : <ICONS.lock />}
                            </span>
                        </button>
                    </li>
                )
            })}
            {cards.length == 0 && <li className={`
                px-4 py-6 rounded-2xl
                border border-dashed border-line
                text-center text-sm text-cream-dim
            `}>
                Nenhuma carta encontrada
            </li>}
        </ul>
    )
}
