'use client'
import { ICONS } from '@/assets/icons';
import { Card } from '@/components/cards/Card';
import { Modal } from '@/components/containers/Modal';
import { ActionButton } from '@/components/buttons/ActionButton';

/**
 * O que fazer com a carta que voce tocou na mao.
 *
 * O toque curto jogava a carta na hora. Num jogo de texto isso e uma armadilha:
 * a mao esta a 0.38 de escala, onde nao se le nada, e o unico jeito de ler
 * antes era descobrir o toque longo — um gesto que ninguem ve. Uma jogada
 * irreversivel nao pode depender de um gesto escondido.
 *
 * Entao o toque abre esta gaveta: jogar continua a um toque de distancia (e o
 * primeiro botao, na cor da acao), e ler passa a ser uma opcao visivel. O toque
 * longo continua valendo e continua indo direto para a lupa — quem ja aprendeu
 * o atalho nao paga por ele.
 *
 * Carta bloqueada tambem abre: saber o que voce *nao* pode jogar agora e
 * informacao de jogo, e aqui ela vem escrita, sem o botao de jogar.
 */
export function CardActionModal({ card, isPlayable, isReaction, onPlay, onInspect, onClose }){

    return (
        <Modal onClose={onClose} label={card.name}>
            <div className='flex flex-col items-center gap-3 w-full px-4 py-4 panel'>
                <div className='overflow-hidden rounded-lg border border-line'>
                    <Card card={card} scale={0.3} />
                </div>

                <header className='flex flex-col items-center gap-0.5 text-center'>
                    <h2 className='text-[1rem] font-bold text-cream'>
                        {card.name}
                    </h2>
                    {!isPlayable && <p className='text-xs text-cream-dim'>
                        Não dá para jogar esta carta agora.
                    </p>}
                </header>

                <div className='flex flex-col gap-2 w-full'>
                    {isPlayable && <ActionButton
                        text={isReaction ? 'Reagir com esta carta' : 'Jogar carta'}
                        variant='gold'
                        icon={ICONS.play}
                        action={onPlay}
                    />}
                    <ActionButton text='Ver detalhes'
                        variant='secondary'
                        icon={ICONS.eye}
                        action={onInspect}
                    />
                </div>
            </div>
        </Modal>
    );
}
