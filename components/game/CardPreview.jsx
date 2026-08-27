'use client'
import { useEffect, useState } from 'react';
import { Card } from '@/components/cards/Card';

/**
 * A carta, no tamanho em que da para ler.
 *
 * Nao usa o Modal comum de proposito: aqui nao ha nada para operar, so uma
 * carta para olhar. Botao de fechar no canto seria mais um alvo entre o dedo e
 * o jogo — qualquer toque fecha.
 */
export function CardPreview({ card, onClose }){

    const scale = useFitScale();

    if(!card) return null;

    return (
        <div role='dialog'
            aria-label={card.name}
            onClick={onClose}
            className={`
                fixed inset-0 z-50 px-4
                flex flex-col items-center justify-center gap-3
                bg-black/80 backdrop-blur-sm
                animate-fade-in
            `}
        >
            <div className='animate-sheet-up rounded-xl overflow-hidden'>
                <Card card={card} scale={scale} />
            </div>
            <p className='text-[0.7rem] text-cream-dim'>
                Toque para fechar
            </p>
        </div>
    );
}

/** A carta tem 300x440 fixos: a maior escala que cabe na tela com folga. */
function useFitScale(){

    const [scale, setScale] = useState(0.7);

    useEffect(() => {
        function measure(){
            setScale(Math.min(
                (window.innerWidth - 48) / 300,
                (window.innerHeight - 96) / 440,
                1
            ));
        }
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    return scale;
}
