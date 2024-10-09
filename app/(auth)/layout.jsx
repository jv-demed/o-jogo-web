import { UserProvider } from '@/providers/UserProvider';

export default function AuthLayout({ children }){
    return(
        <UserProvider>
            {children}
        </UserProvider>
    );
}