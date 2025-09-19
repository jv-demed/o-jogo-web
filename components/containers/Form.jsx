'use client'
import { useState } from 'react';
import { SpinLoader } from '@/components/elements/SpinLoader';


export function Form({ children, onSubmit }){

    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(event){
        event.preventDefault();
        setIsLoading(true);
        onSubmit && await onSubmit();
        setIsLoading(false);
    }

    return (
        <form 
            onSubmit={handleSubmit}
            className={`
                flex flex-col gap-2.5
                w-full  
            `}
        >
            {isLoading ? <SpinLoader /> : children}
        </form>
    )
}