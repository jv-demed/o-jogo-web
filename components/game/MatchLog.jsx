import { narrate } from './narrate';

/**
 * A narracao da mesa, do mais recente para o mais antigo.
 *
 * Num jogo em que o bot joga sozinho e a carta resolve depois de uma espera, o
 * log e o que responde "o que acabou de acontecer?". Sem ele, a unica pista de
 * que alguem bebeu e um numero mudando de canto.
 */
export function MatchLog({ state, limit = 14 }){

    const nameOf = id => state.players.find(player => player.id === id)?.name;

    const lines = state.log
        .map((entry, index) => ({ index, text: narrate(entry, nameOf) }))
        .filter(line => line.text)
        .slice(-limit)
        .reverse();

    if(lines.length === 0){
        return (
            <p className='text-center text-[0.7rem] text-cream-dim/60'>
                A partida começou.
            </p>
        );
    }

    return (
        <ul className='flex flex-col gap-1'>
            {lines.map((line, position) => (
                <li key={line.index}
                    className={`
                        text-[0.7rem] leading-snug
                        ${position === 0 ? 'text-cream' : 'text-cream-dim/70'}
                    `}
                >
                    {line.text}
                </li>
            ))}
        </ul>
    );
}
