'use client'
import { useEffect, useState } from 'react';
import { CARDS } from '@/assets/cards';
import { ICONS } from '@/assets/icons';
import { useUser } from '@/providers/UserProvider';
import { useImmersive } from '@/providers/ImmersiveProvider';
import { useSoloMatch } from '@/hooks/useSoloMatch';
import { useLastPlay } from '@/hooks/useLastPlay';
import { Command, isReaction } from '@/domain/match/engine';
import { MISSIONS } from '@/domain/match/missions';
import { MatchStatus, Phase } from '@/domain/match/state';
import { SOLO_DECK_SIZE } from '@/domain/match/solo';
import { Main } from '@/components/containers/Main';
import { Box } from '@/components/containers/Box';
import { PageHeader } from '@/components/elements/PageHeader';
import { ErrorMessage } from '@/components/elements/ErrorMessage';
import { ActionButton } from '@/components/buttons/ActionButton';
import { GameTable } from '@/components/game/GameTable';
import { PlayedCard } from '@/components/game/PlayedCard';
import { Hand } from '@/components/game/Hand';
import { TurnBar } from '@/components/game/TurnBar';
import { MatchLog } from '@/components/game/MatchLog';
import { MatchResult, MissionGuess } from '@/components/game/MatchResult';
import { MissionModal, MissionButton } from '@/components/game/MissionModal';

/**
 * Jogo solo: voce contra bots, tudo no browser.
 *
 * Nao fala com o Supabase de proposito. A partida no servidor ainda nao existe
 * (ver PENDENCIAS.md) e o motor em domain/match/ e puro, entao da para jogar
 * agora — que e o unico jeito de descobrir se as regras escritas dao uma
 * partida boa antes de gastar migration com elas. Nada e salvo: recarregar a
 * pagina recomeça.
 */

const CATALOG_IDS = CARDS.map(card => card.id);

export default function Solo(){

    const { user } = useUser();
    const {
        state, you, error, dismissError,
        isYourTurn, isOver, start, leave, dispatch
    } = useSoloMatch();

    const [botCount, setBotCount] = useState(3);
    const [useCollection, setUseCollection] = useState(false);
    const [selected, setSelected] = useState([]);
    const [isRevealing, setIsRevealing] = useState(false);
    const [isMissionOpen, setIsMissionOpen] = useState(false);

    // Com a partida na tela, o app inteiro sai de cena: sem cabecalho e sem
    // titulo de pagina, a mesa fica com a tela toda.
    useImmersive(Boolean(state));

    const lastPlay = useLastPlay(state);

    // A colecao vem como lista plana com repeticao; o baralho quer ids unicos.
    const collectionIds = [...new Set(user.cards)];
    const canUseCollection = collectionIds.length >= SOLO_DECK_SIZE;

    const request = state?.phase === Phase.pending ? state.pending[0] : null;

    // A selecao pertence a *uma* pergunta: trocou a pergunta, zera. Sem isto o
    // alvo escolhido na carta anterior chega pre-marcado na proxima.
    useEffect(() => {
        setSelected([]);
    }, [request?.slot, request?.uid]);

    // A carta jogada nao abre mais um veu em tela cheia: ela fica grande no meio
    // da mesa enquanto resolve (ver GameTable), onde nao cobre a mao de quem
    // ainda pode reagir. O modal aqui e so para reler a ultima carta com calma,
    // a pedido — dai so o toque na pilha do descarte abrir.

    function handleStart(){
        setSelected([]);
        start({
            you: {
                id: user.id,
                name: user.name,
                deck: useCollection && canUseCollection ? collectionIds : undefined,
            },
            botCount,
            pool: useCollection && canUseCollection ? collectionIds : CATALOG_IDS,
        });
    }

    function handleSelect(id){
        if(!request) return;
        setSelected(prev => {
            if(prev.includes(id)) return prev.filter(other => other !== id);
            // Escolha de 1 troca em vez de acumular: e o gesto que a mesa faz.
            if(prev.length >= request.count) return request.count === 1 ? [id] : prev;
            return [...prev, id];
        });
    }

    function handlePlay(idCard){
        if(state.phase === Phase.window){
            dispatch({ type: Command.react, playerId: you.id, idCard });
            return;
        }
        dispatch({ type: Command.play, playerId: you.id, idCard });
    }

    if(!state){
        return (
            <Setup
                botCount={botCount}
                setBotCount={setBotCount}
                useCollection={useCollection}
                setUseCollection={setUseCollection}
                canUseCollection={canUseCollection}
                collectionSize={collectionIds.length}
                onStart={handleStart}
            />
        );
    }

    const mission = MISSIONS[you.mission];

    // O que da para jogar agora: na sua vez, a mao toda; na janela, so o que
    // reage. Quem sabe a diferenca e o motor (`isReaction`), nao a tela.
    const playable = isYourTurn && state.phase === Phase.play
        ? you.hand
        : state.phase === Phase.window
            && state.stack[state.stack.length - 1]?.byId !== you.id
            && !state.window.passed.includes(you.id)
            ? you.hand.filter(isReaction)
            : [];

    return (
        <>
            {/* Sem Main e sem Box: a partida e a tela. O painel de 480px com
                borda servia para uma lista de cartas, nao para uma roda de sete
                cadeiras — cada pixel que ele reservava de moldura era pixel que
                faltava para a mesa. */}
            <div className={`
                fixed inset-0 z-30 flex flex-col
                bg-base text-cream overflow-hidden
            `}>
                {isOver
                    ? <Sheet>
                        <MatchResult state={state} you={you}
                            onRestart={handleStart}
                            onLeave={leave}
                        />
                    </Sheet>
                    : state.status === MatchStatus.guessing && you.mission === 'sjehnsens'
                        ? <Sheet>
                            <MissionGuess state={state} you={you} dispatch={dispatch} />
                        </Sheet>
                        : <>
                            <div className='relative flex flex-col flex-1 min-h-0'>
                                <GameTable state={state} you={you}
                                    lastPlay={lastPlay}
                                    onOpenLastPlay={() => setIsRevealing(true)}
                                    selectable={request?.chooserId === you.id ? (request.candidates ?? []) : []}
                                    selected={selected}
                                    onSelect={handleSelect}
                                />

                                {/* O log flutua sobre a mesa em vez de ocupar
                                    uma faixa dela: e leitura de canto de olho, e
                                    a altura que ele cobrava rende mais como
                                    feltro. */}
                                <div className={`
                                    absolute left-2 top-2 z-10
                                    max-w-[58%] max-h-20
                                    overflow-y-auto scrollbar-custom
                                    pointer-events-none
                                `}>
                                    <MatchLog state={state} limit={6} />
                                </div>

                                {/* A saida nao tem mais barra onde morar, entao
                                    vira um icone no canto da mesa. */}
                                <button type='button'
                                    aria-label='Sair da partida'
                                    onClick={leave}
                                    className={`
                                        absolute right-2 top-2 z-10
                                        flex items-center justify-center
                                        h-9 w-9 rounded-xl
                                        border border-line bg-base/70 text-cream-dim
                                        transition-transform active:scale-95
                                        focus:outline-none focus-visible:ring-2
                                        focus-visible:ring-brand-light
                                    `}
                                >
                                    <ICONS.close />
                                </button>

                                {error && <div onClick={dismissError}
                                    className='absolute inset-x-3 bottom-2 z-20'
                                >
                                    <ErrorMessage error={error} />
                                </div>}
                            </div>

                            {/* Controles e mao colados no rodape: a mao e a
                                borda de baixo da tela, e a acao fica logo em
                                cima dela, sempre no mesmo lugar. */}
                            <div className={`
                                shrink-0 flex flex-col gap-2
                                px-3 pt-1
                                pb-[max(0.5rem,env(safe-area-inset-bottom))]
                            `}>
                                <div className='flex items-end gap-2'>
                                    <MissionButton onClick={() => setIsMissionOpen(true)} />
                                    <div className='flex-1 min-w-0'>
                                        <TurnBar state={state} you={you}
                                            isYourTurn={isYourTurn}
                                            selected={selected}
                                            onSelect={handleSelect}
                                            dispatch={dispatch}
                                        />
                                    </div>
                                </div>

                                <Hand cards={you.hand}
                                    playable={playable}
                                    onPlay={handlePlay}
                                    scale={0.38}
                                />
                            </div>
                        </>}
            </div>

            {isMissionOpen && <MissionModal mission={mission}
                onClose={() => setIsMissionOpen(false)}
            />}

            {isRevealing && <PlayedCard play={lastPlay}
                players={state.players}
                onClose={() => setIsRevealing(false)}
            />}
        </>
    );
}

/**
 * O painel de fim de partida e o da adivinhacao: as duas telas que nao sao
 * mesa. Aqui a largura limitada volta a fazer sentido — sao texto e botoes.
 */
function Sheet({ children }){
    return (
        <div className={`
            flex flex-col justify-center
            flex-1 min-h-0 w-full max-w-[480px] mx-auto
            px-4 py-6 overflow-y-auto scrollbar-custom
        `}>
            {children}
        </div>
    );
}

/**
 * A sala do solo. Duas decisoes so: com quantos bots, e de onde saem as cartas.
 * Mais que isso seria configurar em vez de jogar.
 */
function Setup({
    botCount, setBotCount,
    useCollection, setUseCollection,
    canUseCollection, collectionSize,
    onStart
}){
    return (
        <Main>
            <PageHeader title='Jogo solo' />
            <Box fullH>
                <div className='flex flex-col gap-5 h-full'>
                    <p className='text-xs text-cream-dim'>
                        Uma partida contra bots, sem sala e sem link. Cada bot entra com um
                        baralho sorteado de {SOLO_DECK_SIZE} cartas. Nada é salvo.
                    </p>

                    <section className='flex flex-col gap-2'>
                        <span className='text-sm font-semibold'>Quantos bots</span>
                        <div className='flex gap-1.5'>
                            {/* Ate 6: sao 7 missoes, uma por jogador, e voce
                                ocupa uma delas. */}
                            {[1, 2, 3, 4, 5, 6].map(count => (
                                <button key={count}
                                    type='button'
                                    onClick={() => setBotCount(count)}
                                    className={`
                                        flex-1 h-11 rounded-xl text-sm font-semibold
                                        border transition-transform active:scale-95
                                        ${botCount === count
                                            ? 'border-gold bg-gold/15 text-gold'
                                            : 'border-line bg-elevated text-cream-dim'}
                                    `}
                                >
                                    {count}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className='flex flex-col gap-2'>
                        <span className='text-sm font-semibold'>De onde vêm as cartas</span>
                        <button type='button'
                            onClick={() => setUseCollection(false)}
                            className={`
                                flex flex-col items-start gap-0.5
                                px-3 py-2.5 rounded-2xl border text-left
                                ${!useCollection
                                    ? 'border-gold bg-gold/10'
                                    : 'border-line bg-elevated'}
                            `}
                        >
                            <span className='text-sm font-semibold'>Catálogo inteiro</span>
                            <span className='text-[0.7rem] text-cream-dim'>
                                As {CARDS.length} cartas, tenha você ou não.
                            </span>
                        </button>
                        <button type='button'
                            disabled={!canUseCollection}
                            onClick={() => setUseCollection(true)}
                            className={`
                                flex flex-col items-start gap-0.5
                                px-3 py-2.5 rounded-2xl border text-left
                                disabled:opacity-40 disabled:cursor-not-allowed
                                ${useCollection
                                    ? 'border-gold bg-gold/10'
                                    : 'border-line bg-elevated'}
                            `}
                        >
                            <span className='text-sm font-semibold'>Minha coleção</span>
                            <span className='text-[0.7rem] text-cream-dim'>
                                {canUseCollection
                                    ? `${collectionSize} cartas diferentes.`
                                    : `Precisa de ${SOLO_DECK_SIZE} cartas diferentes; você tem ${collectionSize}.`}
                            </span>
                        </button>
                    </section>

                    <div className='mt-auto'>
                        <ActionButton text='Começar'
                            variant='gold'
                            icon={ICONS.play}
                            action={onStart}
                        />
                    </div>
                </div>
            </Box>
        </Main>
    );
}
