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

export default function Colecao(){

    const user = useUser();

    const cards = useDataList({
        table: 'oJogo-cards',
        order: 'number'
    });

    const packs = useDataList({
        table: 'oJogo-packs',
        order: 'dateRelease'
    });
    console.log(packs);

    return (
        <Main>
            <Box>
                <PageHeader title='Loja' />  
                {cards.loading 
                    ? <SpinLoader /> 
                    : <div className='flex flex-col gap-3'>
                        qeqweqew
                    </div> 
                }
            </Box>
        </Main>
    );
}