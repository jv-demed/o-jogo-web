'use client'
import Image from 'next/image';
import { useState } from 'react';
import { useUser } from '@/providers/UserProvider';
import { PACKS } from '@/assets/packs';
import { ICONS } from '@/assets/icons';
import { Main } from '@/components/containers/Main';
import { PageHeader } from '@/components/elements/PageHeader';
import { PackDetailsModal } from '@/components/cards/PackDetailsModal';

// Lancamento mais recente primeiro. Trocar por (a - b) para ordem cronologica.
const ORDERED_PACKS = [...PACKS].sort((a, b) => b.dateRelease - a.dateRelease);

export default function StorePage(){

    const { user, refreshUser } = useUser();

    const [selectedPack, setSelectedPack] = useState(null);

    return (
        <Main>
            <PageHeader title='Loja' />
            {/* Cada pack e uma linha com arte a esquerda e preco a direita:
                no formato anterior (arte centralizada, nome embaixo) cabia
                pouco mais de um pack por tela e o preco so aparecia depois de
                abrir o modal. */}
            <ul className={`
                flex flex-col gap-3
                flex-1 min-h-0 pt-1 pb-6 w-full
                overflow-y-auto overflow-x-hidden
                scrollbar-custom
            `}>
                {ORDERED_PACKS.map(pack => {
                    const canAfford = user.coins >= pack.price;
                    return (
                        <li key={`pack-${pack.id}`}>
                            <button type='button'
                                aria-label={pack.name}
                                onClick={() => setSelectedPack(pack)}
                                className={`
                                    flex items-center gap-3.5
                                    w-full p-3 panel text-left
                                    transition-transform active:scale-[0.98]
                                    focus:outline-none focus-visible:ring-2
                                    focus-visible:ring-brand-light
                                `}
                            >
                                <span className={`
                                    relative shrink-0 block
                                    h-[104px] w-[68px] rounded-lg overflow-hidden
                                    border border-line bg-elevated
                                `}>
                                    <Image
                                        className='object-cover'
                                        src={`/packs/${pack.id}.webp`}
                                        alt={pack.name}
                                        fill
                                        sizes='68px'
                                        quality={85}
                                    />
                                </span>
                                <span className='flex flex-col gap-1.5 min-w-0 flex-1'>
                                    <span className='font-semibold leading-tight'>
                                        {pack.name}
                                    </span>
                                    <span className='text-xs text-cream-dim'>
                                        {pack.quantity} cartas por pacote
                                    </span>
                                    <span className={`
                                        flex items-center gap-1.5 mt-1 w-fit
                                        px-2.5 py-1 rounded-full
                                        text-xs font-semibold tabular-nums
                                        ${canAfford
                                            ? 'border border-gold/30 bg-gold/10 text-gold'
                                            : 'border border-line bg-elevated text-cream-dim'}
                                    `}>
                                        <ICONS.coins />
                                        {pack.price}
                                    </span>
                                </span>
                                <span className='shrink-0 text-cream-dim'>
                                    <ICONS.chevronForward />
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            <PackDetailsModal
                refresh={refreshUser}
                pack={selectedPack}
                onClose={() => setSelectedPack(null)}
            />
        </Main>
    );
}
