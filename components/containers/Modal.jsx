'use client'
import { useEffect, useRef } from 'react';
import { ICONS } from '@/assets/icons';

const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(', ');

export function Modal({ 
    onClose, 
    label, 
    children 
}){

    const dialogRef = useRef(null);

    // O onClose chega como arrow nova a cada render dos modais. Guardado num
    // ref, o efeito abaixo roda so na montagem: se dependesse do onClose, ele
    // reaplicaria o foco no dialog a cada render e roubaria o foco dos botoes.
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        // Ao fechar, o foco volta para o elemento que abriu o modal, e nao
        // para o topo da pagina.
        const previous = document.activeElement;
        dialogRef.current?.focus();

        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';

        function handleKeyDown(e){
            if(e.key === 'Escape'){
                onCloseRef.current();
                return;
            }
            if(e.key !== 'Tab') return;

            const items = dialogRef.current?.querySelectorAll(FOCUSABLE);
            if(!items?.length) return;

            const first = items[0];
            const last = items[items.length - 1];
            if(e.shiftKey && document.activeElement === first){
                e.preventDefault();
                last.focus();
            }else if(!e.shiftKey && document.activeElement === last){
                e.preventDefault();
                first.focus();
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = overflow;
            previous?.focus?.();
        };
    }, []);

    return (
        <div role='presentation'
            // mousedown, e nao click: arrastar de dentro do dialog e soltar no
            // backdrop nao deve fechar. O teste de target ignora o que borbulha
            // de dentro.
            onMouseDown={e => {
                if(e.target === e.currentTarget) onCloseRef.current();
            }}
            className={`
                fixed inset-0 bg-black/60 px-4
                flex items-center justify-center z-50
            `}
        >
            <div ref={dialogRef}
                role='dialog'
                aria-modal='true'
                aria-label={label}
                tabIndex={-1}
                className={`
                    flex flex-col justify-center items-center gap-2
                    px-6 py-1 max-w-lg w-full 
                    relative shadow-xl focus:outline-none
                `}
            >
                <header className='flex justify-end w-full'>
                    <button type='button'
                        aria-label='Fechar'
                        onClick={onClose}
                        className={`
                            flex items-center justify-center
                            h-12 w-12 text-4xl
                            hover:text-red-400
                            focus:outline-none focus:ring-2 focus:ring-cream
                        `}
                    >
                        <ICONS.close />
                    </button>
                </header>
                {children}
            </div>
        </div>
    );
}
