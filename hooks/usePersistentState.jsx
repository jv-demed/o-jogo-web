import { useEffect, useRef, useState } from 'react';

export function usePersistentState(key, initialValue) {

    const [value, setValue] = useState(initialValue);
    const isHydrated = useRef(false);

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem(key);
            if(saved !== null) setValue(JSON.parse(saved));
        } catch (err) {
            console.warn(`usePersistentState: falha ao ler "${key}"`, err);
        }
        isHydrated.current = true;
    }, [key]);

    useEffect(() => {
        if(!isHydrated.current) return;
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (err) {
            console.warn(`usePersistentState: falha ao gravar "${key}"`, err);
        }
    }, [key, value]);

    return [value, setValue];
}
