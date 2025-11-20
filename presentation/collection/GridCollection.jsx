import { userHaveCard } from '@/presenters/usersPresenter';
import { Card } from '@/components/cards/Card';
import { CardForm } from '@/components/cards/CardForm';

export function GridCollection({ user, cards, onPressCard }) {
    return (
        <ul className={`
            flex-grow min-h-0
            grid gap-x-1 gap-y-2 justify-between
            grid-cols-[repeat(auto-fit,minmax(70px,max-content))]
            overflow-y-auto overflow-x-hidden 
            scrollbar-custom pr-1
        `}>
            {cards.map(card => {
                const haveCard = userHaveCard(user, card.id);
                return (
                    <li key={`card-${card.id}`}>
                        <div className='flex flex-col items-center'>
                            {haveCard 
                                ? <Card card={card} 
                                    scale={0.24}
                                    onLongPress={() => {
                                        if(!haveCard) return;
                                        onPressCard(card);
                                    }}
                                />   
                                : <CardForm factor={0.24}>
                                    <span className='text-gray-400'>
                                        {card.number}    
                                    </span> 
                                </CardForm>
                            }  
                        </div>
                    </li>
                )
            })}
            {cards.length == 0 && 
                <span>Nenhum carta encontrada</span>
            }
        </ul>
    )
}