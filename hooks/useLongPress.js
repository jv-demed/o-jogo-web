'use client'
import { useCallback, useRef } from 'react';

/**
 * Segurar para olhar.
 *
 * Na mao, o toque curto ja tem dono: jogar a carta. E ler a carta antes de
 * jogar e exatamente o que o jogador precisa fazer — as cartas sao texto, e
 * texto a 0.38 de escala nao se le. O gesto que sobra e o de segurar.
 *
 * Duas armadilhas moram aqui, e as duas sao da mao ser uma fileira rolavel:
 * arrastar para rolar nao pode virar "segurou" (dai o cancelamento por
 * movimento), e o toque que termina um long press ainda dispara `click` no
 * caminho de volta (dai o `onClickCapture`, que engole so esse).
 *
 * @param {() => void} onLongPress
 * @param {{ delay?: number, tolerance?: number }} [options]
 */
export function useLongPress(onLongPress, { delay = 400, tolerance = 12 } = {}){

    const timer = useRef(null);
    const fired = useRef(false);
    const origin = useRef(null);

    const clear = useCallback(() => {
        if(timer.current){
            clearTimeout(timer.current);
            timer.current = null;
        }
    }, []);

    return {
        onPointerDown(event){
            fired.current = false;
            origin.current = { x: event.clientX, y: event.clientY };
            clear();
            timer.current = setTimeout(() => {
                timer.current = null;
                fired.current = true;
                onLongPress();
            }, delay);
        },
        onPointerMove(event){
            if(!timer.current || !origin.current) return;
            const dx = Math.abs(event.clientX - origin.current.x);
            const dy = Math.abs(event.clientY - origin.current.y);
            if(dx > tolerance || dy > tolerance) clear();
        },
        onPointerUp: clear,
        onPointerLeave: clear,
        onPointerCancel: clear,
        onClickCapture(event){
            if(!fired.current) return;
            fired.current = false;
            event.preventDefault();
            event.stopPropagation();
        }
    };
}
