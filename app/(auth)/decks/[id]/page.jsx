'use client'
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useDataObj } from '@/hooks/useDataObj';
import { useUser } from '@/providers/UserProvider';
import { saveDeck } from '@/presenters/decksPresenter';
import { ICONS } from '@/assets/icons';
import { CARDS } from '@/assets/cards';
import { Card } from '@/components/cards/Card';
import { Main } from '@/components/containers/Main';
import { TextInput } from '@/components/inputs/TextInput';
import { PageHeader } from '@/components/elements/PageHeader';
import { ActionButton } from '@/components/buttons/ActionButton';
import { CardDetailsModal } from '@/components/cards/CardDetailsModal';
import { ErrorMessage } from '@/components/elements/ErrorMessage';

export default function Deck({ params }){

    const router = useRouter();
    const { user, refreshUser } = useUser();

    const deck = useDataObj({
        table: 'decks',
        select: 'id, name, deck_cards(id_card, quantity)',
        delay: params.id == 0,
        filter: q => q.eq('id', params.id)
    });

    const byName = (a, b) => a.name.localeCompare(b.name);

    // user.cards e a colecao como array plano de ids, com repeticao.
    const collection = useMemo(() => user.cards
        .map(id => CARDS.find(c => c.id === id))
        .filter(Boolean), [user.cards]);

    const [userCards, setUserCards] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [deckName, setDeckName] = useState('');

    // Um unico efeito reparte a colecao entre "no deck" e "disponivel".
    // Antes eram dois efeitos gravando userCards, um sobrescrevendo o outro.
    useEffect(() => {
        const isNovo = params.id == 0;
        if(!isNovo && !deck.obj) return;

        const disponiveis = [...collection];
        const noDeck = [];

        // Cruza por id_card. A versao antiga cruzava id com number e trazia
        // a carta errada em qualquer deck com carta de pack 2 ou 3.
        for(const { id_card, quantity } of deck.obj?.deck_cards ?? []) {
            for(let i = 0; i < quantity; i++) {
                const idx = disponiveis.findIndex(c => c.id === id_card);
                if(idx === -1) break; // carta saiu da colecao desde o ultimo save
                noDeck.push(disponiveis[idx]);
                disponiveis.splice(idx, 1);
            }
        }

        setSelectedCards(noDeck.sort(byName));
        setUserCards(disponiveis.sort(byName));
        setDeckName(deck.obj?.name ?? '');
    }, [deck.obj, collection, params.id]);

    const [search, setSearch] = useState('');
    const copyList = useMemo(() => userCards
        .filter(card => card.name?.toLowerCase().includes(search.toLowerCase()))
        .sort(byName), [userCards, search]);

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

    const [saveError, setSaveError] = useState(null);

    async function handleSaveDeck() {
        setSaveError(null);
        try{
            const idDeck = await saveDeck({
                idDeck: params.id != 0 ? deck.obj.id : null,
                idUser: user.id,
                name: deckName,
                cards: selectedCards
            });
            if(params.id == 0) router.replace(`/decks/${idDeck}`);
        }catch(err){
            setSaveError(err);
        }
    }

    const [selectedCardIndex, setSelectedCardIndex] = useState(null);
    const [selectedCardList, setSelectedCardList] = useState([]);

    return (
        <Main>
            <PageHeader title={deck.obj ? 'Editar deck' : 'Novo deck'} 
                returnTo='/decks'
            />
            <div className={`
                flex flex-col gap-3 
                h-full w-full min-h-0 pb-4
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
                            scrollbar-custom min-w-0  
                            w-full snap-x snap-mandatory
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
                            {saveError && <ErrorMessage error={saveError} />}
                        </div>}
                    </div>
                </div>}
            </div> 
            <CardDetailsModal
                user={user}
                refresh={refreshUser}
                cards={selectedCardList}
                selectedCardIndex={selectedCardIndex}
                setSelectedCardIndex={setSelectedCardIndex}
            />
        </Main>
    );
}