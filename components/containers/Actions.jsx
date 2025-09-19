export function Actions({ 
    children,
    justifyContent = 'justify-end', 
}){
    return (
        <div className={`
            flex gap-2.5 ${justifyContent}
            w-full pt-2.5 border-t border-t-gray-500
        `}
        >
            {children}
        </div>
    )
}