'use client'
import { useEffect, useState } from 'react';
import { useDataList } from '@/hooks/useDataList';
import { useUser } from '@/providers/UserProvider';
import { PACK_CATEGORIES } from '@/presenters/packsPresenter';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { CardForm } from '@/components/cards/CardForm';
import { PageHeader } from '@/components/elements/PageHeader';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { PackDetailsModal } from '@/components/cards/PackDetailsModal';

export default function StorePage(){

    const { user, refreshUser } = useUser();

    const cards = useDataList({
        table: 'oJogo-cards',
        order: 'number'
    });

    const packs = useDataList({
        table: 'oJogo-packs',
        order: 'dateRelease'
    });

    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        !cards.loading && !packs.loading && setIsLoading(false);
    }, [cards, packs]);

    const [selectedPack, setSelectedPack] = useState(null);

    return (
        <Main>
            <Box>
                <PageHeader title='Loja' />  
                {isLoading 
                    ? <SpinLoader /> 
                    : <div className='flex flex-col gap-6'>
                        {PACK_CATEGORIES.map(category => (
                            <div key={`category-${category.id}`}
                                className='flex flex-col gap-4 border-b pb-2'
                            >
                                <span className='underline'>
                                    Packs - {category.name}
                                </span>
                                <ul className={`
                                    flex-grow min-h-0
                                    grid gap-x-1 gap-y-2 justify-between
                                    grid-cols-[repeat(auto-fit,minmax(70px,max-content))]
                                    overflow-y-auto overflow-x-hidden 
                                    scrollbar-custom pr-1
                                `}>
                                    {packs.list
                                        .filter(pack => pack.category === category.id)
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map((pack, i) => (
                                            <li key={`pack-${i}/${pack.id}`}>
                                                <div className='flex flex-col items-center gap-0.5'
                                                    onClick={() => setSelectedPack(pack)}
                                                >
                                                    <CardForm factor={0.24} />
                                                    <span className='text-gray-400 text-sm text-wrap'>
                                                        {pack.name}
                                                    </span>
                                                </div>
                                            </li>
                                        ))
                                    }
                                </ul>
                            </div>
                        ))}
                    </div> 
                }
            </Box>
            <PackDetailsModal 
                user={user}
                refresh={refreshUser}
                pack={selectedPack}
                cards={cards.list}
                onClose={() => setSelectedPack(null)} 
            />
        </Main>
    );
}