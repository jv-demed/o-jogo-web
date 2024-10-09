'use client'

import { useState } from 'react';
import { login } from '@/actions/auth/loginActions';
import { ICONS } from '@/assets/icons';
import { Box } from '@/components/boxes/Box';
import { Main } from '@/components/boxes/Main';
import { Form } from '@/components/boxes/Form';
import { Actions } from '@/components/boxes/Actions';
import { TextInput } from '@/components/inputs/TextInput';
import { ActionButton } from '@/components/buttons/ActionButton';
import { ErrorMessage } from '@/components/elements/ErrorMessage';
import { PasswordInput } from '@/components/inputs/PasswordInput';

export default function Login(){

    const [error, setError] = useState();
    const [auth, setAuth] = useState({
        email: '',
        password: ''
    });

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
                        <ActionButton name='Entrar' 
                            type='submit'
                            icon={ICONS.login}
                            action={async () => {
                                setError();
                                await login(auth).then(res => setError(res));
                            }}
                        />
                    </Actions>
                    {error == 400 && <ErrorMessage 
                        message='Credenciais inválidas'
                    />}
                </Form>
            </Box>
        </Main>
    );
}