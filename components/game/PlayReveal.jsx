'use client'
import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/cards/Card';
import { REACTION_WINDOW_MS } from '@/domain/match/state';
import { cardById } from './narrate';

/**
 * A carta jogada, sobreposta a mesa inteira.
 *
 * A tela tem duas metades claras: a mesa em cima, a mao embaixo. A carta que
 * acabou de ser jogada cobre a mesa toda — grande o bastante para a sala ler o
 * texto dela de longe — e nao encosta na mao: e olhando para a carta que se
 * decide se vale gastar um bloqueio, e a carta do bloqueio esta na mao.
 *
 * Nao intercepta toque (`pointer-events-none`): o que existe para clicar
 * enquanto ela esta na tela mora fora da mesa.
 */
export function PlayReveal({ play, players, closesAt }){

    const boxRef = useRef(null);
    const scale = useRevealScale(boxRef);

    const card = play ? cardById(play.idCard) : null;
    if(!card) return null;

    const byName = players.find(player => player.id === play.byId)?.name;

    return (
        <div ref={boxRef}
            role='status'
            aria-label={`${byName ?? 'Alguém'} jogou ${card.name}`}
            className={`
                absolute inset-0 z-20
                flex flex-col items-center justify-center gap-2
                bg-black/70 backdrop-blur-[2px]
                pointer-events-none animate-fade-in
            `}
        >
            {byName && <p className='text-xs text-cream-dim'>
                <span className='font-semibold text-cream'>{byName}</span>
                {' jogou'}
            </p>}

            <div className={`
                rounded-xl overflow-hidden animate-sheet-up
                shadow-[0_18px_44px_-16px_rgba(0,0,0,0.95)]
            `}>
                <Card card={card} scale={scale} />
            </div>

            {/* O relogio embaixo da carta, e nao na barra de acao: o tempo e
                sobre esta carta, e sem ele a espera parece travamento. */}
            {closesAt ? <WindowTimer closesAt={closesAt} width={300 * scale} /> : null}
        </div>
    );
}

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
            className='h-1.5 rounded-full bg-elevated/80 overflow-hidden'
        >
            <div className='h-full bg-gold transition-[width] duration-100'
                style={{ width: `${ratio * 100}%` }}
            />
        </div>
    );
}

/**
 * A carta tem 300x440 fixos e encolhe por transform, entao o tamanho e conta
 * nossa: a maior escala que cabe na area da mesa, com folga para a legenda em
 * cima e o relogio embaixo.
 */
function useRevealScale(boxRef){

    const [scale, setScale] = useState(0.5);

    useEffect(() => {
        const element = boxRef.current;
        if(!element) return;

        function measure(){
            const { width, height } = element.getBoundingClientRect();
            setScale(Math.max(0.3, Math.min(
                (height - 72) / 440,
                (width - 40) / 300,
                1
            )));
        }

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [boxRef]);

    return scale;
}
