'use client'
import { useEffect, useState } from 'react';
import { Card } from '@/components/cards/Card';
import { cardById } from './narrate';

/**
 * O anuncio da jogada: a carta grande, na tela de todo mundo.
 *
 * Numa mesa em que o bot joga sozinho e a resolucao demora uma janela inteira,
 * o nome da carta numa linha de log nao e suficiente — ninguem decide se vai
 * reagir sem ter lido a carta. Entao a carta aparece inteira, no tamanho em que
 * da para ler.
 *
 * Fecha no toque e sozinha (o page controla o relogio): a janela de
 * interferencia continua correndo atras do veu, e um anuncio que precisasse de
 * confirmacao comeria o tempo de reagir.
 */
export function PlayedCard({ play, players, onClose }){

    const scale = useCardScale();

    if(!play) return null;

    const card = cardById(play.idCard);
    if(!card) return null;

    const byName = players.find(player => player.id === play.byId)?.name;

    return (
        <div role='dialog'
            aria-label={card.name}
            onClick={onClose}
            className={`
                fixed inset-0 z-40
                flex flex-col items-center justify-center gap-3
                bg-black/75 backdrop-blur-sm
                animate-fade-in
            `}
        >
            {byName && <p className='text-sm text-cream-dim'>
                <span className='font-semibold text-cream'>{byName}</span>
                {' jogou'}
            </p>}
            <div className='animate-sheet-up'>
                <Card card={card} scale={scale} />
            </div>
        </div>
    );
}

/**
 * A carta tem 300x440 fixos e encolhe por transform, entao o tamanho e conta
 * nossa: a maior escala que ainda cabe na tela, com folga para a legenda.
 */
function useCardScale(){

    const [scale, setScale] = useState(0.7);

    useEffect(() => {
        function measure(){
            setScale(Math.min(
                (window.innerWidth - 48) / 300,
                (window.innerHeight - 120) / 440,
                1
            ));
        }
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    return scale;
}
