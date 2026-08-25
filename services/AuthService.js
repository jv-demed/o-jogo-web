'use server'
import { createClient } from '@/supabase/server';

export async function login(user){
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(user);
    if(error){
        console.log(error);
        return { 
            success: false, 
            status: error.status,
            message: error.message 
        };
    }
    return { 
        success: true
    };
}

// Encerrar sessao mora aqui, e nao inline nas telas: o signOut do servidor
// revoga o refresh token e limpa os cookies na mesma resposta. Feito so no
// browser, o cookie continuaria sendo reescrito pelo auto-refresh do client.
export async function signOut(){
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if(error){
        return {
            success: false,
            status: error.status,
            message: error.message
        };
    }
    return {
        success: true
    };
}
