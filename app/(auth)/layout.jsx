import { UserProvider } from '@/providers/UserProvider';
import { Header } from '@/components/containers/Header';

export default function AuthLayout({ children }){
    return(
        <UserProvider>
            <Header />
            {children}
        </UserProvider>
    );
}