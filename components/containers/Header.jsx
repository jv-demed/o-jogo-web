'use client'
import { useUser } from '@/providers/UserProvider';

export function Header() {

    const { user } = useUser(); 

    return (
        <header className={`
            flex items-center justify-between
            h-10 px-[5%]
            bg-[#1b5b82] text-[#e2d4b8]
        `}>
            <span>
                {user.name}
            </span>
            <span>
                Coins: {user.coins}
            </span>
        </header>
    )
}