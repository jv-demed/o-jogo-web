'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDataObj } from '@/hooks/useDataObj';
import { useUser } from '@/providers/UserProvider';
import { getRealtime, removeChannel } from '@/supabase/realtime';
import { createMatch } from '@/actions/controls/matchActions';
import { Box } from '@/components/boxes/Box';
import { Main } from '@/components/boxes/Main';
import { ActionButton } from '@/components/buttons/ActionButton';
import styled from 'styled-components';
import { ICONS } from '@/assets/icons';
import { useDataList } from '@/hooks/useDataList';
import { Loading } from '@/components/elements/Loading';

const Styled = styled.div`
    display: flex;
    flex-direction: column;
    gap: 15px;
    .buttons{
        gap: 8px;
    }
    .deck-list{
        gap: 10px;
        .deck{
            border: 1px solid white;
            border-radius: 5px;
            padding: 15px;
        }
    }
`;

export default function Deck(){

    const router = useRouter();

    const user = useUser();

    const decks = useDataList({
        table: 'decks',
        select: 'id, name',
        order: 'name',
        filter: e => e.eq('idUser', user.id)
    });

    return (
        <Main>
            <Box>
                <Styled>
                    <div className='flexR buttons'>
                        <ActionButton 
                            width='50px'
                            icon={ICONS.arrowLeft}
                            action={() => router.push('/home')}
                        />
                        <ActionButton name='Novo Deck' />
                    </div>
                    {decks.loading ? <Loading /> : <ul className='flexC deck-list'>
                        {decks.list.map(deck => (
                            <li key={deck.id}>
                                <div className='deck'>
                                    {deck.name}
                                </div>
                            </li>
                        ))}
                    </ul>}
                </Styled>
            </Box>
        </Main>
    );
}