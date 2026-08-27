import { ICONS } from '@/assets/icons';
import { missionName } from './narrate';

/**
 * Um lugar na mesa.
 *
 * Mostra so o que a mesa realmente enxerga: nome, shots bebidos, quantas cartas
 * restam no baralho dele e a missao *se* ela foi revelada. Missao secreta
 * continua secreta — o estado da partida tem `mission` de todo mundo porque o
 * motor precisa dela, e vazar isso na tela seria acabar com o jogo.
 *
 * E estreito de proposito: sao ate seis lugares em volta da pilha, numa tela de
 * celular. O que nao cabe em duas linhas nao entra.
 *
 * So dos outros: voce nao senta na mesa. O seu par de numeros mora no rodape,
 * em `YouCorner`, colado na mao — a cadeira que voce mais consulta e a que
 * menos precisa de lugar no feltro.
 */
export function Seat({
    player,
    ongoing = [],
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
            <span className='relative'>
                <span className={`
                    flex items-center justify-center
                    h-8 w-8 rounded-full text-xs
                    border ${isCurrent
                        ? 'border-brand-light/60 bg-brand/30 text-brand-light'
                        : 'border-line bg-elevated text-cream-dim'}
                `}>
                    {isCurrent ? <ICONS.play /> : <ICONS.user />}
                </span>

                {/* Carta de efeito prolongado nao vai para o descarte: fica
                    valendo sobre este jogador. Aqui e so o aviso de que existe,
                    do tamanho de um contador e colado na foto — desenhar as
                    cartas na cadeira esticava o lugar para baixo, e sao ate
                    seis deles em volta do feltro. Qual carta, de quem veio e
                    quanto ainda falta abrem no toque, como no seu canto. */}
                {ongoing.length > 0 && <Ongoing
                    count={ongoing.length}
                    name={player.name}
                    className='absolute -right-2.5 -top-1'
                    // Cadeira selecionavel ja e um <button>, e botao dentro de
                    // botao nao existe: durante uma escolha o aviso vira so
                    // informacao, e volta a abrir quando a pergunta passar.
                    canOpen={!isSelectable && Boolean(onOpenOngoing)}
                    onOpen={() => onOpenOngoing?.(player.id)}
                />}
            </span>

            <span className='max-w-full truncate text-[0.7rem] font-semibold leading-tight'>
                {player.name}
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
 * O seu canto: bebida, baralho e o que esta ativo em voce.
 *
 * E a sua cadeira, so que fora do feltro — encostada na direita, logo acima do
 * botao de acao. Voce e o unico jogador que nao precisa ser *localizado* na
 * roda: a sua mao, a sua acao e os seus numeros sao a mesma regiao da tela, e a
 * cadeira no meio da mesa so tirava espaco de quem voce precisa olhar.
 *
 * Por isso e uma tira de badges, e nao a cadeira em miniatura: no rodape cada
 * linha disputa altura com a mao. Os mesmos numeros da cadeira, deitados — e
 * sem nome: dizer "Voce" em cima da sua propria mao e legendar o obvio.
 */
export function YouCorner({
    player,
    ongoing = [],
    isCurrent,
    isSelectable,
    isSelected,
    onSelect,
    onOpenOngoing
}){

    const Root = isSelectable ? 'button' : 'div';

    return (
        <Root
            {...(isSelectable && {
                type: 'button',
                onClick: () => onSelect(player.id),
                'aria-pressed': isSelected,
                'aria-label': 'Escolher você'
            })}
            className={`
                flex items-center gap-1.5 self-end shrink-0
                px-2 py-1 rounded-xl border
                ${isSelected
                    ? 'border-gold bg-gold/10 ring-2 ring-gold/40'
                    : isCurrent
                        ? 'border-brand-light/60 bg-brand/15'
                        : 'border-line bg-elevated/60'}
                ${isSelectable ? 'cursor-pointer active:scale-95 transition-transform' : ''}
            `}
        >
            <span className={`
                flex items-center gap-0.5
                px-1.5 py-0.5 rounded-lg
                border border-gold/30 bg-gold/10
                text-[0.65rem] font-semibold tabular-nums text-gold
            `}>
                <ICONS.shot />
                {player.shots}
            </span>

            {/* O baralho, como na cadeira dos outros: e ele que conta o fim da
                partida. A mao esta logo abaixo, contada carta a carta. */}
            <span className={`
                flex items-center gap-0.5
                px-1.5 py-0.5 rounded-lg
                border border-line bg-base
                text-[0.65rem] tabular-nums
                ${player.deck.length === 0 ? 'text-danger' : 'text-cream-dim'}
            `}>
                <ICONS.deck />
                {player.deck.length}
            </span>

            {player.equipment.length > 0 && <span className={`
                flex items-center gap-0.5
                px-1.5 py-0.5 rounded-lg
                border border-line bg-base
                text-[0.65rem] tabular-nums text-cream-dim
            `}>
                <ICONS.equip />
                {player.equipment.length}
            </span>}

            {/* Os efeitos ativos em voce viram contador, e nao a pilha de
                cartas da cadeira: aqui a altura de uma carta seria a altura que
                falta para a mao. O toque abre a mesma gaveta. */}
            {ongoing.length > 0 && <Ongoing
                count={ongoing.length}
                // Dentro de uma escolha o canto inteiro ja e um <button>, e
                // botao dentro de botao nao existe: a pilha vira so numero e
                // volta a abrir quando a pergunta passar.
                canOpen={!isSelectable && Boolean(onOpenOngoing)}
                onOpen={() => onOpenOngoing?.(player.id)}
            />}
        </Root>
    );
}

/**
 * O contador de efeitos prolongados. Serve ao seu canto e as cadeiras da mesa:
 * e a mesma informacao nos dois lugares, e o `className` so decide onde ele
 * pousa — no canto, deitado ao lado dos outros numeros; na cadeira, grudado no
 * canto da foto.
 */
function Ongoing({ count, name = 'você', className = '', canOpen, onOpen }){

    const Root = canOpen ? 'button' : 'span';

    return (
        <Root
            {...(canOpen && {
                type: 'button',
                onClick: onOpen,
                'aria-label': `Ver os ${count} efeito(s) ativo(s) em ${name}`
            })}
            className={`
                ${className}
                flex items-center gap-0.5
                px-1.5 py-0.5 rounded-lg
                border border-gold/40 bg-gold/10
                text-[0.65rem] font-semibold tabular-nums text-gold
                ${canOpen ? `
                    transition-transform active:scale-95
                    focus:outline-none focus-visible:ring-2
                    focus-visible:ring-gold
                ` : ''}
            `}
        >
            <ICONS.effect />
            {count}
        </Root>
    );
}
