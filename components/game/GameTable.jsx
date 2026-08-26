'use client'
import { useEffect, useMemo, useRef, useState } from 'react';
import { ICONS } from '@/assets/icons';
import { Card } from '@/components/cards/Card';
import { Phase, REACTION_WINDOW_MS } from '@/domain/match/state';
import { Seat } from './Seat';
import { cardById } from './narrate';

/**
 * A mesa: os lugares em roda e a carta em jogo no meio.
 *
 * A fila vertical de adversarios dizia quem estava na partida, mas nao *onde* —
 * e um jogo em que carta fala de vizinho, de ordem e de inverter a mesa precisa
 * que a roda exista na tela. Aqui cada jogador ocupa uma cadeira numa elipse, e
 * o numero de cadeiras e o numero de jogadores: a mesma disposicao serve para
 * dois e para sete.
 *
 * Voce senta embaixo, colado na sua mao, e os outros seguem na ordem de turno a
 * partir dali — quem joga depois de voce e a cadeira seguinte no sentido
 * horario. A ordem vem de `state.order`, e nao do array de jogadores: carta que
 * rearranja a mesa mexe numa e nao na outra.
 */

// Raios da elipse, em % do container. Sobra margem para a largura da cadeira
// (5.5rem) nao vazar pela borda nas laterais.
const RADIUS_X = 34;
const RADIUS_Y = 33;

export function GameTable({
    state,
    you,
    lastPlay,
    onOpenLastPlay,
    selectable = [],
    selected = [],
    onSelect
}){

    const areaRef = useRef(null);

    const seats = useMemo(() => {
        if(!state || !you) return [];
        const size = state.order.length;
        const mine = state.order.indexOf(you.id);
        return state.order
            .map((id, index) => ({
                player: state.players.find(p => p.id === id),
                seat: (index - mine + size) % size
            }))
            .filter(entry => entry.player)
            .sort((a, b) => a.seat - b.seat)
            .map(({ player, seat }) => {
                // 90 graus e o pe da elipse (o eixo y da tela cresce para
                // baixo), entao a cadeira 0 — a sua — nasce embaixo.
                const angle = (90 + (seat * 360) / size) * (Math.PI / 180);
                return {
                    player,
                    style: {
                        left: `${50 + RADIUS_X * Math.cos(angle)}%`,
                        top: `${50 + RADIUS_Y * Math.sin(angle)}%`
                    }
                };
            });
    }, [state, you]);

    const currentId = state?.order[state.turnIndex];

    return (
        <section ref={areaRef} className='relative w-full flex-1 min-h-[13rem]'>
            {/* O feltro. Nao e enfeite: e ele que faz as cadeiras lerem como
                uma roda em volta de um centro, e nao como cartoes soltos. */}
            <div className={`
                absolute left-1/2 top-1/2
                -translate-x-1/2 -translate-y-1/2
                h-[74%] w-[86%] rounded-[50%]
                border border-line/70
                bg-[radial-gradient(circle_at_50%_35%,rgba(47,141,196,0.10),transparent_70%)]
            `} />

            <TableCenter state={state}
                areaRef={areaRef}
                lastPlay={lastPlay}
                onOpen={onOpenLastPlay}
            />

            {seats.map(({ player, style }) => (
                <Seat key={player.id}
                    player={player}
                    style={style}
                    isYou={player.id === you.id}
                    isCurrent={player.id === currentId}
                    isSelectable={selectable.includes(player.id)}
                    isSelected={selected.includes(player.id)}
                    onSelect={onSelect}
                />
            ))}
        </section>
    );
}

/**
 * O meio da mesa.
 *
 * Enquanto uma carta esta resolvendo ela fica ali, grande, com o tempo que
 * sobra logo abaixo — para todo mundo, o tempo inteiro da espera. Era um
 * anuncio em tela cheia que sumia em dois segundos, e isso tinha dois defeitos:
 * cobria a mao justo na janela em que da para reagir, e ia embora antes de a
 * espera acabar, deixando "por que ainda nao resolveu?" sem resposta na tela.
 *
 * Fora da resolucao o centro volta a ser a pilha do descarte, pequena, e um
 * toque nela reabre a ultima carta em tamanho de leitura.
 */
function TableCenter({ state, areaRef, lastPlay, onOpen }){

    const scale = useCenterScale(areaRef);

    const top = state.stack[state.stack.length - 1];
    const card = top ? cardById(top.idCard) : null;

    if(!card){
        return <DiscardPile state={state} lastPlay={lastPlay} onOpen={onOpen} />;
    }

    const byName = state.players.find(player => player.id === top.byId)?.name;

    return (
        <div className={`
            absolute left-1/2 top-1/2
            -translate-x-1/2 -translate-y-1/2
            flex flex-col items-center gap-1.5
            pointer-events-none
        `}>
            {byName && <p className='text-[0.7rem] text-cream-dim'>
                <span className='font-semibold text-cream'>{byName}</span>
                {' jogou'}
            </p>}

            <div className={`
                rounded-xl overflow-hidden
                shadow-[0_16px_40px_-16px_rgba(0,0,0,0.95)]
                animate-sheet-up
            `}>
                <Card card={card} scale={scale} />
            </div>

            {/* O relogio mora embaixo da carta, e nao na barra de acao: e a
                carta que a mesa esta olhando, e o tempo e sobre ela. */}
            {state.phase === Phase.window && state.window
                ? <WindowTimer closesAt={state.window.closesAt}
                    width={300 * scale}
                />
                : null}
        </div>
    );
}

/**
 * A barra encolhendo da janela de interferencia.
 *
 * Sem ela, a espera parece travamento — e num jogo em que a janela fecha
 * sozinha, saber quanto falta e o que decide se vale a pena procurar uma carta
 * de reacao na mao.
 */
function WindowTimer({ closesAt, width }){

    const [left, setLeft] = useState(() => closesAt - Date.now());

    useEffect(() => {
        setLeft(closesAt - Date.now());
        const timer = setInterval(() => setLeft(closesAt - Date.now()), 100);
        return () => clearInterval(timer);
    }, [closesAt]);

    const ratio = Math.max(0, Math.min(1, left / REACTION_WINDOW_MS));

    return (
        <div style={{ width }}
            className='h-1.5 rounded-full bg-elevated overflow-hidden'
        >
            <div className='h-full bg-gold transition-[width] duration-100'
                style={{ width: `${ratio * 100}%` }}
            />
        </div>
    );
}

/**
 * A carta tem 300x440 fixos e encolhe por transform, entao o tamanho e conta
 * nossa: a maior escala que ainda cabe no buraco da roda sem encostar nas
 * cadeiras de cima e de baixo.
 */
function useCenterScale(areaRef){

    const [scale, setScale] = useState(0.34);

    useEffect(() => {
        const element = areaRef.current;
        if(!element) return;

        function measure(){
            const { width, height } = element.getBoundingClientRect();
            setScale(Math.max(0.24, Math.min(
                // 2 * RADIUS_Y da a distancia entre as cadeiras opostas; o
                // resto e a folga para a altura da cadeira e a legenda.
                (height * 0.42) / 440,
                (width * 0.52) / 300,
                0.6
            )));
        }

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [areaRef]);

    return scale;
}

/**
 * A pilha do descarte, no centro.
 *
 * Mostra a ultima carta que a mesa viu — a que resolveu por ultimo. O descarte
 * e por jogador no estado (cada um tem o proprio baralho), entao o numero aqui
 * e a soma: o que interessa a mesa e quanto ja foi jogado, nao de quem era.
 */
function DiscardPile({ state, lastPlay, onOpen }){

    const card = lastPlay ? cardById(lastPlay.idCard) : null;
    const count = state.players.reduce((total, player) => total + player.discard.length, 0);

    return (
        <div className={`
            absolute left-1/2 top-1/2
            -translate-x-1/2 -translate-y-1/2
            flex flex-col items-center
        `}>
            {card
                ? <button type='button'
                    onClick={onOpen}
                    aria-label={`Ver ${card.name}`}
                    className={`
                        relative rounded-lg
                        shadow-[0_10px_24px_-12px_rgba(0,0,0,0.9)]
                        transition-transform active:scale-95
                        focus:outline-none focus-visible:ring-2
                        focus-visible:ring-cream
                    `}
                >
                    {/* Duas folhas tortas atras dao volume de pilha sem custar
                        outro <Card> renderizado. */}
                    <span className={`
                        absolute inset-0 -rotate-6 rounded-lg
                        border border-line bg-elevated
                    `} />
                    <span className={`
                        absolute inset-0 rotate-3 rounded-lg
                        border border-line bg-elevated
                    `} />
                    <span className='relative block overflow-hidden rounded-lg'>
                        <Card card={card} scale={0.2} />
                    </span>
                </button>
                : <div className={`
                    flex flex-col items-center justify-center gap-1
                    h-[88px] w-[60px] rounded-lg
                    border border-dashed border-line
                    text-cream-dim/60 text-[0.55rem] text-center
                `}>
                    <ICONS.deck />
                    descarte
                </div>}

            {/* O contador monta em cima da pilha em vez de abaixo: no meio de
                uma roda de cadeiras, cada linha extra encosta em alguem. */}
            {count > 0 && <span className={`
                absolute -bottom-2 left-1/2 -translate-x-1/2
                px-1.5 py-0.5 rounded-full
                border border-line bg-base
                text-[0.6rem] tabular-nums text-cream-dim
            `}>
                {count}
            </span>}
        </div>
    );
}
