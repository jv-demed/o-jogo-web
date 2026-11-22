'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CARDS } from '@/assets/cards';
import { ICONS } from '@/assets/icons';
import { useUser } from '@/providers/UserProvider';
import { useSoloMatch } from '@/hooks/useSoloMatch';
import { createLabMatch } from '@/domain/match/lab';
import { isReaction } from '@/domain/match/engine';
import { ALL_MISSIONS, MISSIONS } from '@/domain/match/missions';
import { SCENARIOS } from '@/scripts/scenarios/index.mjs';
import { Main } from '@/components/containers/Main';
import { Box } from '@/components/containers/Box';
import { PageHeader } from '@/components/elements/PageHeader';
import { ActionButton } from '@/components/buttons/ActionButton';
import { MatchScreen } from '@/components/game/MatchScreen';
import { CardPickerModal } from '@/components/dev/CardPickerModal';
import { ScenarioPickerModal } from '@/components/dev/ScenarioPickerModal';
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

// Quanto o bot pensa no laboratorio (3s), contra 0,9s na partida. Aqui a mesa e
// lida escolha por escolha — em quem o bot apontou, se ele entrou na bebida,
// se reagiu — e no ritmo do jogo a resposta dele chega antes de dar para ver
// a pergunta. Passar a janela continua rapido: nao ha escolha para ler.
const LAB_BOT_DELAY = 3000;
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
    // Carta de defesa: { seat, idCard, choices? } — o bot que joga primeiro.
    trigger: null,
    // Carta comum jogada por um bot em vez de voce: { seat, choices? }.
    playedBy: null,
    // Se os bots ficam com as defesas do sorteio. Desligado, a carta testada
    // resolve: com a mesa cheia quase sempre alguem tinha com o que bloquear.
    botsDefend: false,
};

/** Assento (indice) de quem tem a missao, ou de numero (1..N), como no cenario. */
const seatOf = (mesa, who) => typeof who === 'string'
    ? Math.max(0, mesa.findIndex(seat => seat.mission === who))
    : Math.max(0, (who ?? 1) - 1);

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
    // `voce` e so do laboratorio: o assento que e voce, quando a carta e
    // jogada por outro. Sem ele, voce e quem joga.
    const yourSeat = seatOf(scenario.mesa, scenario.voce ?? scenario.joga);
    const { gatilho } = scenario;
    // Os alvos vem em missao ou numero, e o laboratorio fala em assento: a
    // mesa ainda nao existe quando o formulario e preenchido.
    const toSeats = choices => Object.fromEntries(Object.entries(choices ?? {}).map(([slot, value]) =>
        [slot, Array.isArray(value) ? value.map(who => seatOf(scenario.mesa, who)) : value]));
    const trigger = gatilho ? {
        seat: seatOf(scenario.mesa, gatilho.joga),
        idCard: gatilho.carta,
        choices: toSeats(gatilho.escolhas),
    } : null;
    const playerSeat = seatOf(scenario.mesa, scenario.joga);
    const playedBy = !gatilho && playerSeat !== yourSeat
        ? { seat: playerSeat, choices: toSeats(scenario.escolhas) }
        : null;
    return { idCard: scenario.carta, seats, yourSeat, extra: [], trigger, playedBy, botsDefend: false };
}

export default function CardLab(){

    const router = useRouter();
    const { user, isDev } = useUser();
    const {
        state, you, error, dismissError,
        isYourTurn, isOver, load, leave, dispatch,
        devDispatch, botsPaused, setBotsPaused, stepBots, hasBotCommand
    } = useSoloMatch({ botDelay: LAB_BOT_DELAY });

    const [form, setForm] = useState(INITIAL_FORM);
    // Como a mesa saiu do "Montar". O "Repetir" monta de novo com a mesma
    // semente, e nao recarrega o estado guardado: com gatilho a mesa ja nasce
    // na janela, e o relogio dela tem que comecar agora, nao no primeiro Montar.
    const [prepared, setPrepared] = useState(null);

    useEffect(() => {
        if(!isDev) router.replace('/home');
    }, [isDev, router]);

    if(!isDev) return null;

    const build = params => load(createLabMatch({ ...params, now: Date.now() }));

    function handleBuild(){
        const params = {
            seed: Date.now(),
            you: { id: user.id, name: user.name, avatar: user.avatar },
            idCard: form.idCard,
            seats: form.seats,
            yourSeat: form.yourSeat,
            extra: form.extra,
            pool: CATALOG_IDS,
            trigger: form.trigger,
            playedBy: form.playedBy,
            botsDefend: form.botsDefend,
        };
        setPrepared(params);
        build(params);
    }

    const handleRepeat = () => prepared && build(prepared);

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
        // Gatilho e de carta de defesa, e "quem joga" e de carta comum: trocar
        // de um tipo para o outro descarta o que nao vale mais, em vez de
        // deixar escondido valendo.
        if(picking === 'card') update({
            idCard: card.id,
            trigger: isReaction(card.id) ? form.trigger : null,
            playedBy: isReaction(card.id) ? null : form.playedBy,
        });
        else if(picking === 'trigger') setTrigger({ idCard: card.id });
        else update({ extra: [...form.extra, card.id] });
        setPicking(null);
    }

    const firstBot = you => (you === 0 ? 1 : 0);

    // Mexer no gatilho a mao descarta os alvos que vieram do cenario: eles
    // apontam assentos de uma mesa que pode nao ser mais esta.
    function setTrigger(patch){
        setForm(prev => ({
            ...prev,
            trigger: {
                seat: prev.trigger?.seat ?? firstBot(prev.yourSeat),
                idCard: prev.trigger?.idCard ?? CARDS[0].id,
                ...patch,
                choices: undefined,
            },
        }));
    }

    // O gatilho e de um bot: sentar na cadeira dele empurra o gatilho para o
    // primeiro bot, em vez de deixar a mesa impossivel de montar.
    function setYourSeat(index){
        setForm(prev => ({
            ...prev,
            yourSeat: index,
            trigger: prev.trigger?.seat === index
                ? { ...prev.trigger, seat: firstBot(index), choices: undefined }
                : prev.trigger,
            playedBy: prev.playedBy?.seat === index ? null : prev.playedBy,
        }));
    }

    // Escolher quem joga a mao descarta os alvos do cenario, pelo mesmo motivo
    // do gatilho.
    const setPlayedBy = seat => update({
        playedBy: seat === form.yourSeat ? null : { seat },
    });

    const triggerValid = !form.trigger
        || (form.trigger.seat !== form.yourSeat && form.trigger.seat < form.seats.length);

    // O cenario carregado, para o botao dizer qual e. Mexer no formulario
    // depois nao o apaga: a mesa continua sendo "a do cenario, ajustada".
    const [loaded, setLoaded] = useState(null);

    function handleScenario(scenario){
        setForm(formFromScenario(scenario));
        setLoaded(scenario);
        setPicking(null);
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
                        <button type='button'
                            onClick={() => setPicking('scenario')}
                            className={`
                                flex items-center justify-between gap-2
                                px-3 py-2.5 rounded-2xl border text-left
                                transition-transform active:scale-[0.98]
                                ${loaded ? 'border-gold bg-gold/10' : 'border-line bg-elevated'}
                            `}
                        >
                            <span className='min-w-0 flex flex-col'>
                                <span className={`text-sm font-semibold truncate ${loaded ? 'text-cream' : 'text-cream-dim'}`}>
                                    {loaded ? `#${loaded.carta} ${cardName(loaded.carta)}` : 'Nenhum cenário'}
                                </span>
                                {loaded && <span className='text-[0.7rem] text-cream-dim truncate'>
                                    {loaded.nome.includes(': ') ? loaded.nome.slice(loaded.nome.indexOf(': ') + 2) : loaded.nome}
                                </span>}
                            </span>
                            <span className='shrink-0 text-[0.7rem] text-cream-dim'>
                                {SCENARIOS.length} cenários
                            </span>
                        </button>
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
                                    onYou={() => setYourSeat(index)}
                                    onChange={patch => setSeat(index, patch)}
                                />
                            ))}
                        </ul>
                    </section>

                    {!isReaction(form.idCard) && <section className='flex flex-col gap-2'>
                        <span className='text-sm font-semibold'>Quem joga a carta</span>
                        <div className='flex flex-wrap gap-1.5'>
                            {form.seats.map((seat, index) => {
                                const active = (form.playedBy?.seat ?? form.yourSeat) === index;
                                return (
                                    <button key={index}
                                        type='button'
                                        onClick={() => setPlayedBy(index)}
                                        aria-pressed={active}
                                        className={`
                                            h-9 px-3 rounded-xl text-xs font-semibold
                                            border transition-transform active:scale-95
                                            ${active
                                                ? 'border-gold bg-gold/15 text-gold'
                                                : 'border-line bg-elevated text-cream-dim'}
                                        `}
                                    >
                                        {index === form.yourSeat ? 'Você' : `Bot ${index + 1}`}
                                    </button>
                                );
                            })}
                        </div>
                        {form.playedBy && <span className='text-[0.65rem] text-cream-dim'>
                            {form.playedBy.choices && Object.keys(form.playedBy.choices).length
                                ? 'O bot joga na vez dele, nos alvos do cenário.'
                                : 'O bot joga na vez dele e escolhe os alvos sozinho.'}
                        </span>}
                    </section>}

                    {isReaction(form.idCard) && <section className='flex flex-col gap-2'>
                        <span className='text-sm font-semibold'>Gatilho (carta de defesa)</span>
                        <p className='text-[0.7rem] text-cream-dim'>
                            Um bot joga primeiro e a mesa começa na janela dessa jogada,
                            com a carta testada na sua mão.
                        </p>
                        {form.trigger
                            ? <div className='flex flex-col gap-1.5'>
                                <div className='flex items-center gap-2'>
                                    <select value={form.trigger.seat}
                                        onChange={event => setTrigger({ seat: Number(event.target.value) })}
                                        aria-label='Bot que joga o gatilho'
                                        className='h-9 px-1 rounded-lg border border-line bg-base text-xs text-cream'
                                    >
                                        {form.seats.map((seat, index) => index === form.yourSeat ? null : (
                                            <option key={index} value={index}>Bot {index + 1}</option>
                                        ))}
                                    </select>
                                    <button type='button'
                                        onClick={() => setPicking('trigger')}
                                        className='flex-1 min-w-0 h-9 px-2 rounded-lg border border-gold bg-gold/10 text-left text-xs font-semibold truncate'
                                    >
                                        joga #{form.trigger.idCard} {cardName(form.trigger.idCard)}
                                    </button>
                                    <button type='button'
                                        onClick={() => update({ trigger: null })}
                                        aria-label='Tirar o gatilho'
                                        className='shrink-0 w-9 h-9 rounded-lg border border-line text-sm text-cream-dim'
                                    >×</button>
                                </div>
                                <span className='text-[0.65rem] text-cream-dim'>
                                    {form.trigger.choices && Object.keys(form.trigger.choices).length
                                        ? 'Alvos do gatilho: os do cenário.'
                                        : 'Alvos do gatilho: o bot escolhe.'}
                                </span>
                            </div>
                            : <>
                                {isReaction(form.idCard) && <span className='text-[0.65rem] text-gold'>
                                    Sem gatilho escolhido: o bot antes de você joga uma carta
                                    sorteada entre as que a #{form.idCard} combate.
                                </span>}
                                <ActionButton text='Um bot joga antes'
                                variant='secondary'
                                icon={ICONS.add}
                                action={() => setTrigger({})}
                            />
                            </>}
                    </section>}

                    <section className='flex flex-col gap-2'>
                        <label className='flex items-center justify-between gap-3'>
                            <span className='flex flex-col'>
                                <span className='text-sm font-semibold'>Bots podem bloquear</span>
                                <span className='text-[0.65rem] text-cream-dim'>
                                    {form.botsDefend
                                        ? 'Os bots ficam com as defesas que o sorteio deu.'
                                        : 'As defesas saem da mão dos bots (menos a mão escrita no cenário).'}
                                </span>
                            </span>
                            <input type='checkbox'
                                checked={form.botsDefend}
                                onChange={event => update({ botsDefend: event.target.checked })}
                                className='shrink-0 w-5 h-5 accent-gold'
                            />
                        </label>
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
                            disabled={!triggerValid}
                        />
                    </div>
                </div>
            </Box>

            {picking === 'scenario' && <ScenarioPickerModal
                scenarios={SCENARIOS}
                onPick={handleScenario}
                onClose={() => setPicking(null)}
            />}

            {picking && picking !== 'scenario' && <CardPickerModal
                title={{ card: 'Carta a testar', trigger: 'Carta do gatilho' }[picking] ?? 'Carta extra'}
                hint={{
                    card: form.trigger
                        ? 'Com gatilho, entra direto na sua mão.'
                        : 'Vem para o topo do seu baralho e chega pela compra da sua vez. Carta de defesa entra direto na sua mão.',
                    trigger: 'O bot compra esta carta e joga ela na vez dele.',
                }[picking] ?? 'Entra na sua mão.'}
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
