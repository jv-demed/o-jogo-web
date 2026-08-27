'use client'
import { ICONS } from '@/assets/icons';
import { Card } from '@/components/cards/Card';
import { Modal } from '@/components/containers/Modal';
import { ongoingFor } from '@/domain/match/state';
import { cardById, ongoingDuration, ongoingTiming } from './narrate';

/**
 * O que ainda esta pesando sobre um jogador.
 *
 * Carta de efeito prolongado nao vai para o descarte quando resolve: ela fica
 * na area do jogador que sofre o efeito, na mesa, e e de la que ela cobra a
 * cada turno. Na cadeira cabe uma pilha e um numero — tres cartas empilhadas a
 * 40px nao dizem *quais* nem por quanto tempo, e e exatamente isso que decide a
 * jogada de quem esta olhando. Por isso a pilha abre aqui.
 *
 * Uma carta por linha, com o prazo em destaque: a arte identifica, o texto
 * explica o efeito e o rodape diz quanto falta — que e a unica parte que muda
 * de turno para turno e que nao esta escrita em lugar nenhum na carta.
 */
export function OngoingModal({ state, you, playerId, onClose, onInspect }){

    const player = state.players.find(p => p.id === playerId);
    if(!player) return null;

    const isYou = player.id === you.id;
    const name = isYou ? 'você' : player.name;
    const entries = ongoingFor(state, playerId);

    return (
        <Modal onClose={onClose} label={`Efeitos ativos em ${name}`}>
            <div className='flex flex-col gap-3 w-full px-4 py-4 panel'>
                <header className='flex flex-col items-center gap-0.5 text-center'>
                    <h2 className='text-[1rem] font-bold text-cream'>
                        Efeitos em {isYou ? 'você' : player.name}
                    </h2>
                    <p className='text-xs text-cream-dim'>
                        {entries.length > 0
                            ? `${entries.length} carta(s) ainda valendo na mesa.`
                            : 'Nada valendo por aqui.'}
                    </p>
                </header>

                <ul className='flex flex-col gap-2'>
                    {entries.map(ongoing => {
                        const card = cardById(ongoing.idCard);
                        if(!card) return null;
                        const source = state.players.find(p => p.id === ongoing.sourceId);
                        return (
                            <li key={ongoing.id}
                                className={`
                                    flex items-center gap-2.5
                                    px-2.5 py-2 rounded-2xl
                                    border border-line bg-elevated
                                `}
                            >
                                <button type='button'
                                    onClick={() => onInspect?.(card)}
                                    aria-label={`Ver ${card.name}`}
                                    className={`
                                        shrink-0 overflow-hidden rounded-md
                                        border border-line
                                        transition-transform active:scale-95
                                        focus:outline-none focus-visible:ring-2
                                        focus-visible:ring-cream
                                    `}
                                >
                                    <Card card={card} scale={0.16} />
                                </button>

                                <div className='flex flex-col gap-1 min-w-0 flex-1'>
                                    <span className='truncate text-sm font-semibold text-cream'>
                                        {card.name}
                                    </span>
                                    <span className='truncate text-[0.7rem] text-cream-dim'>
                                        {ongoingTiming(ongoing, isYou ? 'você' : player.name)}
                                        {source && ` · de ${source.id === you.id ? 'você' : source.name}`}
                                    </span>
                                    <span className={`
                                        self-start flex items-center gap-1
                                        px-1.5 py-0.5 rounded-lg
                                        border border-gold/30 bg-gold/10
                                        text-[0.65rem] font-semibold text-gold
                                    `}>
                                        <ICONS.history />
                                        {ongoingDuration(ongoing)}
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </Modal>
    );
}
