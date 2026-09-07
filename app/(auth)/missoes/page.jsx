'use client'
import { useState } from 'react';
import Image from 'next/image';
import { MISSION_CARDS } from '@/assets/missions';
import { ICONS } from '@/assets/icons';
import { Main } from '@/components/containers/Main';
import { PageHeader } from '@/components/elements/PageHeader';
import { MissionDetailsModal } from '@/components/cards/MissionDetailsModal';

/**
 * As sete missoes, abertas.
 *
 * Nao ha o que esconder aqui, e e de proposito: a missao e secreta *na mesa*,
 * nao no jogo. Quem senta sem saber que existe alguem jogando para perder nao
 * esta jogando no escuro, esta jogando sem as regras — a graca do Swelcows e
 * saber que ele pode estar ali, nao descobrir na apuracao que ele existia.
 *
 * Por isso a lista tambem nao tem cadeado nem progresso, ao contrario da
 * colecao: missao nao se compra nem se possui.
 */
export default function Missoes(){

    const [selectedIndex, setSelectedIndex] = useState(null);

    return (
        <Main>
            <PageHeader title='Missões' />

            <p className='shrink-0 w-full text-xs text-cream-dim'>
                Cada jogador recebe uma no começo da partida, e ninguém vê a dos
                outros até a apuração. Toque para abrir a carta.
            </p>

            <ul className={`
                flex flex-col gap-2
                flex-1 min-h-0 pb-4 w-full
                overflow-y-auto scrollbar-custom
            `}>
                {MISSION_CARDS.map((mission, index) => (
                    <li key={mission.id}>
                        <button type='button'
                            onClick={() => setSelectedIndex(index)}
                            className={`
                                flex items-center gap-3
                                px-3 py-2.5 w-full rounded-2xl
                                border border-brand-light/25 bg-surface
                                text-left transition-transform
                                active:scale-[0.99]
                                focus:outline-none focus-visible:ring-2
                                focus-visible:ring-brand-light
                            `}
                        >
                            <Image src={mission.art}
                                alt=''
                                width={44}
                                height={44}
                                sizes='44px'
                                className={`
                                    shrink-0 h-11 w-11 rounded-xl object-cover
                                    border border-line
                                `}
                            />
                            <span className='flex flex-col min-w-0 flex-1'>
                                <span className='font-semibold truncate'>
                                    {mission.name}
                                </span>
                                {/* O objetivo, e nao o texto da carta: aqui a
                                    linha e uma so, e o que a pessoa esta
                                    comparando entre as sete e a condicao de
                                    vitoria. O sabor esta na carta, a um toque. */}
                                <span className='text-xs text-cream-dim truncate'>
                                    {mission.objective}
                                </span>
                            </span>
                            <span className='shrink-0 text-cream-dim'>
                                <ICONS.chevronForward />
                            </span>
                        </button>
                    </li>
                ))}
            </ul>

            <MissionDetailsModal
                missions={MISSION_CARDS}
                selectedIndex={selectedIndex}
                setSelectedIndex={setSelectedIndex}
            />
        </Main>
    );
}
