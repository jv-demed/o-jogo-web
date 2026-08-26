'use client'
import { useEffect, useState } from 'react';
import { useUser } from '@/providers/UserProvider';
import { getMatchPlayers } from '@/presenters/matchesPresenter';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { GameTable } from '@/components/game/GameTable';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { ErrorMessage } from '@/components/elements/ErrorMessage';

/**
 * Esqueleto da partida.
 *
 * Continua esqueleto de proposito: nao existem regras definidas (turnos, mao,
 * compra, resolucao, condicao de vitoria) nem os efeitos das cartas como dados
 * estruturados - os dois itens estao em PENDENCIAS.md. O que esta reescrito
 * aqui e so a camada de dados: antes esta tela consultava `game-players`, uma
 * tabela sem prefixo que sumiu na migracao para o schema o_jogo, e estilizava
 * com styled-components sem ThemeProvider.
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

    const player = players.find(row => row.id === user.id);

    return (
        <Main>
            <Box fullH>
                {isLoading
                    ? <SpinLoader marginTop='20px' />
                    : <div className='flex flex-col justify-between gap-4 h-full'>
                        {error && <ErrorMessage error={error} />}
                        <GameTable
                            player={player}
                            players={players}
                        />
                        <section className={`
                            flex flex-col items-center justify-center gap-1
                            h-[200px] w-full shrink-0
                            rounded-2xl border border-dashed border-line
                            bg-base/50 text-center
                        `}>
                            <span className='text-sm text-cream-dim'>
                                Mão do jogador
                            </span>
                            <span className='text-xs text-cream-dim/70'>
                                Depende das regras da partida.
                            </span>
                        </section>
                    </div>}
            </Box>
        </Main>
    );
}
