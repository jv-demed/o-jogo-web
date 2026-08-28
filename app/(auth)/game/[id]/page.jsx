'use client'
import { useEffect, useState } from 'react';
import { useUser } from '@/providers/UserProvider';
import { getMatchPlayers } from '@/presenters/matchesPresenter';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { ErrorMessage } from '@/components/elements/ErrorMessage';

/**
 * Esqueleto da partida multijogador.
 *
 * As regras ja existem e sao jogaveis - `domain/match/`, e o modo solo em
 * /solo joga a partida inteira em cima delas. O que falta aqui e o outro lado:
 * o estado da partida vivendo no banco, com uma RPC aplicando os comandos do
 * lado do servidor (PENDENCIAS.md). Ate la esta tela mostra so quem esta na
 * mesa - nao ha estado de partida para desenhar, e inventar um no cliente seria
 * fingir uma autoridade que ele nao tem.
 */
export default function Game({ params }){

    const { user } = useUser();

    const idMatch = Number(params.id);

    const [players, setPlayers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        getMatchPlayers(idMatch)
            .then(list => isMounted && setPlayers(list))
            .catch(err => isMounted && setError(err))
            .finally(() => isMounted && setIsLoading(false));
        return () => { isMounted = false; };
    }, [idMatch]);

    return (
        <Main>
            <Box fullH>
                {isLoading
                    ? <SpinLoader marginTop='20px' />
                    : <div className='flex flex-col justify-between gap-4 h-full'>
                        {error && <ErrorMessage error={error} />}
                        <ul className='flex flex-col gap-1.5 w-full'>
                            {players.map(row => (
                                <li key={row.id}
                                    className={`
                                        flex items-center gap-2
                                        px-3 py-2 rounded-2xl
                                        border border-line bg-base text-sm
                                    `}
                                >
                                    <span className='truncate'>{row.name}</span>
                                    {row.isBot && <span className={`
                                        ml-auto shrink-0
                                        px-2 py-0.5 rounded-full
                                        border border-line bg-elevated
                                        text-[0.65rem] uppercase tracking-wider text-cream-dim
                                    `}>
                                        bot
                                    </span>}
                                    {row.idUser === user.id && <span className={`
                                        ml-auto shrink-0
                                        px-2 py-0.5 rounded-full
                                        border border-line bg-elevated
                                        text-[0.65rem] uppercase tracking-wider text-cream-dim
                                    `}>
                                        você
                                    </span>}
                                </li>
                            ))}
                        </ul>
                        <section className={`
                            flex flex-col items-center justify-center gap-1
                            h-[200px] w-full shrink-0
                            rounded-2xl border border-dashed border-line
                            bg-base/50 text-center px-4
                        `}>
                            <span className='text-sm text-cream-dim'>
                                A partida ainda não vive no servidor
                            </span>
                            <span className='text-xs text-cream-dim/70'>
                                As regras já estão prontas: dá para jogar em Jogo solo.
                            </span>
                        </section>
                    </div>}
            </Box>
        </Main>
    );
}
