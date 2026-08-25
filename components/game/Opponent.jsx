export function Opponent({ player }){
    return (
        <div className={`
            flex items-center justify-center
            h-10 w-[70px] px-1
            rounded border border-white
            text-xs text-center truncate
        `}>
            {player.name}
        </div>
    );
}
