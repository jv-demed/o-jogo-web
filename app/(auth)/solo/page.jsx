'use client'
import { useState } from 'react';
import { CARDS } from '@/assets/cards';
import { ICONS } from '@/assets/icons';
import { useUser } from '@/providers/UserProvider';
import { useSoloMatch } from '@/hooks/useSoloMatch';
import { DECK_SIZE } from '@/domain/match/setup';
import { Main } from '@/components/containers/Main';
import { Box } from '@/components/containers/Box';
import { PageHeader } from '@/components/elements/PageHeader';
import { ActionButton } from '@/components/buttons/ActionButton';
import { MatchScreen } from '@/components/game/MatchScreen';

/**
 * Jogo solo: voce contra bots, tudo no browser.
 *
 * Nao fala com o Supabase de proposito, e continua assim depois de a partida
 * ter ido para o banco: e a unica que comeca em um toque, sem sala, sem link e
 * sem ninguem do outro lado — que e o que se quer para provar uma carta. Nada
 * e salvo: recarregar a pagina recomeca.
 *
 * A mesa em si nao mora mais aqui. Ela e o `MatchScreen`, que a partida do
 * lobby desenha igual: as duas so discordam de onde o estado vem, e e por isso
 * que o solo continua sendo bancada de teste do jogo de verdade, e nao de um
 * jogo parecido.
 */

const CATALOG_IDS = CARDS.map(card => card.id);

export default function Solo(){

    const { user, isDev } = useUser();
    const {
        state, you, error, dismissError,
        isYourTurn, isOver, start, leave, dispatch,
        devDispatch, botsPaused, setBotsPaused, stepBots, hasBotCommand
    } = useSoloMatch();

    const [botCount, setBotCount] = useState(3);
    const [useCollection, setUseCollection] = useState(false);

    // A colecao vem como lista plana com repeticao; o baralho quer ids unicos.
    const collectionIds = [...new Set(user.cards)];
    const canUseCollection = collectionIds.length >= DECK_SIZE;

    function handleStart(){
        start({
            you: {
                id: user.id,
                name: user.name,
                deck: useCollection && canUseCollection ? collectionIds : undefined,
            },
            botCount,
            pool: useCollection && canUseCollection ? collectionIds : CATALOG_IDS,
        });
    }

    if(!state){
        return (
            <Setup
                botCount={botCount}
                setBotCount={setBotCount}
                useCollection={useCollection}
                setUseCollection={setUseCollection}
                canUseCollection={canUseCollection}
                collectionSize={collectionIds.length}
                onStart={handleStart}
            />
        );
    }

    return (
        <MatchScreen
            state={state}
            you={you}
            error={error}
            dismissError={dismissError}
            isYourTurn={isYourTurn}
            isOver={isOver}
            dispatch={dispatch}
            onLeave={leave}
            onRestart={handleStart}
            dev={{ isDev, devDispatch, botsPaused, setBotsPaused, stepBots, hasBotCommand }}
        />
    );
}

/**
 * A sala do solo. Duas decisoes so: com quantos bots, e de onde saem as cartas.
 * Mais que isso seria configurar em vez de jogar.
 */
function Setup({
    botCount, setBotCount,
    useCollection, setUseCollection,
    canUseCollection, collectionSize,
    onStart
}){
    return (
        <Main>
            <PageHeader title='Jogo solo' />
            <Box fullH>
                <div className='flex flex-col gap-5 h-full'>
                    <p className='text-xs text-cream-dim'>
                        Uma partida contra bots, sem sala e sem link. Cada bot entra com um
                        baralho sorteado de {DECK_SIZE} cartas. Nada é salvo.
                    </p>

                    <section className='flex flex-col gap-2'>
                        <span className='text-sm font-semibold'>Quantos bots</span>
                        <div className='flex gap-1.5'>
                            {/* Ate 6: sao 7 missoes, uma por jogador, e voce
                                ocupa uma delas. */}
                            {[1, 2, 3, 4, 5, 6].map(count => (
                                <button key={count}
                                    type='button'
                                    onClick={() => setBotCount(count)}
                                    className={`
                                        flex-1 h-11 rounded-xl text-sm font-semibold
                                        border transition-transform active:scale-95
                                        ${botCount === count
                                            ? 'border-gold bg-gold/15 text-gold'
                                            : 'border-line bg-elevated text-cream-dim'}
                                    `}
                                >
                                    {count}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className='flex flex-col gap-2'>
                        <span className='text-sm font-semibold'>De onde vêm as cartas</span>
                        <button type='button'
                            onClick={() => setUseCollection(false)}
                            className={`
                                flex flex-col items-start gap-0.5
                                px-3 py-2.5 rounded-2xl border text-left
                                ${!useCollection
                                    ? 'border-gold bg-gold/10'
                                    : 'border-line bg-elevated'}
                            `}
                        >
                            <span className='text-sm font-semibold'>Catálogo inteiro</span>
                            <span className='text-[0.7rem] text-cream-dim'>
                                As {CARDS.length} cartas, tenha você ou não.
                            </span>
                        </button>
                        <button type='button'
                            disabled={!canUseCollection}
                            onClick={() => setUseCollection(true)}
                            className={`
                                flex flex-col items-start gap-0.5
                                px-3 py-2.5 rounded-2xl border text-left
                                disabled:opacity-40 disabled:cursor-not-allowed
                                ${useCollection
                                    ? 'border-gold bg-gold/10'
                                    : 'border-line bg-elevated'}
                            `}
                        >
                            <span className='text-sm font-semibold'>Minha coleção</span>
                            <span className='text-[0.7rem] text-cream-dim'>
                                {canUseCollection
                                    ? `${collectionSize} cartas diferentes.`
                                    : `Precisa de ${DECK_SIZE} cartas diferentes; você tem ${collectionSize}.`}
                            </span>
                        </button>
                    </section>

                    <div className='mt-auto'>
                        <ActionButton text='Começar'
                            variant='gold'
                            icon={ICONS.play}
                            action={onStart}
                        />
                    </div>
                </div>
            </Box>
        </Main>
    );
}
