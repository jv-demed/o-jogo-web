'use client'
import { useEffect, useState } from 'react';
import { useDataList } from '@/hooks/useDataList';
import { useUser } from '@/providers/UserProvider';
import { userHaveCard } from '@/presenters/usersPresenter';
import { getCardTypeIcon } from '@/presenters/cardsPresenter';
import { Card } from '@/components/cards/Card';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { TextInput } from '@/components/inputs/TextInput';
import { PageHeader } from '@/components/elements/PageHeader';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { CardDetailsModal } from '@/components/cards/CardDetailsModal';
import { ICONS } from '@/assets/icons';
import { PACK_CATEGORIES } from '@/presenters/packsPresenter';
import { CardForm } from '@/components/containers/CardForm';

export default function StorePage(){

    const cards = useDataList({
        table: 'oJogo-cards',
        order: 'number'
    });

    const packs = useDataList({
        table: 'oJogo-packs',
        order: 'dateRelease'
    });
    console.log(packs);

    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        !cards.loading && !packs.loading && setIsLoading(false);
    }, [cards, packs]);

    return (
        <Main>
            <Box>
                <PageHeader title='Loja' />  
                {isLoading 
                    ? <SpinLoader /> 
                    : <div className='flex flex-col gap-6'>
                        {PACK_CATEGORIES.map(category => (
                            <div className='flex flex-col gap-4 border-b pb-2'>
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
                                                <div className='flex flex-col items-center gap-0.5'>
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
        </Main>
    );
}