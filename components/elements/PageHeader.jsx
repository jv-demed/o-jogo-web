import { ICONS } from '@/assets/icons';
import { useRouter } from 'next/navigation';

export function PageHeader({ 
    title, 
    returnTo = '/home' 
}) { 

    const router = useRouter();

    return (
        <header className={`
            flex items-center gap-2 
            w-full pt-4
        `}>
            <button type='button'
                aria-label='Voltar'
                onClick={() => router.push(returnTo)}
                className={`
                    flex items-center justify-center
                    h-12 w-12 -ml-3 text-xl
                    focus:outline-none focus-visible:ring-2
                    focus-visible:ring-[#e2d4b8]
                `}
            >
                <ICONS.arrowLeft />
            </button>
            <h3 className='text-xl text-center w-full'>
                {title}
            </h3>
        </header>
    )
}