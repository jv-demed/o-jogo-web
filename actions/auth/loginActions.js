'use server'

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/supabase/server';

export async function login(user){
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(user);
    if(error){
        console.log(error);
        return error.status;
    }
    revalidatePath('/home', 'layout');
    redirect('/home');
}