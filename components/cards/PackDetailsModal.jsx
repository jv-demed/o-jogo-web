'use client'
import { useState } from 'react';
import { addCardsInUser } from '@/presenters/usersPresenter';
import { ICONS } from '@/assets/icons';
import { CARDS } from '@/assets/cards';
import { CardForm } from '@/components/cards/CardForm';
import { ActionButton } from '@/components/buttons/ActionButton';
import { CardNavigation } from '@/components/cards/CardNavigation';
import Image from 'next/image';

export function PackDetailsModal({ 
    user,
    refresh,
    pack,
    onClose
}) {

    if(pack == null) return null;

    const cards = CARDS.filter(c => c.idPack == pack.id);

    const [selectedCardIndex, setSelectedCardIndex] = useState(0);
    const [drawnCards, setDrawnCards] = useState([]);

    async function handleBuy() {
        const cardIds = cards.map(c => c.id);
        const shuffled = [...cardIds].sort(() => Math.random() - 0.5);
        const drawnIds = shuffled.slice(0, pack.quantity);
        await addCardsInUser(user, drawnIds);
        await refresh();
        const newDrawnCards = cards.filter(card => 
            drawnIds.includes(card.id)
        );
        setDrawnCards(newDrawnCards);
        setSelectedCardIndex(0);
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
                <header onClick={onClose}
                    className='flex justify-end w-full'
                >
                    <ICONS.close className='text-4xl hover:text-red-400' />
                </header>
                {drawnCards.length == 0 && <div className='flex flex-col items-center gap-1'>
                    <CardForm factor={1}>
                        <Image
                            className='object-contain rounded'
                            src={`/packs/${pack.id}.png`}
                            alt={pack.name}
                            width={300}
                            height={480}
                        />
                    </CardForm>
                    <ActionButton text='Comprar' 
                        action={handleBuy}
                    />
                </div>}
                {drawnCards.length > 0 && <div 
                    className='flex flex-col items-center gap-2'
                >
                    <CardNavigation 
                        cards={drawnCards}
                        index={selectedCardIndex}
                        setIndex={setSelectedCardIndex}
                    />  
                    <ActionButton 
                        icon={ICONS.check}
                        width='300px'
                        action={() => {
                            setDrawnCards([]);
                            setSelectedCardIndex(0);
                        }}
                    />
                </div>}
            </div>
        </div>
    );
}