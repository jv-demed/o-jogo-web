'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CARDS } from '@/assets/cards';
import { ICONS } from '@/assets/icons';
import { useUser } from '@/providers/UserProvider';
import { useSoloMatch } from '@/hooks/useSoloMatch';
import { createLabMatch } from '@/domain/match/lab';
import { ALL_MISSIONS, MISSIONS } from '@/domain/match/missions';
import { SCENARIOS } from '@/scripts/scenarios/index.mjs';
import { Main } from '@/components/containers/Main';
import { Box } from '@/components/containers/Box';
import { PageHeader } from '@/components/elements/PageHeader';
import { ActionButton } from '@/components/buttons/ActionButton';
import { MatchScreen } from '@/components/game/MatchScreen';
import { CardPickerModal } from '@/components/dev/CardPickerModal';
import { cardName } from '@/components/game/narrate';

/**
 * Laboratorio de carta: a mesa do solo montada como voce quiser, comecando na
 * sua vez com a carta na mao.
 *
 * Existe porque o cenario (scripts/scenarios/) diz se o estado ficou certo, mas
 * nao mostra se a tela conta a historia certa — quem ve o que, para quem a
 * escolha aparece, se a fila de shots entrega alguem. Para isso e preciso
 * jogar, e chegar na mesa certa jogando leva varios turnos.
 *
 * Nao e um caminho de jogo paralelo: a mesa nasce do `createLabMatch`, que e o
 * `createSoloMatch` de sempre mais cirurgia de dev, e roda no `useSoloMatch`
 * como qualquer solo. Toda jogada passa pelo `apply`. Nada aqui fala com o
 * Supabase — o solo e em memoria, e recarregar perde a mesa.
 *
 * So para quem tem `is_dev`. Quem nao tem e mandado para o menu sem aviso: uma
 * tela de "acesso negado" contaria que a rota existe. A trava e so de tela, e
 * basta, porque nada daqui grava coisa nenhuma — ver o comentario do `isDev`
 * no UserProvider.
 */

const CATALOG_IDS = CARDS.map(card => card.id);
const SEAT_COUNTS = [2, 3, 4, 5, 6, 7];

const defaultSeats = count => Array.from({ length: count }, (_, i) => ({
    mission: ALL_MISSIONS[i % ALL_MISSIONS.length],
    shots: 0,
}));

const INITIAL_FORM = {
    idCard: CARDS[0].id,
    seats: defaultSeats(5),
    yourSeat: 0,
    extra: [],
};

/**
 * A mesa de um cenario, no formato do formulario. O assento que joga no
 * cenario e voce: e a carta dele que se quer ver na tela.
 */
function formFromScenario(scenario){
    const seats = scenario.mesa.map(seat => ({
        mission: seat.mission,
        shots: seat.shots ?? 0,
        ...(seat.mao ? { hand: seat.mao } : {}),
    }));
    const yourSeat = typeof scenario.joga === 'string'
        ? Math.max(0, scenario.mesa.findIndex(seat => seat.mission === scenario.joga))
        : Math.max(0, (scenario.joga ?? 1) - 1);
    return { idCard: scenario.carta, seats, yourSeat, extra: [] };
}

export default function CardLab(){

    const router = useRouter();
    const { user, isDev } = useUser();
    const {
        state, you, error, dismissError,
        isYourTurn, isOver, load, leave, dispatch,
        devDispatch, botsPaused, setBotsPaused, stepBots, hasBotCommand
    } = useSoloMatch();

    const [form, setForm] = useState(INITIAL_FORM);
    // A mesa como ela saiu do "Montar". O "Repetir" carrega ela de novo: o
    // estado e imutavel, entao o que foi jogado depois nao a alcanca.
    const [prepared, setPrepared] = useState(null);

    useEffect(() => {
        if(!isDev) router.replace('/home');
    }, [isDev, router]);

    if(!isDev) return null;

    function handleBuild(){
        const match = createLabMatch({
            seed: Date.now(),
            you: { id: user.id, name: user.name, avatar: user.avatar },
            idCard: form.idCard,
            seats: form.seats,
            yourSeat: form.yourSeat,
            extra: form.extra,
            pool: CATALOG_IDS,
        });
        setPrepared(match);
        load(match);
    }

    const handleRepeat = () => prepared && load(prepared);

    if(!state){
        return <LabForm form={form} setForm={setForm} onBuild={handleBuild} />;
    }

    return (
        <>
            <MatchScreen
                state={state}
                you={you}
                error={error}
                dismissError={dismissError}
                isYourTurn={isYourTurn}
                isOver={isOver}
                dispatch={dispatch}
                onLeave={leave}
                onRestart={handleRepeat}
                dev={{ isDev, devDispatch, botsPaused, setBotsPaused, stepBots, hasBotCommand }}
            />
            {/* Tracejado como a alca DEV: nao faz parte do jogo, e nenhuma
                captura de tela deve confundir este botao com a mesa. Fica por
                cima dos modais (z-50) de proposito: repetir e o jeito de sair
                de qualquer estado, inclusive de uma cobranca de shot. */}
            <button type='button'
                onClick={handleRepeat}
                aria-label='Repetir a mesa montada'
                className={`
                    fixed top-2 left-1/2 -translate-x-1/2 z-[60]
                    h-8 px-3 rounded-xl
                    border border-dashed border-gold/50 bg-base/80
                    text-[0.6rem] font-bold tracking-widest text-gold
                    transition-transform active:scale-95
                `}
            >
                REPETIR
            </button>
        </>
    );
}

/** O formulario. Curto de proposito: o resto da mesa e sorteado como no solo. */
function LabForm({ form, setForm, onBuild }){

    // O que o seletor de carta esta escolhendo agora: a carta testada ou uma
    // extra para a mao.
    const [picking, setPicking] = useState(null);

    const update = patch => setForm(prev => ({ ...prev, ...patch }));

    function setSeat(index, patch){
        setForm(prev => ({
            ...prev,
            seats: prev.seats.map((seat, i) => i === index ? { ...seat, ...patch } : seat),
        }));
    }

    function setSeatCount(count){
        setForm(prev => {
            const fresh = defaultSeats(count);
            return {
                ...prev,
                seats: fresh.map((seat, i) => prev.seats[i] ?? seat),
                yourSeat: Math.min(prev.yourSeat, count - 1),
            };
        });
    }

    function handlePick(card){
        if(picking === 'card') update({ idCard: card.id });
        else update({ extra: [...form.extra, card.id] });
        setPicking(null);
    }

    function handleScenario(event){
        const scenario = SCENARIOS[Number(event.target.value)];
        if(scenario) setForm(formFromScenario(scenario));
        event.target.value = '';
    }

    return (
        <Main>
            <PageHeader title='Laboratório de carta' />
            <Box fullH>
                <div className='flex flex-col gap-5 h-full'>
                    <p className='text-xs text-cream-dim'>
                        Monta a mesa do solo e começa na sua vez, com a carta já comprada.
                        Os bots respondem as escolhas deles sozinhos. Nada é salvo.
                    </p>

                    {SCENARIOS.length > 0 && <section className='flex flex-col gap-2'>
                        <span className='text-sm font-semibold'>Carregar de um cenário</span>
                        <select defaultValue=''
                            onChange={handleScenario}
                            className='h-10 px-2 rounded-xl border border-line bg-elevated text-sm text-cream'
                        >
                            <option value='' disabled>scripts/scenarios…</option>
                            {SCENARIOS.map((scenario, index) => (
                                <option key={index} value={index}>
                                    #{scenario.carta} — {scenario.nome}
                                </option>
                            ))}
                        </select>
                    </section>}

                    <section className='flex flex-col gap-2'>
                        <span className='text-sm font-semibold'>Carta</span>
                        <button type='button'
                            onClick={() => setPicking('card')}
                            className={`
                                flex items-center justify-between gap-2
                                px-3 py-2.5 rounded-2xl border border-gold bg-gold/10 text-left
                            `}
                        >
                            <span className='text-sm font-semibold'>
                                #{form.idCard} {cardName(form.idCard)}
                            </span>
                            <span className='text-[0.7rem] text-cream-dim'>trocar</span>
                        </button>
                    </section>

                    <section className='flex flex-col gap-2'>
                        <span className='text-sm font-semibold'>Assentos</span>
                        <div className='flex gap-1.5'>
                            {SEAT_COUNTS.map(count => (
                                <button key={count}
                                    type='button'
                                    onClick={() => setSeatCount(count)}
                                    className={`
                                        flex-1 h-9 rounded-xl text-sm font-semibold
                                        border transition-transform active:scale-95
                                        ${form.seats.length === count
                                            ? 'border-gold bg-gold/15 text-gold'
                                            : 'border-line bg-elevated text-cream-dim'}
                                    `}
                                >
                                    {count}
                                </button>
                            ))}
                        </div>
                        <ul className='flex flex-col gap-1.5'>
                            {form.seats.map((seat, index) => (
                                <SeatRow key={index}
                                    index={index}
                                    seat={seat}
                                    isYou={form.yourSeat === index}
                                    onYou={() => update({ yourSeat: index })}
                                    onChange={patch => setSeat(index, patch)}
                                />
                            ))}
                        </ul>
                    </section>

                    <section className='flex flex-col gap-2'>
                        <span className='text-sm font-semibold'>Cartas extras na sua mão</span>
                        {form.extra.length > 0 && <ul className='flex flex-wrap gap-1'>
                            {form.extra.map((idCard, index) => (
                                <li key={`${idCard}:${index}`}>
                                    <button type='button'
                                        onClick={() => update({ extra: form.extra.filter((_, i) => i !== index) })}
                                        aria-label={`Tirar ${cardName(idCard)}`}
                                        className='px-2 py-1 rounded-lg border border-line bg-elevated text-[0.7rem] text-cream-dim'
                                    >
                                        #{idCard} {cardName(idCard)} ×
                                    </button>
                                </li>
                            ))}
                        </ul>}
                        <ActionButton text='Adicionar carta'
                            variant='secondary'
                            icon={ICONS.add}
                            action={() => setPicking('extra')}
                        />
                    </section>

                    <div className='mt-auto'>
                        <ActionButton text='Montar'
                            variant='gold'
                            icon={ICONS.play}
                            action={onBuild}
                        />
                    </div>
                </div>
            </Box>

            {picking && <CardPickerModal
                title={picking === 'card' ? 'Carta a testar' : 'Carta extra'}
                hint={picking === 'card'
                    ? 'Vem para o topo do seu baralho e chega pela compra da sua vez.'
                    : 'Entra na sua mão depois da compra.'}
                sources={[{ key: 'catalog', label: 'Catálogo', ids: CATALOG_IDS }]}
                onPick={handlePick}
                onClose={() => setPicking(null)}
            />}
        </Main>
    );
}

function SeatRow({ index, seat, isYou, onYou, onChange }){
    const shots = seat.shots ?? 0;
    return (
        <li className={`
            flex items-center gap-2 px-2 py-1.5 rounded-xl border
            ${isYou ? 'border-gold bg-gold/10' : 'border-line bg-elevated'}
        `}>
            <button type='button'
                onClick={onYou}
                aria-pressed={isYou}
                className={`
                    shrink-0 w-14 h-8 rounded-lg text-[0.65rem] font-semibold border
                    ${isYou ? 'border-gold text-gold' : 'border-line text-cream-dim'}
                `}
            >
                {isYou ? 'Você' : `Bot ${index + 1}`}
            </button>
            <select value={seat.mission}
                onChange={event => onChange({ mission: event.target.value })}
                aria-label={`Missão do assento ${index + 1}`}
                className='flex-1 min-w-0 h-8 px-1 rounded-lg border border-line bg-base text-xs text-cream'
            >
                {ALL_MISSIONS.map(mission => (
                    <option key={mission} value={mission}>{MISSIONS[mission].name}</option>
                ))}
            </select>
            <div className='shrink-0 flex items-center gap-1'>
                <button type='button'
                    onClick={() => onChange({ shots: Math.max(0, shots - 1) })}
                    aria-label={`Menos shots no assento ${index + 1}`}
                    className='w-7 h-8 rounded-lg border border-line text-sm'
                >−</button>
                <span className='w-12 text-center text-[0.7rem] tabular-nums'>{shots} {shots === 1 ? 'shot' : 'shots'}</span>
                <button type='button'
                    onClick={() => onChange({ shots: shots + 1 })}
                    aria-label={`Mais shots no assento ${index + 1}`}
                    className='w-7 h-8 rounded-lg border border-line text-sm'
                >+</button>
            </div>
        </li>
    );
}
