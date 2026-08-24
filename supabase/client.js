import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// db.schema: todas as tabelas do jogo vivem no schema o_jogo, e nao no
// public, que e compartilhado com os outros projetinhos desta instancia.
// Exige o schema listado em API Settings > Exposed schemas no painel.
const OPTIONS = { db: { schema: 'o_jogo' } };

function createClient() {
    return createBrowserClient(URL, ANON_KEY, OPTIONS);
}

export const supabase = createClient();