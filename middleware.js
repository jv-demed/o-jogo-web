import { updateSession } from '@/supabase/middleware';

export async function middleware(req){
    const response = await updateSession(req);
    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ]
}