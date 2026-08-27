'use client'
import { useRef } from 'react';
import { ICONS } from '@/assets/icons';
import { Card } from '@/components/cards/Card';
import { useRevealScale } from './PlayReveal';
import { cardById, ongoingDuration, ongoingEffectText } from './narrate';

/**
 * O efeito prolongado cobrando, no comeco da vez de quem sofre.
 *
 * A carta ficou parada na cadeira desde que foi jogada e agora cobra sozinha,
 * antes da compra. Aqui a carta *aparece* — ao contrario do anuncio da jogada,
 * onde o alvo ja tinha sido apontado e a carta so ocupava a tela: passados tres
 * turnos, ninguem lembra qual era a carta parada ali, e a arte e o jeito mais
 * rapido de lembrar.
 *
 * Menor que o anuncio da jogada, e de proposito: ninguem tem decisao a tomar
 * aqui. Nao ha janela, nao ha o que cancelar — e um aviso do que ja aconteceu,
 * e ele sai da tela sozinho.
 */
export function TurnEffectReveal({ trigger, players, you }){

    const boxRef = useRef(null);
    // Teto de 0,55: a carta e ilustracao do aviso, nao a leitura da mesa.
    const scale = useRevealScale(boxRef, 150, 0.55);

    const card = trigger ? cardById(trigger.idCard) : null;
    if(!card) return null;

    const player = players.find(p => p.id === trigger.playerId);
    const name = trigger.playerId === you?.id ? 'Você' : player?.name;
    const phrase = ongoingEffectText(trigger.idCard);
    // A contagem se le conforme o timing: `onTargetTurn` conta as vezes do
    // alvo, o resto conta turnos de mesa.
    const left = ongoingDuration({
        turnsLeft: trigger.turnsLeft,
        timing: trigger.timing
    });

    return (
        <div ref={boxRef}
            role='status'
            aria-label={`${name ?? 'Alguém'}: ${card.name} cobrou`}
            className={`
                absolute inset-0 z-20
                flex flex-col items-center justify-center gap-2
                bg-black/70 backdrop-blur-[2px]
                pointer-events-none animate-fade-in
            `}
        >
            <div className='flex items-center gap-2'>
                <span className={`
                    flex items-center justify-center
                    h-8 w-8 rounded-full text-sm
                    border border-gold/60 bg-gold/20 text-gold
                `}>
                    <ICONS.user />
                </span>
                <span className='text-base font-bold text-cream'>{name}</span>
            </div>

            <div className={`
                rounded-xl overflow-hidden animate-sheet-up
                shadow-[0_18px_44px_-16px_rgba(0,0,0,0.95)]
            `}>
                <Card card={card} scale={scale} />
            </div>

            <div className='flex flex-col items-center gap-1 max-w-[19rem] px-3'>
                {phrase && <p className='text-center text-sm font-semibold text-cream'>
                    {phrase}
                </p>}
                {/* Quanto ainda falta e a metade que a carta nao tem escrita: o
                    prazo mora no estado, e e ele que diz se isto foi a ultima
                    cobranca. */}
                {trigger.turnsLeft !== null && trigger.turnsLeft !== undefined
                    && <p className='text-[0.7rem] text-cream-dim'>
                        {trigger.turnsLeft > 0
                            ? `Ainda vale por ${left}.`
                            : 'Era a última — a carta vai para o descarte.'}
                    </p>}
            </div>
        </div>
    );
}
