'use client'
import { ICONS } from '@/assets/icons';
import { Modal } from '@/components/containers/Modal';
import { MatchLog } from './MatchLog';

/**
 * O log da mesa, sob um botao.
 *
 * Ele flutuava sobre o feltro, e ali brigava com a coisa que a partida mais
 * precisa mostrar: a roda e a carta em jogo. Quem bebeu quantos shots e
 * consulta — se lê quando alguem duvida do placar — e nao acompanhamento
 * continuo. Fica guardado, e abre inteiro quando pedido.
 */
export function MatchLogModal({ state, onClose }){
    return (
        <Modal onClose={onClose} label='O que aconteceu'>
            <div className='flex flex-col gap-2.5 w-full px-4 py-4 panel'>
                <h2 className='text-base font-bold text-center'>
                    O que aconteceu
                </h2>
                {/* Sem limite aqui: o modal e justamente o lugar de ver o
                    historico inteiro, rolando. */}
                <MatchLog state={state} limit={200} />
            </div>
        </Modal>
    );
}

/** O botao que abre o log, no canto da mesa. */
export function MatchLogButton({ onClick }){
    return (
        <button type='button'
            onClick={onClick}
            aria-label='Ver o que aconteceu na mesa'
            className={`
                flex items-center justify-center
                h-9 w-9 rounded-xl text-lg
                border border-line bg-base/70 text-cream-dim
                transition-transform active:scale-95
                focus:outline-none focus-visible:ring-2
                focus-visible:ring-brand-light
            `}
        >
            <ICONS.list />
        </button>
    );
}
