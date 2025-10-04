'use client'
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDataList } from '@/hooks/useDataList';
import { useUser } from '@/providers/UserProvider';
import { ICONS } from '@/assets/icons';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { TextInput } from '@/components/inputs/TextInput';
import { PageHeader } from '@/components/elements/PageHeader';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { ActionButton } from '@/components/buttons/ActionButton';

export default function Deck(){

    const router = useRouter();
    const user = useUser();

    const decks = useDataList({
        table: 'oJogo-decks',
        order: 'name',
        filter: e => e.eq('idUser', user.id)
    });

    const [search, setSearch] = useState('');
    const [copyList, setCopyList] = useState([]);
    useEffect(() => {
        const filteredList = decks.list.filter(deck => deck.name.toLowerCase().includes(search.toLowerCase()));
        setCopyList(filteredList);
    }, [decks.list, search]);

    return (
        <Main>
            <Box>
                <PageHeader title='Decks' />
                {decks.loading 
                    ? <SpinLoader /> 
                    : <div className='flex flex-col gap-3'>
                        <div className='flex gap-1'>
                            <TextInput value={search}
                                setValue={setSearch}
                                placeholder='Buscar deck...'
                            />
                            <ActionButton
                                icon={ICONS.add}
                                width='40px'
                                action={() => router.push('/decks/novo')}
                            />
                        </div>
                        <ul className='flex flex-col gap-2'>
                            {copyList.map(deck => (
                                <li key={deck.id}>
                                    <div className={`
                                        flex items-center justify-between
                                        border border-gray-500 rounded-4xl
                                        px-4 py-3 cursor-pointer
                                    `}>
                                        <span>{deck.name}</span>
                                        <span className='text-xs'>
                                            N. Cartas: {deck.cards.length}
                                        </span>
                                    </div>
                                </li>
                            ))}
                            {copyList.length == 0 && <span>Nenhum deck encontrado</span>}
                        </ul>
                    </div> 
                }
            </Box>
        </Main>
    );
}