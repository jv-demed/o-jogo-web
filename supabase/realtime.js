import { supabase } from '@/supabase/client';

export function getRealtime({ name, table, callback }){
    return supabase.channel(name).on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: table 
    }, callback).subscribe();   
}

export function removeChannel(channel){
    supabase.removeChannel(channel);
}
