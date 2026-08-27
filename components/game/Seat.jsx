import { ICONS } from '@/assets/icons';
import { missionName } from './narrate';

/**
 * Um lugar na mesa.
 *
 * Mostra so o que a mesa realmente enxerga: nome, shots bebidos, quantas cartas
 * tem na mao e a missao *se* ela foi revelada. Missao secreta continua secreta —
 * o estado da partida tem `mission` de todo mundo porque o motor precisa dela,
 * e vazar isso na tela seria acabar com o jogo.
 *
 * E estreito de proposito: sao ate sete lugares em volta da pilha, numa tela de
 * celular. O que nao cabe em duas linhas nao entra.
 */
export function Seat({
    player,
    isYou,
    reveal,
    isCurrent,
    isSelectable,
    isSelected,
    onSelect,
    style
}){

    const Root = isSelectable ? 'button' : 'div';

    return (
        <Root
            style={style}
            {...(isSelectable && {
                type: 'button',
                onClick: () => onSelect(player.id),
                'aria-pressed': isSelected
            })}
            className={`
                absolute -translate-x-1/2 -translate-y-1/2
                flex flex-col items-center gap-1
                w-[5.5rem] px-1.5 py-1.5 rounded-2xl
                border transition-transform
                ${isSelected
                    ? 'border-gold bg-gold/10 ring-2 ring-gold/40'
                    : isCurrent
                        ? 'border-brand-light bg-brand/15'
                        : 'border-line bg-base/85'}
                ${isSelectable ? 'cursor-pointer active:scale-95' : ''}
                ${player.out ? 'opacity-40' : ''}
            `}
        >
            {/* A vez e a informacao mais volatil da mesa: ganha o marcador no
                lugar fixo, em vez de mudar a cor do nome. */}
            <span className={`
                flex items-center justify-center
                h-8 w-8 rounded-full text-xs
                border ${isCurrent
                    ? 'border-brand-light/60 bg-brand/30 text-brand-light'
                    : 'border-line bg-elevated text-cream-dim'}
            `}>
                {isCurrent ? <ICONS.play /> : <ICONS.user />}
            </span>

            <span className='max-w-full truncate text-[0.7rem] font-semibold leading-tight'>
                {isYou ? 'Você' : player.name}
            </span>

            <span className='flex items-center gap-1'>
                <span className={`
                    flex items-center gap-0.5
                    px-1.5 py-0.5 rounded-lg
                    border border-gold/30 bg-gold/10
                    text-[0.65rem] font-semibold tabular-nums text-gold
                `}>
                    <ICONS.shot />
                    {player.shots}
                </span>
                <span className={`
                    flex items-center gap-0.5
                    px-1.5 py-0.5 rounded-lg
                    border border-line bg-elevated
                    text-[0.65rem] tabular-nums text-cream-dim
                `}>
                    <ICONS.deck />
                    {player.hand.length}
                </span>
            </span>

            {player.equipment.length > 0 && <span className={`
                flex items-center gap-0.5
                px-1.5 py-0.5 rounded-lg
                border border-line bg-elevated
                text-[0.65rem] text-cream-dim
            `}>
                <ICONS.equip />
                {player.equipment.length}
            </span>}

            {/* A missao revelada e informacao de mesa; a mesma linha em
                tracejado dourado e a ferramenta de dev espiando por cima do
                jogo. Precisam ser distinguiveis de relance: o que voce ve
                trapaceando nao pode parecer o que a mesa ve. */}
            {player.missionRevealed
                ? <span className='max-w-full truncate text-[0.6rem] text-brand-light'>
                    {missionName(player.mission)}
                </span>
                : reveal && <span className={`
                    max-w-full truncate px-1 rounded
                    border border-dashed border-gold/50
                    text-[0.6rem] text-gold
                `}>
                    {missionName(player.mission)}
                </span>}
        </Root>
    );
}
