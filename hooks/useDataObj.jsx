'use client'

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabase/client';

export function useDataObj({
    table,
    select = '*',
    filter
}){

    const [obj, setObj] = useState();
    const [flag, setFlag] = useState(false);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(() => {
        setFlag(prev => !prev);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try{
                let query = supabase.from(table).select(select);
                if(filter){
                    query = filter(query);
                }
                query.limit(1);
                const { data, error } = await query;
                if(error) throw error;
                setObj(data[0]);
            }catch(err){
                console.log(err.message);
            }finally{
                setLoading(false);
            }
        };
        fetchData();
    }, [flag]);

    return { obj, loading, refresh };
}