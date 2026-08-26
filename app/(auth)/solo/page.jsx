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

// Quanto tempo a carta jogada fica grande na tela. Um toque fecha antes.
const PLAY_REVEAL_MS = 2200;

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

    // Carta jogada aparece grande para todo mundo e sai sozinha. O relogio e
    // curto de proposito: a janela de interferencia corre atras do veu, e quem
    // quiser reagir precisa da mao de volta antes dela fechar.
    useEffect(() => {
        if(!lastPlay) return;
        setIsRevealing(true);
        const timer = setTimeout(() => setIsRevealing(false), PLAY_REVEAL_MS);
        return () => clearTimeout(timer);
    }, [lastPlay?.uid]);

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
        <Main>
            {/* Sem PageHeader durante a partida: a saida mora na barra da
                missao, junto do resto do que e seu. */}
            <Box fullH>
                {error && <div onClick={dismissError}><ErrorMessage error={error} /></div>}

                {isOver
                    ? <MatchResult state={state} you={you}
                        onRestart={handleStart}
                        onLeave={leave}
                    />
                    : state.status === MatchStatus.guessing && you.mission === 'sjehnsens'
                        ? <MissionGuess state={state} you={you} dispatch={dispatch} />
                        : <div className='flex flex-col gap-2 h-full min-h-0'>
                            {/* Sua missao fica sempre a vista: e a unica coisa
                                que voce sabe e os outros nao, e esquecer dela
                                e jogar sem objetivo. */}
                            <section className={`
                                flex items-center gap-2.5 shrink-0
                                px-3 py-2 rounded-2xl
                                border border-brand-light/30 bg-brand/15
                            `}>
                                <span className='text-brand-light text-lg shrink-0'>
                                    <ICONS.investigation />
                                </span>
                                <span className='flex flex-col min-w-0'>
                                    <span className='text-sm font-bold'>{mission.name}</span>
                                    <span className='text-[0.65rem] text-cream-dim'>{mission.text}</span>
                                </span>
                                {/* Seus shots agora estao na sua cadeira, com
                                    os dos outros; aqui fica a saida, que sem o
                                    cabecalho nao teria outro lugar. */}
                                <button type='button'
                                    aria-label='Sair da partida'
                                    onClick={leave}
                                    className={`
                                        flex items-center justify-center
                                        ml-auto shrink-0 h-9 w-9 rounded-xl
                                        border border-line bg-base/60 text-cream-dim
                                        transition-transform active:scale-95
                                        focus:outline-none focus-visible:ring-2
                                        focus-visible:ring-brand-light
                                    `}
                                >
                                    <ICONS.close />
                                </button>
                            </section>

                            <GameTable state={state} you={you}
                                lastPlay={lastPlay}
                                onOpenLastPlay={() => setIsRevealing(true)}
                                selectable={request?.chooserId === you.id ? (request.candidates ?? []) : []}
                                selected={selected}
                                onSelect={handleSelect}
                            />

                            {/* O log encolheu para caber a mesa: quem quiser o
                                historico inteiro rola dentro dele. */}
                            <section className={`
                                shrink-0 h-12 overflow-y-auto
                                scrollbar-custom
                            `}>
                                <MatchLog state={state} limit={8} />
                            </section>

                            <section className='shrink-0'>
                                <TurnBar state={state} you={you}
                                    isYourTurn={isYourTurn}
                                    selected={selected}
                                    onSelect={handleSelect}
                                    dispatch={dispatch}
                                />
                            </section>

                            <section className='shrink-0'>
                                <Hand cards={you.hand}
                                    playable={playable}
                                    onPlay={handlePlay}
                                    scale={0.38}
                                />
                            </section>

                            {isRevealing && <PlayedCard play={lastPlay}
                                players={state.players}
                                onClose={() => setIsRevealing(false)}
                            />}
                        </div>}
            </Box>
        </Main>
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
