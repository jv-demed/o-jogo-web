'use client'
import { useRef, useEffect, useLayoutEffect } from 'react';

const MIN_SIZE = 6;
const MAX_SIZE = 12;

// A carta e desenhada num box de tamanho fixo (300x440) e so depois escalada,
// entao o tamanho que serve para um texto nunca muda de uma carta para outra.
// Medir uma vez e reusar: cada leitura de scrollHeight custa um reflow
// sincrono, e a grid repete muita carta.
const cache = new Map();

// useLayoutEffect nao existe no servidor, e no SSR nao ha o que medir.
const useIsomorphicLayoutEffect = typeof window === 'undefined'
    ? useEffect
    : useLayoutEffect;

export function AutoFitText({ 
    children, 
    maxHeight = 100, 
    className = '' 
}){

    const ref = useRef(null);

    useIsomorphicLayoutEffect(() => {
        const el = ref.current;
        if(!el) return;

        const key = `${maxHeight}|${el.clientWidth}|${String(children)}`;
        const cached = cache.get(key);
        if(cached != null){
            el.style.fontSize = `${cached}px`;
            return;
        }

        // Busca binaria: 3 medicoes em vez das 6 do decremento linear, com o
        // mesmo resultado, porque diminuir a fonte nunca aumenta o scrollHeight.
        let low = MIN_SIZE;
        let high = MAX_SIZE;
        let best = MIN_SIZE;
        while(low <= high){
            const mid = Math.floor((low + high) / 2);
            el.style.fontSize = `${mid}px`;
            if(el.scrollHeight <= maxHeight){
                best = mid;
                low = mid + 1;
            }else{
                high = mid - 1;
            }
        }

        el.style.fontSize = `${best}px`;
        cache.set(key, best);
    }, [children, maxHeight]);

    return (
        <div ref={ref}
            className={className}
        >
            {children}
        </div>
    );
}
