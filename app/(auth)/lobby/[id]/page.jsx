'use client'
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/providers/UserProvider';
import { getRealtime, removeChannel } from '@/supabase/realtime';
import {
    cancelMatch,
    getMatch,
    getMatchPlayers,
    joinMatch,
    leaveMatch,
    reorderMatchPlayers,
    startMatch
} from '@/presenters/matchesPresenter';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { Actions } from '@/components/containers/Actions';
import { PageHeader } from '@/components/elements/PageHeader';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { ErrorMessage } from '@/components/elements/ErrorMessage';
import { ActionButton } from '@/components/buttons/ActionButton';

/**
 * Sala de espera da partida.
 *
 * Reescrita: a versao anterior falava com as tabelas `matches` e `users` sem
 * prefixo (que sumiram na migracao para o schema o_jogo), montava a lista de
 * jogadores a partir de um array `players` na propria partida, e estilizava
 * com styled-components lendo `theme.content` - sem ThemeProvider no projeto,
 * ou seja, todas as cores saiam `undefined`.
 *
 * Entra-se pelo link: quem abre /lobby/{id} e adicionado a partida. Isso e o
 * que a RLS permite - `match_players_join_self` autoriza o INSERT da propria
 * linha numa partida aberta, mas `matches_read_participant` so deixa LER a
 * partida depois de estar dentro. Dai o join vir antes das leituras.
 */
export default function Lobby({ params }){

    const router = useRouter();
    const { user } = useUser();

    const idMatch = Number(params.id);
    const isValidId = Number.isInteger(idMatch) && idMatch > 0;

    const [match, setMatch] = useState(null);
    const [players, setPlayers] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const isHost = match?.id_host === user.id;
    const status = match?.status;

    const loadMatch = useCallback(async () => {
        try{
            const data = await getMatch(idMatch);
            if(!data){
                setError({ message: 'Partida não encontrada.' });
                return;
            }
            setMatch(data);
        }catch(err){
            setError(err);
        }
    }, [idMatch]);

    const loadPlayers = useCallback(async () => {
        try{
            setPlayers(await getMatchPlayers(idMatch));
        }catch(err){
            setError(err);
        }
    }, [idMatch]);

    useEffect(() => {
        if(!isValidId){
            setError({ message: 'Partida inválida.' });
            setIsLoading(false);
            return;
        }
        let isMounted = true;
        joinMatch(idMatch)
            .then(() => Promise.all([loadMatch(), loadPlayers()]))
            .catch(err => isMounted && setError(err))
            .finally(() => isMounted && setIsLoading(false));
        return () => { isMounted = false; };
    }, [idMatch, isValidId, loadMatch, loadPlayers]);

    // Dois canais filtrados por esta partida. O antigo escutava
    // `{ schema: 'public' }` sem filtro: toda mudanca de todos os
    // projetinhos que dividem esta instancia chegava aqui.
    useEffect(() => {
        if(!isValidId) return;
        const playersChannel = getRealtime({
            table: 'match_players',
            filter: `id_match=eq.${idMatch}`,
            callback: loadPlayers
        });
        const matchChannel = getRealtime({
            table: 'matches',
            filter: `id=eq.${idMatch}`,
            event: 'UPDATE',
            callback: loadMatch
        });
        return () => {
            removeChannel(playersChannel);
            removeChannel(matchChannel);
        };
    }, [idMatch, isValidId, loadPlayers, loadMatch]);

    // Quem tira todo mundo do lobby e o status da partida, nao o clique do
    // host: assim o convidado sai junto, pelo evento de realtime.
    useEffect(() => {
        if(status === 'progress') router.push(`/game/${idMatch}`);
        if(status === 'finished') router.push('/home');
    }, [status, idMatch, router]);

    async function handlePlayerClick(index){
        if(!isHost) return;

        if(selectedIndex === null){
            setSelectedIndex(index);
            return;
        }
        if(selectedIndex === index){
            setSelectedIndex(null);
            return;
        }

        const reordered = [...players];
        [reordered[selectedIndex], reordered[index]] = [reordered[index], reordered[selectedIndex]];
        setSelectedIndex(null);
        setPlayers(reordered);

        try{
            await reorderMatchPlayers(idMatch, reordered.map(player => player.id));
        }catch(err){
            setError(err);
            await loadPlayers();
        }
    }

    async function handleLeave(){
        try{
            if(isHost) await cancelMatch(idMatch);
            else await leaveMatch(idMatch, user.id);
            router.push('/home');
        }catch(err){
            setError(err);
        }
    }

    async function handleStart(){
        try{
            await startMatch(idMatch);
        }catch(err){
            setError(err);
        }
    }

    return (
        <Main>
            <PageHeader title={`Partida #${params.id}`} />
            <Box fullH>
                {isLoading
                    ? <SpinLoader marginTop='20px' />
                    : <div className='flex flex-col justify-between gap-4 h-full'>
                        {error && <ErrorMessage error={error} />}
                        {match && <>
                            <div className='flex flex-col flex-1 gap-4 justify-center w-full'>
                                <div className='flex flex-col items-center gap-1.5'>
                                    <span className={`
                                        flex items-center gap-2
                                        px-3 py-1 rounded-full
                                        border border-line bg-elevated
                                        text-xs uppercase tracking-widest text-cream-dim
                                    `}>
                                        {players.length} na mesa
                                    </span>
                                    <span className='text-sm text-cream-dim text-center'>
                                        {isHost
                                            ? 'Toque em dois jogadores para trocá-los de lugar. A ordem é a ordem dos turnos.'
                                            : 'Aguardando o host começar...'}
                                    </span>
                                </div>
                                <ul className='flex flex-col gap-2 w-full'>
                                    {players.map((player, i) => {
                                        const isSelected = selectedIndex === i;
                                        return (
                                            <li key={player.id}>
                                                <button
                                                    type='button'
                                                    disabled={!isHost}
                                                    onClick={() => handlePlayerClick(i)}
                                                    className={`
                                                        flex items-center gap-3
                                                        px-3 py-2.5 w-full min-h-14 rounded-2xl
                                                        bg-base text-left
                                                        border transition-transform
                                                        ${isSelected
                                                            ? 'border-brand-light ring-2 ring-brand-light/40'
                                                            : 'border-line'}
                                                        ${isHost
                                                            ? 'cursor-pointer active:scale-[0.99]'
                                                            : 'cursor-default'}
                                                        focus:outline-none focus-visible:ring-2
                                                        focus-visible:ring-brand-light
                                                    `}
                                                >
                                                    {/* A posicao na fila e o
                                                        dado que o host esta
                                                        reordenando; fica no
                                                        selo, nao implicita. */}
                                                    <span className={`
                                                        flex items-center justify-center shrink-0
                                                        h-8 w-8 rounded-lg
                                                        border border-line bg-elevated
                                                        text-xs font-semibold tabular-nums
                                                    `}>
                                                        {i + 1}
                                                    </span>
                                                    <span className='truncate'>
                                                        {player.name}
                                                    </span>
                                                    <span className='ml-auto flex shrink-0 gap-1.5'>
                                                        {player.id === match.id_host && <span className={`
                                                            px-2 py-0.5 rounded-full
                                                            border border-gold/30 bg-gold/10
                                                            text-[0.65rem] uppercase tracking-wider text-gold
                                                        `}>
                                                            host
                                                        </span>}
                                                        {player.id === user.id && <span className={`
                                                            px-2 py-0.5 rounded-full
                                                            border border-line bg-elevated
                                                            text-[0.65rem] uppercase tracking-wider text-cream-dim
                                                        `}>
                                                            você
                                                        </span>}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                                {!isHost && <SpinLoader color='text-cream-dim' />}
                            </div>
                            <Actions justifyContent='justify-between'>
                                <ActionButton text={isHost ? 'Cancelar' : 'Sair'}
                                    variant='secondary'
                                    width='40%'
                                    action={handleLeave}
                                />
                                {isHost && <ActionButton text='Começar'
                                    variant='gold'
                                    width='55%'
                                    disabled={players.length < 2}
                                    action={handleStart}
                                />}
                            </Actions>
                        </>}
                    </div>}
            </Box>
        </Main>
    );
}
