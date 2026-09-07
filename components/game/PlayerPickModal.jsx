'use client'
import { ICONS } from '@/assets/icons';
import { Avatar } from '@/components/elements/Avatar';
import { Modal } from '@/components/containers/Modal';
import { ActionButton } from '@/components/buttons/ActionButton';
import { promptText, cardName } from './narrate';

/**
 * Escolher quem sofre a carta.
 *
 * As cadeiras na mesa continuam clicaveis, mas nao podem ser o unico caminho:
 * elas sao pequenas, ficam em volta de uma elipse e algumas encostam na borda
 * da tela. A escolha que decide a carta merece o centro e uma lista — nome,
 * shots e cartas na mao lado a lado, que e por isso que se escolhe um e nao
 * outro.
 *
 * Fecha sem responder de proposito: quem quiser conferir a mesa antes fecha,
 * olha, e o botao de acao reabre com a selecao intacta.
 */
export function PlayerPickModal({
    request,
    state,
    you,
    selected,
    onSelect,
    onConfirm,
    onClose
}){

    const candidates = request.candidates ?? state.players.map(player => player.id);

    const done = request.upTo
        ? selected.length > 0 && selected.length <= request.count
        : selected.length === request.count;

    return (
        <Modal onClose={onClose} label={promptText(request)}>
            <div className='flex flex-col gap-3 w-full px-4 py-4 panel'>
                <header className='flex flex-col items-center gap-1 text-center'>
                    <h2 className='text-[1rem] font-bold text-cream'>
                        {promptText(request)}
                    </h2>
                    {request.idCard && <p className='text-xs text-cream-dim'>
                        {cardName(request.idCard)}
                    </p>}
                </header>

                <ul className='flex flex-col gap-1.5'>
                    {candidates.map(id => {
                        const player = state.players.find(p => p.id === id);
                        if(!player) return null;
                        const isOn = selected.includes(id);
                        return (
                            <li key={id}>
                                <button type='button'
                                    onClick={() => onSelect(id)}
                                    aria-pressed={isOn}
                                    className={`
                                        flex items-center gap-2.5 w-full
                                        px-3 py-2.5 rounded-2xl border text-left
                                        transition-transform active:scale-[0.99]
                                        ${isOn
                                            ? 'border-gold bg-gold/15'
                                            : 'border-line bg-elevated'}
                                    `}
                                >
                                    {/* A foto do perfil, e o visto por cima
                                        dela: quem escolhe procura a pessoa, e
                                        trocar a foto pelo visto tirava da lista
                                        justamente quem ja esta marcado. */}
                                    <span className='relative shrink-0'>
                                        <Avatar id={player.avatar} size={32}
                                            className={isOn ? 'ring-2 ring-gold/70' : ''}
                                        />
                                        {isOn && <span className={`
                                            absolute -right-1 -bottom-0.5
                                            flex items-center justify-center
                                            h-4 w-4 rounded-full text-[0.5rem]
                                            border border-gold/60 bg-gold text-base
                                        `}>
                                            <ICONS.check />
                                        </span>}
                                    </span>

                                    <span className='flex-1 min-w-0 text-sm font-semibold text-cream truncate'>
                                        {id === you.id ? 'Você' : player.name}
                                    </span>

                                    <span className='flex items-center gap-1 shrink-0'>
                                        <span className={`
                                            flex items-center gap-0.5
                                            px-1.5 py-0.5 rounded-lg
                                            border border-gold/30 bg-gold/10
                                            text-[0.7rem] font-semibold tabular-nums text-gold
                                        `}>
                                            <ICONS.shot />
                                            {player.shots}
                                        </span>
                                        <span className={`
                                            flex items-center gap-0.5
                                            px-1.5 py-0.5 rounded-lg
                                            border border-line bg-surface
                                            text-[0.7rem] tabular-nums text-cream-dim
                                        `}>
                                            <ICONS.deck />
                                            {player.hand.length}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <p className='text-center text-[0.7rem] text-cream-dim'>
                    {request.upTo
                        ? `Até ${request.count} — ${selected.length} escolhido(s).`
                        : `${selected.length} de ${request.count} escolhido(s).`}
                </p>

                <ActionButton text='Confirmar'
                    variant='gold'
                    disabled={!done}
                    action={onConfirm}
                />
            </div>
        </Modal>
    );
}
