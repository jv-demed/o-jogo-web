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

    const { user, refreshUser } = useUser();

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

    const totalProgress = Math.round((userCards.length / CARDS.length) * 100);

    return (
        <Main>
            <PageHeader title='Coleção' />
            <div className='flex flex-col gap-3 w-full shrink-0'>
                <TextInput value={search}
                    setValue={setSearch}
                    placeholder='Buscar carta...'
                />
                <div className='flex items-center justify-between gap-3'>
                    <div className='flex flex-col gap-1.5 min-w-0 flex-1'>
                        <span className='text-xs text-cream-dim'>
                            Obtidas <strong className='text-cream'>{userCards.length}</strong> de {CARDS.length}
                        </span>
                        <div className='h-1.5 w-full rounded-full bg-elevated overflow-hidden'>
                            <div className={`
                                h-full rounded-full
                                bg-linear-to-r from-brand to-brand-light
                                transition-[width] duration-500
                            `}
                                style={{ width: `${totalProgress}%` }}
                            />
                        </div>
                    </div>
                    {/* Alternador segmentado: os dois modos ficam visiveis e o
                        atual acende, em vez de um botao que troca de icone e
                        so diz para onde vai. */}
                    <div className={`
                        flex shrink-0 gap-0.5 p-0.5 rounded-xl
                        border border-line bg-surface
                    `}>
                        {[
                            { mode: true, icon: ICONS.list, label: 'Ver em lista' },
                            { mode: false, icon: ICONS.blocks, label: 'Ver em grade' }
                        ].map(option => {
                            const Icon = option.icon;
                            const isCurrent = isListMode === option.mode;
                            return (
                                <button key={option.label}
                                    type='button'
                                    aria-label={option.label}
                                    aria-pressed={isCurrent}
                                    onClick={() => setIsListMode(option.mode)}
                                    className={`
                                        flex items-center justify-center
                                        h-9 w-10 rounded-[0.6rem] text-lg
                                        transition-colors
                                        ${isCurrent
                                            ? 'bg-brand text-cream'
                                            : 'text-cream-dim'}
                                        focus:outline-none focus-visible:ring-2
                                        focus-visible:ring-brand-light
                                    `}
                                >
                                    <Icon />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className={`
                flex flex-col gap-6
                flex-1 min-h-0 pb-4 w-full
                overflow-y-auto scrollbar-custom
            `}>
                {PACKS.map(pack => {
                    const packCards = copyList.filter(card => card.idPack == pack.id);
                    const packTotal = CARDS.filter(card => card.idPack == pack.id).length;
                    const packOwned = userCards.filter(card => card.idPack == pack.id).length;
                    return (
                        <section key={`collection-${pack.id}`}>
                            {/* Titulo grudado no topo da rolagem: a lista e
                                longa e sem isto some a referencia de qual
                                pacote se esta olhando. */}
                            <header className={`
                                sticky top-0 z-10
                                flex items-center justify-between gap-2 mb-3 py-2
                                bg-base/90 backdrop-blur-sm
                            `}>
                                <h2 className='font-semibold truncate'>
                                    {pack.name}
                                </h2>
                                <span className={`
                                    shrink-0 px-2.5 py-1 rounded-full
                                    border border-line bg-elevated
                                    text-xs tabular-nums text-cream-dim
                                `}>
                                    {packOwned}/{packTotal}
                                </span>
                            </header>
                            {isListMode
                                ? <ListCollection
                                    user={user}
                                    cards={packCards}
                                    onPressCard={onPressCard}
                                />
                                : <GridCollection
                                    user={user}
                                    cards={packCards}
                                    onPressCard={onPressCard}
                                />
                            }
                        </section>
                    );
                })}
            </div>
            <CardDetailsModal
                user={user}
                refresh={refreshUser}
                cards={userCards}
                selectedCardIndex={selectedCardIndex}
                setSelectedCardIndex={setSelectedCardIndex}
            />
        </Main>
    );
}
