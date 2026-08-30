'use client'
import { ICONS } from '@/assets/icons';
import { Command } from '@/domain/match/engine';
import { ActionButton } from '@/components/buttons/ActionButton';
import { cardName } from './narrate';

/**
 * O que a carta manda fazer e o jogo nao sabe fazer: cantar a musiquinha, dizer
 * a frase, apresentar a carta inventada.
 *
 * Irmao do `DrinkPrompt`, e pela mesma razao: e uma regra que acontece na mesa
 * de verdade, entao a partida para ate a pessoa dizer que cumpriu. A diferenca
 * e a ordem — o ritual vem *antes* do shot. Na carta 3 e o ponto todo dela: se
 * o shot descesse primeiro, a musiquinha viraria enfeite cantado depois do
 * fato.
 *
 * A instrucao aparece igual para a mesa inteira, e nao so para quem tem que
 * cumprir: ritual e coisa que se faz na frente dos outros — os outros sao a
 * plateia, e plateia precisa saber o que esta assistindo. Botao, so quem canta.
 */
export function RitualPrompt({ entries, players, dispatch, playerId }){

    // Um ritual por vez, na ordem em que a carta pediu.
    const entry = entries[0];
    if(!entry) return null;

    const isMine = entry.playerId === playerId;
    const name = players?.find(player => player.id === entry.playerId)?.name ?? 'alguem';

    return (
        <div role={isMine ? 'alertdialog' : 'status'}
            aria-modal={isMine ? 'true' : undefined}
            aria-label={entry.text}
            aria-live='polite'
            className={`
                fixed inset-0 z-50
                flex flex-col items-center justify-center gap-4 px-6
                bg-black/85 backdrop-blur-sm animate-fade-in
            `}
        >
            <span className={`
                flex items-center justify-center
                h-20 w-20 rounded-full text-4xl
                border border-gold/60 bg-gold/15 text-gold
                animate-sheet-up
            `}>
                <ICONS.star />
            </span>

            <div className='flex flex-col items-center gap-1 text-center'>
                <h2 className='text-2xl font-bold text-cream'>
                    {entry.text}
                </h2>
                {entry.idCard && <p className='text-xs text-cream-dim'>
                    {cardName(entry.idCard)}
                </p>}
                {/* Quem cumpre le uma cobranca; a plateia le quem esta devendo
                    ela. O shot so aparece depois — dizer isso aqui e o que faz
                    a ordem parecer ordem, e nao uma tela a mais no caminho. */}
                <p className='pt-1 text-[0.7rem] text-cream-dim/80'>
                    {isMine
                        ? 'A partida está parada esperando você. O shot vem depois.'
                        : `${name} tem que cumprir antes do shot. A mesa é a plateia.`}
                </p>
            </div>

            <div className='w-full max-w-[280px]'>
                {isMine
                    ? <ActionButton text='Feito'
                        variant='gold'
                        icon={ICONS.check}
                        action={() => dispatch({ type: Command.performed, playerId })}
                    />
                    : <ActionButton text={`Esperando ${name}`}
                        variant='secondary'
                        disabled
                    />}
            </div>
        </div>
    );
}
