'use client'
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/client';
import { Main } from '@/components/containers/Main';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { ErrorMessage } from '@/components/elements/ErrorMessage';

const UserContext = createContext(null);

// A colecao virou linhas (id_card, quantity) no banco, mas o resto do app
// espera user.cards como array plano de ids, com a repeticao explicita:
// [12, 12, 30]. Expandir aqui evita tocar colecao, decks e os modais.
function expandCollection(rows){
    return (rows ?? [])
        .flatMap(({ id_card, quantity }) => Array(quantity).fill(id_card))
        .sort((a, b) => a - b);
}

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
        // A colecao vem embutida: user_cards tem FK para users, entao o
        // PostgREST resolve o join numa chamada so.
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, id_auth, name, coins, user_cards(id_card, quantity)')
            .eq('id_auth', data.user.id)
            .single();
        if(userError){
            setError(userError);
            router.push('/');
            return;
        }
        setError(null);
        return { ...userData, cards: expandCollection(userData.user_cards) };
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