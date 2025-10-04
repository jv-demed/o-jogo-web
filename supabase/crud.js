import { supabase } from '@/supabase/client';

export async function insertRecord(table, obj){
    const { data, error } = await supabase.from(table).insert(obj);
    if(error) console.log(error);
    return data;
}