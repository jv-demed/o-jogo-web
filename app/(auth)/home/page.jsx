'use client'
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMatch, getOpenLobby } from '@/presenters/matchesPresenter';
import { useUser } from '@/providers/UserProvider';
import { CARDS } from '@/assets/cards';
import { ICONS } from '@/assets/icons';
import { Avatar } from '@/components/elements/Avatar';
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
        href: '/missoes',
        label: 'Missões',
        hint: 'As sete identidades da mesa',
        icon: ICONS.investigation
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
    // A sala de outra pessoa, quando ha exatamente uma aberta. Quem decide se
    // ha e o banco (`open_lobby`): duas no ar, ninguem e oferecido.
    const [openLobby, setOpenLobby] = useState(null);

    /**
     * Procurar a sala aberta.
     *
     * O erro e engolido: nao achar convite nao e um problema que a tela
     * inicial deva anunciar — sem sala, o menu simplesmente nao ganha a linha
     * a mais, que e o mesmo que ele mostra na maior parte do tempo.
     */
    const loadOpenLobby = useCallback(async () => {
        try{
            setOpenLobby(await getOpenLobby());
        }catch{
            setOpenLobby(null);
        }
    }, []);

    // Perguntar de tempos em tempos, e nao escutar o realtime: a sala de outra
    // pessoa nao chega por evento nenhum, porque a RLS nao deixa o cliente
    // enxergar a linha de `matches` antes de ele estar dentro dela. A volta
    // para a aba pergunta de novo — e o momento em que a resposta velha mais
    // atrapalha, e o que mais acontece: o convite costuma vir por fora.
    useEffect(() => {
        loadOpenLobby();
        const timer = setInterval(loadOpenLobby, 15000);
        function handleVisibility(){
            if(document.visibilityState === 'visible') loadOpenLobby();
        }
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [loadOpenLobby]);

    // Criar sala continua sendo o unico caminho para *comecar* uma partida: a
    // RLS nao deixa procurar a de outra pessoa, e o que quebra o galho e a
    // RPC acima, que devolve a sala aberta quando ha uma so. Havendo duas, o
    // link do lobby volta a ser a unica porta.
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
            {/* Saudacao fixa de proposito: uma variante por horario dependeria
                do relogio e o texto do servidor sairia diferente do texto do
                cliente na hidratacao. */}
            <button type='button'
                onClick={() => router.push('/perfil')}
                className={`
                    flex items-center gap-3 w-full pt-5 text-left
                    animate-fade-rise
                    transition-transform active:scale-[0.99]
                    focus:outline-none focus-visible:ring-2
                    focus-visible:ring-brand-light rounded-2xl
                `}
            >
                <Avatar id={user.avatar} size={52} />
                <span className='flex flex-col min-w-0'>
                    <span className='text-sm text-cream-dim'>
                        Boa jogatina,
                    </span>
                    <span className='text-2xl font-bold truncate'>
                        {user.name}
                    </span>
                </span>
                <span className='ml-auto shrink-0 text-cream-dim'>
                    <ICONS.chevronForward />
                </span>
            </button>

            {/* A sala de outra pessoa vem antes de "Nova partida" porque e a
                unica coisa da tela com hora marcada: se alguem esta esperando
                na mesa agora, essa e a escolha certa, e criar uma segunda sala
                seria justamente o que faz as duas sumirem daqui. */}
            {openLobby && <button type='button'
                onClick={() => router.push(`/lobby/${openLobby.id}`)}
                className={`
                    flex items-center gap-3 w-full p-3.5 text-left
                    rounded-2xl border border-gold/40 bg-gold/10
                    animate-fade-rise
                    transition-transform active:scale-[0.99]
                    focus:outline-none focus-visible:ring-2
                    focus-visible:ring-gold
                `}
            >
                <Avatar id={openLobby.hostAvatar} size={44} />
                <span className='flex flex-col min-w-0'>
                    <span className='text-xs uppercase tracking-widest text-gold'>
                        Sala aberta
                    </span>
                    <span className='font-semibold truncate'>
                        {openLobby.hostName} está montando a mesa
                    </span>
                    <span className='text-xs text-cream-dim'>
                        {openLobby.seats} na mesa · toque para entrar
                    </span>
                </span>
                <span className='ml-auto shrink-0 text-gold'>
                    <ICONS.chevronForward />
                </span>
            </button>}

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
                            Crie a sala, ou jogue sozinho contra bots.
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
                {/* O solo fica aqui, e nao na navegacao de baixo: e um jeito de
                    jogar, nao uma tela para visitar. Enquanto a partida nao
                    existe no banco, e o unico caminho que leva a uma mesa de
                    verdade. */}
                <ActionButton text='Jogar solo'
                    variant='secondary'
                    icon={ICONS.blocks}
                    action={() => router.push('/solo')}
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
