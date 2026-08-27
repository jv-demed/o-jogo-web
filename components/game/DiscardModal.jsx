'use client'
import { Card } from '@/components/cards/Card';
import { Modal } from '@/components/containers/Modal';
import { cardById } from './narrate';

/**
 * O que ja foi usado, e por quem.
 *
 * A pilha do centro mostra so a folha de cima, e num jogo em que a decisao e
 * "ainda existe um cancelamento na mesa?" a folha de cima nao responde nada. O
 * toque na pilha abre o monte inteiro.
 *
 * Uma grade de tres colunas, com o dono embaixo de cada carta. Antes era uma
 * secao por jogador, e a secao gastava uma linha de titulo para as vezes uma
 * carta so: com sete jogadores, o modal virava mais titulo do que carta.
 *
 * A ordem e a que a mesa viu: `state.discardPile` guarda o descarte em ordem
 * cronologica, e aqui ele vem invertido — a carta que acabou de cair primeiro,
 * que e a que faz alguem abrir isto. O `discard` de cada jogador continua
 * existindo (e dele que a carta volta para o baralho), mas ele nao sabe
 * *quando*, e sem isso a lista era so a ordem das cadeiras.
 */
export function DiscardModal({ state, you, onClose, onInspect }){

    const used = state.discardPile.map(({ idCard, playerId }, index) => {
        const player = state.players.find(p => p.id === playerId);
        return {
            key: `${index}:${idCard}`,
            card: cardById(idCard),
            owner: playerId === you.id ? 'Você' : player?.name ?? 'alguém'
        };
    }).filter(entry => entry.card).reverse();

    return (
        <Modal onClose={onClose} label='Cartas já usadas'>
            <div className='flex flex-col gap-3 w-full px-4 py-4 panel'>
                <header className='flex flex-col items-center gap-0.5 text-center'>
                    <h2 className='text-[1rem] font-bold text-cream'>
                        Cartas já usadas
                    </h2>
                    <p className='text-xs text-cream-dim'>
                        {used.length > 0
                            ? `${used.length} no descarte da mesa. Toque para ler.`
                            : 'Ninguém descartou nada ainda.'}
                    </p>
                </header>

                {used.length > 0 && <ul className='grid grid-cols-3 gap-x-2 gap-y-3'>
                    {used.map(({ key, card, owner }) => (
                        <li key={key} className='flex flex-col items-center gap-1'>
                            <button type='button'
                                onClick={() => onInspect?.(card)}
                                aria-label={`Ver ${card.name}`}
                                className={`
                                    overflow-hidden rounded-md border border-line
                                    transition-transform active:scale-95
                                    focus:outline-none focus-visible:ring-2
                                    focus-visible:ring-cream
                                `}
                            >
                                <Card card={card} scale={0.28} />
                            </button>
                            <span className='max-w-full truncate text-[0.65rem] text-cream-dim'>
                                {owner}
                            </span>
                        </li>
                    ))}
                </ul>}
            </div>
        </Modal>
    );
}
