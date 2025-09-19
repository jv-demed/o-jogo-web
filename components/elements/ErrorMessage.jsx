import { ICONS } from '@/assets/icons';

export function ErrorMessage({ error }){
    return (
        <div className='flex items-center gap-1'>
            <span className='text-red-800'>
                <ICONS.warning /> 
            </span>
            <span>
                {error.status != null && `${error.status}:`} {error.message}  
            </span>
        </div>
    );
}