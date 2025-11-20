'use client'
import { useEffect, useState } from 'react';
import { useUser } from '@/providers/UserProvider';
import { usePersistentState } from '@/hooks/usePersistentState';
import { userHaveCard } from '@/presenters/usersPresenter';
import { ICONS } from '@/assets/icons';
import { CARDS } from '@/assets/cards';
import { PACKS } from '@/assets/packs';
import { Main } from '@/components/containers/Main';
import { TextInput } from '@/components/inputs/TextInput';
import { PageHeader } from '@/components/elements/PageHeader';
import { CardDetailsModal } from '@/components/cards/CardDetailsModal';
import { ListCollection } from '@/presentation/collection/ListCollection';
import { GridCollection } from '@/presentation/collection/GridCollection';

export default function Colecao(){

    const { user } = useUser(); 

    const [isListMode, setIsListMode] = usePersistentState('isListModeInCollection', true);

    const [search, setSearch] = useState('');
    const [copyList, setCopyList] = useState(CARDS);

    useEffect(() => {
        const filteredList = CARDS.filter(card => card.name.toLowerCase().includes(search.toLowerCase()));
        setCopyList(filteredList);
    }, [search]);

    const userCards = CARDS.filter(card => userHaveCard(user, card.id));

    const [selectedCardIndex, setSelectedCardIndex] = useState(null);

    function onPressCard(selectedCard) {
        const cardIndex = userCards.findIndex(userCard => userCard.id === selectedCard.id);
        setSelectedCardIndex(cardIndex);
    }

    return (
        <Main>
            <PageHeader title='Coleção' />  
            <div className='flex flex-col gap-2 w-full'>
                <TextInput value={search}
                    setValue={setSearch}
                    placeholder='Buscar carta...'
                />
                <div className='flex items-center justify-between text-sm'>
                    <span>
                        Obtidas: {userCards.length || 0}/{CARDS.length}
                    </span>
                    <button className='text-2xl' 
                        onClick={() => setIsListMode(!isListMode)}  
                    >
                        {isListMode ? <ICONS.list /> : <ICONS.blocks />}
                    </button>
                </div>
            </div>
            <div className={`
                flex flex-col gap-4
                flex-1 pb-4 w-full
                overflow-y-auto scrollbar-custom 
            `}>
                {PACKS.map((pack, i) => <div key={`collection-${pack.id}`}>
                    <div className='flex items-center justify-between mb-2'>
                        <h3 className='underline'>
                            {pack.name}
                        </h3>
                        <div className='flex justify-between text-sm'>
                            <span>
                                {userCards.filter(cards => cards.idPack == i+1).length || 0}/{CARDS.filter(cards => cards.idPack == i+1).length}
                            </span>
                        </div>
                    </div>
                    {isListMode
                        ? <ListCollection 
                            user={user}
                            cards={copyList.filter(cards => cards.idPack == i+1)}
                            onPressCard={onPressCard}
                        />
                        : <GridCollection 
                            user={user}
                            cards={copyList.filter(cards => cards.idPack == i+1)}
                            onPressCard={onPressCard}
                        />
                    }
                </div>)}
            </div>
            <CardDetailsModal
                cards={userCards}
                selectedCardIndex={selectedCardIndex}
                setSelectedCardIndex={setSelectedCardIndex}
            />
        </Main>
    );
}