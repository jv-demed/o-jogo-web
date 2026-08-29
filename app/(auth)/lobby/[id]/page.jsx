'use client'
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/providers/UserProvider';
import { getRealtime, removeChannel } from '@/supabase/realtime';
import {
    addMatchBot,
    getMatch,
    getMatchDevCount,
    getMatchPlayers,
    joinMatch,
    leaveMatch,
    removeMatchBot,
    reorderMatchSeats,
    setMatchCheats,
    startMatch
} from '@/presenters/matchesPresenter';
import { BOT_NAMES } from '@/domain/match/bot';
import { ICONS } from '@/assets/icons';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { Actions } from '@/components/containers/Actions';
import { PageHeader } from '@/components/elements/PageHeader';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { DotsLoader } from '@/components/elements/DotsLoader';
import { ErrorMessage } from '@/components/elements/ErrorMessage';
import { ActionButton } from '@/components/buttons/ActionButton';
import { InviteBox } from '@/components/lobby/InviteBox';

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
 *
 * A mesa pode ser mista: o host completa com bots os assentos que faltam. Nao
 * e um modo a parte - o motor nunca soube o que e um bot, e o que muda aqui e
 * so quem comanda cada assento (migration 0009).
 */

// Sao 7 missoes, sorteadas sem reposicao, uma por jogador. A RPC recusa mesa
// maior; o botao some antes disso para o host nao descobrir no erro.
const MAX_SEATS = 7;

/**
 * Um nome livre da lista, sorteado. Esgotada, numera.
 *
 * Sorteado e nao "o primeiro que sobrou": pegando sempre da frente, toda mesa
 * de teste saia com os mesmos bots na mesma ordem, e a mesa de tres era sempre
 * Chutador, Tchori Tchori e Silverio. Aqui o sorteio nao e do motor e nao vai
 * para estado nenhum — e enfeite —, entao e `Math.random` mesmo, e nao o `rng`
 * semeado de domain/match/.
 */
function nextBotName(players){
    const usados = new Set(players.map(player => player.name));
    const livres = BOT_NAMES.filter(name => !usados.has(name));
    return livres.length
        ? livres[Math.floor(Math.random() * livres.length)]
        : `Bot ${players.filter(player => player.isBot).length + 1}`;
}

export default function Lobby({ params }){

    const router = useRouter();
    const { user } = useUser();

    const idMatch = Number(params.id);
    const isValidId = Number.isInteger(idMatch) && idMatch > 0;

    const [match, setMatch] = useState(null);
    const [players, setPlayers] = useState([]);
    // Quantos devs estao sentados. Vem de RPC, e nao da lista: `users.is_dev`
    // do vizinho nao e leitura do cliente, e o que o lobby precisa saber e o
    // numero, nao quem e quem.
    const [devCount, setDevCount] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Tres refs para uma pergunta so: ao desmontar, este assento deve ser
    // solto? Nao deve quando a partida comecou (o desmonte e a ida para a
    // mesa) e nao deve quando quem saiu ja soltou o assento pelo botao.
    const isStartingRef = useRef(false);
    const hasLeftRef = useRef(false);
    const releaseRef = useRef(null);

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
            const [list, devs] = await Promise.all([
                getMatchPlayers(idMatch),
                getMatchDevCount(idMatch)
            ]);
            setPlayers(list);
            setDevCount(devs);
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
    //
    // Saindo, o convidado solta o assento dele — e o que permite a sala vazia
    // se apagar (migration 0014). O erro e engolido de proposito: se o ultimo a
    // sair ja levou a sala junto, nao ha assento para soltar, e isso e o
    // sucesso, nao uma falha para mostrar a quem esta indo embora.
    useEffect(() => {
        if(status === 'progress'){
            // O desmonte que vem a seguir e a ida para a mesa, e nao uma
            // saida: o assento tem que continuar de pe.
            isStartingRef.current = true;
            router.push(`/game/${idMatch}`);
        }
        if(status === 'finished'){
            hasLeftRef.current = true;
            leaveMatch(idMatch).catch(() => {}).finally(() => router.push('/home'));
        }
    }, [status, idMatch, router]);

    /**
     * Soltar o assento ao sair da tela por qualquer caminho.
     *
     * O botao de sair nunca foi o unico jeito de sair do lobby: a seta do
     * cabecalho, o menu do header e o voltar do navegador tambem tiram a
     * pessoa dali, e por nenhum deles o banco ficava sabendo. O assento
     * continuava ocupado, e por isso a sala nao se apagava — o trigger da 0014
     * so e chamado quando alguem *sai*.
     *
     * O `setTimeout` nao e atraso, e cancelamento: em dev o React monta,
     * desmonta e remonta de proposito (StrictMode), e uma saida sincrona no
     * desmonte cancelaria a sala do host no instante em que ele a abrisse. A
     * saida fica agendada para o proximo tick, e uma remontagem a cancela
     * antes de acontecer.
     */
    useEffect(() => {
        clearTimeout(releaseRef.current);
        return () => {
            if(isStartingRef.current || hasLeftRef.current) return;
            releaseRef.current = setTimeout(() => {
                leaveMatch(idMatch).catch(() => {});
            }, 0);
        };
    }, [idMatch]);

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
            await reorderMatchSeats(idMatch, reordered.map(player => player.id));
        }catch(err){
            setError(err);
            await loadPlayers();
        }
    }

    async function handleAddBot(){
        try{
            await addMatchBot(idMatch, nextBotName(players));
            await loadPlayers();
        }catch(err){
            setError(err);
        }
    }

    async function handleRemoveBot(idSeat){
        setSelectedIndex(null);
        try{
            await removeMatchBot(idMatch, idSeat);
            await loadPlayers();
        }catch(err){
            setError(err);
        }
    }

    async function handleLeave(){
        hasLeftRef.current = true;
        try{
            // Uma chamada so para os dois: sendo o host, a RPC encerra a sala
            // antes de soltar o assento dele — e o `status` que tira os
            // convidados daqui, pelo realtime.
            await leaveMatch(idMatch);
            router.push('/home');
        }catch(err){
            // Nao saiu: o assento continua ocupado, entao o desmonte volta a
            // ser responsavel por solta-lo.
            hasLeftRef.current = false;
            setError(err);
        }
    }

    async function handleToggleCheats(){
        try{
            await setMatchCheats(idMatch, !match.cheats);
            await loadMatch();
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
            {/* A seta sai pelo mesmo caminho do botao: ela tambem esta
                deixando um assento para tras. */}
            <PageHeader title={`Partida #${params.id}`} onReturn={handleLeave} />
            <Box fullH>
                {isLoading
                    ? <SpinLoader marginTop='20px' />
                    : <div className='flex flex-col justify-between gap-4 h-full'>
                        {error && <ErrorMessage error={error} />}
                        {match && <>
                            <div className='flex flex-col flex-1 gap-4 justify-center w-full'>
                                <div className='flex flex-col items-center gap-1.5'>
                                    <div className='flex items-center gap-1.5'>
                                        <span className={`
                                            flex items-center gap-2
                                            px-3 py-1 rounded-full
                                            border border-line bg-elevated
                                            text-xs uppercase tracking-widest text-cream-dim
                                        `}>
                                            {players.length} na mesa
                                        </span>
                                        {match.cheats && <span className={`
                                            flex items-center gap-1
                                            px-3 py-1 rounded-full
                                            border border-gold/40 bg-gold/10
                                            text-xs uppercase tracking-widest text-gold
                                        `}>
                                            cheats
                                        </span>}
                                    </div>
                                    <span className='text-sm text-cream-dim text-center'>
                                        {isHost
                                            ? 'Toque em dois jogadores para trocá-los de lugar. A ordem é a ordem dos turnos.'
                                            : 'Aguardando o host começar...'}
                                    </span>
                                </div>
                                {/* So para o host: quem ja esta dentro nao
                                    convida ninguem — a RLS nao deixaria, e o
                                    link e dele. */}
                                {isHost && <InviteBox id={params.id} />}
                                <ul className='flex flex-col gap-2 w-full'>
                                    {players.map((player, i) => {
                                        const isSelected = selectedIndex === i;
                                        return (
                                            <li key={player.id} className='flex items-center gap-2'>
                                                <button
                                                    type='button'
                                                    disabled={!isHost}
                                                    onClick={() => handlePlayerClick(i)}
                                                    className={`
                                                        flex flex-1 items-center gap-3 min-w-0
                                                        px-3 py-2.5 min-h-14 rounded-2xl
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
                                                        {player.isBot && <span className={`
                                                            px-2 py-0.5 rounded-full
                                                            border border-line bg-elevated
                                                            text-[0.65rem] uppercase tracking-wider text-cream-dim
                                                        `}>
                                                            bot
                                                        </span>}
                                                        {player.idUser === match.id_host && <span className={`
                                                            px-2 py-0.5 rounded-full
                                                            border border-gold/30 bg-gold/10
                                                            text-[0.65rem] uppercase tracking-wider text-gold
                                                        `}>
                                                            host
                                                        </span>}
                                                        {player.idUser === user.id && <span className={`
                                                            px-2 py-0.5 rounded-full
                                                            border border-line bg-elevated
                                                            text-[0.65rem] uppercase tracking-wider text-cream-dim
                                                        `}>
                                                            você
                                                        </span>}
                                                    </span>
                                                </button>
                                                {/* Fora do botao da linha, e
                                                    nao dentro: botao aninhado
                                                    em botao nao e HTML valido,
                                                    e o toque na linha ja tem
                                                    dono (a troca de lugar). */}
                                                {isHost && player.isBot && <button
                                                    type='button'
                                                    aria-label={`Tirar ${player.name} da mesa`}
                                                    onClick={() => handleRemoveBot(player.id)}
                                                    className={`
                                                        flex items-center justify-center shrink-0
                                                        h-14 w-11 rounded-2xl
                                                        border border-line bg-elevated
                                                        text-lg leading-none text-cream-dim
                                                        transition-transform active:scale-95
                                                        focus:outline-none focus-visible:ring-2
                                                        focus-visible:ring-brand-light
                                                    `}
                                                >
                                                    ×
                                                </button>}
                                            </li>
                                        );
                                    })}
                                </ul>
                                {isHost && <button
                                    type='button'
                                    disabled={players.length >= MAX_SEATS}
                                    onClick={handleAddBot}
                                    className={`
                                        flex items-center justify-center gap-2
                                        min-h-12 w-full rounded-2xl
                                        border border-dashed border-line bg-base/50
                                        text-sm text-cream-dim
                                        transition-transform active:scale-[0.99]
                                        disabled:opacity-40 disabled:active:scale-100
                                        focus:outline-none focus-visible:ring-2
                                        focus-visible:ring-brand-light
                                    `}
                                >
                                    {players.length >= MAX_SEATS
                                        ? 'A mesa está cheia'
                                        : '+ Adicionar bot'}
                                </button>}
                                {/* Dois ou mais devs na mesa liberam a partida
                                    com cheats: o painel de dev, que so existia
                                    no solo, aparece na mesa para eles. Um dev
                                    sozinho nao libera — poder de cirurgia sobre
                                    a mesa dos outros so vale entre pares que
                                    sabem o que estao testando. Quem autoriza e
                                    a RPC; isto aqui e o interruptor. */}
                                {devCount >= 2 && <button
                                    type='button'
                                    disabled={!isHost}
                                    aria-pressed={Boolean(match.cheats)}
                                    onClick={handleToggleCheats}
                                    className={`
                                        flex items-center justify-between gap-3
                                        w-full px-3 py-2.5 rounded-2xl
                                        border text-left transition-transform
                                        ${match.cheats
                                            ? 'border-gold bg-gold/10 text-gold'
                                            : 'border-line bg-elevated text-cream'}
                                        ${isHost
                                            ? 'active:scale-[0.99]'
                                            : 'opacity-70 cursor-default'}
                                        focus:outline-none focus-visible:ring-2
                                        focus-visible:ring-brand-light
                                    `}
                                >
                                    <span className='flex flex-col gap-0.5 min-w-0'>
                                        <span className='text-sm font-semibold'>
                                            Partida com cheats
                                        </span>
                                        <span className='text-[0.65rem] text-cream-dim'>
                                            {devCount} devs na mesa. Libera as ferramentas
                                            de dev durante a partida, e tudo que
                                            elas fizerem fica no log.
                                        </span>
                                    </span>
                                    <span className={`
                                        shrink-0 flex items-center justify-center
                                        h-6 w-6 rounded-full border text-xs
                                        ${match.cheats
                                            ? 'border-gold bg-gold/20 text-gold'
                                            : 'border-line'}
                                    `}>
                                        {match.cheats && <ICONS.check />}
                                    </span>
                                </button>}
                                {/* Nao e spinner: nao esta carregando nada, esta
                                    se esperando o host decidir comecar. */}
                                {!isHost && <DotsLoader label='Aguardando o host' />}
                            </div>
                            <Actions justifyContent='justify-between'>
                                {/* O convidado nao tem o botao de comecar ao
                                    lado, entao sair ocupa a linha inteira em
                                    vez de deixar 60% de vazio. */}
                                <ActionButton text={isHost ? 'Cancelar' : 'Sair'}
                                    variant='secondary'
                                    width={isHost ? '40%' : '100%'}
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
