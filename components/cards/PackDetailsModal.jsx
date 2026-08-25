'use client'
import Image from 'next/image';
import { useState } from 'react';
import { buyPack } from '@/presenters/usersPresenter';
import { ICONS } from '@/assets/icons';
import { CARDS } from '@/assets/cards';
import { Modal } from '@/components/containers/Modal';
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
        <Modal onClose={onClose}
            label={pack.name}
        >
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
        </Modal>
    );
}