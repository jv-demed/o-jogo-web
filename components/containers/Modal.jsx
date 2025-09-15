'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

const Styled = styled.div`
    border: 1px solid red;
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

export function Modal(){
    return (
        <Styled>
                        
        </Styled>
    );
}