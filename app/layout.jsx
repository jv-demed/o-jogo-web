import '@/styles/globals.css';

export const metadata = {
    title: 'O JOGO',
    description: 'O maior jogo de todos os tempos.',
};

export default function RootLayout({ children }){
    return (
        <html lang='pt-br'>
            <body>
                {children}
            </body>
        </html>
    );
}