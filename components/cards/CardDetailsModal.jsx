'use client'
import { useState } from 'react';
import { sellCard, cardSellPrice } from '@/presenters/usersPresenter';
import { ICONS } from '@/assets/icons';
import { Modal } from '@/components/containers/Modal';
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
        <Modal onClose={() => setSelectedCardIndex(null)}
            label={selectedCard.name}
        >
            <CardNavigation
                cards={cards}
                index={selectedCardIndex}
                setIndex={setSelectedCardIndex}
            />
            <footer className={`
                flex flex-col gap-3
                p-3 w-full max-w-[300px] panel
            `}>
                <div className='flex items-center justify-between text-sm'>
                    <span className='text-cream-dim'>
                        Unidades
                    </span>
                    <span className={`
                        px-2.5 py-0.5 rounded-full
                        border border-line bg-elevated
                        font-semibold tabular-nums
                    `}>
                        {repetitions}
                    </span>
                </div>
                <ActionButton text={`Vender por ${cardSellPrice(selectedCard.level)}`}
                    variant='gold'
                    icon={ICONS.coins}
                    disabled={repetitions == 0}
                    action={handleSell}
                />
                {error && <ErrorMessage error={error} />}
            </footer>
        </Modal>
    );
}
