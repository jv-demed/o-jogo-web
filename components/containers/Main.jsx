export function Main({ 
    children,
    between = false,
    style = {}
}){
    return (
        <main style={style}
            className={`
                flex flex-col items-center gap-4
                max-h-[100vh] min-h-[100vh] px-[4%]
                text-[#e2d4b8] font-[verdana]
                ${between ? 'justify-between' : 'justify-start'}
                w-full max-w-[420px] mx-auto overflow-x-hidden
            `}
        >
            {children}
        </main>
    )
}