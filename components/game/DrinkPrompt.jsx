'use client'
import { ICONS } from '@/assets/icons';
import { Command } from '@/domain/match/engine';
import { ActionButton } from '@/components/buttons/ActionButton';
import { cardName } from './narrate';

/**
 * O shot que voce tem que beber, e o botao que diz que voce bebeu.
 *
 * A unica parte deste jogo que acontece fora da tela. O contador ja subiu — a
 * regra e do motor —, mas a partida fica parada aqui ate a mesa confirmar, o
 * que e o mesmo que a mesa de verdade faz: ninguem joga a proxima carta com o
 * copo cheio na frente de alguem.
 *
 * Nao e um `Modal`: modal fecha no Esc, no toque fora e num X no canto, e as
 * tres saidas estao erradas aqui. Este aviso tem uma saida so, e ela e beber —
 * por isso ele intercepta o toque (ao contrario dos anuncios da mesa, que sao
 * `pointer-events-none`) e cobre a tela inteira, inclusive a mao.
 */
export function DrinkPrompt({ entries, dispatch, playerId }){

    // Uma cobranca por vez, na ordem em que aconteceram. Duas cartas que
    // mandaram beber sao dois shots e dois "bebi" — somar os dois num aviso so
    // faria a mesa esperar uma confirmacao por duas bebidas.
    const entry = entries.find(item => item.playerId === playerId);
    if(!entry) return null;

    const total = entry.amount;
    const from = entry.idCard;
    const queued = entries.filter(item => item.playerId === playerId).length;

    return (
        <div role='alertdialog'
            aria-modal='true'
            aria-label={`Beba ${total} shot(s)`}
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
                <ICONS.shot />
            </span>

            <div className='flex flex-col items-center gap-1 text-center'>
                <h2 className='text-2xl font-bold text-cream'>
                    {total === 1 ? 'Beba 1 shot' : `Beba ${total} shots`}
                </h2>
                {from && <p className='text-xs text-cream-dim'>
                    {cardName(from)}
                </p>}
                {/* Dizer que a mesa parou e o que evita o toque apressado: o
                    botao nao e "ok, entendi", e "ok, bebi". */}
                <p className='pt-1 text-[0.7rem] text-cream-dim/80'>
                    A partida está parada esperando você.
                    {queued > 1 && ` Ainda vêm mais ${queued - 1}.`}
                </p>
            </div>

            <div className='w-full max-w-[280px]'>
                <ActionButton text='Bebi'
                    variant='gold'
                    icon={ICONS.check}
                    action={() => dispatch({ type: Command.drank, playerId })}
                />
            </div>
        </div>
    );
}
