'use client'
import { useEffect, useState } from 'react';
import { useDataList } from '@/hooks/useDataList';
import { useUser } from '@/providers/UserProvider';
import { userHaveCard } from '@/presenters/usersPresenter';
import { getCardTypeIcon } from '@/presenters/cardsPresenter';
import { ICONS } from '@/assets/icons';
import { Card } from '@/components/cards/Card';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { TextInput } from '@/components/inputs/TextInput';
import { CardForm } from '@/components/containers/CardForm';
import { PageHeader } from '@/components/elements/PageHeader';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { CardDetailsModal } from '@/components/cards/CardDetailsModal';

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

    const [isListMode, setIsListMode] = useState(true);

    const [selectedCardIndex, setSelectedCardIndex] = useState(null);
    const [selectedCardList, setSelectedCardList] = useState([]);

    function longPressCard(card) {
        const ownedCards = copyList.filter(c => userHaveCard(user, c.number));
        const cardIndexInOwned = ownedCards.findIndex(c => c.number === card.number);
        setSelectedCardList(ownedCards);
        setSelectedCardIndex(cardIndexInOwned);
    }

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
                        <div className='flex justify-between text-sm'>
                            <span>
                                Obtidas: {user?.cards?.length || 0}/{cards.list.length}
                            </span>
                            <button onClick={() => setIsListMode(!isListMode)}
                                className='text-xl'    
                            >
                                {isListMode ? <ICONS.list /> : <ICONS.blocks />}
                            </button>
                        </div>
                        {isListMode
                            ? <ul className='flex flex-col gap-2'>
                                {copyList.map((card, i) => {
                                    const haveCard = userHaveCard(user, card.number);
                                    return (
                                        <li key={card.id}>
                                            <div onClick={() => {
                                                if(!haveCard) return;
                                                longPressCard(card);
                                            }}
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
                            : <ul className={`
                                flex-grow min-h-0
                                grid gap-x-1 gap-y-2 justify-between
                                grid-cols-[repeat(auto-fit,minmax(70px,max-content))]
                                overflow-y-auto overflow-x-hidden 
                                scrollbar-custom pr-1
                            `}>
                                {copyList.map((card, i) => {
                                    const haveCard = userHaveCard(user, card.number);
                                    return (
                                        <li key={`card-${i}/${card.id}`}>
                                            <div className='flex flex-col items-center'>
                                                {haveCard 
                                                    ? <Card card={card} 
                                                        scale={0.24}
                                                        onLongPress={() => {
                                                            if(!haveCard) return;
                                                            longPressCard(card);
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
                                {copyList.length == 0 && 
                                    <span>Nenhum carta encontrada</span>
                                }
                            </ul>
                        }
                    </div> 
                }
            </Box>
            <CardDetailsModal
                cards={selectedCardList}
                selectedCardIndex={selectedCardIndex}
                setSelectedCardIndex={setSelectedCardIndex}
            />
        </Main>
    );
}