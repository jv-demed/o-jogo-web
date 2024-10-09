import { supabase } from '@/supabase/client';


export async function getTable(table, select){
    const { data, error } = await supabase.from(table).select(select);
    if(error) console.log(error);
    return data;
}

export async function getRecordByFilter(table, select, where, value){
    const { data, error } = await supabase.from(table).select(select).eq(where, value);
    if(error){
        console.log(error);
        return null;
    }return data.length > 0 ? data[0] : null;
}

export async function insertRecord(table, obj){
    const { data, error } = await supabase.from(table).insert(obj);
    if(error) console.log(error);
    return data;
}

export async function updateRecord(table, obj, where, value){
    const { data, error } = await supabase.from(table).update(obj).eq(where, value);
    if(error) console.log(error);
    return data;
}

export async function generateId(table){
    const list = await getTable(table, 'id');
    return list.length != 0 ? list[list.length-1].id + 1 : 1;
}