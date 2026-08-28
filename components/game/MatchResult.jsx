'use client'
import { useState } from 'react';
import { ALL_MISSIONS, MISSIONS } from '@/domain/match/missions';
import { Command } from '@/domain/match/engine';
import { ActionButton } from '@/components/buttons/ActionButton';
import { ICONS } from '@/assets/icons';

/**
 * O fim da partida: quem ganhou e por que, com as missoes todas abertas.
 *
 * Abrir as missoes so aqui e o ponto: a partida inteira e jogada no escuro, e a
 * apuracao e o unico momento em que a mesa descobre contra o que estava jogando.
 */
export function MatchResult({ state, you, onRestart, onLeave }){

    const nameOf = id => state.players.find(player => player.id === id)?.name ?? 'alguém';
    const youWon = state.winners?.includes(you.id);

    return (
        <div className='flex flex-col gap-4 w-full'>
            <div className='flex flex-col items-center gap-1'>
                <span className={`
                    flex items-center justify-center
                    h-12 w-12 rounded-2xl text-xl
                    border ${youWon
                        ? 'border-gold/50 bg-gold/15 text-gold'
                        : 'border-line bg-elevated text-cream-dim'}
                `}>
                    {youWon ? <ICONS.star /> : <ICONS.close />}
                </span>
                <h2 className='text-lg font-bold'>
                    {youWon ? 'Você ganhou' : 'Você não ganhou'}
                </h2>
                <p className='text-xs text-cream-dim text-center'>
                    {state.winners?.length
                        ? `Ganhou${state.winners.length > 1 ? 'ram' : ''}: ${state.winners.map(nameOf).join(', ')}.`
                        : 'Ninguém cumpriu a missão.'}
                </p>
            </div>

            <ul className='flex flex-col gap-1.5'>
                {(state.results ?? []).map(result => (
                    <li key={result.id}
                        className={`
                            flex items-center gap-2.5
                            px-3 py-2 rounded-2xl border bg-base
                            ${result.won ? 'border-gold/40' : 'border-line'}
                        `}
                    >
                        <span className='flex flex-col min-w-0 flex-1'>
                            <span className='text-sm font-semibold truncate'>
                                {nameOf(result.id)}
                                {result.id === you.id && ' (você)'}
                            </span>
                            <span className='text-[0.65rem] text-cream-dim truncate'>
                                {MISSIONS[result.mission].name} — {MISSIONS[result.mission].text}
                            </span>
                        </span>
                        <span className='flex items-center gap-1 shrink-0 text-xs text-gold tabular-nums'>
                            <ICONS.shot />
                            {result.shots}
                        </span>
                        {result.won && <span className='shrink-0 text-gold'><ICONS.check /></span>}
                    </li>
                ))}
            </ul>

            {/* "De novo" so quando ha como recomecar. Na mesa do lobby nao ha:
                remontar a partida dali seria refazer a mesa por baixo de quem
                ainda esta nela — voltar ao lobby e o caminho. */}
            <div className='flex gap-2'>
                <ActionButton text='Sair' variant='secondary'
                    width={onRestart ? '40%' : '100%'}
                    action={onLeave}
                />
                {onRestart && <ActionButton text='Jogar de novo' variant='gold'
                    width='55%'
                    action={onRestart}
                />}
            </div>
        </div>
    );
}

/**
 * O palpite do Sjehnsens, antes da apuracao.
 *
 * So aparece para quem tirou a missao — e para essa pessoa a partida nao acabou
 * de verdade ate ela apontar quem e quem. Um por jogador, sem repetir: a mesa
 * tem uma missao de cada.
 */
export function MissionGuess({ state, you, dispatch }){

    const others = state.players.filter(player => player.id !== you.id);
    const [guesses, setGuesses] = useState({});

    const usadas = new Set(Object.values(guesses));
    const completo = others.every(other => guesses[other.id]);

    return (
        <div className='flex flex-col gap-3 w-full'>
            <div className='flex flex-col items-center gap-1'>
                <h2 className='text-lg font-bold'>Quem é quem?</h2>
                <p className='text-xs text-cream-dim text-center'>
                    Sua missão é acertar todos. Errar um só já vale como errar tudo.
                </p>
            </div>

            {others.map(other => (
                <div key={other.id} className='flex flex-col gap-1.5'>
                    <span className='text-sm font-semibold'>{other.name}</span>
                    <div className='flex flex-wrap gap-1.5'>
                        {ALL_MISSIONS.filter(mission => mission !== you.mission).map(mission => {
                            const isOn = guesses[other.id] === mission;
                            // Missao ja usada em outro jogador some da lista:
                            // duas pessoas com a mesma identidade nao existem.
                            const taken = usadas.has(mission) && !isOn;
                            return (
                                <button key={mission}
                                    type='button'
                                    disabled={taken}
                                    onClick={() => setGuesses(prev => ({ ...prev, [other.id]: mission }))}
                                    className={`
                                        px-2.5 py-1 rounded-full text-[0.7rem]
                                        border transition-transform active:scale-95
                                        disabled:opacity-25
                                        ${isOn
                                            ? 'border-gold bg-gold/15 text-gold'
                                            : 'border-line bg-elevated text-cream-dim'}
                                    `}
                                >
                                    {MISSIONS[mission].name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            <ActionButton text='Apurar'
                variant='gold'
                disabled={!completo}
                action={() => dispatch({ type: Command.guess, playerId: you.id, value: guesses })}
            />
        </div>
    );
}
