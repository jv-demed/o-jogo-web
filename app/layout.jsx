import { ThemeProvider } from '@/providers/ThemeProvider';
import '@/styles/globals.css';
import '@/styles/typography.css';

export const metadata = {
    title: 'O JOGO',
    description: 'O maior jogo de todos os tempos.',
};

export default function RootLayout({ children }){
    return (
        <html lang='pt-br'>
            <body>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}