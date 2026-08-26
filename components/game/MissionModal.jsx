'use client'
import { ICONS } from '@/assets/icons';
import { Modal } from '@/components/containers/Modal';

/**
 * A sua missao, sob demanda.
 *
 * Ela ocupava uma faixa fixa no topo da partida, e faixa fixa e altura que a
 * mesa nao tem: a missao e uma frase que voce le uma vez e confere de vez em
 * quando, nao uma informacao que muda a cada jogada. Aqui ela vira um botao do
 * tamanho de um icone ao lado da acao, e o texto inteiro abre quando voce pede.
 */
export function MissionModal({ mission, onClose }){
    return (
        <Modal onClose={onClose} label={`Missão: ${mission.name}`}>
            <div className={`
                flex flex-col items-center gap-2.5
                w-full px-4 py-5 panel text-center
            `}>
                <span className={`
                    flex items-center justify-center
                    h-12 w-12 rounded-2xl text-xl
                    border border-brand-light/40 bg-brand/15 text-brand-light
                `}>
                    <ICONS.investigation />
                </span>
                <span className='text-[0.65rem] uppercase tracking-wide text-cream-dim'>
                    Sua missão
                </span>
                <h2 className='text-lg font-bold'>{mission.name}</h2>
                <p className='text-sm text-cream-dim'>{mission.text}</p>
                <p className='text-[0.65rem] text-cream-dim/70'>
                    Só você vê isto — até a apuração.
                </p>
            </div>
        </Modal>
    );
}

/** O botao que abre o modal: fica ao lado do botao de acao, na altura dele. */
export function MissionButton({ onClick }){
    return (
        <button type='button'
            onClick={onClick}
            aria-label='Ver sua missão'
            className={`
                flex items-center justify-center shrink-0
                h-12 w-12 rounded-xl text-xl
                border border-brand-light/40 bg-brand/15 text-brand-light
                transition-transform active:scale-95
                focus:outline-none focus-visible:ring-2
                focus-visible:ring-brand-light
            `}
        >
            <ICONS.investigation />
        </button>
    );
}
