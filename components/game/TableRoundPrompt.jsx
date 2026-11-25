'use client'
import { useState } from 'react';
import { ICONS } from '@/assets/icons';
import { Avatar } from '@/components/elements/Avatar';
import { ActionButton } from '@/components/buttons/ActionButton';
import { Command } from '@/domain/match/engine';
import { optInRound } from '@/domain/match/state';
import { CardGrid } from './RequestPickModal';
import { cardName, nameList } from './narrate';

/**
 * As outras rodadas em que a mesa responde junta, irmas do `OptInPrompt`: o
 * voto da 75, a corrida da 46 e o descarte de cada um da 58.
 *
 * O molde e o mesmo e pelo mesmo motivo: a pergunta e de varios ao mesmo
 * tempo, a lista mostra quem ja respondeu — nunca *o que* respondeu — e da
 * tela so se sai respondendo. A ordem da lista e a dos assentos, a unica que
 * nao conta nada.
 */
export function TableRoundPrompt({ request, state, playerId, dispatch }){
    const answer = value => dispatch({ type: Command.answer, playerId, value });
    switch(request.kind){
        case 'vote':     return <VotePrompt request={request} state={state} playerId={playerId} answer={answer} />;
        case 'race':     return <RacePrompt request={request} state={state} playerId={playerId} answer={answer} />;
        case 'handPick': return <HandPickPrompt request={request} state={state} playerId={playerId} answer={answer} />;
        default:         return null;
    }
}

export const isTableRound = request => ['vote', 'race', 'handPick'].includes(request?.kind);

function seated(state, ids){
    const seat = id => {
        const index = state.order.indexOf(id);
        return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    return [...ids].sort((a, b) => seat(a) - seat(b)).map(id => {
        const player = state.players.find(p => p.id === id);
        return { id, name: player?.name ?? 'alguém', avatar: player?.avatar };
    });
}

function Shell({ request, title, subtitle, icon: Icon, isMine, children, list }){
    return (
        <div role={isMine ? 'alertdialog' : 'status'}
            aria-modal={isMine ? 'true' : undefined}
            aria-label={title}
            aria-live='polite'
            className={`
                fixed inset-0 z-50
                flex flex-col items-center justify-center gap-4 px-6
                bg-black/85 backdrop-blur-sm animate-fade-in overflow-y-auto
            `}
        >
            <span className={`
                flex items-center justify-center
                h-20 w-20 rounded-full text-4xl
                border border-gold/60 bg-gold/15 text-gold
                animate-sheet-up
            `}>
                <Icon />
            </span>
            <div className='flex flex-col items-center gap-1 text-center'>
                <h2 className='text-2xl font-bold text-cream'>{title}</h2>
                {request.idCard && <p className='text-xs text-cream-dim'>{cardName(request.idCard)}</p>}
                {subtitle && <p className='pt-1 text-[0.7rem] text-cream-dim/80'>{subtitle}</p>}
            </div>
            {list}
            <div className='w-full max-w-[320px]'>{children}</div>
        </div>
    );
}

function RoundList({ entries, playerId, mark }){
    return (
        <ul className='flex w-full max-w-[280px] flex-col gap-1'>
            {entries.map(item => (
                <li key={item.id}
                    className={`
                        flex items-center justify-between gap-2
                        rounded-md border px-3 py-2 text-sm
                        ${item.done
                            ? 'border-gold/40 bg-gold/10 text-cream'
                            : 'border-cream-dim/20 bg-white/[0.03] text-cream-dim'}
                    `}
                >
                    <span className='flex min-w-0 items-center gap-2'>
                        <Avatar id={item.avatar} size={20} className={item.done ? 'opacity-50' : ''} />
                        <span className='truncate'>{item.name}{item.id === playerId && ' (você)'}</span>
                    </span>
                    <span className='flex shrink-0 items-center gap-1 text-xs'>
                        {item.done ? mark(item) : <span className='text-cream-dim/60'>…</span>}
                    </span>
                </li>
            ))}
        </ul>
    );
}

/** 75: carta boa ou ruim. O voto de cada um so aparece no fim, em numero. */
function VotePrompt({ request, state, playerId, answer }){
    const { waiting } = optInRound(request);
    const isMine = waiting.includes(playerId);
    const entries = seated(state, request.voters).map(item => ({ ...item, done: !waiting.includes(item.id) }));
    const missing = entries.filter(item => !item.done).map(item => item.name);
    return (
        <Shell request={request}
            icon={ICONS.effect}
            isMine={isMine}
            title={isMine ? 'A carta inventada é boa?' : request.voters.includes(playerId) ? 'Você já votou' : 'A mesa está votando'}
            subtitle='Todos votam juntos. Empate é carta boa, e o voto de cada um não aparece.'
            list={<RoundList entries={entries} playerId={playerId} mark={() => <><ICONS.check className='text-gold' /> votou</>} />}
        >
            {isMine
                ? <div className='flex gap-2'>
                    <ActionButton text='Ruim' variant='secondary' width='50%' action={() => answer(false)} />
                    <ActionButton text='Boa' variant='gold' width='50%' action={() => answer(true)} />
                </div>
                : <ActionButton text={`Esperando ${nameList(missing)}`} variant='secondary' disabled />}
        </Shell>
    );
}

/** 46: a mao na mesa. O ultimo a tocar bebe 2; quando so falta um, acabou. */
function RacePrompt({ request, state, playerId, answer }){
    const { waiting } = optInRound(request);
    const isMine = waiting.includes(playerId);
    const order = request.touched ?? [];
    const entries = seated(state, request.racers).map(item => ({ ...item, done: order.includes(item.id) }));
    return (
        <Shell request={request}
            icon={ICONS.quick}
            isMine={isMine}
            title={isMine ? 'Mão na mesa!' : request.racers.includes(playerId) ? 'Você tocou' : 'Corrida na mesa'}
            subtitle='O último a tocar bebe 2.'
            list={<RoundList entries={entries} playerId={playerId}
                mark={item => <><ICONS.check className='text-gold' /> {order.indexOf(item.id) + 1}º</>} />}
        >
            {isMine
                ? <button type='button'
                    onClick={() => answer(true)}
                    className={`
                        w-full h-24 rounded-3xl text-3xl font-black
                        border-2 border-gold bg-gold/20 text-gold
                        transition-transform active:scale-95
                    `}
                >
                    ✋ MÃO!
                </button>
                : <ActionButton text='Esperando a corrida' variant='secondary' disabled />}
        </Shell>
    );
}

/** 58: cada escolhido descarta a propria carta, todos ao mesmo tempo. */
function HandPickPrompt({ request, state, playerId, answer }){
    const [picked, setPicked] = useState([]);
    const { waiting } = optInRound(request);
    const isMine = waiting.includes(playerId);
    const me = state.players.find(p => p.id === playerId);
    const count = Math.min(request.count ?? 1, me?.hand.length ?? 0);
    const entries = seated(state, request.players).map(item => ({ ...item, done: !waiting.includes(item.id) }));
    const missing = entries.filter(item => !item.done).map(item => item.name);
    const toggle = index => setPicked(prev => prev.includes(index)
        ? prev.filter(i => i !== index)
        : prev.length >= count ? (count === 1 ? [index] : prev) : [...prev, index]);
    return (
        <Shell request={request}
            icon={ICONS.deck}
            isMine={isMine}
            title={isMine ? 'Escolha a carta para descartar' : 'A mesa está descartando'}
            subtitle='Cada um escolhe a sua, ao mesmo tempo.'
            list={isMine
                ? <div className='w-full max-w-[320px]'><CardGrid cards={me.hand} picked={picked} onToggle={toggle} /></div>
                : <RoundList entries={entries} playerId={playerId} mark={() => <><ICONS.check className='text-gold' /> ok</>} />}
        >
            {isMine
                ? <ActionButton text='Descartar' variant='gold' disabled={picked.length !== count}
                    action={() => answer(picked.map(i => me.hand[i]))} />
                : <ActionButton text={`Esperando ${nameList(missing)}`} variant='secondary' disabled />}
        </Shell>
    );
}
