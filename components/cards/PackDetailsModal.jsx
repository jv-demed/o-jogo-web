'use client'
import Image from 'next/image';
import { useState } from 'react';
import { buyPack } from '@/presenters/usersPresenter';
import { ICONS } from '@/assets/icons';
import { CARDS } from '@/assets/cards';
import { CardForm } from '@/components/cards/CardForm';
import { ActionButton } from '@/components/buttons/ActionButton';
import { CardNavigation } from '@/components/cards/CardNavigation';
import { ErrorMessage } from '@/components/elements/ErrorMessage';

export function PackDetailsModal({ 
    refresh,
    pack,
    onClose
}) {

    const [selectedCardIndex, setSelectedCardIndex] = useState(0);
    const [drawnCards, setDrawnCards] = useState([]);
    const [error, setError] = useState(null);

    if(pack == null) return null;

    async function handleBuy() {
        setError(null);
        try{
            // O sorteio acontece no servidor. Aqui so recebemos os ids e
            // buscamos a arte no bundle para exibir.
            const drawnIds = await buyPack(pack.id);
            setDrawnCards(drawnIds.map(id => CARDS.find(c => c.id === id)).filter(Boolean));
            setSelectedCardIndex(0);
            await refresh();
        }catch(err){
            // Saldo insuficiente agora e decisao do banco, nao do cliente.
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
                    <ActionButton text={`Comprar por ${pack.price} coins`}
                        action={handleBuy}
                    />
                    {error && <ErrorMessage error={error} />}
                </div>}
                {drawnCards.length > 0 && <div 
                    className='flex flex-col items-center gap-2'
                >
                    <CardNavigation 
                        cards={drawnCards}
                        index={selectedCardIndex}
                        setIndex={setSelectedCardIndex}
                    />  
                    {selectedCardIndex == drawnCards.length-1 && <ActionButton 
                        icon={ICONS.check}
                        width='300px'
                        action={() => {
                            setDrawnCards([]);
                            setSelectedCardIndex(0);
                        }}
                    />}
                </div>}
            </div>
        </div>
    );
}