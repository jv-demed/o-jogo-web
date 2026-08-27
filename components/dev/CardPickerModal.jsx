'use client'
import { useMemo, useState } from 'react';
import { CARDS } from '@/assets/cards';
import { Card } from '@/components/cards/Card';
import { Modal } from '@/components/containers/Modal';

/**
 * Escolher uma carta do catalogo, para as ferramentas de dev.
 *
 * O catalogo tem 116 cartas: sem busca, achar a que se quer testar e rolar a
 * lista inteira toda vez. Busca por nome ou por numero — o id e como a carta e
 * chamada em `domain/cards/effects/`, entao e por ele que se procura quando o
 * que se esta testando e um efeito, e nao uma carta.
 *
 * `sources` sao as origens oferecidas (o seu baralho, o catalogo inteiro). Sao
 * listas de id em vez de listas de carta porque e assim que o estado da partida
 * guarda baralho e mao — a carta em si mora no catalogo estatico.
 */
export function CardPickerModal({
    title,
    hint,
    sources,
    onPick,
    onClose
}){

    const [sourceKey, setSourceKey] = useState(sources[0]?.key);
    const [query, setQuery] = useState('');

    const source = sources.find(entry => entry.key === sourceKey) ?? sources[0];

    const results = useMemo(() => {
        const byId = new Map(CARDS.map(card => [card.id, card]));
        // Sem dedupe e na ordem recebida: o baralho vem de cima para baixo, e
        // qual e a proxima carta e justamente o que se quer ver aqui.
        const cards = source.ids.map(id => byId.get(id)).filter(Boolean);
        const term = query.trim().toLowerCase();
        if(!term) return cards;
        return cards.filter(card =>
            String(card.id) === term || card.name.toLowerCase().includes(term));
    }, [source, query]);

    return (
        <Modal onClose={onClose} label={title}>
            <div className='flex flex-col gap-3 w-full px-4 py-4 panel'>
                <header className='flex flex-col items-center gap-0.5 text-center'>
                    <h2 className='text-[1rem] font-bold text-cream'>{title}</h2>
                    {hint && <p className='text-xs text-cream-dim'>{hint}</p>}
                </header>

                {sources.length > 1 && <div className='flex gap-1.5'>
                    {sources.map(entry => (
                        <button key={entry.key}
                            type='button'
                            onClick={() => setSourceKey(entry.key)}
                            className={`
                                flex-1 h-9 rounded-xl text-xs font-semibold
                                border transition-transform active:scale-95
                                ${entry.key === source.key
                                    ? 'border-gold bg-gold/15 text-gold'
                                    : 'border-line bg-elevated text-cream-dim'}
                            `}
                        >
                            {entry.label}
                        </button>
                    ))}
                </div>}

                <input type='search'
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder='Nome ou número da carta'
                    className={`
                        h-10 px-3 rounded-xl
                        border border-line bg-elevated
                        text-sm text-cream placeholder:text-cream-dim/60
                        focus:outline-none focus-visible:ring-2
                        focus-visible:ring-brand-light
                    `}
                />

                {results.length === 0
                    ? <p className='py-4 text-center text-xs text-cream-dim'>
                        Nada com “{query}”.
                    </p>
                    : <ul className='grid grid-cols-3 gap-x-2 gap-y-3'>
                        {results.map((card, index) => (
                            <li key={`${card.id}:${index}`}
                                className='flex flex-col items-center gap-1'
                            >
                                <button type='button'
                                    onClick={() => onPick(card)}
                                    aria-label={`Escolher ${card.name}`}
                                    className={`
                                        overflow-hidden rounded-md border border-line
                                        transition-transform active:scale-95
                                        focus:outline-none focus-visible:ring-2
                                        focus-visible:ring-gold
                                    `}
                                >
                                    <Card card={card} scale={0.28} />
                                </button>
                                <span className='max-w-full truncate text-[0.6rem] text-cream-dim'>
                                    #{card.id}
                                </span>
                            </li>
                        ))}
                    </ul>}
            </div>
        </Modal>
    );
}
