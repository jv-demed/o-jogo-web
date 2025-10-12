export function CardForm({ 
    children,
    factor = 1
}) {
    return (
        <div 
            className={`
                flex items-center justify-center
                bg-gray-700 rounded
            `}
            style={{ 
                width: 300*factor, 
                height: 440*factor 
            }}
        >
            {children}
        </div>
    )
}