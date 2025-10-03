'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/services/AuthService';
import { ICONS } from '@/assets/icons';
import { Box } from '@/components/containers/Box';
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

    async function handleSubmit(){
        setError();
        await login(auth).then(res => {
            if(res.success){
                router.push('/home');
            } else {
                setError(res);
            }
        });
    }

    return (
        <Main>
            <Box>
                <Form>
                    <TextInput name='E-mail' 
                        type='email'
                        value={auth.email}
                        setValue={e => setAuth({...auth, email: e})}
                    />
                    <PasswordInput name='Senha' 
                        value={auth.password}
                        setValue={e => setAuth({...auth, password: e})}
                    />
                    <Actions>
                        <ActionButton text='Entrar' 
                            type='submit'
                            icon={ICONS.login}
                            action={handleSubmit}
                        />
                    </Actions>
                    {error && <ErrorMessage 
                        error={error}
                    />}
                </Form>
            </Box>
        </Main>
    );
}