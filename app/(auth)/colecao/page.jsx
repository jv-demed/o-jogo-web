'use client'
import { useDataList } from '@/hooks/useDataList';
import { useUser } from '@/providers/UserProvider';
import { userHaveCard } from '@/presenters/usersPresenter';
import { getCardTypeIcon } from '@/presenters/cardsPresenter';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { PageHeader } from '@/components/elements/PageHeader';
import { useState } from 'react';
import { Modal } from '@/components/containers/Modal';
import { Card } from '@/components/cards/Card';

export default function Colecao(){

    const user = useUser();

    const cards = useDataList({
        table: 'oJogo-cards',
        order: 'number'
    });
    console.log(user);
    console.log(cards);

    const [selectedCard, setSelectedCard] = useState(null);

    return (
        <Main>
            <Box>
                <PageHeader title='Coleção' />  
                {cards.loading 
                    ? <SpinLoader /> 
                    : <ul className='flex flex-col gap-2'>
                        {cards.list.map(card => {
                            const haveCard = userHaveCard(user, card.number);
                            return (
                                <li key={card.id}>
                                    <div onClick={() => haveCard && setSelectedCard(card)}
                                        className={`
                                            flex items-center
                                            border border-[#e2d4b8] rounded-4xl
                                            px-4 py-3 cursor-pointer
                                        `}
                                    >
                                        <span className='id'>
                                            {card.number}
                                        </span>
                                        <div className={`
                                            flex ${haveCard ? 'justify-start' : 'justify-center'}
                                            w-full 
                                        `}>
                                            <span className={haveCard ? 'pl-4' : ''}>
                                                {haveCard ? card.name : '???'}
                                            </span>
                                        </div>
                                        {haveCard && getCardTypeIcon(card)}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                }
            </Box>
            <Modal isOpen={selectedCard} 
                onClose={() => setSelectedCard(null)}
            >
                <Card card={selectedCard} />
            </Modal>
        </Main>
    );
}