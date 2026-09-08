'use client'
import { ICONS } from '@/assets/icons';
import { Avatar } from '@/components/elements/Avatar';
import { Command } from '@/domain/match/engine';
import { optInRound } from '@/domain/match/state';
import { ActionButton } from '@/components/buttons/ActionButton';
import { cardName, nameList, promptText } from './narrate';

/**
 * "Voce quer entrar nessa?" — a rodada em que a mesa decide junto.
 *
 * Irmao do `DrinkPrompt`, e pelo mesmo motivo: e uma pergunta que a mesa de
 * verdade faz de uma vez so, olhando para todo mundo. Perguntar de um em um
 * (que era como ela funcionava) fazia tres coisas erradas: virava turno, quem
 * respondia depois ja sabia o que os outros fizeram, e a mesa inteira ficava
 * parada olhando *uma* pessoa demorar. Aqui o botao esta na mao de todos ao
 * mesmo tempo, e o que a mesa acompanha e a lista de quem ja apertou — o mesmo
 * ok da fila do shot, e de proposito: e o mesmo gesto.
 *
 * O motivo de a lista existir e o Sauzburg. A carta 4 manda ele beber e oferece
 * o shot aos outros; se ele fosse o unico a nao ter o que apertar, a rodada o
 * apontaria com o dedo — a mesa veria os nomes aparecerem e um faltar, e a
 * carta, que existe para ele beber *sem* se entregar, entregaria ele na
 * primeira vez que fosse jogada. Entao ele entra na rodada como os outros e ela
 * espera por ele; o que muda na tela dele e so o "nao", que nao aparece porque
 * ele nao tem essa opcao. A demora dele, que e o que sobra de informacao, e a
 * mesma demora de quem esta pensando.
 *
 * Nao e um `Modal` pela mesma razao do `DrinkPrompt`: nao ha Esc, nao ha toque
 * fora e nao ha X. Da rodada so se sai respondendo — e, para quem nao esta
 * nela, so quando ela fechar.
 */
export function OptInPrompt({ request, players, order, playerId, dispatch }){

    const { round, waiting } = optInRound(request);
    const forced = request.forced ?? [];

    // Na ordem da mesa, e nao na ordem em que os efeitos da carta acharam cada
    // um: a ordem dos efeitos e informacao (na carta 4 o obrigado seria sempre
    // o ultimo da lista), e o assento e a unica ordem que a mesa ja sabia antes
    // da carta. Mesma regra do `seatOrderDrinks`, no motor.
    const seatOf = id => {
        const index = (order ?? []).indexOf(id);
        return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    const table = round
        .map(id => {
            const player = players?.find(seat => seat.id === id);
            return {
                playerId: id,
                name: player?.name ?? 'alguem',
                avatar: player?.avatar,
                pending: waiting.includes(id),
            };
        })
        .sort((a, b) => seatOf(a.playerId) - seatOf(b.playerId));

    // Tres lugares nesta tela: quem ainda deve resposta, quem ja respondeu e
    // quem nem esta na rodada. Os dois ultimos leem a mesma coisa — a conta de
    // quem falta —, e e por isso que o aviso nao fecha quando voce responde.
    const isMine = waiting.includes(playerId);
    const mustSayYes = forced.includes(playerId);
    const watching = !round.includes(playerId);
    const missing = table.filter(item => item.pending);

    const answer = value => dispatch({ type: Command.answer, playerId, value });

    return (
        <div role={isMine ? 'alertdialog' : 'status'}
            aria-modal={isMine ? 'true' : undefined}
            aria-label={isMine
                ? promptText(request)
                : missing.length === 1
                    ? `Esperando ${missing[0].name} responder`
                    : 'Esperando a mesa responder'}
            aria-live='polite'
            className={`
                fixed inset-0 z-50
                flex flex-col items-center justify-center gap-4 px-6
                bg-black/85 backdrop-blur-sm animate-fade-in
            `}
        >
            <span className={`
                flex items-center justify-center
                h-20 w-20 rounded-full text-4xl
                border border-gold/60 bg-gold/15 text-gold
                animate-sheet-up
            `}>
                <ICONS.shot />
            </span>

            <div className='flex flex-col items-center gap-1 text-center'>
                <h2 className='text-2xl font-bold text-cream'>
                    {isMine
                        ? promptText(request)
                        : watching
                            ? 'A mesa está decidindo'
                            : 'Você já respondeu'}
                </h2>
                {request.idCard && <p className='text-xs text-cream-dim'>
                    {cardName(request.idCard)}
                </p>}
                {/* Todo mundo responde ao mesmo tempo, e isso precisa estar
                    dito: sem a frase, quem aperta primeiro acha que travou a
                    mesa, e quem aperta por ultimo acha que perdeu a vez. */}
                <p className='pt-1 text-[0.7rem] text-cream-dim/80'>
                    {isMine
                        ? 'A mesa toda responde junto. A carta resolve quando o último apertar.'
                        : missing.length === 1
                            ? `Falta ${missing[0].name}.`
                            : `Faltam ${missing.length} respostas.`}
                </p>
            </div>

            {/* A lista e o ponto da tela: e nela que a mesa ve a rodada
                acontecer. Fica sempre, inclusive para quem ainda nao apertou —
                ver quem ja decidiu faz parte de decidir. */}
            <ul className='flex w-full max-w-[280px] flex-col gap-1'>
                {table.map(item => (
                    <li key={item.playerId}
                        className={`
                            flex items-center justify-between gap-2
                            rounded-md border px-3 py-2 text-sm
                            ${item.pending
                                ? 'border-cream-dim/20 bg-white/[0.03] text-cream-dim'
                                : 'border-gold/40 bg-gold/10 text-cream'}
                        `}
                    >
                        <span className='flex min-w-0 items-center gap-2'>
                            <Avatar id={item.avatar} size={20}
                                className={item.pending ? '' : 'opacity-50'}
                            />
                            <span className='truncate'>
                                {item.name}{item.playerId === playerId && ' (você)'}
                            </span>
                        </span>
                        {/* O que a lista conta e *se* respondeu, nunca o que
                            respondeu: a resposta so aparece quando a carta
                            resolver, senao quem apertasse por ultimo estaria
                            escolhendo com a mesa inteira na mao. */}
                        <span className='flex shrink-0 items-center gap-1 text-xs'>
                            {item.pending
                                ? <span className='text-cream-dim/60'>…</span>
                                : <><ICONS.check className='text-gold' /> ok</>}
                        </span>
                    </li>
                ))}
            </ul>

            <div className='w-full max-w-[280px]'>
                {isMine
                    ? mustSayYes
                        // Obrigado pela carta: o botao existe para ele apertar
                        // junto com a mesa, e nao para ele decidir — decidir
                        // ele nao pode. Um botao so, e nao dois com um apagado:
                        // um "nao" desabilitado ao lado do "sim" contaria, para
                        // quem olhasse a tela dele, exatamente o que esta tela
                        // esconde.
                        ? <ActionButton text='Sim'
                            variant='gold'
                            icon={ICONS.check}
                            action={() => answer(true)}
                        />
                        : <div className='flex gap-2'>
                            <ActionButton text='Não' variant='secondary' width='50%'
                                action={() => answer(false)}
                            />
                            <ActionButton text='Sim' variant='gold' width='50%'
                                action={() => answer(true)}
                            />
                        </div>
                    : <ActionButton
                        text={`Esperando ${nameList(missing.map(item => item.name))}`}
                        variant='secondary'
                        disabled
                    />}
            </div>
        </div>
    );
}
