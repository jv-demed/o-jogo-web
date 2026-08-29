'use client'
import { ICONS } from '@/assets/icons';
import { Command } from '@/domain/match/engine';
import { ActionButton } from '@/components/buttons/ActionButton';
import { cardName } from './narrate';

/**
 * O shot que voce tem que beber, e o botao que diz que voce bebeu.
 *
 * A unica parte deste jogo que acontece fora da tela. O contador ja subiu — a
 * regra e do motor —, mas a partida fica parada aqui ate a mesa confirmar, o
 * que e o mesmo que a mesa de verdade faz: ninguem joga a proxima carta com o
 * copo cheio na frente de alguem.
 *
 * Quando a carta cobra mais de uma pessoa (a 2, festinha de sexta, cobra a mesa
 * inteira menos quem jogou), o aviso e o *mesmo* para todas elas: a lista traz
 * quem deve, com o ok ao lado de quem ja bebeu. E por isso que confirmar nao
 * fecha a tela — ela so sai quando o ultimo bebe. Um brinde tem hora marcada,
 * e a hora e quando todo mundo levantou o copo; sumir da tela de quem bebeu
 * primeiro seria dizer que a cobranca era de cada um por si.
 *
 * E o mesmo aviso aparece para quem *nao* deve nada, quem jogou a carta
 * inclusive. A partida esta parada para essas pessoas tambem, e quem manda a
 * mesa beber e justamente quem quer ver a mesa beber: esconder a lista de quem
 * falta de quem esta ali olhando seria tirar da tela o unico momento em que
 * todo mundo esta fazendo a mesma coisa. Sem botao, so a conta.
 *
 * Nao e um `Modal`: modal fecha no Esc, no toque fora e num X no canto, e as
 * tres saidas estao erradas aqui. Este aviso tem uma saida so, e ela e beber —
 * por isso ele intercepta o toque (ao contrario dos anuncios da mesa, que sao
 * `pointer-events-none`) e cobre a tela inteira, inclusive a mao.
 */
export function DrinkPrompt({ entries, players, dispatch, playerId }){

    // Uma cobranca por vez, na ordem em que aconteceram. Duas cartas que
    // mandaram beber sao dois shots e dois "bebi" — somar os dois num aviso so
    // faria a mesa esperar uma confirmacao por duas bebidas.
    const mine = entries.filter(item => item.playerId === playerId);

    // Voce nao esta na cobranca: a tela e a mesma, mas de fora. Sem "bebi" —
    // confirmar bebida que nao e sua nao existe.
    const watching = mine.length === 0;

    const entry = mine.find(item => !item.confirmed) ?? null;
    const queued = mine.filter(item => !item.confirmed).length;
    const from = entry?.idCard ?? entries[entries.length - 1].idCard;

    // A mesa da cobranca, na ordem em que o motor enfileirou: uma linha por
    // pessoa, somando o que ela deve. Duas cartas cobrando a mesma pessoa sao
    // dois "bebi" dela, mas uma linha so aqui — o que os outros precisam
    // saber e se ela ja acabou, e nao quantas vezes ela clicou.
    const table = [];
    for(const item of entries){
        const row = table.find(seat => seat.playerId === item.playerId);
        if(row){
            row.amount += item.amount;
            row.pending = row.pending || !item.confirmed;
        }else{
            table.push({
                playerId: item.playerId,
                amount: item.amount,
                pending: !item.confirmed,
                name: players?.find(player => player.id === item.playerId)?.name ?? 'alguem',
            });
        }
    }
    const missing = table.filter(seat => seat.pending);

    return (
        <div role={watching ? 'status' : 'alertdialog'}
            aria-modal={watching ? undefined : 'true'}
            aria-label={entry ? `Beba ${entry.amount} shot(s)` : 'Esperando a mesa beber'}
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
                    {watching
                        ? 'A mesa está bebendo'
                        : !entry
                            ? 'Você já bebeu'
                            : entry.amount === 1 ? 'Beba 1 shot' : `Beba ${entry.amount} shots`}
                </h2>
                {from && <p className='text-xs text-cream-dim'>
                    {cardName(from)}
                </p>}
                {/* Dizer que a mesa parou e o que evita o toque apressado: o
                    botao nao e "ok, entendi", e "ok, bebi". Depois do ok o
                    texto muda de dono: a partida passa a esperar os outros. */}
                <p className='pt-1 text-[0.7rem] text-cream-dim/80'>
                    {entry
                        ? <>A partida está parada esperando você.
                            {queued > 1 && ` Ainda vêm mais ${queued - 1}.`}</>
                        : watching
                            ? 'Você não bebe nesta. A partida segue quando o último shot descer.'
                            : 'A partida segue quando o último shot descer.'}
                </p>
            </div>

            {/* A lista so some quando ela seria uma linha repetindo o titulo:
                voce, sozinho, cobrado. De fora, mesmo uma pessoa so precisa de
                nome — o titulo diz que a mesa bebe, nao quem. */}
            {(table.length > 1 || watching) && <ul className='flex w-full max-w-[280px] flex-col gap-1'>
                {table.map(seat => (
                    <li key={seat.playerId}
                        className={`
                            flex items-center justify-between gap-2
                            rounded-md border px-3 py-2 text-sm
                            ${seat.pending
                                ? 'border-cream-dim/20 bg-white/[0.03] text-cream-dim'
                                : 'border-gold/40 bg-gold/10 text-cream'}
                        `}
                    >
                        <span className='truncate'>
                            {seat.name}{seat.playerId === playerId && ' (você)'}
                        </span>
                        <span className='flex shrink-0 items-center gap-1 text-xs'>
                            {seat.pending
                                ? <>{seat.amount} <ICONS.shot /></>
                                : <><ICONS.check className='text-gold' /> ok</>}
                        </span>
                    </li>
                ))}
            </ul>}

            <div className='w-full max-w-[280px]'>
                {entry
                    ? <ActionButton text='Bebi'
                        variant='gold'
                        icon={ICONS.check}
                        action={() => dispatch({ type: Command.drank, playerId })}
                    />
                    : <ActionButton
                        text={`Esperando ${missing.map(seat => seat.name).join(', ')}`}
                        variant='secondary'
                        disabled
                    />}
            </div>
        </div>
    );
}
