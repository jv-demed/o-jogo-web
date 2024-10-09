'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDataObj } from '@/hooks/useDataObj';
import { useUser } from '@/providers/UserProvider';
import { getRealtime, removeChannel } from '@/supabase/realtime';
import { newMatch, startMatch, updateMatch } from '@/actions/constrols/matchActions';
import { Box } from '@/components/boxes/Box';
import { Main } from '@/components/boxes/Main';
import { ActionButton } from '@/components/buttons/ActionButton';

export default function Home(){

    const router = useRouter();

    const user = useUser();

    const match = useDataObj({
        table: 'matches',
        select: '*',
        filter: e => e.eq('status', 'waiting')
    });

    useEffect(() => {
        const channel = getRealtime({ 
            name: 'matches realtime',
            table: 'matches',
            callback: match.refresh
        });
        return () => removeChannel(channel);
    }, []);

    useEffect(() => {
        console.log(match.obj);
    }, [match])

    return (
        <Main>
            <Box>
                <ActionButton name={`Jogar${match.obj ? ` (${match.obj.players.length} esperando)` : ''}`}
                    action={async () => await startMatch({
                        user: user,
                        match: match.obj,
                        router: router
                    })}
                />
            </Box>
        </Main>
    );
}