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
            <span className='shrink-0 text-base leading-5'>
                <ICONS.warning />
            </span>
            <span className='min-w-0 break-words'>
                {error.status != null && `${error.status}: `}{error.message}
            </span>
        </div>
    );
}
