'use client'
import { useState } from 'react';
import { useUser } from '@/providers/UserProvider';
import { PACKS } from '@/assets/packs';
import { CARDS } from '@/assets/cards';
import { Main } from '@/components/containers/Main';
import { CardForm } from '@/components/cards/CardForm';
import { PageHeader } from '@/components/elements/PageHeader';
import { PackDetailsModal } from '@/components/cards/PackDetailsModal';
import Image from 'next/image';

export default function StorePage(){

    const { user, refreshUser } = useUser();

    const [selectedPack, setSelectedPack] = useState(null);

    return (
        <Main>
            <PageHeader title='Loja' />  
            <ul className={`
                flex flex-col gap-y-6 
                pt-2 pb-6 w-full
                overflow-y-auto overflow-x-hidden 
                scrollbar-custom pr-1
            `}>
                {PACKS.map(pack => (
                    <li key={`pack-${pack.id}`}>
                        <div className='flex flex-col items-center gap-0.5'
                            onClick={() => setSelectedPack(pack)}
                        >
                            <CardForm factor={0.40}>
                                <Image
                                    className='object-contain rounded'
                                    src={`/packs/${pack.id}.png`}
                                    alt={pack.name}
                                    width={300}
                                    height={480}
                                />
                            </CardForm>
                            <span className='text-gray-400 text-sm text-wrap'>
                                {pack.name}
                            </span>
                        </div>
                    </li>
                ))} 
            </ul>
            <PackDetailsModal 
                user={user}
                refresh={refreshUser}
                pack={selectedPack}
                onClose={() => setSelectedPack(null)} 
            />
        </Main>
    );
}