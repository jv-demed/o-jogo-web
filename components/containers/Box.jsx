export function Box({
    children,
    fullH,
    height
}){

    // O Main ja limita a largura em 480px e centraliza; o Box so precisa
    // ocupar o que sobrou. Antes ele media a tela com useMedia para fixar
    // 400px no desktop, o que dava um painel mais estreito que a pagina.
    //
    // fullH agora e flex-1: `height: 100%` valia 100% da altura do Main
    // inteiro, ignorando o PageHeader e o gap acima, e o painel vazava para
    // fora da tela.
    return (
        <div
            className={`
                flex flex-col gap-2.5
                px-4 py-4 w-full min-h-0
                panel
                overflow-y-auto overflow-x-hidden
                scrollbar-custom
                ${fullH ? 'flex-1' : ''}
            `}
            style={{ height: fullH ? undefined : height }}
        >
            {children}
        </div>
    )
}
