'use client'
import { useState } from 'react';
import { sellCard, cardSellPrice } from '@/presenters/usersPresenter';
import { ICONS } from '@/assets/icons';
import { ActionButton } from '@/components/buttons/ActionButton';
import { CardNavigation } from '@/components/cards/CardNavigation';
import { ErrorMessage } from '@/components/elements/ErrorMessage';

export function CardDetailsModal({ 
    user,
    refresh,
    cards,
    selectedCardIndex,
    setSelectedCardIndex
}) {
    
    const [error, setError] = useState(null);

    if (selectedCardIndex == null) return null;

    const selectedCard = cards[selectedCardIndex];

    const repetitions = user.cards.filter(
        cardId => cardId === selectedCard.id
    ).length;

    async function handleSell() {
        try{
            await sellCard(selectedCard.id);
            // Vender a ultima copia tira a carta da lista: sem isto o indice
            // continuaria apontando para uma posicao que mudou de dono.
            if(repetitions == 1) setSelectedCardIndex(null);
            await refresh();
        }catch(err){
            setError(err);
        }
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
                    <ActionButton text={`Vender por ${cardSellPrice(selectedCard.level)} coins`}
                        disabled={repetitions == 0}
                        action={handleSell}
                    />
                    {error && <ErrorMessage error={error} />}
                </footer>
            </div>
        </div>
    );
}