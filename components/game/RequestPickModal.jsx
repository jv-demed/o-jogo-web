'use client'
import { useState } from 'react';
import { ICONS } from '@/assets/icons';
import { Card } from '@/components/cards/Card';
import { Modal } from '@/components/containers/Modal';
import { ActionButton } from '@/components/buttons/ActionButton';
import { Avatar } from '@/components/elements/Avatar';
import { dispellable } from '@/domain/match/state';
import { cardById, cardName, missionName, promptText } from './narrate';

/**
 * As perguntas de um jogador so que nao apontam cadeira: escolher cartas (de
 * uma mao, do descarte, das ja jogadas, de um equipamento), escolher missoes de
 * uma lista, arrumar lugares e escolher um efeito que esta valendo.
 *
 * Irma da `PlayerPickModal`, no mesmo molde: o centro da tela, uma lista, e o
 * "Confirmar" que so acende com a escolha completa. Fecha sem responder pelo
 * mesmo motivo — olhar a mesa antes — e o botao da barra reabre.
 */
export function RequestPickModal({ request, state, you, onAnswer, onClose }){
    switch(request.kind){
        case 'cards':    return <CardsPick request={request} onAnswer={onAnswer} onClose={onClose} />;
        case 'missions': return <MissionsPick request={request} onAnswer={onAnswer} onClose={onClose} />;
        case 'order':    return <OrderPick request={request} state={state} you={you} onAnswer={onAnswer} onClose={onClose} />;
        case 'ongoing':  return <OngoingPick request={request} state={state} you={you} onAnswer={onAnswer} onClose={onClose} />;
        default:         return null;
    }
}

/** Os pedidos que esta gaveta responde. */
export const isRequestPick = request =>
    ['cards', 'missions', 'order', 'ongoing'].includes(request?.kind);

function Shell({ request, title, hint, onClose, children, done, onConfirm, count }){
    return (
        <Modal onClose={onClose} label={title}>
            <div className='flex flex-col gap-3 w-full px-4 py-4 panel'>
                <header className='flex flex-col items-center gap-1 text-center'>
                    <h2 className='text-[1rem] font-bold text-cream'>{title}</h2>
                    {request.idCard && <p className='text-xs text-cream-dim'>{cardName(request.idCard)}</p>}
                    {hint && <p className='text-[0.7rem] text-cream-dim/80'>{hint}</p>}
                </header>
                {children}
                {count && <p className='text-center text-[0.7rem] text-cream-dim'>{count}</p>}
                <ActionButton text='Confirmar' variant='gold' disabled={!done} action={onConfirm} />
            </div>
        </Modal>
    );
}

/** Escolher cartas. Repetida pode aparecer duas vezes (o descarte tem copias). */
function CardsPick({ request, onAnswer, onClose }){
    const [picked, setPicked] = useState([]);
    const count = Math.min(request.count ?? 1, request.cards.length);
    const toggle = index => setPicked(prev => prev.includes(index)
        ? prev.filter(i => i !== index)
        : prev.length >= count ? (count === 1 ? [index] : prev) : [...prev, index]);

    const SOURCE = {
        hand: 'Da sua mão', discard: 'Do seu descarte', played: 'Das cartas já jogadas',
        equipment: 'Dos equipamentos',
    };
    return (
        <Shell request={request}
            title={count === 1 ? 'Escolha 1 carta' : `Escolha ${count} cartas`}
            hint={SOURCE[request.source]}
            onClose={onClose}
            done={picked.length === count}
            count={`${picked.length} de ${count} escolhida(s).`}
            onConfirm={() => onAnswer(picked.map(i => request.cards[i]))}
        >
            <CardGrid cards={request.cards} picked={picked} onToggle={toggle} />
        </Shell>
    );
}

/** A grade de cartas, com o visto por cima da escolhida. Exportada para o descarte de cada um. */
export function CardGrid({ cards, picked, onToggle }){
    return (
        <ul className='grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto scrollbar-custom'>
            {cards.map((idCard, index) => {
                const card = cardById(idCard);
                const isOn = picked.includes(index);
                return (
                    <li key={`${idCard}-${index}`} className='flex justify-center'>
                        <button type='button'
                            onClick={() => onToggle(index)}
                            aria-pressed={isOn}
                            aria-label={card?.name ?? `carta ${idCard}`}
                            className={`
                                relative overflow-hidden rounded-md border-2
                                transition-transform active:scale-95
                                ${isOn ? 'border-gold' : 'border-transparent'}
                            `}
                        >
                            {card ? <Card card={card} scale={0.22} /> : <span className='p-2 text-xs'>#{idCard}</span>}
                            {isOn && <span className={`
                                absolute right-1 top-1 flex items-center justify-center
                                h-5 w-5 rounded-full text-[0.6rem] bg-gold text-base
                            `}>
                                <ICONS.check />
                            </span>}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

/** Missoes de uma lista: as 7 (74) ou as da partida, em segredo (64). */
function MissionsPick({ request, onAnswer, onClose }){
    const [picked, setPicked] = useState([]);
    const count = request.count ?? 1;
    const toggle = id => setPicked(prev => prev.includes(id)
        ? prev.filter(other => other !== id)
        : prev.length >= count ? (count === 1 ? [id] : prev) : [...prev, id]);
    return (
        <Shell request={request}
            title={count === 1 ? 'Escolha 1 missão' : `Escolha ${count} missões`}
            hint={request.secret ? 'Só você vê esta escolha.' : 'A mesa vai ver as missões escolhidas.'}
            onClose={onClose}
            done={picked.length === count}
            count={`${picked.length} de ${count} escolhida(s).`}
            onConfirm={() => onAnswer(picked)}
        >
            <ul className='flex flex-col gap-1.5'>
                {request.options.map(id => (
                    <li key={id}>
                        <Row isOn={picked.includes(id)} onClick={() => toggle(id)}>
                            <span className='text-lg text-brand-light'><ICONS.investigation /></span>
                            <span className='flex-1 text-sm font-semibold text-cream'>{missionName(id)}</span>
                        </Row>
                    </li>
                ))}
            </ul>
        </Shell>
    );
}

/** 34: a ordem nova dos escolhidos, do primeiro lugar ao ultimo. */
function OrderPick({ request, state, you, onAnswer, onClose }){
    const [order, setOrder] = useState(request.ids);
    const move = (index, step) => setOrder(prev => {
        const next = [...prev];
        const target = index + step;
        if(target < 0 || target >= next.length) return prev;
        [next[index], next[target]] = [next[target], next[index]];
        return next;
    });
    const nameOf = id => (id === you.id ? 'Você' : state.players.find(p => p.id === id)?.name ?? '?');
    return (
        <Shell request={request}
            title='Arrume os lugares'
            hint='Os escolhidos trocam entre os lugares que já ocupavam, na ordem de cima para baixo.'
            onClose={onClose}
            done
            onConfirm={() => onAnswer(order)}
        >
            <ol className='flex flex-col gap-1.5'>
                {order.map((id, index) => {
                    const player = state.players.find(p => p.id === id);
                    return (
                        <li key={id} className={`
                            flex items-center gap-2.5 px-3 py-2 rounded-2xl border border-line bg-elevated
                        `}>
                            <span className='w-4 text-xs tabular-nums text-cream-dim'>{index + 1}</span>
                            <Avatar id={player?.avatar} size={28} />
                            <span className='flex-1 text-sm font-semibold text-cream truncate'>{nameOf(id)}</span>
                            <button type='button' aria-label='Subir' onClick={() => move(index, -1)}
                                className='h-8 w-8 rounded-lg border border-line text-cream disabled:opacity-30'
                                disabled={index === 0}
                            >▲</button>
                            <button type='button' aria-label='Descer' onClick={() => move(index, 1)}
                                className='h-8 w-8 rounded-lg border border-line text-cream disabled:opacity-30'
                                disabled={index === order.length - 1}
                            >▼</button>
                        </li>
                    );
                })}
            </ol>
        </Shell>
    );
}

/**
 * 104: um efeito que esta valendo. A 99 aparece pela cadeira de quem jogou,
 * nunca pela do escolhido: o casamento e segredo.
 */
function OngoingPick({ request, state, you, onAnswer, onClose }){
    const [picked, setPicked] = useState(null);
    const entries = dispellable(state).filter(o => request.options.includes(o.id));
    const nameOf = id => (id === you.id ? 'você' : state.players.find(p => p.id === id)?.name ?? '?');
    return (
        <Shell request={request}
            title='Escolha um efeito para destruir'
            onClose={onClose}
            done={picked !== null}
            onConfirm={() => onAnswer(picked)}
        >
            <ul className='flex flex-col gap-1.5'>
                {entries.map(ongoing => {
                    const card = cardById(ongoing.idCard);
                    const where = ongoing.onTable || ongoing.global
                        ? 'na mesa'
                        : `sobre ${ongoing.targets.map(nameOf).join(' e ')}`;
                    return (
                        <li key={ongoing.id}>
                            <Row isOn={picked === ongoing.id} onClick={() => setPicked(ongoing.id)}>
                                {card && <span className='shrink-0 overflow-hidden rounded-md'><Card card={card} scale={0.12} /></span>}
                                <span className='flex flex-col min-w-0 flex-1'>
                                    <span className='truncate text-sm font-semibold text-cream'>{card?.name ?? `#${ongoing.idCard}`}</span>
                                    <span className='truncate text-[0.7rem] text-cream-dim'>{where}</span>
                                </span>
                            </Row>
                        </li>
                    );
                })}
            </ul>
        </Shell>
    );
}

function Row({ isOn, onClick, children }){
    return (
        <button type='button'
            onClick={onClick}
            aria-pressed={isOn}
            className={`
                flex items-center gap-2.5 w-full
                px-3 py-2.5 rounded-2xl border text-left
                transition-transform active:scale-[0.99]
                ${isOn ? 'border-gold bg-gold/15' : 'border-line bg-elevated'}
            `}
        >
            {children}
            {isOn && <span className='text-gold'><ICONS.check /></span>}
        </button>
    );
}

export { promptText };
