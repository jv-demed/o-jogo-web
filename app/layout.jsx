import '@/styles/globals.css';

export const metadata = {
    title: 'O JOGO',
    description: 'O maior jogo de todos os tempos.',
    // manifest: '/manifest.json', 
    appleWebAppCapable: 'yes',
    appleWebAppStatusBarStyle: 'black-translucent',
    themeColor: '#000000',
};

export const viewport = {
    width: 'device-width',      
    initialScale: 1,            
    maximumScale: 1,            
    userScalable: 'no',        
    viewportFit: 'cover',      
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