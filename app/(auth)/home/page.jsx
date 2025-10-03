'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDataObj } from '@/hooks/useDataObj';
import { useUser } from '@/providers/UserProvider';
import { getRealtime, removeChannel } from '@/supabase/realtime';
import { createMatch } from '@/actions/controls/matchActions';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { ActionButton } from '@/components/buttons/ActionButton';

export default function Home(){

    const router = useRouter();
    const user = useUser();

    // const match = useDataObj({
    //     table: 'matches',
    //     filter: e => e.eq('status', 'waiting')
    // });

    // useEffect(() => {
    //     const channel = getRealtime({ 
    //         name: 'matches realtime',
    //         table: 'matches',
    //         callback: match.refresh
    //     });
    //     return () => removeChannel(channel);
    // }, []);

    return (
        <Main>
            <Box>
                {/* <ActionButton name={`Jogar${match.obj ? ` (${match.obj.players.length} esperando)` : ''}`}
                    action={async () => await createMatch({
                        user: user,
                        match: match.obj,
                        router: router
                    })}
                /> */}
                <ActionButton text='Decks' 
                    action={() => router.push('/decks')}
                />
                <ActionButton text='Coleção'
                    action={() => router.push('/colecao')}
                />
            </Box>
        </Main>
    );
}