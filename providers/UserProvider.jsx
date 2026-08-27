'use client'
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/client';
import { signOut } from '@/services/AuthService';
import { Main } from '@/components/containers/Main';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { ErrorMessage } from '@/components/elements/ErrorMessage';
import { ActionButton } from '@/components/buttons/ActionButton';

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
        // maybeSingle, e nao single: o auth.users desta instancia e
        // compartilhado com outros projetinhos e os perfis daqui sao criados
        // a mao, entao "tem JWT mas nao e jogador" e um estado esperado.
        // Com single() o PostgREST devolve 406 nesse caso, o que parece um
        // bug de request quando na verdade e so ausencia de perfil.
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, id_auth, name, coins, is_dev, user_cards(id_card, quantity)')
            .eq('id_auth', data.user.id)
            .maybeSingle();
        if(userError){
            setError(userError);
            router.push('/');
            return;
        }
        if(!userData){
            setError({ message: 'Esta conta não tem perfil de jogador em O Jogo.' });
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
        // Sem perfil de jogador nao ha para onde navegar: a sessao continua
        // valida, entao voltar para '/' so traria de volta para ca. A saida
        // e encerrar a sessao, pelo mesmo signOut que o Header usa.
        return (
            <Main>
                <div className='flex flex-col items-center gap-4 pt-8'>
                    <ErrorMessage error={error ?? { message: 'Não foi possível carregar o usuário.' }} />
                    <ActionButton text='Sair'
                        width='200px'
                        action={async () => {
                            await signOut();
                            router.replace('/');
                            router.refresh();
                        }}
                    />
                </div>
            </Main>
        );
    }
    return (
        // `isDev` sai da coluna o_jogo.users.is_dev, e nao de uma env var: a
        // mesma verdade precisa servir a UI agora e a RPC depois, quando a
        // partida for para o banco. Aqui ela so decide o que aparece na tela —
        // os poderes do solo rodam em memoria e nao valem autorizacao nenhuma.
        <UserContext.Provider value={{ user, refreshUser, isDev: Boolean(user.is_dev) }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => useContext(UserContext);