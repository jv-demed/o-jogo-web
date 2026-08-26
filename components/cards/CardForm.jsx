export function CardForm({
    children,
    factor = 1
}) {
    return (
        <div
            className={`
                flex items-center justify-center
                rounded-md border border-dashed border-line
                bg-linear-to-b from-elevated to-surface
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
