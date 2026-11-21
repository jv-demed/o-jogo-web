'use client'
import { useMemo, useState } from 'react';
import { CARDS } from '@/assets/cards';
import { Card } from '@/components/cards/Card';
import { Modal } from '@/components/containers/Modal';
import { cardName } from '@/components/game/narrate';

/**
 * Escolher um cenario de scripts/scenarios/ para montar a mesa do laboratorio.
 *
 * Agrupado por carta porque e assim que a revisao anda — carta a carta — e uma
 * carta tem varios cenarios (a 6 tem quatro). O nome do cenario comeca pelo
 * nome da carta ("E, Deve Ser: anula a troca..."); dentro do grupo o prefixo
 * so repete o cabecalho, e sai.
 *
 * Cada linha diz o que o cenario monta sem precisar abrir o arquivo: quantos
 * lugares, quem joga antes (o gatilho, para carta de defesa), se a defesa
 * tem que ser recusada e se o cenario esta marcado como bug conhecido.
 */

const byId = new Map(CARDS.map(card => [card.id, card]));

/** "E, Deve Ser: anula a troca" -> "anula a troca". Sem prefixo, fica igual. */
const shortName = name => {
    const index = name.indexOf(': ');
    return index === -1 ? name : name.slice(index + 2);
};

export function ScenarioPickerModal({ scenarios, onPick, onClose }){

    const [query, setQuery] = useState('');

    const groups = useMemo(() => {
        const term = query.trim().toLowerCase();
        const map = new Map();
        scenarios.forEach((scenario, index) => {
            const title = cardName(scenario.carta);
            const matches = !term
                || String(scenario.carta) === term
                || title.toLowerCase().includes(term)
                || scenario.nome.toLowerCase().includes(term);
            if(!matches) return;
            if(!map.has(scenario.carta)) map.set(scenario.carta, { idCard: scenario.carta, title, items: [] });
            map.get(scenario.carta).items.push({ scenario, index });
        });
        return [...map.values()].sort((a, b) => a.idCard - b.idCard);
    }, [scenarios, query]);

    return (
        <Modal onClose={onClose} label='Carregar de um cenário'>
            <div className='flex flex-col gap-3 w-full px-4 py-4 panel'>
                <header className='flex flex-col items-center gap-0.5 text-center'>
                    <h2 className='text-[1rem] font-bold text-cream'>Carregar de um cenário</h2>
                    <p className='text-xs text-cream-dim'>
                        A mesa do cenário vai para o formulário. Quem joga a carta é você.
                    </p>
                </header>

                <input type='search'
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder='Carta, número ou o que o cenário testa'
                    className={`
                        h-10 px-3 rounded-xl
                        border border-line bg-elevated
                        text-sm text-cream placeholder:text-cream-dim/60
                        focus:outline-none focus-visible:ring-2
                        focus-visible:ring-brand-light
                    `}
                />

                {groups.length === 0
                    ? <p className='py-4 text-center text-xs text-cream-dim'>
                        Nenhum cenário com “{query}”.
                    </p>
                    : <ul className='flex flex-col gap-3'>
                        {groups.map(group => (
                            <ScenarioGroup key={group.idCard} group={group} onPick={onPick} />
                        ))}
                    </ul>}
            </div>
        </Modal>
    );
}

function ScenarioGroup({ group, onPick }){
    const card = byId.get(group.idCard);
    return (
        <li className='flex gap-3 p-2 rounded-2xl border border-line bg-elevated/60'>
            <div className='shrink-0 self-start overflow-hidden rounded-md border border-line'>
                {card && <Card card={card} scale={0.16} />}
            </div>
            <div className='flex-1 min-w-0 flex flex-col gap-1.5'>
                <header className='flex items-baseline gap-1.5'>
                    <span className='text-[0.7rem] font-bold text-gold tabular-nums'>#{group.idCard}</span>
                    <span className='text-sm font-semibold text-cream truncate'>{group.title}</span>
                    <span className='ml-auto shrink-0 text-[0.6rem] text-cream-dim'>
                        {group.items.length} {group.items.length === 1 ? 'cenário' : 'cenários'}
                    </span>
                </header>
                <ul className='flex flex-col gap-1'>
                    {group.items.map(({ scenario, index }) => (
                        <li key={index}>
                            <ScenarioRow scenario={scenario} onPick={() => onPick(scenario)} />
                        </li>
                    ))}
                </ul>
            </div>
        </li>
    );
}

function ScenarioRow({ scenario, onPick }){
    const { gatilho } = scenario;
    return (
        <button type='button'
            onClick={onPick}
            className={`
                w-full flex flex-col gap-1 px-2.5 py-2 rounded-xl text-left
                border border-line bg-base
                transition-transform active:scale-[0.98]
                hover:border-gold/60
                focus:outline-none focus-visible:ring-2 focus-visible:ring-gold
            `}
        >
            <span className='text-xs text-cream leading-snug'>{shortName(scenario.nome)}</span>
            <span className='flex flex-wrap gap-1'>
                <Chip>{scenario.mesa.length} lugares</Chip>
                {scenario.voce && <Chip tone='gold'>jogada em você</Chip>}
                {gatilho && <Chip tone='gold'>depois de #{gatilho.carta} {cardName(gatilho.carta)}</Chip>}
                {scenario.recusada && <Chip tone='dim'>defesa recusada</Chip>}
                {scenario.depois?.length > 0 && <Chip>+{scenario.depois.length} {scenario.depois.length === 1 ? 'passo' : 'passos'}</Chip>}
                {scenario.pendente && <Chip tone='warn'>pendente</Chip>}
            </span>
        </button>
    );
}

const TONES = {
    neutral: 'border-line text-cream-dim',
    gold: 'border-gold/50 text-gold bg-gold/10',
    dim: 'border-line text-cream-dim bg-elevated',
    warn: 'border-danger/40 text-danger bg-danger/10',
};

function Chip({ tone = 'neutral', children }){
    return (
        <span className={`px-1.5 py-0.5 rounded-md border text-[0.6rem] leading-none ${TONES[tone]}`}>
            {children}
        </span>
    );
}
