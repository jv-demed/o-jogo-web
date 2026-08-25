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
    { href: '/home', label: 'Início' },
    { href: '/colecao', label: 'Coleção' },
    { href: '/loja', label: 'Loja' }
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
            relative
            flex items-center justify-between
            h-10 px-[5%]
            bg-[#1b5b82] text-[#e2d4b8]
        `}>
            <div ref={menuRef}
                className='flex items-center gap-2'
            >
                <button type='button'
                    aria-label='Menu'
                    aria-haspopup='menu'
                    aria-expanded={isOpen}
                    onClick={() => setIsOpen(prev => !prev)}
                    className={`
                        flex items-center justify-center
                        h-10 w-10 -ml-2 text-2xl
                        hover:brightness-90
                        focus:outline-none focus:ring-2 focus:ring-[#e2d4b8]
                    `}
                >
                    {isOpen ? <ICONS.close /> : <ICONS.menu />}
                </button>
                <span>
                    {user.name}
                </span>
                {isOpen && <nav role='menu'
                    className={`
                        absolute left-[5%] top-10 z-20
                        flex flex-col
                        min-w-[180px] rounded-b
                        bg-[#1b5b82] shadow-lg
                    `}
                >
                    {NAV.map(item => (
                        <button key={item.href}
                            type='button'
                            role='menuitem'
                            disabled={pathname === item.href}
                            onClick={() => router.push(item.href)}
                            className={`
                                flex items-center
                                h-12 px-4 text-left
                                disabled:opacity-50 disabled:cursor-default
                                enabled:hover:brightness-90
                                focus:outline-none focus:ring-2 focus:ring-inset
                                focus:ring-[#e2d4b8]
                            `}
                        >
                            {item.label}
                        </button>
                    ))}
                    <div className='border-t border-[#e2d4b8]/30' />
                    <button type='button'
                        role='menuitem'
                        disabled={isLeaving}
                        onClick={handleSignOut}
                        className={`
                            flex items-center gap-2
                            h-12 px-4 text-left
                            hover:brightness-90
                            focus:outline-none focus:ring-2 focus:ring-inset
                            focus:ring-[#e2d4b8]
                        `}
                    >
                        {isLeaving
                            ? <SpinLoader />
                            : <>
                                <span className='text-xl'>
                                    <ICONS.logout />
                                </span>
                                <span>Sair</span>
                            </>}
                    </button>
                    {error && <div className='px-4 pb-2'>
                        <ErrorMessage error={error} />
                    </div>}
                </nav>}
            </div>
            <span>
                Coins: {user.coins}
            </span>
        </header>
    )
}
