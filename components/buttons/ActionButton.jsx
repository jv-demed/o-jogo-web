import { useState } from 'react';
import { SpinLoader } from '@/components/elements/SpinLoader';

// `bg` continua aceito (o lobby passa var(--color-base) no botao de cancelar),
// mas o caminho normal e a variante: ela traz borda, sombra e cor de texto
// junto, coisas que uma cor de fundo solta nao consegue combinar sozinha.
const VARIANTS = {
    primary: `
        text-cream border border-brand-light/40
        bg-linear-to-b from-brand-light to-brand
        shadow-lg shadow-brand/25
    `,
    secondary: `
        text-cream border border-line bg-elevated
    `,
    ghost: `
        text-cream-dim border border-transparent bg-transparent
    `,
    danger: `
        text-danger border border-danger/40 bg-danger/10
    `,
    gold: `
        text-[#241a04] border border-gold/50
        bg-linear-to-b from-[#f2c661] to-gold
        shadow-lg shadow-gold/20
    `
};

export function ActionButton({
    text,
    type,
    action,
    disabled,
    reverse,
    variant = 'primary',
    bg,
    width = '100%',
    icon: Icon
}){

    const [isLoading, setIsLoading] = useState(false);

    async function handleAction() {
        setIsLoading(true);
        action && await action();
        setIsLoading(false);
    }

    const isDisabled = disabled || isLoading;

    return(
        <button type={type || 'button'}
            disabled={isDisabled}
            onClick={handleAction}
            className={`
                flex items-center justify-center gap-2.5
                h-12 px-4 rounded-xl shrink-0
                font-semibold tracking-wide
                transition-[transform,filter,opacity] duration-100
                ${bg ? 'text-cream border border-line' : VARIANTS[variant]}
                ${isDisabled
                    ? 'opacity-45 saturate-50 cursor-not-allowed shadow-none'
                    : 'cursor-pointer active:scale-[0.97] active:brightness-90'}
                focus:outline-none focus-visible:ring-2
                focus-visible:ring-brand-light focus-visible:ring-offset-2
                focus-visible:ring-offset-base
            `}
            style={{
                background: bg,
                flexDirection: reverse ? 'row-reverse' : 'row',
                width: width
            }}
        >
            {!isLoading
                ? <>
                    {text && <span>{text}</span>}
                    {Icon && <span className='text-xl'>
                        <Icon />
                    </span>}
                </>
                : <SpinLoader color='text-current' />}
        </button>
    )
}
