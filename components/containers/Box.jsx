export function Box({ children, fullH }){
    return (
        <div className={`
            flex flex-col gap-2.5
            px-5 py-10 w-full
            bg-[#171717]
            rounded-2xl
            ${fullH && 'grow-1 h-full'}
        `}>
            {children}
        </div>
    )
}