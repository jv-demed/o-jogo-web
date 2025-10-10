'use client'
import { ICONS } from '@/assets/icons';
import { Card } from '@/components/cards/Card';

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
                <header className='flex justify-end w-full'>
                    <button onClick={() => setSelectedCardIndex(null)} 
                        className={` text-4xl hover:text-red-400`}
                    >
                        <ICONS.close />
                    </button>
                </header>
                <div className='flex items-center gap-1'>
                    <ICONS.chevronBack className='text-3xl' 
                        onClick={() => {
                            if(selectedCardIndex > 0) {
                                setSelectedCardIndex(selectedCardIndex - 1);
                            }
                        }}
                    />
                    <Card card={cards[selectedCardIndex]} />
                    <ICONS.chevronForward className='text-3xl'
                        onClick={() => {
                            if(selectedCardIndex < cards.length - 1) {
                                setSelectedCardIndex(selectedCardIndex + 1);
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}