import { ICONS } from '@/assets/icons';

export function ErrorMessage({ error }){
    return (
        <div className='flex items-center gap-1'>
            {ICONS.warning} 
            <span>
                {error.status}: {error.message}  
            </span>
        </div>
    );
}