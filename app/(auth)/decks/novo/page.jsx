'use client'
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDataList } from '@/hooks/useDataList';
import { useUser } from '@/providers/UserProvider';
import { insertDeck } from '@/presenters/decksPresenter';
import { ICONS } from '@/assets/icons';
import { Card } from '@/components/cards/Card';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { Modal } from '@/components/containers/Modal';
import { TextInput } from '@/components/inputs/TextInput';
import { PageHeader } from '@/components/elements/PageHeader';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { ActionButton } from '@/components/buttons/ActionButton';

export default function Deck(){

    const user = useUser();
    const router = useRouter();

    const cards = useDataList({
        table: 'oJogo-cards',
        filter: q => q.in('number', user.cards),
    });

    const [userCards, setUserCards] = useState([]);
    useEffect(() => {
        const finalList = user.cards
            .map(userCard => cards.list.find(c => c.number === userCard))
            .filter(Boolean);
        setUserCards(finalList);
    }, [cards.list, user.cards]);

    const [search, setSearch] = useState('');
    const [copyList, setCopyList] = useState([]);
    useEffect(() => {
        const filteredList = userCards
            .filter(card => card.name?.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
        setCopyList(filteredList);
    }, [userCards, search]);

    const [selectedCards, setSelectedCards] = useState([]);
    const [deckName, setDeckName] = useState('');

    async function handleSaveDeck() {
        await insertDeck({
            idUser: user.id,
            name: deckName,
            cards: selectedCards.map(card => card.number)
        });
        router.push('/decks');
    }

    const [selectedCard, setSelectedCard] = useState(null);

    return (
        <Main between>
            <Box>
                <PageHeader title='Montar deck' 
                    returnTo='/decks'
                />
                {cards.loading 
                    ? <SpinLoader /> 
                    : <div className='flex flex-col gap-3'>
                        <div className='flex flex-col gap-3'>
                            <TextInput value={search}
                                setValue={setSearch}
                                placeholder='Buscar carta...'
                            />
                            <ul className={`
                                grid gap-x-1 gap-y-2 justify-between
                                grid-cols-[repeat(auto-fit,minmax(70px,max-content))]
                            `}>
                                {copyList.map((card, i) => (
                                    <li key={`card-${i}/${card.id}`}
                                        onClick={() => {
                                            setSelectedCards(prev => [...prev, card].sort((a, b) => a.name.localeCompare(b.name)));
                                            setUserCards(prev => {
                                                const index = prev.findIndex(c => c.id === card.id);
                                                if (index === -1) return prev;
                                                const copy = [...prev];
                                                copy.splice(index, 1);
                                                return copy;
                                            });
                                        }}
                                    >
                                        <Card card={card} 
                                            scale={0.24}
                                            onLongPress={() => setSelectedCard(card)}
                                        />        
                                    </li>
                                ))}
                                {copyList.length == 0 && <span>Nenhum carta encontrada</span>}
                            </ul>
                        </div> 
                    </div>
                }
            </Box>
            {selectedCards.length > 0 && <Box>
                <div className='flex flex-col gap-3'>
                    <span>
                        Número de cartas: {selectedCards.length}
                    </span>
                    <ul className={`
                        flex gap-2 
                        overflow-x-auto overflow-y-hidden
                        scrollbar-custom    
                        snap-x snap-mandatory
                    `}>
                        {selectedCards.map((card, i) => (
                            <li key={`card-${i}/${card.id}`}
                                className='snap-center shrink-0'
                                onClick={() => {
                                    setSelectedCards(prev => {
                                        const index = prev.findIndex(c => c.id === card.id)
                                        if (index === -1) return prev;
                                        const copy = [...prev];
                                        copy.splice(index, 1);
                                        return copy;
                                    });
                                    setUserCards(prev => [...prev, card]);
                                }}
                            >
                                <Card card={card} 
                                    scale={0.25}
                                    onLongPress={() => setSelectedCard(card)}
                                />        
                            </li>
                        ))}
                    </ul>
                    <TextInput placeholder='Nome do deck'
                        value={deckName}
                        setValue={setDeckName}
                        maxLength={20}
                    />
                    <ActionButton text='Salvar' 
                        icon={ICONS.check}
                        disabled={deckName.length == 0}
                        action={handleSaveDeck}
                    />
                </div>
            </Box>} 
            <Modal isOpen={selectedCard} 
                onClose={() => setSelectedCard(null)}
            >
                <Card card={selectedCard} />
            </Modal>
        </Main>
    );
}