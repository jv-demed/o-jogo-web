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
            <p className='text-center text-xs text-cream-dim'>
                A partida começou.
            </p>
        );
    }

    return (
        <ul className='flex flex-col gap-1'>
            {lines.map((line, position) => (
                <li key={line.index}
                    // Nada de opacidade nas linhas antigas: o log e para ser
                    // lido, e cream-dim ja e o degrau de contraste. Duas linhas
                    // de cinza uma sobre a outra viravam sombra no painel.
                    className={`
                        text-[0.8rem] leading-snug
                        ${position === 0 ? 'text-cream' : 'text-cream-dim'}
                    `}
                >
                    {line.text}
                </li>
            ))}
        </ul>
    );
}
