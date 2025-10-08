import { supabase } from '@/supabase/client';

export async function insertRecord(table, obj){
    const { data, error } = await supabase
        .from(table)
        .insert(obj)
        .select('*');
    if(error) console.log(error);
    return data[0];
}

export async function updateRecord(table, id, updatedObj) {
    const { data, error } = await supabase
        .from(table)
        .update(updatedObj)
        .eq('id', id)
        .select('*');
    if(error) console.log(error);
    return data;
}