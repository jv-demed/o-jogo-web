'use client'
import { ICONS } from '@/assets/icons';
import { missionCard } from '@/assets/missions';
import { Modal } from '@/components/containers/Modal';
import { Card } from '@/components/cards/Card';
import { MISSIONS, goalText } from '@/domain/match/missions';
import { cardName } from './narrate';

/**
 * A sua missao, sob demanda.
 *
 * Ela ocupava uma faixa fixa no topo da partida, e faixa fixa e altura que a
 * mesa nao tem: a missao e uma frase que voce le uma vez e confere de vez em
 * quando, nao uma informacao que muda a cada jogada. Aqui ela vira um botao do
 * tamanho de um icone ao lado da acao, e a carta inteira abre quando voce pede.
 *
 * Carta e nao paragrafo porque a missao *e* uma carta: mesma moldura, mesma
 * arte, mesmo lugar do texto. Quem vira a sua no comeco da partida ja sabe ler
 * a dos outros quando uma for revelada.
 *
 * Quando uma carta troca a sua meta (`goalChangedBy`, ex.: a 5 faz o Sauzburg
 * querer menos shots), a carta da missao continua impressa com o objetivo de
 * origem — e o aviso em cima dela diz o que vale agora e por causa de quem.
 * So voce ve: a mesa nao sabe que foi voce, e e a carta ficar na mesa, e nao
 * na sua cadeira, que garante isso.
 */
export function MissionModal({ player, onClose }){

    const mission = MISSIONS[player.mission];
    const card = missionCard(mission.id);
    const changedBy = player.goalChangedBy ?? null;

    return (
        <Modal onClose={onClose} label={`Missão: ${mission.name}`}>
            <span className='text-[0.65rem] uppercase tracking-wide text-cream-dim'>
                Sua missão
            </span>

            {changedBy !== null && <div className={`
                flex items-start gap-2.5 w-full
                px-3 py-2.5 rounded-2xl
                border border-gold/40 bg-gold/10
            `}>
                <span className='shrink-0 mt-0.5 text-lg text-gold'>
                    <ICONS.warning />
                </span>
                <div className='flex flex-col gap-0.5 min-w-0'>
                    <span className='text-[0.65rem] font-semibold uppercase tracking-wide text-gold'>
                        Objetivo alterado por {cardName(changedBy)}
                    </span>
                    <p className='text-sm font-semibold text-cream'>
                        {goalText(player)}
                    </p>
                </div>
            </div>}

            {/* Missao sem carta no catalogo ainda tem regra: cai no texto, que
                e o que a apuracao usa. Some a arte, nao a informacao. */}
            {card
                ? <div className={changedBy !== null ? 'opacity-60' : ''}>
                    <Card card={card} />
                </div>
                : <div className={`
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
                    <h2 className='text-lg font-bold'>{mission.name}</h2>
                    <p className='text-sm text-cream-dim'>{goalText(player)}</p>
                </div>}
            <p className='text-[0.65rem] text-cream-dim/70'>
                Só você vê isto — até a apuração.
            </p>
        </Modal>
    );
}

/**
 * O botao que abre o modal: fica ao lado do botao de acao, na altura dele.
 *
 * `changed` acende a exclamacao: a meta foi trocada por carta e o dono precisa
 * saber sem ter de abrir a missao a cada jogada para conferir.
 */
export function MissionButton({ onClick, changed = false }){
    return (
        <button type='button'
            onClick={onClick}
            aria-label={changed ? 'Ver sua missão (objetivo alterado)' : 'Ver sua missão'}
            className={`
                relative flex items-center justify-center shrink-0
                h-12 w-12 rounded-xl text-xl
                border border-brand-light/40 bg-brand/15 text-brand-light
                transition-transform active:scale-95
                focus:outline-none focus-visible:ring-2
                focus-visible:ring-brand-light
            `}
        >
            <ICONS.investigation />
            {changed && <span aria-hidden='true' className={`
                absolute -top-1.5 -right-1.5
                flex items-center justify-center
                h-5 w-5 rounded-full
                border-2 border-base bg-gold
                text-[0.7rem] font-black leading-none text-[var(--color-base)]
            `}>
                !
            </span>}
        </button>
    );
}
