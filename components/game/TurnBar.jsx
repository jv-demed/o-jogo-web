'use client'
import { Command } from '@/domain/match/engine';
import { Phase } from '@/domain/match/state';
import { ActionButton } from '@/components/buttons/ActionButton';
import { promptText } from './narrate';

/**
 * O que fazer agora: a barra que diz de quem e a vez e oferece a acao da fase.
 *
 * Uma fase, um controle. A alternativa — deixar todos os botoes na tela e
 * desabilitar os que nao valem — nao funciona num jogo em que a fase muda
 * sozinha (a janela fecha no relogio, o bot joga na sua frente): o jogador
 * ficaria caçando qual dos cinco botoes acendeu.
 */
export function TurnBar({
    state,
    you,
    isYourTurn,
    selected,
    onSelect,
    dispatch
}){

    const request = state.phase === Phase.pending ? state.pending[0] : null;
    const isChooser = request?.chooserId === you.id;
    const top = state.stack[state.stack.length - 1];
    const currentName = state.players.find(p => p.id === state.order[state.turnIndex])?.name;

    if(request && isChooser){
        return (
            <Prompt request={request}
                state={state}
                you={you}
                selected={selected}
                onSelect={onSelect}
                dispatch={dispatch}
            />
        );
    }

    switch(state.phase){
        case Phase.draw:
            return isYourTurn
                ? <Bar hint='Sua vez. Comece comprando.'>
                    <ActionButton text='Comprar carta'
                        variant='gold'
                        action={() => dispatch({ type: Command.draw, playerId: you.id })}
                    />
                </Bar>
                : <Bar hint={`Vez de ${currentName}.`} />;

        case Phase.play:
            return isYourTurn
                ? <Bar hint='Escolha uma carta da mão para jogar.' />
                : <Bar hint={`${currentName} está escolhendo a carta.`} />;

        case Phase.window:
            return <Window state={state} you={you} top={top} dispatch={dispatch} />;

        case Phase.pending:
            return <Bar hint='A mesa está resolvendo uma escolha...' />;

        case Phase.end:
            return isYourTurn
                ? <Bar hint='Turno encerrado.'>
                    <ActionButton text='Passar a vez'
                        action={() => dispatch({ type: Command.endTurn, playerId: you.id })}
                    />
                </Bar>
                : <Bar hint={`${currentName} está terminando o turno.`} />;

        default:
            return null;
    }
}

function Bar({ hint, children }){
    return (
        <div className='flex flex-col gap-2 w-full'>
            <p className='text-center text-xs text-cream-dim'>{hint}</p>
            {children}
        </div>
    );
}

/**
 * A janela de interferencia.
 *
 * O que a mesa esta esperando — a carta e o tempo que sobra — mora no meio da
 * mesa, grande, onde todo mundo ja esta olhando. Aqui fica so a decisao: reagir
 * com uma carta da mao, ou passar.
 */
function Window({ state, you, top, dispatch }){

    const canPass = top?.byId !== you.id && !state.window.passed.includes(you.id);

    return canPass
        ? <Bar hint='Reaja com uma carta ou passe.'>
            <ActionButton text='Passar'
                variant='secondary'
                action={() => dispatch({ type: Command.pass, playerId: you.id })}
            />
        </Bar>
        : <Bar hint='Esperando a mesa.' />;
}

/**
 * A pergunta que travou a resolucao. Sao tres formatos, e nao um generico:
 * escolher jogador, escolher entre opcoes da carta, e aceitar ou nao um efeito
 * opcional.
 */
function Prompt({ request, state, you, selected, onSelect, dispatch }){

    const answer = value => dispatch({ type: Command.answer, playerId: you.id, value });

    if(request.kind === 'optIn'){
        return (
            <div className='flex flex-col gap-2 w-full'>
                <p className='text-center text-xs text-cream'>{promptText(request)}</p>
                <div className='flex gap-2'>
                    <ActionButton text='Não' variant='secondary' width='50%'
                        action={() => answer(false)} />
                    <ActionButton text='Sim' variant='gold' width='50%'
                        action={() => answer(true)} />
                </div>
            </div>
        );
    }

    if(request.kind === 'option'){
        return (
            <div className='flex flex-col gap-2 w-full'>
                <p className='text-center text-xs text-cream'>{promptText(request)}</p>
                <div className='flex gap-2'>
                    {Array.from({ length: request.options }).map((_, i) => (
                        <ActionButton key={i}
                            text={`Opção ${i + 1}`}
                            variant={i === 0 ? 'primary' : 'secondary'}
                            width={`${100 / request.options}%`}
                            action={() => answer(i)}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // Escolha de jogador. Os candidatos viram fichas, inclusive voce quando a
    // carta permite: so a mesa mostra os adversarios, e escolher a si mesmo
    // precisa de um lugar para acontecer.
    const candidates = request.candidates ?? state.players.map(p => p.id);
    const done = request.upTo
        ? selected.length > 0 && selected.length <= request.count
        : selected.length === request.count;

    return (
        <div className='flex flex-col gap-2 w-full'>
            <p className='text-center text-xs text-cream'>{promptText(request)}</p>
            <div className='flex flex-wrap justify-center gap-1.5'>
                {candidates.map(id => {
                    const player = state.players.find(p => p.id === id);
                    if(!player) return null;
                    const isOn = selected.includes(id);
                    return (
                        <button key={id}
                            type='button'
                            onClick={() => onSelect(id)}
                            className={`
                                px-2.5 py-1 rounded-full text-xs
                                border transition-transform active:scale-95
                                ${isOn
                                    ? 'border-gold bg-gold/15 text-gold'
                                    : 'border-line bg-elevated text-cream-dim'}
                            `}
                        >
                            {id === you.id ? 'Você' : player.name}
                        </button>
                    );
                })}
            </div>
            <ActionButton text='Confirmar'
                variant='gold'
                disabled={!done}
                action={() => answer(selected)}
            />
        </div>
    );
}
