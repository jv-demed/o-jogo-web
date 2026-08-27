'use client'
import { Card } from '@/components/cards/Card';
import { useLongPress } from '@/hooks/useLongPress';
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
 *
 * Toque curto abre a gaveta da carta (`onChoose`, ver CardActionModal), onde
 * jogar e ler ficam lado a lado; toque longo vai direto para a carta inteira
 * (`onInspect`), que e o atalho de quem ja sabe o que tem na mao. Nesta escala
 * o texto da carta nao se le, e jogar no primeiro toque era jogar sem ler.
 *
 * Carta bloqueada abre a gaveta do mesmo jeito: saber o que voce *nao* pode
 * jogar agora e informacao de jogo.
 */
export function Hand({
    cards,
    playable = [],
    onChoose,
    onInspect,
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
                if(!card) return null;
                return (
                    // A chave leva o indice junto: a mesma carta pode aparecer
                    // duas vezes na mao, e so o id faria React reusar o no.
                    <HandCard key={`${idCard}:${index}`}
                        card={card}
                        scale={scale}
                        isPlayable={playable.includes(idCard)}
                        onChoose={() => onChoose(card)}
                        onInspect={() => onInspect?.(card)}
                    />
                );
            })}
        </div>
    );
}

function HandCard({ card, scale, isPlayable, onChoose, onInspect }){

    const longPress = useLongPress(onInspect);

    return (
        <div {...longPress}
            className={`
                shrink-0 transition-[opacity,transform]
                ${isPlayable ? '' : 'opacity-40 saturate-50'}
            `}
        >
            <Card card={card}
                scale={scale}
                onClick={onChoose}
            />
        </div>
    );
}
