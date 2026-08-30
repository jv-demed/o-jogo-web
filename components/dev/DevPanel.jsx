'use client'
import { ICONS } from '@/assets/icons';
import { Phase } from '@/domain/match/state';
import { Modal } from '@/components/containers/Modal';
import { ActionButton } from '@/components/buttons/ActionButton';
import { cardById, cardName, missionName } from '@/components/game/narrate';

/**
 * As ferramentas de dev da partida.
 *
 * Existe para testar carta: sem isto, ver o que a #74 faz numa mesa de sete
 * exige jogar ate ela cair na mao, e ela pode nao cair. Aqui a carta vem para o
 * topo do baralho — ou direto para a mao — e o resto da partida acontece
 * normalmente.
 *
 * Nao e uma tela do jogo, e nao tenta parecer uma: a borda tracejada e o rotulo
 * DEV existem para que nenhuma captura de tela deste painel seja confundida com
 * a mesa de verdade.
 *
 * Todo poder daqui e cirurgia no estado (`domain/match/dev.js`), nunca comando
 * do motor — ver o cabecalho de la para o porque.
 *
 * Vale nos dois lugares: no solo, e na partida marcada com cheats (migration
 * 0013), onde a cirurgia viaja como comando `dev.*` e fica escrita no log. O
 * que nao vale nos dois e o ritmo: os bots sao comandados pelo host, e o botao
 * de pausa na tela do convidado nao pararia nada — dai `canDriveBots`.
 */
export function DevPanel({
    state,
    you,
    reveal,
    onToggleReveal,
    canDriveBots = true,
    botsPaused,
    onToggleBots,
    onStepBots,
    hasBotCommand,
    onPickForDeck,
    onPickForHand,
    onCloseWindow,
    onInspect,
    onClose
}){

    const nextDraw = you.deck[0];

    return (
        <Modal onClose={onClose} label='Ferramentas de dev'>
            <div className={`
                flex flex-col gap-4 w-full px-4 py-5
                rounded-2xl border border-dashed border-gold/50 bg-surface/95
            `}>
                <header className='flex flex-col items-center gap-1 text-center'>
                    <span className={`
                        px-2 py-0.5 rounded-full
                        border border-gold/50 text-[0.6rem] font-bold
                        tracking-widest text-gold
                    `}>
                        DEV
                    </span>
                    <p className='text-xs text-cream-dim'>
                        Tudo que você mexer aqui aparece no log da partida — e,
                        numa mesa com outra gente, com o seu nome.
                    </p>
                </header>

                <Section title='Compra'>
                    <p className='text-[0.7rem] text-cream-dim'>
                        {nextDraw
                            ? <>Sua próxima compra é <strong className='text-cream'>{cardName(nextDraw)}</strong>.</>
                            : 'Seu baralho acabou.'}
                    </p>
                    <ActionButton text='Escolher a próxima compra'
                        variant='gold'
                        icon={ICONS.deck}
                        action={onPickForDeck}
                    />
                    <ActionButton text='Carta direto na mão'
                        variant='secondary'
                        icon={ICONS.add}
                        action={onPickForHand}
                    />
                </Section>

                <Section title='Ritmo'>
                    {/* Parar os bots e coisa de quem os comanda. Numa mesa, e
                        o host: para o convidado os dois controles seriam
                        botoes que nao fazem nada. */}
                    {canDriveBots && <>
                        <Toggle label='Pausar os bots'
                            hint='Segura também a passagem de vez; o relógio da janela continua correndo.'
                            active={botsPaused}
                            onToggle={onToggleBots}
                        />
                        <ActionButton text='Um passo da mesa'
                            variant='secondary'
                            icon={ICONS.play}
                            disabled={!botsPaused || !hasBotCommand}
                            action={onStepBots}
                        />
                    </>}
                    <ActionButton text='Fechar a janela agora'
                        variant='secondary'
                        icon={ICONS.history}
                        disabled={state.phase !== Phase.window}
                        action={onCloseWindow}
                    />
                </Section>

                <Section title='Mesa'>
                    <Toggle label='Revelar tudo'
                        hint='Missões e mãos dos bots, na mesa e aqui.'
                        active={reveal}
                        onToggle={onToggleReveal}
                    />
                    <ul className='flex flex-col gap-2'>
                        {state.order.map(id => {
                            const player = state.players.find(p => p.id === id);
                            if(!player) return null;
                            const open = reveal || player.id === you.id;
                            return (
                                <li key={id} className={`
                                    flex flex-col gap-1
                                    px-2.5 py-2 rounded-xl
                                    border border-line bg-elevated
                                `}>
                                    <div className='flex items-baseline justify-between gap-2'>
                                        <span className='truncate text-xs font-semibold'>
                                            {player.id === you.id ? 'Você' : player.name}
                                        </span>
                                        <span className='shrink-0 text-[0.6rem] tabular-nums text-cream-dim'>
                                            {player.shots} shots · mão {player.hand.length} · baralho {player.deck.length}
                                        </span>
                                    </div>
                                    <span className='text-[0.65rem] text-brand-light'>
                                        {open || player.missionRevealed
                                            ? missionName(player.mission)
                                            : 'missão secreta'}
                                    </span>
                                    {open && player.hand.length > 0 && <ul className='flex flex-wrap gap-1'>
                                        {player.hand.map((idCard, index) => (
                                            <li key={`${idCard}:${index}`}>
                                                <button type='button'
                                                    onClick={() => onInspect?.(cardById(idCard))}
                                                    className={`
                                                        px-1.5 py-0.5 rounded-lg
                                                        border border-line bg-base
                                                        text-[0.6rem] text-cream-dim
                                                        transition-transform active:scale-95
                                                    `}
                                                >
                                                    {cardName(idCard)}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>}
                                </li>
                            );
                        })}
                    </ul>
                </Section>

                <ActionButton text='Voltar ao jogo'
                    variant='secondary'
                    action={onClose}
                />
            </div>
        </Modal>
    );
}

function Section({ title, children }){
    return (
        <section className='flex flex-col gap-2'>
            <h3 className='text-[0.7rem] font-bold uppercase tracking-wider text-cream-dim'>
                {title}
            </h3>
            {children}
        </section>
    );
}

/**
 * Interruptor. Nao e ActionButton porque o estado ligado precisa aparecer sem
 * ler o texto — o painel se usa no meio da partida, de relance.
 */
function Toggle({ label, hint, active, onToggle }){
    return (
        <button type='button'
            onClick={onToggle}
            aria-pressed={active}
            className={`
                flex items-center justify-between gap-3
                px-3 py-2.5 rounded-xl border text-left
                transition-transform active:scale-[0.98]
                ${active
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-line bg-elevated text-cream'}
            `}
        >
            <span className='flex flex-col gap-0.5'>
                <span className='text-sm font-semibold'>{label}</span>
                {hint && <span className='text-[0.65rem] text-cream-dim'>{hint}</span>}
            </span>
            <span className={`
                shrink-0 flex items-center justify-center
                h-6 w-6 rounded-full border text-xs
                ${active ? 'border-gold bg-gold/20 text-gold' : 'border-line'}
            `}>
                {active && <ICONS.check />}
            </span>
        </button>
    );
}

/** A alca, no canto da mesa. Tracejada: nao faz parte do jogo. */
export function DevButton({ active, onClick }){
    return (
        <button type='button'
            onClick={onClick}
            aria-label='Abrir as ferramentas de dev'
            className={`
                flex items-center justify-center
                h-9 px-2.5 rounded-xl
                border border-dashed text-[0.6rem] font-bold tracking-widest
                transition-transform active:scale-95
                focus:outline-none focus-visible:ring-2 focus-visible:ring-gold
                ${active
                    ? 'border-gold bg-gold/15 text-gold'
                    : 'border-gold/40 bg-base/70 text-gold/70'}
            `}
        >
            DEV
        </button>
    );
}
