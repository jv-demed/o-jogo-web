import { ICONS } from '@/assets/icons';

export function ErrorMessage({ error }){
    return (
        <div role='alert'
            className={`
                flex items-start gap-2 w-full
                px-3 py-2.5 rounded-xl
                border border-danger/30 bg-danger/10
                text-danger text-sm text-left
                animate-fade-rise
            `}
        >
            {/* text-[1rem] e nao text-base: `base` tambem e cor no tema, e o
                Tailwind casa os dois — o icone saia pintado do preto do fundo. */}
            <span className='shrink-0 text-[1rem] leading-5'>
                <ICONS.warning />
            </span>
            <span className='min-w-0 break-words'>
                {error.status != null && `${error.status}: `}{error.message}
            </span>
        </div>
    );
}
