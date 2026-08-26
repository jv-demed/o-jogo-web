export function Opponent({ player }){
    return (
        <div className={`
            flex items-center justify-center
            h-10 min-w-[4.5rem] max-w-[7rem] px-3
            rounded-full border border-line bg-elevated
            text-xs text-center truncate
        `}>
            {player.name}
        </div>
    );
}
