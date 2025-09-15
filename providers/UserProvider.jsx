'use client'
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/client';
import { Main } from '@/components/containers/Main';
import { Loading } from '@/components/elements/Loading';

const UserContext = createContext(null);

export function UserProvider({ children }){

    const router = useRouter();

    const [user, setUser] = useState();

    const [isLoading, setIsLoading] = useState(true);

    async function getUser(){
        const { data, error } = await supabase.auth.getUser();
        console.log(data);
        if(error || !data?.user){
            router.push('/');
            return;
        }
        const { data: userData, error: userError } = await supabase
            .from('oJogo-users')
            .select('*')
            .eq('idAuth', data.user.id)
            .single();
        if(userError){
            router.push('/');
            return;
        }return userData;
    }
    
    useEffect(() => {
        getUser().then(async res => {
            if(!res) return;
            setUser(res);
            setIsLoading(false);
        });
    }, []);
    
    if(isLoading){
        return (
            <Main $justifyContent='center'>
                <Loading />
            </Main>
        );
    }
    return (
        <UserContext.Provider value={user}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => useContext(UserContext);