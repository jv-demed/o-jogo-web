'use client'
import { useEffect, useState } from 'react';
import { useUser } from '@/providers/UserProvider';
import { usePersistentState } from '@/hooks/usePersistentState';
import { userHaveCard } from '@/presenters/usersPresenter';
import { ICONS } from '@/assets/icons';
import { CARDS } from '@/assets/cards';
import { Box } from '@/components/containers/Box';
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

    const userCards = CARDS.filter(card => userHaveCard(user, card.number));

    const [selectedCardIndex, setSelectedCardIndex] = useState(null);

    function onPressCard(selectedCard) {
        const cardIndex = userCards.findIndex(userCard => userCard.number === selectedCard.number);
        setSelectedCardIndex(cardIndex);
    }

    return (
        <Main>
            <Box>
                <PageHeader title='Coleção' />  
                <div className='flex flex-col gap-3'>
                    <TextInput value={search}
                        setValue={setSearch}
                        placeholder='Buscar carta...'
                    />
                    <div className='flex justify-between text-sm'>
                        <span>
                            Obtidas: {userCards.length || 0}/{CARDS.length}
                        </span>
                        <button className='text-xl' 
                            onClick={() => setIsListMode(!isListMode)}  
                        >
                            {isListMode ? <ICONS.list /> : <ICONS.blocks />}
                        </button>
                    </div>
                    {isListMode
                        ? <ListCollection 
                            user={user}
                            cards={copyList}
                            onPressCard={onPressCard}
                        />
                        : <GridCollection 
                            user={user}
                            cards={copyList}
                            onPressCard={onPressCard}
                        />
                    }
                </div> 
            </Box>
            <CardDetailsModal
                cards={userCards}
                selectedCardIndex={selectedCardIndex}
                setSelectedCardIndex={setSelectedCardIndex}
            />
        </Main>
    );
}