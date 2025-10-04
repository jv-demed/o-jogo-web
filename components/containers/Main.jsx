export function Main({ 
    children,
    between = false
}){
    return (
        <main className={`
            flex flex-col items-center gap-4
            min-h-[100vh] px-[4%] py-5
            text-[#e2d4b8] font-[verdana]
            bg-[#212121] 
            ${between ? 'justify-between' : 'justify-start'}
        `}>
            {children}
        </main>
    )
}