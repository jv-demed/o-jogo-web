'use client'
import { useEffect, useState } from 'react';
import { useDataList } from '@/hooks/useDataList';
import { useUser } from '@/providers/UserProvider';
import { userHaveCard } from '@/presenters/usersPresenter';
import { getCardTypeIcon } from '@/presenters/cardsPresenter';
import { Card } from '@/components/cards/Card';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { CardDetailsModal } from '@/components/cards/CardDetailsModal';
import { TextInput } from '@/components/inputs/TextInput';
import { PageHeader } from '@/components/elements/PageHeader';
import { SpinLoader } from '@/components/elements/SpinLoader';

export default function Colecao(){

    const user = useUser();

    const cards = useDataList({
        table: 'oJogo-cards',
        order: 'number'
    });

    const [search, setSearch] = useState('');
    const [copyList, setCopyList] = useState([]);
    useEffect(() => {
        const filteredList = cards.list.filter(card => card.name.toLowerCase().includes(search.toLowerCase()));
        setCopyList(filteredList);
    }, [cards.list, search]);

    const [selectedCard, setSelectedCard] = useState(null);

    return (
        <Main>
            <Box>
                <PageHeader title='Coleção' />  
                {cards.loading 
                    ? <SpinLoader /> 
                    : <div className='flex flex-col gap-3'>
                        <TextInput value={search}
                            setValue={setSearch}
                            placeholder='Buscar carta...'
                        />
                        <ul className='flex flex-col gap-2'>
                            {copyList.map(card => {
                                const haveCard = userHaveCard(user, card.number);
                                return (
                                    <li key={card.id}>
                                        <div onClick={() => haveCard && setSelectedCard(card)}
                                            className={`
                                                flex items-center
                                                border border-gray-500 rounded-4xl
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
                            {copyList.length == 0 && <span>Nenhum carta encontrada</span>}
                        </ul>
                    </div> 
                }
            </Box>
            <CardDetailsModal isOpen={selectedCard} 
                onClose={() => setSelectedCard(null)}
                selectedCard={selectedCard}
            />
        </Main>
    );
}