import { ICONS } from '@/assets/icons';
import { useRouter } from 'next/navigation';

/**
 * @param {Function} [props.onReturn] o que fazer no lugar de navegar. Existe
 *        para o lobby: sair de la nao e so trocar de tela — ha um assento
 *        ocupado no banco, e quem sai precisa solta-lo. Sem isto, a seta era
 *        uma porta dos fundos que deixava a sala de pe para sempre.
 */
export function PageHeader({
    title,
    returnTo = '/home',
    onReturn
}) {

    const router = useRouter();

    return (
        <header className={`
            flex items-center gap-2 shrink-0
            w-full pt-3
        `}>
            <button type='button'
                aria-label='Voltar'
                onClick={() => onReturn ? onReturn() : router.push(returnTo)}
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
