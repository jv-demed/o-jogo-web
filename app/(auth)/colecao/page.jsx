'use client'

import { useEffect, useState } from 'react';
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
import { CARD_TYPES } from '@/actions/controls/cardActions';

const Styled = styled.div`
    display: flex;
    flex-direction: column;
    gap: 15px;
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
    .card-list{
        gap: 10px;
        .item{
            border: 1px solid white;
            border-radius: 5px;
            cursor: pointer;
            padding: 10px;
            .card{
                align-items: center;
                justify-content: space-between;
                .text{
                    align-items: center;
                    gap: 10px;
                    .id{
                        background: ${({ theme }) => theme.primary};
                        border-radius: 5px;
                        padding: 2px 5px;
                    }
                }
            }
        }
    }
`;

const Modal = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;

    .close-btn {
        align-self: flex-end;
        cursor: pointer;
        font-size: 1.2rem;
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: 5px;

        .card-name {
            font-size: 1.5rem;
            font-weight: bold;
        }

        .card-details {
            font-size: 1rem;
            color: gray;
        }
    }
`;

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
`;

export default function Colecao(){

    const router = useRouter();

    const user = useUser();

    const cards = useDataList({
        table: 'cards',
        select: '*',
        order: 'id'
    });

    const [selectedCard, setSelectedCard] = useState(null);

    const closeModal = () => setSelectedCard(null);

    return (
        <Main>
            <Box>
                <Styled>
                    <header className='flexR header'>
                        <div className='flexR back-icon'
                            onClick={() => router.push('/home')}
                        >
                            {ICONS.arrowLeft}
                        </div>
                        <h3>Coleção</h3>
                    </header>
                    {cards.loading ? <Loading /> : <ul className='flexC card-list'>
                        {cards.list.map(card => (
                            <li key={card.id}>
                                <div className='item'>
                                    {!user.cards.includes(card.id) ? <div className='flexR card'>
                                        <div className='flexR text'>
                                            <span className='id'>
                                                {card.id}
                                            </span>
                                            <span>???</span>
                                        </div>
                                    </div> : 
                                    <div className='flexR card'
                                        onClick={() => setSelectedCard(card)}
                                    >
                                        <div className='flexR text'>
                                            <span className='id'>
                                                {card.id}
                                            </span>
                                            <span>{card.name}</span>
                                        </div>
                                        {CARD_TYPES.find(t => t.id == card.type).icon}
                                    </div>}
                                </div>
                            </li>
                        ))}
                    </ul>}
                </Styled>
            </Box>
            {selectedCard && (
                <>
                    <Overlay onClick={closeModal} />
                    <Modal>
                        <div className='close-btn' onClick={closeModal}>
                            &times;
                        </div>
                        <div className='content'>
                            <span className='card-name'>{selectedCard.name}</span>
                            <span className='card-details'>ID: {selectedCard.id}</span>
                            <span className='card-details'>
                                Type: {CARD_TYPES.find((t) => t.id === selectedCard.type)?.name}
                            </span>
                        </div>
                    </Modal>
                </>
            )}
        </Main>
    );
}