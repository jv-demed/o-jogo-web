import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Rotas acessiveis sem sessao. Todo o resto vive em app/(auth) e exige login.
const PUBLIC_PATHS = ['/'];

function isPublicPath(pathname){
    return PUBLIC_PATHS.includes(pathname);
}

export async function updateSession(request){

    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(URL, ANON_KEY, {
        cookies: {
            getAll(){
                return request.cookies.getAll()
            },
            setAll(cookiesToSet){
                cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                supabaseResponse = NextResponse.next({
                    request,
                })
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                )
            },
        },
    })

    const {data: { user }} = await supabase.auth.getUser();

    if(!user && !isPublicPath(request.nextUrl.pathname)){
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}