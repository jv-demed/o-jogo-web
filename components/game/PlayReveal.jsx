'use client'
import { useEffect, useRef, useState } from 'react';
import { ICONS } from '@/assets/icons';
import { Card } from '@/components/cards/Card';
import { REACTION_WINDOW_MS } from '@/domain/match/state';
import { cardById, declaredEffectText } from './narrate';

/**
 * A carta jogada, sobreposta a mesa inteira.
 *
 * A tela tem duas metades claras: a mesa em cima, a mao embaixo. A carta que
 * acabou de ser jogada cobre a mesa toda — grande o bastante para a sala ler o
 * texto dela de longe — e nao encosta na mao: e olhando para a carta que se
 * decide se vale gastar um bloqueio, e a carta do bloqueio esta na mao.
 *
 * Com alvo apontado, a carta sai da tela e quem fica e o alvo: a bolinha, o
 * nome grande e uma frase do que vai acontecer com ele. O alvo e escolhido
 * *antes* da janela abrir (ver a declaracao, em engine.js) justamente para isso
 * — interferir so e decisao de verdade quando se sabe quem ia sofrer.
 *
 * A troca e proposital: a carta inteira e o texto dela, que fala de todo mundo
 * e de todos os casos; a frase e o caso *deste* alvo, em uma linha. Quem esta
 * decidindo se gasta um bloqueio le a linha, nao o paragrafo. O nome da carta
 * continua no alto, junto de quem jogou, para a mesa saber do que se trata.
 *
 * Nao intercepta toque (`pointer-events-none`): o que existe para clicar
 * enquanto ela esta na tela mora fora da mesa.
 */
export function PlayReveal({ play, players, you, closesAt }){

    const boxRef = useRef(null);

    const card = play ? cardById(play.idCard) : null;
    const scale = useRevealScale(boxRef, 72);
    if(!card) return null;

    const nameOf = id => (id === you?.id ? 'Você' : players.find(p => p.id === id)?.name);
    const byName = nameOf(play.byId);
    const targets = (play.targets ?? []).map(id => ({ id, name: nameOf(id) })).filter(t => t.name);
    // A frase e a mesma para todos os apontados: ela descreve o efeito, e o
    // efeito e um so.
    const phrase = targets.length > 0 ? declaredEffectText(play.idCard) : null;

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
                {targets.length > 0 && <span className='font-semibold text-cream'>
                    {' ' + card.name}
                </span>}
            </p>}

            {targets.length === 0 && <div className={`
                rounded-xl overflow-hidden animate-sheet-up
                shadow-[0_18px_44px_-16px_rgba(0,0,0,0.95)]
            `}>
                <Card card={card} scale={scale} />
            </div>}

            {/* Em quem ela bate. Fica entre a carta e o relogio porque e o
                par que decide a reacao: o que a carta faz, e com quem. */}
            {targets.length > 0 && <div className={`
                flex flex-col items-center gap-1.5
                max-w-[19rem] px-3 animate-fade-in
            `}>
                <div className='flex flex-wrap items-center justify-center gap-2'>
                    {targets.map(target => (
                        <div key={target.id} className='flex items-center gap-2'>
                            <span className={`
                                flex items-center justify-center
                                h-9 w-9 rounded-full text-base
                                border border-gold/60 bg-gold/20 text-gold
                            `}>
                                <ICONS.user />
                            </span>
                            <span className='text-lg font-bold text-cream'>
                                {target.name}
                            </span>
                        </div>
                    ))}
                </div>
                {phrase && <p className='text-center text-xs text-cream-dim'>
                    {phrase}
                </p>}
            </div>}

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
 * cima e o relogio embaixo (`reserved`). `max` limita o crescimento — nem todo
 * anuncio quer a carta do tamanho da mesa.
 */
export function useRevealScale(boxRef, reserved = 72, max = 1){

    const [scale, setScale] = useState(0.5);

    useEffect(() => {
        const element = boxRef.current;
        if(!element) return;

        function measure(){
            const { width, height } = element.getBoundingClientRect();
            setScale(Math.max(0.3, Math.min(
                (height - reserved) / 440,
                (width - 40) / 300,
                max
            )));
        }

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [boxRef, reserved, max]);

    return scale;
}
