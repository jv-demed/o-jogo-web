'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMatch } from '@/presenters/matchesPresenter';
import { useUser } from '@/providers/UserProvider';
import { CARDS } from '@/assets/cards';
import { ICONS } from '@/assets/icons';
import { Main } from '@/components/containers/Main';
import { ErrorMessage } from '@/components/elements/ErrorMessage';
import { ActionButton } from '@/components/buttons/ActionButton';
import { SpinLoader } from '@/components/elements/SpinLoader';

// Um bloco por destino: o icone e a linha de apoio dizem o que a tela faz
// antes do toque, coisa que a fileira de botoes de texto nao dizia.
const MENU = [
    {
        href: '/decks',
        label: 'Decks',
        hint: 'Monte suas combinações',
        icon: ICONS.deck,
        disabled: true
    },{
        href: '/colecao',
        label: 'Coleção',
        hint: 'Todas as cartas que você tem',
        icon: ICONS.collection
    },{
        href: '/loja',
        label: 'Loja',
        hint: 'Troque coins por pacotes',
        icon: ICONS.store
    }
];

export default function Home(){

    const router = useRouter();
    const { user } = useUser();

    const [error, setError] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    // O bloco de matchmaking que morava comentado aqui procurava "a" partida
    // em espera - uma so, global. Nao sobrevive a RLS: matches_read_participant
    // so mostra partida de que o jogador ja participa, entao nao ha como
    // descobrir a sala de outra pessoa. Quem entra, entra pelo link do lobby.
    async function handlePlay(){
        setError(null);
        setIsCreating(true);
        try{
            const idMatch = await createMatch();
            router.push(`/lobby/${idMatch}`);
        }catch(err){
            setError(err);
            setIsCreating(false);
        }
    }

    const uniqueCards = new Set(user.cards).size;

    return (
        <Main>
            <section className='w-full pt-5 animate-fade-rise'>
                {/* Saudacao fixa de proposito: uma variante por horario
                    dependeria do relogio e o texto do servidor sairia
                    diferente do texto do cliente na hidratacao. */}
                <p className='text-sm text-cream-dim'>
                    Boa jogatina,
                </p>
                <h1 className='text-2xl font-bold truncate'>
                    {user.name}
                </h1>
            </section>

            {/* Cartao de acao principal: e o unico caminho para uma partida,
                entao ganha a area, o dourado e a estatistica ao lado. */}
            <section className={`
                w-full panel p-4 flex flex-col gap-4
                animate-fade-rise
            `}>
                <div className='flex items-center justify-between gap-3'>
                    <div className='min-w-0'>
                        <h2 className='font-semibold'>Nova partida</h2>
                        <p className='text-xs text-cream-dim mt-0.5'>
                            Crie a sala e mande o link para a mesa.
                        </p>
                    </div>
                    <div className={`
                        flex flex-col items-center shrink-0
                        px-3 py-1.5 rounded-xl
                        border border-line bg-elevated
                    `}>
                        <span className='text-base font-bold tabular-nums'>
                            {uniqueCards}
                        </span>
                        <span className='text-[0.6rem] uppercase tracking-widest text-cream-dim'>
                            cartas
                        </span>
                    </div>
                </div>
                <ActionButton text={isCreating ? 'Criando sala...' : 'Jogar'}
                    variant='gold'
                    icon={ICONS.play}
                    action={handlePlay}
                />
                {isCreating && <SpinLoader color='text-gold' />}
                {error && <ErrorMessage error={error} />}
            </section>

            <nav className='flex flex-col gap-2.5 w-full animate-fade-rise'>
                {MENU.map(item => {
                    const Icon = item.icon;
                    return (
                        <button key={item.href}
                            type='button'
                            disabled={item.disabled}
                            onClick={() => router.push(item.href)}
                            className={`
                                flex items-center gap-3.5
                                w-full p-3.5 panel text-left
                                transition-transform
                                disabled:opacity-40 disabled:cursor-not-allowed
                                enabled:active:scale-[0.98]
                                focus:outline-none focus-visible:ring-2
                                focus-visible:ring-brand-light
                            `}
                        >
                            <span className={`
                                flex items-center justify-center shrink-0
                                h-11 w-11 rounded-xl
                                border border-brand-light/25 bg-brand/25
                                text-brand-light text-lg
                            `}>
                                <Icon />
                            </span>
                            <span className='flex flex-col min-w-0'>
                                <span className='font-semibold'>
                                    {item.label}
                                </span>
                                <span className='text-xs text-cream-dim truncate'>
                                    {item.disabled ? 'Em construção' : item.hint}
                                </span>
                            </span>
                            <span className='ml-auto text-cream-dim shrink-0'>
                                <ICONS.chevronForward />
                            </span>
                        </button>
                    );
                })}
            </nav>

            <p className='mt-auto pt-4 text-xs text-cream-dim/60'>
                {CARDS.length} cartas no catálogo
            </p>
        </Main>
    );
}
