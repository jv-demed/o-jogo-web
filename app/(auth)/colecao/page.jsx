'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDataObj } from '@/hooks/useDataObj';
import { useUser } from '@/providers/UserProvider';
import { getRealtime, removeChannel } from '@/supabase/realtime';
import { createMatch } from '@/actions/constrols/matchActions';
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
    .header{
        align-items: center;
        gap: 8px;
        h3{
            font-size: 1.5rem;
            text-align: center;
            width: 100%;
        }
    }
    .card-list{
        gap: 10px;
        .card{
            border: 1px solid white;
            border-radius: 5px;
            padding: 15px;
        }
    }
`;

export default function Colecao(){

    const router = useRouter();

    const user = useUser();

    const cards = useDataList({
        table: 'cards',
        select: '*',
        order: 'id'
    });

    return (
        <Main>
            <Box>
                <Styled>
                    <header className='flexR header'>
                        <ActionButton 
                            width='50px'
                            icon={ICONS.arrowLeft}
                            action={() => router.push('/home')}
                        />
                        <h3>Coleção</h3>
                    </header>
                    {cards.loading ? <Loading /> : <ul className='flexC card-list'>
                        {cards.list.map(card => (
                            <li key={card.id}>
                                <div className='card'>
                                    {card.name}
                                </div>
                            </li>
                        ))}
                    </ul>}
                </Styled>
            </Box>
        </Main>
    );
}