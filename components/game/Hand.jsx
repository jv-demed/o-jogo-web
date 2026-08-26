import { Card } from '@/components/cards/Card';
import { cardById } from './narrate';

/**
 * A mao do jogador, em fileira rolavel.
 *
 * A carta e a mesma `Card` da colecao, so que reduzida: manter um unico
 * componente de carta e o que garante que a carta na mao e a carta da loja sao
 * visivelmente a mesma coisa.
 *
 * `playable` e a lista de ids que podem ser jogados agora — na sua vez e a mao
 * toda, na janela de interferencia sao so as cartas de reacao. Quem decide isso
 * e a tela, com o que o motor respondeu; aqui so muda a aparencia.
 */
export function Hand({
    cards,
    playable = [],
    onPlay,
    scale = 0.42
}){

    if(cards.length === 0){
        return (
            <p className='py-6 text-center text-xs text-cream-dim'>
                Sua mão está vazia.
            </p>
        );
    }

    return (
        <div className={`
            flex gap-2 w-full
            overflow-x-auto overflow-y-hidden
            scrollbar-custom
            pb-1
        `}>
            {cards.map((idCard, index) => {
                const card = cardById(idCard);
                const isPlayable = playable.includes(idCard);
                if(!card) return null;
                return (
                    // A chave leva o indice junto: a mesma carta pode aparecer
                    // duas vezes na mao, e so o id faria React reusar o no.
                    <div key={`${idCard}:${index}`}
                        className={`
                            shrink-0 transition-[opacity,transform]
                            ${isPlayable ? '' : 'opacity-40 saturate-50'}
                        `}
                    >
                        <Card card={card}
                            scale={scale}
                            onClick={isPlayable ? () => onPlay(idCard) : undefined}
                        />
                    </div>
                );
            })}
        </div>
    );
}
