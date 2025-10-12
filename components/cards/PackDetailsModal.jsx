'use client'
import { useDataObj } from '@/hooks/useDataObj';
import { incPurchase, insertPurchase } from '@/presenters/packsPresenter';
import { ICONS } from '@/assets/icons';
import { CardForm } from '@/components/cards/CardForm';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { ActionButton } from '@/components/buttons/ActionButton';
import { CardNavigation } from './CardNavigation';
import { useState } from 'react';
import { addCardsInUser } from '@/presenters/usersPresenter';

export function PackDetailsModal({ 
    user,
    pack,
    cards,
    onClose
}) {

    //  CORRIGIR WARNING 
    //  NÚMERO DE CARTAS POR PACK DINAMICAMENTE

    if (pack == null) return null;

    const purchase = useDataObj({
        table: 'oJogo-users:packs',
        filter: q => q.eq('idUser', user.id).eq('idPack', pack.id)
    });

    const [selectedCardIndex, setSelectedCardIndex] = useState(0);
    const [drawnCards, setDrawnCards] = useState([]);

    async function handleBuy() {
        if(purchase.obj) {
            await incPurchase(purchase.obj);
        } else {
            await insertPurchase({
                idUser: user.id,
                idPack: pack.id
            });
        }
        purchase.refresh();
        const deckNumbers = pack.cards;
        const shuffled = [...deckNumbers].sort(() => Math.random() - 0.5);
        const drawnNumbers = shuffled.slice(0, 4);
        await addCardsInUser(user, drawnNumbers);
        const newDrawnCards = cards.filter(card => 
            drawnNumbers.includes(card.number)
        );
        setDrawnCards(newDrawnCards);
        setSelectedCardIndex(0);
    }

    return (
        <div className={`
            fixed inset-0 bg-black/60 px-4
            flex items-center justify-center z-50
        `}>
            {purchase.loading ? <SpinLoader /> :
                <div className={`
                    flex flex-col justify-center items-center gap-2
                    px-6 py-1 max-w-lg w-full 
                    relative shadow-xl
                `}>
                    <header className='flex justify-end w-full'>
                        <button onClick={onClose} 
                            className={` text-4xl hover:text-red-400`}
                        >
                            <ICONS.close />
                        </button>
                    </header>
                    {drawnCards.length == 0 && <div className='flex flex-col items-center gap-1'>
                        <CardForm factor={1} />
                        <ActionButton text='Comprar' 
                            action={handleBuy}
                        />
                        <span>
                            Quantidade comprada: {purchase.obj?.amount ?? 0}
                        </span>
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
            }
        </div>
    );
}