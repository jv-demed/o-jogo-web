'use client'
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/providers/UserProvider';
import { signOut } from '@/services/AuthService';
import { ICONS } from '@/assets/icons';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { ErrorMessage } from '@/components/elements/ErrorMessage';

// Decks fica de fora enquanto o botao da home estiver desabilitado: o menu
// nao deve abrir uma porta que a tela principal ainda mantem fechada.
const NAV = [
    { href: '/home', label: 'Início', icon: ICONS.play },
    { href: '/colecao', label: 'Coleção', icon: ICONS.collection },
    { href: '/loja', label: 'Loja', icon: ICONS.store }
];

export function Header() {

    const { user } = useUser();

    const router = useRouter();
    const pathname = usePathname();

    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState(null);
    const [isLeaving, setIsLeaving] = useState(false);

    const menuRef = useRef(null);

    // Fecha ao trocar de rota: sem isso o painel sobrevive a navegacao,
    // porque o Header vive no layout e nao remonta.
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    useEffect(() => {
        if(!isOpen) return;
        function handleKeyDown(e){
            if(e.key === 'Escape') setIsOpen(false);
        }
        function handlePointerDown(e){
            if(!menuRef.current?.contains(e.target)) setIsOpen(false);
        }
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('pointerdown', handlePointerDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [isOpen]);

    async function handleSignOut(){
        setError(null);
        setIsLeaving(true);
        const res = await signOut();
        if(!res.success){
            setError(res);
            setIsLeaving(false);
            return;
        }
        // replace, e nao push: o botao de voltar do celular nao deve
        // devolver o jogador para uma tela autenticada e ja sem sessao.
        router.replace('/');
        router.refresh();
    }

    return (
        <header className={`
            sticky top-0 z-30
            h-14 w-full
            border-b border-line
            bg-base/80 backdrop-blur-md
        `}>
            <div className={`
                flex items-center justify-between gap-2
                h-full w-full max-w-[480px] mx-auto pl-2 pr-4
            `}>
                <div ref={menuRef}
                    className='flex items-center gap-1 min-w-0'
                >
                    <button type='button'
                        aria-label='Menu'
                        aria-haspopup='menu'
                        aria-expanded={isOpen}
                        onClick={() => setIsOpen(prev => !prev)}
                        className={`
                            flex items-center justify-center shrink-0
                            h-11 w-11 rounded-xl text-2xl
                            text-cream transition-colors
                            ${isOpen ? 'bg-elevated' : 'active:bg-elevated'}
                            focus:outline-none focus-visible:ring-2
                            focus-visible:ring-brand-light
                        `}
                    >
                        {isOpen ? <ICONS.close /> : <ICONS.menu />}
                    </button>
                    <span className='truncate font-semibold'>
                        {user.name}
                    </span>
                    {isOpen && <>
                        {/* O veu escurece a tela atras do menu e da o alvo de
                            toque para fechar em qualquer lugar. */}
                        <div className='fixed inset-0 top-14 z-10 bg-black/50 animate-fade-in' />
                        <nav role='menu'
                            className={`
                                absolute left-2 top-[3.25rem] z-20
                                flex flex-col overflow-hidden
                                w-60 panel
                                animate-fade-rise
                            `}
                        >
                            {NAV.map(item => {
                                const isCurrent = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <button key={item.href}
                                        type='button'
                                        role='menuitem'
                                        disabled={isCurrent}
                                        onClick={() => router.push(item.href)}
                                        className={`
                                            flex items-center gap-3
                                            h-13 px-4 text-left
                                            border-b border-line/60
                                            disabled:cursor-default
                                            enabled:active:bg-elevated
                                            focus:outline-none focus-visible:ring-2
                                            focus-visible:ring-inset
                                            focus-visible:ring-brand-light
                                            ${isCurrent ? 'text-brand-light' : 'text-cream'}
                                        `}
                                    >
                                        <span className='text-base opacity-80'>
                                            <Icon />
                                        </span>
                                        <span>{item.label}</span>
                                        {isCurrent && <span className={`
                                            ml-auto h-1.5 w-1.5 rounded-full
                                            bg-brand-light
                                        `} />}
                                    </button>
                                );
                            })}
                            <button type='button'
                                role='menuitem'
                                disabled={isLeaving}
                                onClick={handleSignOut}
                                className={`
                                    flex items-center gap-3
                                    h-13 px-4 text-left text-danger
                                    active:bg-elevated
                                    focus:outline-none focus-visible:ring-2
                                    focus-visible:ring-inset
                                    focus-visible:ring-brand-light
                                `}
                            >
                                {isLeaving
                                    ? <SpinLoader color='text-danger' />
                                    : <>
                                        <span className='text-base opacity-80'>
                                            <ICONS.logout />
                                        </span>
                                        <span>Sair</span>
                                    </>}
                            </button>
                            {error && <div className='px-3 pb-3'>
                                <ErrorMessage error={error} />
                            </div>}
                        </nav>
                    </>}
                </div>
                <span className={`
                    flex items-center gap-2 shrink-0
                    h-9 px-3.5 rounded-full
                    border border-gold/30 bg-gold/10
                    text-gold font-semibold tabular-nums
                `}>
                    <ICONS.coins />
                    {user.coins}
                </span>
            </div>
        </header>
    )
}
