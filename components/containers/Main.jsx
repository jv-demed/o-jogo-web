export function Main({ 
    children,
    between = false,
    style = {}
}){
    // A altura util e a tela menos o cabecalho. Quem tem Header (o grupo
    // (auth)) declara --header-h no layout; o login nao declara e cai no 0px
    // do fallback. Antes o Main pedia 100dvh nos dois casos e a pagina
    // autenticada ficava 40px mais alta que a tela, com um scroll do body que
    // brigava com o scroll interno das listas.
    return (
        <main style={style}
            className={`
                flex flex-col items-center gap-4
                min-h-[calc(100dvh-var(--header-h,0px))]
                max-h-[calc(100dvh-var(--header-h,0px))]
                px-4 pb-[max(1rem,env(safe-area-inset-bottom))]
                w-full max-w-[480px] mx-auto
                text-cream overflow-x-hidden
                ${between ? 'justify-between' : 'justify-start'}
            `}
        >
            {children}
        </main>
    )
}
