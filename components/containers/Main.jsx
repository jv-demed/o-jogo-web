export function Main({ 
    children,
    between = false
}){
    return (
        <main className={`
            flex flex-col items-center gap-4
            max-h-[100vh] min-h-[100vh] px-[4%]
            text-[#e2d4b8] font-[verdana]
            bg-[#212121] 
            ${between ? 'justify-between' : 'justify-start'}
        `}>
            {children}
        </main>
    )
}