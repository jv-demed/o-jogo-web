'use client'
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDataList } from '@/hooks/useDataList';
import { useUser } from '@/providers/UserProvider';
import { ICONS } from '@/assets/icons';
import { Main } from '@/components/containers/Main';
import { TextInput } from '@/components/inputs/TextInput';
import { PageHeader } from '@/components/elements/PageHeader';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { ActionButton } from '@/components/buttons/ActionButton';

export default function Deck(){

    const router = useRouter();
    const { user } = useUser();

    const decks = useDataList({
        table: 'decks',
        select: 'id, name, deck_cards(quantity)',
        order: 'name',
        filter: e => e.eq('id_user', user.id)
    });

    const [search, setSearch] = useState('');
    const [copyList, setCopyList] = useState([]);
    useEffect(() => {
        const filteredList = decks.list.filter(deck => deck.name.toLowerCase().includes(search.toLowerCase()));
        setCopyList(filteredList);
    }, [decks.list, search]);

    return (
        <Main>
            <PageHeader title='Decks' />
            {decks.loading ? <SpinLoader marginTop='24px' /> :
                <div className='flex flex-col gap-3 w-full flex-1 min-h-0'>
                    {decks.list.length == 0
                        ? <div className={`
                            flex flex-col items-center gap-4
                            w-full p-6 panel text-center
                        `}>
                            <span className={`
                                flex items-center justify-center
                                h-14 w-14 rounded-2xl
                                border border-brand-light/25 bg-brand/25
                                text-brand-light text-xl
                            `}>
                                <ICONS.deck />
                            </span>
                            <p className='text-sm text-cream-dim'>
                                Você ainda não tem decks. Crie o primeiro para
                                começar a montar suas jogadas.
                            </p>
                            <ActionButton text='Criar deck'
                                icon={ICONS.add}
                                action={() => router.push('/decks/0')}
                            />
                        </div>
                        : <>
                            <div className='flex items-end gap-2'>
                                <TextInput value={search}
                                    setValue={setSearch}
                                    placeholder='Buscar deck...'
                                />
                                <ActionButton
                                    icon={ICONS.add}
                                    width='3rem'
                                    action={() => router.push('/decks/0')}
                                />
                            </div>
                            <ul className={`
                                flex flex-col gap-2
                                flex-1 min-h-0 pb-4
                                overflow-y-auto scrollbar-custom
                            `}>
                                {copyList.map(deck => (
                                    <li key={deck.id}>
                                        <button type='button'
                                            onClick={() => router.push(`/decks/${deck.id}`)}
                                            className={`
                                                flex items-center gap-3
                                                px-4 py-3 w-full min-h-14
                                                panel text-left cursor-pointer
                                                transition-transform active:scale-[0.99]
                                                focus:outline-none focus-visible:ring-2
                                                focus-visible:ring-brand-light
                                            `}
                                        >
                                            <span className='font-medium truncate'>
                                                {deck.name}
                                            </span>
                                            <span className={`
                                                ml-auto shrink-0 px-2.5 py-1 rounded-full
                                                border border-line bg-elevated
                                                text-xs tabular-nums text-cream-dim
                                            `}>
                                                {deck.deck_cards.reduce((n, c) => n + c.quantity, 0)} cartas
                                            </span>
                                        </button>
                                    </li>
                                ))}
                                {copyList.length == 0 && <li className={`
                                    px-4 py-6 rounded-2xl
                                    border border-dashed border-line
                                    text-center text-sm text-cream-dim
                                `}>
                                    Nenhum deck encontrado
                                </li>}
                            </ul>
                        </>
                    }
                </div>
            }
        </Main>
    );
}
