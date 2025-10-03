import { ICONS } from '@/assets/icons';
import { useRouter } from 'next/navigation';

export function PageHeader({ 
    title, 
    returnTo = '/home' 
}) { 

    const router = useRouter();

    return (
        <header className='flex items-center gap-2'>
            <div className='text-xl cursor-pointer'
                onClick={() => router.push(returnTo)}
            >
                <ICONS.arrowLeft />
            </div>
            <h3 className='text-xl text-center w-full'>
                {title}
            </h3>
        </header>
    )
}