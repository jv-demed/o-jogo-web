import { UserProvider } from '@/providers/UserProvider';
import { Header } from '@/components/containers/Header';

export default function AuthLayout({ children }){
    return(
        <UserProvider>
            {/* --header-h e a altura do Header; o Main desconta esse valor da
                altura da tela para nao gerar scroll de pagina. */}
            <div className='[--header-h:3.5rem]'>
                <Header />
                {children}
            </div>
        </UserProvider>
    );
}
