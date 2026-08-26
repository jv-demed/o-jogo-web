import { ICONS } from '@/assets/icons';
import { useRouter } from 'next/navigation';

export function PageHeader({
    title,
    returnTo = '/home'
}) {

    const router = useRouter();

    return (
        <header className={`
            flex items-center gap-2 shrink-0
            w-full pt-3
        `}>
            <button type='button'
                aria-label='Voltar'
                onClick={() => router.push(returnTo)}
                className={`
                    flex items-center justify-center shrink-0
                    h-11 w-11 -ml-1 rounded-xl text-lg
                    border border-line bg-surface/70
                    transition-transform active:scale-95 active:bg-elevated
                    focus:outline-none focus-visible:ring-2
                    focus-visible:ring-brand-light
                `}
            >
                <ICONS.arrowLeft />
            </button>
            <h1 className={`
                flex-1 -ml-11 text-center
                text-lg font-semibold tracking-wide
                pointer-events-none
            `}>
                {title}
            </h1>
        </header>
    )
}
