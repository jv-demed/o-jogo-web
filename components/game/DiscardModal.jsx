'use client'
import { Card } from '@/components/cards/Card';
import { Modal } from '@/components/containers/Modal';
import { cardById } from './narrate';

/**
 * O que ja foi usado, e por quem.
 *
 * A pilha do centro mostra so a folha de cima, e num jogo em que a decisao e
 * "ainda existe um cancelamento na mesa?" a folha de cima nao responde nada. O
 * toque na pilha abre o monte inteiro, com o dono de cada carta ao lado dela.
 *
 * O descarte vive por jogador no estado (cada um tem o proprio baralho), e nao
 * ha um registro de quem descartou primeiro: a lista sai agrupada por dono, na
 * ordem da mesa, e nao numa cronologia que o motor nao guarda.
 */
export function DiscardModal({ state, you, onClose }){

    const piles = state.order
        .map(id => state.players.find(player => player.id === id))
        .filter(player => player?.discard.length)
        .map(player => ({
            player,
            // O mais recente primeiro: e a carta que acabou de sair de jogo que
            // faz alguem abrir isto.
            cards: [...player.discard].reverse()
        }));

    const total = piles.reduce((sum, pile) => sum + pile.cards.length, 0);

    return (
        <Modal onClose={onClose} label='Cartas já usadas'>
            <div className='flex flex-col gap-3 w-full px-4 py-4 panel'>
                <header className='flex flex-col items-center gap-0.5 text-center'>
                    <h2 className='text-base font-bold'>Cartas já usadas</h2>
                    <p className='text-[0.7rem] text-cream-dim'>
                        {total > 0
                            ? `${total} carta${total === 1 ? '' : 's'} no descarte da mesa.`
                            : 'Ninguém descartou nada ainda.'}
                    </p>
                </header>

                {piles.map(({ player, cards }) => (
                    <section key={player.id} className='flex flex-col gap-1.5'>
                        <span className='text-xs font-semibold text-cream-dim'>
                            {player.id === you.id ? 'Você' : player.name}
                            <span className='ml-1 tabular-nums text-cream-dim/60'>
                                ({cards.length})
                            </span>
                        </span>
                        <div className='flex flex-wrap gap-1.5'>
                            {cards.map((idCard, index) => {
                                const card = cardById(idCard);
                                if(!card) return null;
                                return (
                                    // A mesma carta pode ter sido usada duas
                                    // vezes: a chave leva o indice junto.
                                    <div key={`${idCard}:${index}`}
                                        className='overflow-hidden rounded-md border border-line'
                                    >
                                        <Card card={card} scale={0.24} />
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        </Modal>
    );
}
