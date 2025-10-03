'use client'
import { ICONS } from '@/assets/icons';

export function Modal({ isOpen, onClose, children }) {
    if (!isOpen) return null;

    return (
        <div className={`
            fixed inset-0 bg-black/50 px-4
            flex items-center justify-center z-50
        `}>
            <div className={`
                flex justify-center items-center
                bg-[#212121] text-[#e2d4b8] 
                rounded-2xl p-6 max-w-lg w-full 
                relative shadow-xl
            `}>
                <button onClick={onClose} 
                    className={`
                        absolute top-3 right-3 
                        text-2xl hover:text-red-400    
                    `}
                >
                    <ICONS.close />
                </button>
                {children}
            </div>
        </div>
    );
}