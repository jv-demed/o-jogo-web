'use client'
import { useMemo } from 'react';
import { ICONS } from '@/assets/icons';
import { Card } from '@/components/cards/Card';
import { Seat } from './Seat';
import { cardById } from './narrate';

/**
 * A mesa: os lugares em roda e o descarte no meio.
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
    onOpenDiscard,
    selectable = [],
    selected = [],
    onSelect,
    reveal = false
}){

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
        <section className='relative w-full flex-1 min-h-[13rem]'>
            {/* O feltro. Nao e enfeite: e ele que faz as cadeiras lerem como
                uma roda em volta de um centro, e nao como cartoes soltos. */}
            <div className={`
                absolute left-1/2 top-1/2
                -translate-x-1/2 -translate-y-1/2
                h-[74%] w-[86%] rounded-[50%]
                border border-line/70
                bg-[radial-gradient(circle_at_50%_35%,rgba(47,141,196,0.10),transparent_70%)]
            `} />

            <DirectionRing direction={state.direction} />

            <DiscardPile state={state} onOpen={onOpenDiscard} />

            {seats.map(({ player, style }) => (
                <Seat key={player.id}
                    player={player}
                    style={style}
                    isYou={player.id === you.id}
                    reveal={reveal}
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
 * O sentido do jogo, correndo na borda do feltro.
 *
 * `order.reverse` inverte a mesa, e ate agora isso so aparecia como uma linha
 * no log — a carta mais barulhenta do jogo passava despercebida. Uma luz que
 * corre pela borda diz para onde a vez esta indo sem gastar texto, e a corrida
 * trocando de mao e a confirmacao de que a carta pegou.
 *
 * Sao pontos parados na elipse acendendo em sequencia, e nao um anel girando:
 * girar um elemento eliptico o deforma a cada frame, e a borda largaria o
 * feltro nas laterais. O que da a volta e a *fase* da animacao, nao a
 * geometria.
 */

// Raios do feltro (h-74% w-86%), mais uma folga para a luz correr do lado de
// fora da linha, e nao em cima dela.
const RING_X = 44.5;
const RING_Y = 38.5;

const RING_DOTS = 16;
const RING_CYCLE = 5.6; // segundos por volta; devagar de proposito

function DirectionRing({ direction }){

    const dots = useMemo(() => Array.from({ length: RING_DOTS }, (_, i) => {
        const angle = ((i * 360) / RING_DOTS) * (Math.PI / 180);
        // O indice cresce no mesmo sentido das cadeiras (`seat` em GameTable),
        // entao a luz acompanha a vez se acender do menor indice para o maior.
        // Quem acende depois e quem tem o atraso maior: dai o `step` positivo
        // no sentido normal, e o negativo quando a mesa inverte. Os dois saem
        // negativos de proposito — atraso negativo entra com a animacao ja em
        // curso, e inverter troca a mao da volta sem reinicia-la.
        const step = (i / RING_DOTS) * RING_CYCLE;
        return {
            key: i,
            left: `${50 + RING_X * Math.cos(angle)}%`,
            top: `${50 + RING_Y * Math.sin(angle)}%`,
            delay: direction >= 0 ? step - RING_CYCLE : -step
        };
    }), [direction]);

    return (
        <div aria-hidden='true' className='absolute inset-0 pointer-events-none'>
            {dots.map(({ key, left, top, delay }) => (
                <span key={key}
                    style={{
                        left,
                        top,
                        animationDelay: `${delay}s`,
                        animationDuration: `${RING_CYCLE}s`
                    }}
                    className={`
                        absolute h-1 w-1 rounded-full
                        -translate-x-1/2 -translate-y-1/2
                        bg-brand-light opacity-20 animate-table-spin
                    `}
                />
            ))}
        </div>
    );
}

/**
 * A pilha do descarte, no centro.
 *
 * Mostra a carta que caiu por ultimo e abre no toque a lista inteira do que ja
 * foi usado. A folha de cima vem de `state.discardPile` — o descarte da mesa em
 * ordem — e nao da ultima carta *jogada*: sao coisas diferentes, e trocar uma
 * pela outra fazia a pilha mentir. A carta jogada ainda esta na pilha de
 * resolucao (ainda da para cancelar, e equipamento nem chega a descartar), e a
 * carta que cai por efeito — descarte forcado, redraw da mao — nunca passa por
 * jogada nenhuma e simplesmente nao aparecia aqui.
 */
function DiscardPile({ state, onOpen }){

    const top = state.discardPile[state.discardPile.length - 1] ?? null;
    const card = top ? cardById(top.idCard) : null;
    const count = state.discardPile.length;

    return (
        <div className={`
            absolute left-1/2 top-1/2
            -translate-x-1/2 -translate-y-1/2
            flex flex-col items-center
        `}>
            {card
                ? <button type='button'
                    onClick={onOpen}
                    aria-label='Ver as cartas já usadas'
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
                    {/* A chave e a altura do monte: sem ela React reusa o no e
                        a folha nova troca sem ninguem ver que caiu carta. */}
                    <span key={count}
                        className='relative block overflow-hidden rounded-lg animate-fade-in'
                    >
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
