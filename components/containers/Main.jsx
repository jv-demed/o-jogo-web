export function Main({ children }){
    return (
        <main className={`
            flex flex-col items-center
            min-h-[100vh] px-[4%] py-5
            text-[#e2d4b8] font-[verdana]
            bg-[#212121] 
        `}>
            {children}
        </main>
    )
}