import { ICONS } from '@/assets/icons';
import { Actions } from '@/components/boxes/Actions';
import { Box } from '@/components/boxes/Box';
import { Form } from '@/components/boxes/Form';
import { Main } from '@/components/boxes/Main';
import { ActionButton } from '@/components/buttons/ActionButton';
import { PasswordInput } from '@/components/inputs/PasswordInput';
import { TextInput } from '@/components/inputs/TextInput';

export default function Home(){
    return (
        <Main>
            <Box>
                <Form>
                    <TextInput name='E-mail' />
                    <PasswordInput name='Senha' />
                    <Actions>
                        <ActionButton name='Entrar' 
                            type='submit'
                            icon={{obj: ICONS.login}}
                        />
                    </Actions>
                </Form>
            </Box>
        </Main>
    );
}