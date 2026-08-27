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
import { MatchStatus, Phase, ongoingFor } from '@/domain/match/state';
import { SOLO_DECK_SIZE } from '@/domain/match/solo';
import { Main } from '@/components/containers/Main';
import { Box } from '@/components/containers/Box';
import { PageHeader } from '@/components/elements/PageHeader';
import { ErrorMessage } from '@/components/elements/ErrorMessage';
import { ActionButton } from '@/components/buttons/ActionButton';
import { GameTable } from '@/components/game/GameTable';
import { YouCorner } from '@/components/game/Seat';
import { PlayReveal } from '@/components/game/PlayReveal';
import { Hand } from '@/components/game/Hand';
import { TurnBar } from '@/components/game/TurnBar';
import { MatchResult, MissionGuess } from '@/components/game/MatchResult';
import { MissionModal, MissionButton } from '@/components/game/MissionModal';
import { MatchLogModal, MatchLogButton } from '@/components/game/MatchLogModal';
import { PlayerPickModal } from '@/components/game/PlayerPickModal';
import { CardPreview } from '@/components/game/CardPreview';
import { CardActionModal } from '@/components/game/CardActionModal';
import { MatchMenu, MatchMenuButton } from '@/components/game/MatchMenu';
import { DiscardModal } from '@/components/game/DiscardModal';
import { OngoingModal } from '@/components/game/OngoingModal';
import { DevPanel, DevButton } from '@/components/dev/DevPanel';
import { CardPickerModal } from '@/components/dev/CardPickerModal';
import { closeWindowNow, giveCard, stackDeck } from '@/domain/match/dev';

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

    const { user, isDev } = useUser();
    const {
        state, you, error, dismissError,
        isYourTurn, isOver, start, leave, dispatch,
        devApply, botsPaused, setBotsPaused, stepBots, hasBotCommand
    } = useSoloMatch();

    const [botCount, setBotCount] = useState(3);
    const [useCollection, setUseCollection] = useState(false);
    const [selected, setSelected] = useState([]);
    // Uma gaveta de cada vez: missao, log, menu, descarte e a escolha de alvo
    // sao todas modais, e duas abertas juntas empilhariam veus.
    const [openPanel, setOpenPanel] = useState(null);
    // A carta que se esta olhando de perto (toque longo na mao, toque no
    // descarte). Fica fora do `openPanel`: da para olhar uma carta *durante*
    // uma escolha, e sem isso abrir a lupa fecharia a pergunta.
    const [preview, setPreview] = useState(null);
    // De quem e a area de efeitos prolongados que esta aberta. Guardado a parte
    // do `openPanel` porque o painel e o mesmo para os sete lugares — o que
    // muda e a cadeira que foi tocada.
    const [ongoingOf, setOngoingOf] = useState(null);
    // A carta da mao que voce tocou, esperando voce dizer o que fazer com ela.
    // Guarda so a carta: se ela pode ser jogada e coisa da mesa, e a mesa anda
    // com a gaveta aberta — a janela fecha, o bot joga. Derivado, o botao de
    // jogar some junto com o direito de jogar, em vez de mentir.
    const [choice, setChoice] = useState(null);

    // Ferramentas de dev. `devPick` diz o que a escolha de carta vai fazer com
    // ela: empilhar e comprar, so empilhar, ou por na mao. Fora do `openPanel`
    // porque a escolha nasce de dentro do painel — as duas gavetas se revezam.
    const [reveal, setReveal] = useState(false);
    const [devPick, setDevPick] = useState(null);

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

    // Pergunta de alvo abre sozinha: e a mesa que esta esperando *voce*, e
    // deixar a pergunta atras de um botao e deixar a partida parada sem dizer
    // por que. Fechada, o botao de acao reabre com a selecao intacta.
    const isYourPick = isPlayerPick(request) && request.chooserId === you?.id;
    useEffect(() => {
        if(isYourPick) setOpenPanel('pick');
    }, [isYourPick, request?.slot, request?.uid]);

    // A carta jogada nao tem estado nenhum na tela: ela aparece porque a mesa
    // esta na janela de interferencia (ver PlayReveal) e some quando a janela
    // fecha. Relogio de exibicao seria um segundo relogio correndo contra o do
    // motor, e os dois discordariam.
    const closePanel = () => setOpenPanel(null);

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

    /**
     * Poder de dev: a carta escolhida vira o topo do seu baralho, e a compra
     * acontece pelo `Command.draw` de sempre. Empilhar em vez de inventar um
     * draw especial e o que mantem a jogada de teste no caminho real — inclusive
     * para a carta que compra duas ou que compra do fundo.
     */
    function handleDevPick(card){
        if(devPick === 'hand'){
            devApply(state => giveCard(state, you.id, card.id));
        }else{
            devApply(state => stackDeck(state, you.id, card.id));
            if(devPick === 'draw') dispatch({ type: Command.draw, playerId: you.id });
        }
        setDevPick(null);
    }

    function handlePlay(idCard){
        setChoice(null);
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
                                    onOpenDiscard={() => setOpenPanel('discard')}
                                    onOpenOngoing={id => {
                                        setOngoingOf(id);
                                        setOpenPanel('ongoing');
                                    }}
                                    selectable={request?.chooserId === you.id ? (request.candidates ?? []) : []}
                                    selected={selected}
                                    onSelect={handleSelect}
                                    reveal={isDev && reveal}
                                />

                                {/* Os dois cantos de cima da mesa: o que
                                    aconteceu, e o menu. Ambos guardados — o
                                    feltro e da roda e da carta em jogo. */}
                                <div className='absolute left-2 top-2 z-30'>
                                    <MatchLogButton onClick={() => setOpenPanel('log')} />
                                </div>
                                <div className='absolute right-2 top-2 z-30 flex items-center gap-1.5'>
                                    {isDev && <DevButton
                                        active={botsPaused || reveal}
                                        onClick={() => setOpenPanel('dev')}
                                    />}
                                    <MatchMenuButton onClick={() => setOpenPanel('menu')} />
                                </div>

                                {/* A carta em jogo cobre a mesa, nunca a mao:
                                    todo mundo le a carta, e quem tiver bloqueio
                                    continua com a mao ali embaixo para jogar. */}
                                {/* Vale tambem enquanto a carta declara os
                                    alvos — menos quando quem escolhe e voce: o
                                    veu cobre a mesa, e e na mesa que estao as
                                    cadeiras que voce precisa apontar. Para quem
                                    so assiste, e o oposto: a carta em tela
                                    cheia e a unica coisa que explica a espera.
                                    Relogio so na janela; na declaracao nao ha
                                    prazo, a mesa espera quem esta escolhendo. */}
                                {(state.phase === Phase.window
                                    || (state.resolution?.declaring && !isYourPick)) && <PlayReveal
                                    play={lastPlay}
                                    players={state.players}
                                    you={you}
                                    closesAt={state.phase === Phase.window
                                        ? state.window?.closesAt
                                        : null}
                                />}

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
                                {/* O seu canto: os numeros que ficariam na
                                    cadeira, encostados na direita logo acima da
                                    acao. Fora do feltro eles nao disputam
                                    espaco com a roda, e ficam no mesmo lugar
                                    para onde o dedo ja vai. */}
                                <YouCorner player={you}
                                    ongoing={ongoingFor(state, you.id)}
                                    isCurrent={isYourTurn}
                                    isSelectable={request?.chooserId === you.id
                                        && (request.candidates ?? []).includes(you.id)}
                                    isSelected={selected.includes(you.id)}
                                    onSelect={handleSelect}
                                    onOpenOngoing={id => {
                                        setOngoingOf(id);
                                        setOpenPanel('ongoing');
                                    }}
                                />

                                <div className='flex items-end gap-2'>
                                    <MissionButton onClick={() => setOpenPanel('mission')} />
                                    <div className='flex-1 min-w-0'>
                                        <TurnBar state={state} you={you}
                                            isYourTurn={isYourTurn}
                                            onOpenPicker={() => setOpenPanel('pick')}
                                            onDevDraw={isDev ? () => setDevPick('draw') : undefined}
                                            dispatch={dispatch}
                                        />
                                    </div>
                                </div>

                                <Hand cards={you.hand}
                                    playable={playable}
                                    onChoose={setChoice}
                                    onInspect={setPreview}
                                    scale={0.3}
                                />
                            </div>
                        </>}
            </div>

            {openPanel === 'mission' && <MissionModal mission={mission}
                onClose={closePanel}
            />}

            {openPanel === 'log' && <MatchLogModal state={state}
                onClose={closePanel}
            />}

            {openPanel === 'menu' && <MatchMenu
                onLeave={leave}
                onClose={closePanel}
            />}

            {openPanel === 'discard' && <DiscardModal state={state} you={you}
                onClose={closePanel}
                onInspect={setPreview}
            />}

            {openPanel === 'ongoing' && <OngoingModal state={state} you={you}
                playerId={ongoingOf}
                onClose={closePanel}
                onInspect={setPreview}
            />}

            {openPanel === 'pick' && isYourPick && <PlayerPickModal
                request={request}
                state={state}
                you={you}
                selected={selected}
                onSelect={handleSelect}
                onConfirm={() => {
                    dispatch({ type: Command.answer, playerId: you.id, value: selected });
                    closePanel();
                }}
                onClose={closePanel}
            />}

            {openPanel === 'dev' && isDev && <DevPanel state={state} you={you}
                reveal={reveal}
                onToggleReveal={() => setReveal(on => !on)}
                botsPaused={botsPaused}
                onToggleBots={() => setBotsPaused(on => !on)}
                onStepBots={stepBots}
                hasBotCommand={hasBotCommand}
                onPickForDeck={() => { closePanel(); setDevPick('deck'); }}
                onPickForHand={() => { closePanel(); setDevPick('hand'); }}
                onCloseWindow={() => { devApply(closeWindowNow); closePanel(); }}
                onInspect={setPreview}
                onClose={closePanel}
            />}

            {devPick && isDev && <CardPickerModal
                title={devPick === 'hand' ? 'Carta para a mão' : 'Carta para comprar'}
                hint={devPick === 'hand'
                    ? 'Entra na sua mão agora, sem passar pelo baralho.'
                    : 'Vai para o topo do seu baralho, no lugar da carta que estava lá.'}
                // O baralho vem primeiro, na ordem em que vai ser comprado —
                // mas some quando acaba: aba vazia e um beco.
                sources={[
                    ...(you.deck.length
                        ? [{ key: 'deck', label: 'Meu baralho', ids: you.deck }]
                        : []),
                    { key: 'catalog', label: 'Catálogo', ids: CATALOG_IDS },
                ]}
                onPick={handleDevPick}
                onClose={() => setDevPick(null)}
            />}

            {/* A gaveta da carta fica antes da lupa na arvore, mas some antes
                dela na tela: "ver detalhes" fecha esta e abre aquela, e voltar
                da lupa cai direto na mao — quem quis ler ja leu. */}
            {choice && <CardActionModal card={choice}
                isPlayable={playable.includes(choice.id)}
                isReaction={state.phase === Phase.window}
                onPlay={() => handlePlay(choice.id)}
                onInspect={() => { setPreview(choice); setChoice(null); }}
                onClose={() => setChoice(null)}
            />}

            {preview && <CardPreview card={preview}
                onClose={() => setPreview(null)}
            />}
        </>
    );
}

/**
 * Pergunta de alvo e a que aponta jogador: `choose` e `manual` no motor. As
 * outras duas (`optIn`, `option`) sao botao de sim/nao e escolha de opcao, e
 * cabem na propria barra de acao.
 */
function isPlayerPick(request){
    return Boolean(request)
        && request.kind !== 'optIn'
        && request.kind !== 'option'
        && Array.isArray(request.candidates);
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
