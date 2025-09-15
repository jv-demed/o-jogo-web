'use client'
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { useDataList } from '@/hooks/useDataList';
import { useUser } from '@/providers/UserProvider';
import { ICONS } from '@/assets/icons';
import { CARD_TYPES } from '@/actions/controls/cardActions';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { Loading } from '@/components/elements/Loading';

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
                                        onClick={() => router.push(`/colecao/${card.id}`)}
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
        </Main>
    );
}