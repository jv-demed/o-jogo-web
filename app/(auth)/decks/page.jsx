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
            {decks.loading ? <SpinLoader /> : 
                <div className='flex flex-col gap-3'>
                    {decks.list.length == 0
                        ? <>
                            <span className='text-center'>
                                Crie seu primeiro deck clicando no botão abaixo!
                            </span>
                            <ActionButton
                                icon={ICONS.add}
                                action={() => router.push('/decks/0')}
                            />
                        </> 
                        : <>
                            <div className='flex gap-1'>
                                <TextInput value={search}
                                    setValue={setSearch}
                                    placeholder='Buscar deck...'
                                />
                                <ActionButton
                                    icon={ICONS.add}
                                    width='40px'
                                    action={() => router.push('/decks/0')}
                                />
                            </div>
                            <ul className='flex flex-col gap-2'>
                                {copyList.map(deck => (
                                    <li key={deck.id}>
                                                                                <button type='button'
                                            onClick={() => router.push(`/decks/${deck.id}`)}
                                            className={`
                                                flex items-center justify-between
                                                border border-gray-500 rounded-4xl
                                                px-4 py-3 w-full min-h-12 cursor-pointer
                                                focus:outline-none focus-visible:ring-2
                                                focus-visible:ring-[#e2d4b8]
                                            `}
                                        >
                                            <span>{deck.name}</span>
                                                                                        <span className='text-xs'>
                                                N. Cartas: {deck.deck_cards.reduce((n, c) => n + c.quantity, 0)}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                                {copyList.length == 0 && <span>Nenhum deck encontrado</span>}
                            </ul>
                        </>
                    }
                </div> 
            }
        </Main>
    );
}