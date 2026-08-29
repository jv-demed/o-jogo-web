'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/services/AuthService';
import { ICONS } from '@/assets/icons';
import { Main } from '@/components/containers/Main';
import { Form } from '@/components/containers/Form';
import { Actions } from '@/components/containers/Actions';
import { TextInput } from '@/components/inputs/TextInput';
import { ActionButton } from '@/components/buttons/ActionButton';
import { ErrorMessage } from '@/components/elements/ErrorMessage';
import { PasswordInput } from '@/components/inputs/PasswordInput';

export default function LoginPage(){

    const router = useRouter();

    const [error, setError] = useState();
    const [auth, setAuth] = useState({
        email: '',
        password: ''
    });

    /**
     * Para onde ir depois de entrar.
     *
     * O middleware poe o destino em `?next=` quando manda para ca quem nao
     * estava logado — e assim que o link de uma sala sobrevive ao login. Lido
     * so na hora do clique, e nao por `useSearchParams`, para esta pagina
     * continuar podendo ser gerada estaticamente.
     *
     * A conferencia nao e preciosismo: `next` vem da URL, e qualquer um
     * consegue escrever uma. Aceitar so caminho absoluto deste site — e barrar
     * `//outro.site`, que o browser leria como host — e o que impede o link de
     * login virar redirecionamento para fora.
     */
    function destination(){
        const next = new URLSearchParams(window.location.search).get('next');
        const isInternal = next?.startsWith('/') && !next.startsWith('//');
        return isInternal ? next : '/home';
    }

    async function handleSubmit(){
        setError();
        await login(auth).then(res => {
            if(res.success){
                router.push(destination());
            } else {
                setError(res);
            }
        });
    }

    return (
        <Main between>
            <section className={`
                flex flex-col items-center gap-2
                w-full pt-14 pb-8
                animate-fade-rise
            `}>
                <span className={`
                    flex items-center justify-center
                    h-16 w-16 rounded-2xl mb-2
                    border border-brand-light/40
                    bg-linear-to-b from-brand-light to-brand
                    shadow-lg shadow-brand/30
                    text-2xl
                `}>
                    <ICONS.shot />
                </span>
                <h1 className={`
                    text-4xl font-black tracking-[0.2em]
                    text-cream
                `}>
                    O JOGO
                </h1>
                <p className='text-sm text-cream-dim tracking-wide'>
                    O maior jogo de todos os tempos.
                </p>
            </section>

            <div className='w-full panel p-5 animate-fade-rise'>
                <Form onSubmit={handleSubmit}>
                    <TextInput name='E-mail'
                        type='email'
                        placeholder='voce@email.com'
                        value={auth.email}
                        setValue={e => setAuth({...auth, email: e})}
                        icon={ICONS.user}
                    />
                    <PasswordInput name='Senha'
                        placeholder='••••••••'
                        value={auth.password}
                        setValue={e => setAuth({...auth, password: e})}
                        icon={ICONS.lock}
                    />
                    {error && <ErrorMessage
                        error={error}
                    />}
                    <Actions justifyContent='justify-center'>
                        <ActionButton text='Entrar'
                            type='submit'
                            icon={ICONS.login}
                        />
                    </Actions>
                </Form>
            </div>

            <footer className='py-6 text-xs text-cream-dim/70'>
                Beba com responsabilidade.
            </footer>
        </Main>
    );
}
