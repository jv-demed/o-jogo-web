'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMatch } from '@/presenters/matchesPresenter';
import { Main } from '@/components/containers/Main';
import { ErrorMessage } from '@/components/elements/ErrorMessage';
import { ActionButton } from '@/components/buttons/ActionButton';

export default function Home(){

    const router = useRouter();

    const [error, setError] = useState(null);

    // O bloco de matchmaking que morava comentado aqui procurava "a" partida
    // em espera - uma so, global. Nao sobrevive a RLS: matches_read_participant
    // so mostra partida de que o jogador ja participa, entao nao ha como
    // descobrir a sala de outra pessoa. Quem entra, entra pelo link do lobby.
    async function handlePlay(){
        setError(null);
        try{
            const idMatch = await createMatch();
            router.push(`/lobby/${idMatch}`);
        }catch(err){
            setError(err);
        }
    }

    return (
        <Main style={{
            marginTop: '30px'
        }}>
            <ActionButton text='Jogar'
                action={handlePlay}
            />
            <ActionButton text='Decks'
                action={() => router.push('/decks')}
                disabled
            />
            <ActionButton text='Coleção'
                action={() => router.push('/colecao')}
            />
            <ActionButton text='Loja'
                action={() => router.push('/loja')}
            />
            {error && <ErrorMessage error={error} />}
        </Main>
    );
}
