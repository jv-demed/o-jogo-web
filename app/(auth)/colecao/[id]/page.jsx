'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDataObj } from '@/hooks/useDataObj';
import { useUser } from '@/providers/UserProvider';
import { getRealtime, removeChannel } from '@/supabase/realtime';
import { createMatch } from '@/actions/controls/matchActions';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { ActionButton } from '@/components/buttons/ActionButton';
import styled from 'styled-components';
import { ICONS } from '@/assets/icons';
import { useDataList } from '@/hooks/useDataList';
import { Loading } from '@/components/elements/Loading';
import { CARD_TYPES } from '@/actions/controls/cardActions';
import { Modal } from '@/components/containers/Modal';
import { Card } from '@/components/cards/Card';

const Styled = styled.div`
    display: flex;
    flex-direction: column;
    gap: 25px;
    .header{
        align-items: center;
        gap: 8px;
        .back-icon{
            cursor: pointer;
            font-size: 1.5rem;
        }
        h3{
            font-size: 1.5rem;
            text-align: center;
            width: 100%;
        }
    }
    .card{
        justify-content: center;
    }
`;

export default function CardPage(){

    const router = useRouter();
    const params = useParams();
    
    const user = useUser();
    
    const card = useDataObj({
        table: 'cards',
        select: '*',
        filter: e => e.eq('id', params.id)
    });

    return (
        <Main>
            <Box>
                <Styled>
                    {card.loading ? <Loading /> : <>
                        <header className='flexR header'>
                            <div className='flexR back-icon'
                                onClick={() => router.push('/colecao')}
                            >
                                {ICONS.arrowLeft}
                            </div>
                            <h3>{card.obj.name}</h3>
                        </header>
                        <section className='flexR card'>
                            <Card card={card.obj} 
                                width={300}
                            />
                        </section>
                    </>}
                </Styled>
            </Box>
        </Main>
    );
}