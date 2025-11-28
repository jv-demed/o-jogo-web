'use client'
import { ICONS } from '@/assets/icons';
import { CardNavigation } from '@/components/cards/CardNavigation';

export function CardDetailsModal({ 
    cards,
    selectedCardIndex,
    setSelectedCardIndex
}) {

    if (selectedCardIndex == null) return null;

    return (
        <div className={`
            fixed inset-0 bg-black/60 px-4
            flex items-center justify-center z-50
        `}>
            <div className={`
                flex flex-col justify-center items-center gap-2
                px-6 py-1 max-w-lg w-full 
                relative shadow-xl
            `}>
                <header onClick={() => setSelectedCardIndex(null)}
                    className='flex justify-end w-full' 
                >
                    <button className={` text-4xl hover:text-red-400`}>
                        <ICONS.close />
                    </button>
                </header>
                <CardNavigation 
                    cards={cards}
                    index={selectedCardIndex}
                    setIndex={setSelectedCardIndex}
                />
            </div>
        </div>
    );
}