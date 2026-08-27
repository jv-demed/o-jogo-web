'use client'
import { Command } from '@/domain/match/engine';
import { Phase } from '@/domain/match/state';
import { ICONS } from '@/assets/icons';
import { ActionButton } from '@/components/buttons/ActionButton';
import { promptText } from './narrate';

/**
 * O que fazer agora: a barra que diz de quem e a vez e oferece a acao da fase.
 *
 * O botao nunca sai da tela. Ele muda de texto e apaga quando nao ha o que
 * fazer, mas continua no mesmo lugar, do mesmo tamanho — a mao logo abaixo nao
 * pode subir e descer a cada troca de fase, com o dedo ja a caminho. Botao que
 * some e alvo que se move.
 *
 * O texto da fase mora dentro do botao, e nao numa linha acima dele. Uma frase
 * explicando o botao logo acima do botao e a mesma informacao dita duas vezes,
 * e custava uma linha de altura da mao em todas as fases. Botao apagado ja e
 * uma frase: `Vez de Ana` nao pede um `Espere` em cima.
 *
 * Uma fase, um controle. A alternativa — todos os botoes na tela, os que nao
 * valem desabilitados — nao funciona num jogo em que a fase muda sozinha (a
 * janela fecha no relogio, o bot joga na sua frente): o jogador ficaria caçando
 * qual dos cinco acendeu.
 */
export function TurnBar({
    state,
    you,
    isYourTurn,
    onOpenPicker,
    onDevDraw,
    dispatch
}){

    const request = state.phase === Phase.pending ? state.pending[0] : null;
    const isChooser = request?.chooserId === you.id;
    const top = state.stack[state.stack.length - 1];
    const currentName = state.players.find(p => p.id === state.order[state.turnIndex])?.name;

    if(request && isChooser){
        return (
            <Prompt request={request}
                you={you}
                onOpenPicker={onOpenPicker}
                dispatch={dispatch}
            />
        );
    }

    switch(state.phase){
        case Phase.draw:
            return isYourTurn
                ? <Bar>
                    <div className='flex gap-2'>
                        <ActionButton text='Comprar carta'
                            variant='gold'
                            width={onDevDraw ? 'calc(100% - 3.5rem)' : '100%'}
                            action={() => dispatch({ type: Command.draw, playerId: you.id })}
                        />
                        {/* Ferramenta de dev, e so para quem tem: escolher a
                            carta que vem. Fica colada na compra porque e ali
                            que a pergunta aparece — no painel ela seria uma
                            gaveta de distancia do gesto. */}
                        {onDevDraw && <button type='button'
                            onClick={onDevDraw}
                            aria-label='Escolher a carta que vou comprar'
                            className={`
                                flex items-center justify-center shrink-0
                                h-12 w-12 rounded-xl text-lg
                                border border-dashed border-gold/60
                                bg-gold/10 text-gold
                                transition-transform active:scale-95
                                focus:outline-none focus-visible:ring-2
                                focus-visible:ring-gold
                            `}
                        >
                            <ICONS.deck />
                        </button>}
                    </div>
                </Bar>
                : <Waiting text={`Vez de ${currentName}`} />;

        case Phase.play:
            return isYourTurn
                ? <Waiting text='Escolha uma carta da mão' />
                : <Waiting text={`${currentName} está escolhendo`} />;

        case Phase.window: {
            const canPass = top?.byId !== you.id && !state.window.passed.includes(you.id);
            return canPass
                // "Sem reagir" e o que o botao faz *em vez* de: e ele que
                // conta que a mao tambem e uma saida daqui.
                ? <Bar>
                    <ActionButton text='Passar sem reagir'
                        variant='secondary'
                        action={() => dispatch({ type: Command.pass, playerId: you.id })}
                    />
                </Bar>
                : <Waiting text='Esperando a mesa' />;
        }

        case Phase.pending:
            return <Waiting text='A mesa está resolvendo' />;

        case Phase.end:
            return isYourTurn
                ? <Bar>
                    <ActionButton text='Passar a vez'
                        action={() => dispatch({ type: Command.endTurn, playerId: you.id })}
                    />
                </Bar>
                : <Waiting text={`${currentName} está terminando`} />;

        default:
            return <Waiting text='Aguarde' />;
    }
}

// So o controle da fase. Nada acima dele: a altura da barra e a altura do
// botao, igual em todas as fases, e o que sobra e da mao.
function Bar({ children }){
    return (
        <div className='flex flex-col gap-1.5 w-full'>
            {children}
        </div>
    );
}

/**
 * A vez de outro. O botao continua ali, apagado, dizendo do que se esta
 * esperando — o lugar dele na tela e informacao, e some-lo devolveria a mao
 * pulando de altura a cada turno.
 */
function Waiting({ text }){
    return (
        <Bar>
            <ActionButton text={text} variant='secondary' disabled />
        </Bar>
    );
}

/**
 * A pergunta que travou a resolucao. Sao tres formatos, e nao um generico:
 * aceitar ou nao um efeito opcional, escolher entre opcoes da carta, e escolher
 * jogador — este ultimo mora num modal (a lista da mesa nao cabe na barra), e
 * aqui a pergunta e o proprio texto da porta.
 *
 * A pergunta e a unica coisa que ainda aparece acima do botao, e so quando a
 * resposta e sim/nao ou uma lista de opcoes: `Sim` e `Opcao 2` nao dizem a que
 * vieram, e sem a pergunta o jogador responderia no escuro. Nao e dica de
 * fase — e o que esta sendo perguntado.
 */
function Prompt({ request, you, onOpenPicker, dispatch }){

    const answer = value => dispatch({ type: Command.answer, playerId: you.id, value });

    if(request.kind === 'optIn'){
        return (
            <Bar>
                <Question text={promptText(request)} />
                <div className='flex gap-2'>
                    <ActionButton text='Não' variant='secondary' width='50%'
                        action={() => answer(false)} />
                    <ActionButton text='Sim' variant='gold' width='50%'
                        action={() => answer(true)} />
                </div>
            </Bar>
        );
    }

    if(request.kind === 'option'){
        return (
            <Bar>
                <Question text={promptText(request)} />
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
            </Bar>
        );
    }

    return (
        <Bar>
            <ActionButton text={promptText(request)}
                variant='gold'
                action={onOpenPicker}
            />
        </Bar>
    );
}

function Question({ text }){
    return (
        <p className='text-center text-xs text-cream-dim'>{text}</p>
    );
}
