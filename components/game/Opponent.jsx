import { ICONS } from '@/assets/icons';
import { missionName } from './narrate';

/**
 * Um adversario na mesa.
 *
 * Mostra so o que a mesa realmente enxerga: nome, shots bebidos, quantas cartas
 * tem na mao e a missao *se* ela foi revelada. Missao secreta continua secreta —
 * o estado da partida tem `mission` de todo mundo porque o motor precisa dela,
 * e vazar isso na tela seria acabar com o jogo.
 */
export function Opponent({
    player,
    isCurrent,
    isSelectable,
    isSelected,
    onSelect
}){

    const Root = isSelectable ? 'button' : 'div';

    return (
        <Root
            {...(isSelectable && {
                type: 'button',
                onClick: () => onSelect(player.id),
                'aria-pressed': isSelected
            })}
            className={`
                flex items-center gap-2.5
                w-full px-3 py-2 rounded-2xl
                border bg-base text-left
                transition-transform
                ${isSelected
                    ? 'border-gold ring-2 ring-gold/40'
                    : isCurrent
                        ? 'border-brand-light'
                        : 'border-line'}
                ${isSelectable ? 'cursor-pointer active:scale-[0.99]' : ''}
                ${player.out ? 'opacity-40' : ''}
            `}
        >
            {/* A vez e a informacao mais volatil da mesa: ganha o marcador da
                esquerda, no lugar fixo, em vez de mudar a cor do nome. */}
            <span className={`
                flex items-center justify-center shrink-0
                h-8 w-8 rounded-lg text-xs
                border ${isCurrent
                    ? 'border-brand-light/60 bg-brand/30 text-brand-light'
                    : 'border-line bg-elevated text-cream-dim'}
            `}>
                {isCurrent ? <ICONS.play /> : <ICONS.user />}
            </span>

            <span className='flex flex-col min-w-0 flex-1'>
                <span className='truncate text-sm font-semibold'>
                    {player.name}
                </span>
                <span className='text-[0.65rem] text-cream-dim truncate'>
                    {player.missionRevealed
                        ? missionName(player.mission)
                        : `${player.hand.length} na mão · ${player.deck.length} no baralho`}
                </span>
            </span>

            {player.equipment.length > 0 && <span className={`
                flex items-center gap-1 shrink-0
                px-1.5 py-0.5 rounded-lg
                border border-line bg-elevated
                text-[0.65rem] text-cream-dim
            `}>
                <ICONS.equip />
                {player.equipment.length}
            </span>}

            <span className={`
                flex items-center gap-1 shrink-0
                px-2 py-1 rounded-lg
                border border-gold/30 bg-gold/10
                text-xs font-semibold tabular-nums text-gold
            `}>
                <ICONS.shot />
                {player.shots}
            </span>
        </Root>
    );
}
