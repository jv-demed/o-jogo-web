import { userHaveCard } from '@/presenters/usersPresenter';
import { Card } from '@/components/cards/Card';
import { CardForm } from '@/components/cards/CardForm';

// A carta e desenhada em 300px e reduzida por transform, entao a escala e que
// define a largura da celula: 0.3 da 90px, tres colunas confortaveis mesmo
// numa tela de 320px.
const SCALE = 0.3;

export function GridCollection({ user, cards, onPressCard }) {
    return (
        <ul className={`
            grid gap-x-2 gap-y-3 justify-items-center
            grid-cols-[repeat(auto-fill,minmax(90px,1fr))]
        `}>
            {cards.map(card => {
                const haveCard = userHaveCard(user, card.id);
                return (
                    <li key={`card-${card.id}`}
                        className='flex justify-center'
                    >
                        {haveCard
                            ? <div className={`
                                rounded-md overflow-hidden
                                shadow-lg shadow-black/40
                            `}>
                                <Card card={card}
                                    scale={SCALE}
                                    onClick={() => onPressCard(card)}
                                />
                            </div>
                            : <CardForm factor={SCALE}>
                                <span className='text-cream-dim/60 text-xs tabular-nums'>
                                    {card.number}
                                </span>
                            </CardForm>
                        }
                    </li>
                )
            })}
            {cards.length == 0 && <li className={`
                col-span-full w-full px-4 py-6 rounded-2xl
                border border-dashed border-line
                text-center text-sm text-cream-dim
            `}>
                Nenhuma carta encontrada
            </li>}
        </ul>
    )
}
