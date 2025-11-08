'use client'
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDataObj } from '@/hooks/useDataObj';
import { useUser } from '@/providers/UserProvider';
import { insertDeck, updateDeck } from '@/presenters/decksPresenter';
import { ICONS } from '@/assets/icons';
import { Card } from '@/components/cards/Card';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { CardDetailsModal } from '@/components/cards/CardDetailsModal';
import { TextInput } from '@/components/inputs/TextInput';
import { PageHeader } from '@/components/elements/PageHeader';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { ActionButton } from '@/components/buttons/ActionButton';
import { CARDS } from '@/assets/cards';

export default function Deck({ params }){

    const router = useRouter();
    const { user } = useUser();

    const deck = useDataObj({
        table: 'oJogo-decks',
        delay: params.id == 0,
        filter: q => q.eq('id', params.id)
    });
    console.log(deck);

    const [userCards, setUserCards] = useState([]);
    useEffect(() => {
        const finalList = user.cards
            .map(userCard => CARDS.find(c => c.id === userCard))
            .filter(Boolean);
        setUserCards(finalList);
    }, [user.cards]);

    const [search, setSearch] = useState('');
    const [copyList, setCopyList] = useState([]);
    useEffect(() => {
        const filteredList = userCards
            .filter(card => card.name?.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
        setCopyList(filteredList);
    }, [userCards, search]);

    useEffect(() => {
        if (!deck.obj || !Array.isArray(deck.obj.cards)) return;
        if (!CARDS.length || !user.cards.length) return;
        const userFull = user.cards
            .map(n => CARDS.find(c => String(c.number) === String(n)))
            .filter(Boolean);
        const deckNums = deck.obj.cards.map(String);
        const selected = [];
        const remaining = [];
        for(const card of userFull) {
            const idx = deckNums.indexOf(String(card.number));
            if(idx !== -1) {
                selected.push(card);
                deckNums.splice(idx, 1);
            }else {
                remaining.push(card);
            }
        }
        const missingFromUser = deckNums
            .map(n => CARDS.find(c => String(c.number) === n))
            .filter(Boolean);
        setSelectedCards(selected.concat(missingFromUser)); 
        setUserCards(remaining.sort((a, b) => a.name.localeCompare(b.name)));
        setDeckName(deck.obj.name ?? '');
    }, [deck.obj, user.cards]);

    const [selectedCards, setSelectedCards] = useState([]);
    const [deckName, setDeckName] = useState('');

    function handleAddCard(card) {
        setSelectedCards(prev => [...prev, card].sort((a, b) => a.name.localeCompare(b.name)));
        setUserCards(prev => {
            const index = prev.findIndex(c => c.id === card.id);
            if (index === -1) return prev;
            const copy = [...prev];
            copy.splice(index, 1);
            return copy;
        });
    }

    function handleRemoveCard(card) {
        setSelectedCards(prev => {
            const index = prev.findIndex(c => c.id === card.id)
            if (index === -1) return prev;
            const copy = [...prev];
            copy.splice(index, 1);
            return copy;
        });
        setUserCards(prev => [...prev, card]);
    }

    const [saveMode, setSaveMode] = useState(false);

    async function handleSaveDeck() {
        if(params.id != 0) {
            const updatedDeck = {
                idUser: user.id,
                name: deckName,
                cards: selectedCards.map(card => card.number)
            };
            await updateDeck(deck.obj.id, updatedDeck);
        } else{
            const { id } = await insertDeck({
                idUser: user.id,
                name: deckName,
                cards: selectedCards.map(card => card.number)
            });
            router.replace(`/decks/${id}`);
        }
    }

    const [selectedCardIndex, setSelectedCardIndex] = useState(null);
    const [selectedCardList, setSelectedCardList] = useState([]);

    return (
        <Main>
            <Box fullH>
                <PageHeader title={deck.obj ? 'Editar deck' : 'Novo deck'} 
                    returnTo='/decks'
                />
                <div className={`
                        flex flex-col gap-3 
                        h-full min-h-0
                    `}>
                        <TextInput value={search}
                            setValue={setSearch}
                            placeholder='Buscar carta...'
                        />
                        <ul className={`
                            flex-grow min-h-0
                            grid gap-x-1 gap-y-2 justify-between
                            grid-cols-[repeat(auto-fit,minmax(70px,max-content))]
                            overflow-y-auto overflow-x-hidden 
                            scrollbar-custom pr-1
                        `}>
                            {copyList.map((card, i) => (
                                <li key={`card-${i}/${card.id}`}>
                                    <div className='flex flex-col items-center'>
                                        <Card card={card} 
                                            scale={0.24}
                                            onLongPress={() => {
                                                setSelectedCardList(copyList);
                                                setSelectedCardIndex(i);
                                            }}
                                        />   
                                        <ICONS.add 
                                            onClick={() => handleAddCard(card)}
                                            className={`
                                                border-b border-r border-l 
                                                w-full rounded-b-2xl    
                                            `} 
                                        />       
                                    </div>
                                </li>
                            ))}
                            {copyList.length == 0 && 
                                <span>Nenhum carta encontrada</span>
                            }
                        </ul>
                        {selectedCards.length > 0 && <div>
                            <div className={`
                                border-b border-gray-500 
                                w-full rounded-2xl    
                            `}/>
                            <div className='flex justify-center text-4xl py-1'
                                onClick={() => setSaveMode(!saveMode)}
                            >
                                {saveMode ? <ICONS.chevronDown /> : <ICONS.chevronUp />}
                            </div>
                            <div className='flex flex-col gap-2'>
                                {saveMode && <span>
                                    Número de cartas: {selectedCards.length}
                                </span>}
                                <ul className={`
                                    flex gap-2 pb-2
                                    overflow-x-auto overflow-y-hidden
                                    scrollbar-custom    
                                    snap-x snap-mandatory
                                `}>
                                    {selectedCards.map((card, i) => (
                                        <li key={`card-${i}/${card.id}`}
                                            className='snap-center shrink-0'
                                        >
                                            <div className='flex flex-col items-center'>
                                                <Card card={card} 
                                                    scale={0.24}
                                                    onLongPress={() => {
                                                        setSelectedCardList(selectedCards);
                                                        setSelectedCardIndex(i);
                                                    }}
                                                />  
                                                <ICONS.close 
                                                    onClick={() => handleRemoveCard(card)}
                                                    className={`
                                                        w-full rounded-b-2xl bg-red-400 
                                                    `} 
                                                />      
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                {saveMode && <div className='flex flex-col gap-1'>
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
                                </div>}
                            </div>
                        </div>}
                </div> 
            </Box>
            <CardDetailsModal
                cards={selectedCardList}
                selectedCardIndex={selectedCardIndex}
                setSelectedCardIndex={setSelectedCardIndex}
            />
        </Main>
    );
}