import { UserProvider } from '@/providers/UserProvider';
import { ImmersiveProvider } from '@/providers/ImmersiveProvider';

export default function AuthLayout({ children }){
    return(
        <UserProvider>
            {/* O ImmersiveProvider e quem monta o Header e declara --header-h,
                a altura que o Main desconta da tela para nao gerar scroll de
                pagina. Na partida ele apaga os dois. */}
            <ImmersiveProvider>
                {children}
            </ImmersiveProvider>
        </UserProvider>
    );
}
