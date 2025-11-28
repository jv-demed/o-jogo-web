import { useRef, useEffect } from 'react';

export function AutoFitText({ 
    children, 
    maxHeight = 100, 
    className = '' 
}){

    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if(!el) return;
        let size = 12; 
        el.style.fontSize = `${size}px`;
        while(el.scrollHeight > maxHeight && size > 6) {
            size--;
            el.style.fontSize = `${size}px`;
        }
    }, [children]);

    return (
        <div ref={ref}
            className={className}
        >
            {children}
        </div>
    );
}
