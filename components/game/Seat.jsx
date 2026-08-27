import { ICONS } from '@/assets/icons';
import { Card } from '@/components/cards/Card';
import { cardById, missionName } from './narrate';

/**
 * Um lugar na mesa.
 *
 * Mostra so o que a mesa realmente enxerga: nome, shots bebidos, quantas cartas
 * restam no baralho dele e a missao *se* ela foi revelada. Missao secreta
 * continua secreta — o estado da partida tem `mission` de todo mundo porque o
 * motor precisa dela, e vazar isso na tela seria acabar com o jogo.
 *
 * E estreito de proposito: sao ate sete lugares em volta da pilha, numa tela de
 * celular. O que nao cabe em duas linhas nao entra.
 */
export function Seat({
    player,
    ongoing = [],
    isYou,
    reveal,
    isCurrent,
    isSelectable,
    isSelected,
    onSelect,
    onOpenOngoing,
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
                {/* O baralho, e nao a mao: o fim da partida vem quando um
                    baralho acaba, entao este numero e um relogio. Quantas
                    cartas o outro segura nao muda decisao nenhuma — ninguem
                    sabe *quais* sao. */}
                <span className={`
                    flex items-center gap-0.5
                    px-1.5 py-0.5 rounded-lg
                    border border-line bg-elevated
                    text-[0.65rem] tabular-nums
                    ${player.deck.length === 0 ? 'text-danger' : 'text-cream-dim'}
                `}>
                    <ICONS.deck />
                    {player.deck.length}
                </span>
            </span>

            {/* A area de efeitos prolongados deste jogador: as cartas que
                resolveram mas continuam valendo sobre ele ficam aqui, e nao no
                descarte. Empilhadas porque varias podem estar ativas ao mesmo
                tempo — e o numero diz quantas sao quando a pilha nao cabe. */}
            {ongoing.length > 0 && <OngoingPile
                entries={ongoing}
                name={isYou ? 'você' : player.name}
                // Cadeira selecionavel ja e um <button>, e botao dentro de
                // botao nao existe: durante uma escolha a pilha vira so
                // informacao, e volta a abrir quando a pergunta passar.
                canOpen={!isSelectable && Boolean(onOpenOngoing)}
                onOpen={() => onOpenOngoing?.(player.id)}
            />}

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

/**
 * A pilha de cartas ativas na cadeira.
 *
 * Sao cartas de verdade, e nao um icone com contador: e a mesma coisa que
 * acontece na mesa fisica, a carta parada na frente de quem esta sofrendo o
 * efeito. Tres folhas de cada vez, tortas, dao o volume de pilha sem virar uma
 * fileira que empurra a cadeira para cima da vizinha.
 */
function OngoingPile({ entries, name, canOpen, onOpen }){

    const Root = canOpen ? 'button' : 'span';
    // As tres ultimas: a de cima e a que entrou por ultimo, como numa pilha.
    const top = entries.slice(-3).map(entry => cardById(entry.idCard)).filter(Boolean);
    if(top.length === 0) return null;

    return (
        <Root
            {...(canOpen && {
                type: 'button',
                onClick: onOpen,
                'aria-label': `Ver os ${entries.length} efeito(s) ativo(s) em ${name}`
            })}
            className={`
                relative block h-[3.4rem] w-[2.4rem] shrink-0
                ${canOpen ? `
                    transition-transform active:scale-95
                    focus:outline-none focus-visible:ring-2
                    focus-visible:ring-gold rounded-md
                ` : ''}
            `}
        >
            {top.map((card, i) => (
                <span key={`${card.id}-${i}`}
                    style={{
                        transform: `rotate(${(i - 1) * 6}deg) translateY(${i * -2}px)`,
                        zIndex: i
                    }}
                    className={`
                        absolute inset-0 overflow-hidden rounded-md
                        border border-gold/40
                        shadow-[0_4px_10px_-6px_rgba(0,0,0,0.9)]
                    `}
                >
                    <Card card={card} scale={0.128} />
                </span>
            ))}

            <span className={`
                absolute -right-1.5 -top-1.5 z-10
                flex items-center justify-center
                h-4 min-w-4 px-1 rounded-full
                border border-gold/50 bg-base
                text-[0.55rem] font-semibold tabular-nums text-gold
            `}>
                {entries.length}
            </span>
        </Root>
    );
}
