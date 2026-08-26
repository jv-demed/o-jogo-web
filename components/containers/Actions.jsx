export function Actions({
    children,
    justifyContent = 'justify-end',
}){
    return (
        <div className={`
            flex gap-2.5 ${justifyContent}
            w-full pt-3 mt-1 border-t border-line
        `}
        >
            {children}
        </div>
    )
}
