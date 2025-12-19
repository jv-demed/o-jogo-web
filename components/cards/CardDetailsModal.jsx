'use client'
import { sellCard } from '@/presenters/usersPresenter';
import { ICONS } from '@/assets/icons';
import { ActionButton } from '@/components/buttons/ActionButton';
import { CardNavigation } from '@/components/cards/CardNavigation';

export function CardDetailsModal({ 
    user,
    refresh,
    cards,
    selectedCardIndex,
    setSelectedCardIndex
}) {
    
    if (selectedCardIndex == null) return null;

    const selectedCard = cards[selectedCardIndex];

    const repetitions = user.cards.filter(
        cardId => cardId === selectedCard.id
    ).length;

    async function handleSell() {
        await sellCard(user, selectedCard);
        await refresh();
    }

    return (
        <div className={`
            fixed inset-0 bg-black/60 px-4
            flex items-center justify-center z-50
        `}>
            <div className={`
                flex flex-col justify-center items-center gap-2
                px-6 py-1 max-w-lg w-full 
                relative shadow-xl
            `}>
                <header onClick={() => setSelectedCardIndex(null)}
                    className='flex justify-end w-full' 
                >
                    <button className={` text-4xl hover:text-red-400`}>
                        <ICONS.close />
                    </button>
                </header>
                <CardNavigation 
                    cards={cards}
                    index={selectedCardIndex}
                    setIndex={setSelectedCardIndex}
                />
                <footer className={`
                    flex flex-col gap-2 
                    p-2 w-[300px] rounded    
                    bg-gray-800/80 
                `}>
                    <div className='flex justify-between'>
                        <span>
                            Unidades:
                        </span>
                        <span>
                            {repetitions}
                        </span>
                    </div>
                    <ActionButton text={`Vender por ${selectedCard.level * 10} coins`}
                        disabled={repetitions == 1}
                        action={handleSell}
                    />
                </footer>
            </div>
        </div>
    );
}