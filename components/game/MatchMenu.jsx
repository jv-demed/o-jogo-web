'use client'
import { ICONS } from '@/assets/icons';
import { Modal } from '@/components/containers/Modal';
import { ActionButton } from '@/components/buttons/ActionButton';

/**
 * O menu da partida.
 *
 * Era um X solto no canto da mesa, e um X so tem um significado possivel: sair
 * agora. Como botao unico ele e perigoso (fica do lado de onde se toca a mesa)
 * e limitado — nao ha onde por a proxima coisa que a partida precisar oferecer.
 * O sanduiche resolve os dois: abre, mostra o que da para fazer, e a saida
 * passa a exigir um segundo toque.
 */
export function MatchMenu({ onLeave, onClose }){
    return (
        <Modal onClose={onClose} label='Menu da partida'>
            <div className='flex flex-col gap-3 w-full px-4 py-5 panel'>
                <h2 className='text-base font-bold text-center'>Menu</h2>
                <p className='text-[0.7rem] text-cream-dim text-center'>
                    Sair encerra a partida: nada aqui é salvo.
                </p>
                <ActionButton text='Sair da partida'
                    variant='danger'
                    icon={ICONS.logout}
                    action={onLeave}
                />
                <ActionButton text='Voltar ao jogo'
                    variant='secondary'
                    action={onClose}
                />
            </div>
        </Modal>
    );
}

/** O sanduiche, no canto da mesa. */
export function MatchMenuButton({ onClick }){
    return (
        <button type='button'
            onClick={onClick}
            aria-label='Abrir o menu da partida'
            className={`
                flex items-center justify-center
                h-9 w-9 rounded-xl text-lg
                border border-line bg-base/70 text-cream-dim
                transition-transform active:scale-95
                focus:outline-none focus-visible:ring-2
                focus-visible:ring-brand-light
            `}
        >
            <ICONS.menu />
        </button>
    );
}
