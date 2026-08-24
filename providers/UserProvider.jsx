'use client'
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/client';
import { Main } from '@/components/containers/Main';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { ErrorMessage } from '@/components/elements/ErrorMessage';

const UserContext = createContext(null);

export function UserProvider({ children }){

    const router = useRouter();

    const [user, setUser] = useState();

    const [isLoading, setIsLoading] = useState(true);

    const [error, setError] = useState(null);

    async function getUser(){
        const { data, error: authError } = await supabase.auth.getUser();
        if(authError || !data?.user){
            setError(authError ?? { message: 'Sessão não encontrada.' });
            router.push('/');
            return;
        }
        const { data: userData, error: userError } = await supabase
            .from('oJogo-users')
            .select('*')
            .eq('idAuth', data.user.id)
            .single();
        if(userError){
            setError(userError);
            router.push('/');
            return;
        }
        setError(null);
        return userData;
    }

    async function refreshUser() {
        const userData = await getUser();
        if(userData) setUser(userData);
        return userData;
    }
    
    useEffect(() => {
        getUser()
            .then(res => {
                if(res) setUser(res);
            })
            .catch(err => setError(err))
            .finally(() => setIsLoading(false));
    }, []);
    
    if(isLoading){
        return (
            <Main>
                <SpinLoader marginTop='20px' />
            </Main>
        );
    }
    if(!user){
        return (
            <Main>
                <ErrorMessage error={error ?? { message: 'Não foi possível carregar o usuário.' }} />
            </Main>
        );
    }
    return (
        <UserContext.Provider value={{ user, refreshUser }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => useContext(UserContext);