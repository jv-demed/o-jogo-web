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
