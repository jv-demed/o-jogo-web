'use client'
import { useRouter } from 'next/navigation';
import { CARDS } from '@/assets/cards';
import { useUser } from '@/providers/UserProvider';
import { useTableMatch } from '@/hooks/useTableMatch';
import { Box } from '@/components/containers/Box';
import { Main } from '@/components/containers/Main';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { ErrorMessage } from '@/components/elements/ErrorMessage';
import { MatchScreen } from '@/components/game/MatchScreen';

/**
 * A partida da mesa do lobby.
 *
 * Deixou de ser esqueleto quando a partida passou a viver no banco (migration
 * 0010): o estado mora em `matches.state`, o host o conduz com o mesmo motor
 * que o solo roda, e quem nao e host le por realtime e joga enfileirando
 * comando. Toda essa mecanica e do `useTableMatch`; aqui so sobra escolher
 * entre a mesa e a espera.
 *
 * A mesa desenhada e a mesma do solo, o `MatchScreen` — de proposito. Duas
 * telas para o mesmo jogo seriam duas telas para consertar, e a de menos uso
 * ficaria para tras.
 */

// O baralho de cada assento e sorteado do catalogo inteiro, humano ou bot.
// Nao e a palavra final: o deck escolhido nao entra ainda porque, sob a RLS,
// o host nao consegue ler o deck de ninguem — `decks_own` so libera o dono. Ate
// existir uma RPC que devolva os decks da mesa, sortear e o que trata todo
// mundo igual (ver PENDENCIAS.md).
const CATALOG_IDS = CARDS.map(card => card.id);

export default function Game({ params }){

    const router = useRouter();
    const { isDev } = useUser();
    const idMatch = Number(params.id);

    const {
        state, you, isHost, isLoading, error, dismissError,
        isYourTurn, isOver, cheats, dispatch, devDispatch,
        botsPaused, setBotsPaused, stepBots, hasBotCommand
    } = useTableMatch(idMatch, CATALOG_IDS);

    // Sair da partida e sair da tela: a mesa continua no banco, e voltar pelo
    // link recomeca de onde ela esta. Quem nao pode sumir e o host, mas isso e
    // consequencia do desenho (ele conduz a mesa), nao uma trava — travar aqui
    // so o prenderia numa aba que ele pode fechar assim mesmo.
    const leave = () => router.push('/home');

    if(state && you){
        return (
            <MatchScreen
                state={state}
                you={you}
                error={error}
                dismissError={dismissError}
                isYourTurn={isYourTurn}
                isOver={isOver}
                dispatch={dispatch}
                onLeave={leave}
                {...(cheats && isDev ? {
                    // O painel de dev na mesa, para a partida que o host marcou
                    // com cheats no lobby (migration 0013). Nao e gate de
                    // seguranca: quem autoriza e o trigger que recusa comando
                    // `dev.*` fora de partida com cheats ou de quem nao e dev.
                    // Aqui so se decide o que aparece na tela.
                    dev: {
                        isDev,
                        devDispatch,
                        canDriveBots: isHost,
                        botsPaused,
                        setBotsPaused,
                        stepBots,
                        hasBotCommand
                    }
                } : {})}
            />
        );
    }

    return (
        <Main>
            <Box fullH>
                <div className='flex flex-col items-center justify-center gap-3 h-full'>
                    {error
                        ? <ErrorMessage error={error} />
                        : <>
                            <SpinLoader />
                            <span className='text-sm text-cream-dim text-center'>
                                {isLoading
                                    ? 'Entrando na mesa...'
                                    : isHost
                                        ? 'Montando a mesa...'
                                        : 'Esperando o host abrir a mesa...'}
                            </span>
                        </>}
                </div>
            </Box>
        </Main>
    );
}
