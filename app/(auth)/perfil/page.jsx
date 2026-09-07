'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/providers/UserProvider';
import { setAvatar, userHaveCard } from '@/presenters/usersPresenter';
import { signOut } from '@/services/AuthService';
import { CARDS } from '@/assets/cards';
import { PACKS } from '@/assets/packs';
import { ICONS } from '@/assets/icons';
import { getAvatar } from '@/assets/avatars';
import { Main } from '@/components/containers/Main';
import { PageHeader } from '@/components/elements/PageHeader';
import { Avatar } from '@/components/elements/Avatar';
import { ActionButton } from '@/components/buttons/ActionButton';
import { ErrorMessage } from '@/components/elements/ErrorMessage';
import { AvatarPickerModal } from '@/components/profile/AvatarPickerModal';

/**
 * O perfil.
 *
 * O que o jogador tem, num lugar so: a foto, o nome, o saldo e o quanto da
 * colecao ja e dele. Nao e a colecao — aqui sao numeros, e a lista fica a um
 * toque de distancia, na tela que existe para isso.
 *
 * A unica coisa editavel e o avatar. Nome e coins tem dono no banco (o nome e
 * criado a mao junto do usuario; o saldo sai do buy_pack e do sell_card), e uma
 * tela que os mostrasse em campo de texto prometeria uma escrita que nao
 * existe.
 */
export default function Perfil(){

    const router = useRouter();
    const { user, refreshUser } = useUser();

    // O avatar mostrado sai deste estado, e nao direto do user: gravar leva uma
    // ida ao banco, e a grade precisa acender no toque. O user chega depois,
    // pelo refreshUser, e passa a concordar.
    const [avatarId, setAvatarId] = useState(user.avatar ?? null);

    const [isPicking, setIsPicking] = useState(false);
    const [saving, setSaving] = useState(null);
    const [error, setError] = useState(null);

    async function handlePick(idAvatar){
        if(idAvatar === avatarId){
            setIsPicking(false);
            return;
        }
        const previous = avatarId;
        setError(null);
        setSaving(idAvatar);
        setAvatarId(idAvatar);
        try{
            await setAvatar(idAvatar);
            await refreshUser();
            setIsPicking(false);
        }catch(err){
            // Volta ao que era: o otimismo acima so se sustenta se o erro
            // desfizer a marca, senao a tela mente sobre o que esta gravado.
            setAvatarId(previous);
            setError(err);
        }finally{
            setSaving(null);
        }
    }

    const userCards = CARDS.filter(card => userHaveCard(user, card.id));
    const totalProgress = Math.round((userCards.length / CARDS.length) * 100);

    return (
        <Main>
            <PageHeader title='Perfil' />

            <div className={`
                flex flex-col gap-4 w-full
                flex-1 min-h-0 pb-2
                overflow-y-auto scrollbar-custom
            `}>
                <section className={`
                    w-full panel p-4 flex flex-col items-center gap-3 shrink-0
                    animate-fade-rise
                `}>
                    <button type='button'
                        onClick={() => setIsPicking(true)}
                        aria-label='Trocar avatar'
                        className={`
                            relative rounded-full
                            transition-transform active:scale-95
                            focus:outline-none focus-visible:ring-2
                            focus-visible:ring-brand-light
                        `}
                    >
                        <Avatar id={avatarId} size={96} />
                        {/* O lapis no canto: sem ele, um circulo no meio da
                            tela nao diz que e um botao. */}
                        <span className={`
                            absolute -right-1 -bottom-1
                            flex items-center justify-center
                            h-8 w-8 rounded-full text-sm
                            border border-line bg-elevated text-cream
                        `}>
                            <ICONS.add />
                        </span>
                    </button>

                    <div className='flex flex-col items-center gap-1 w-full min-w-0'>
                        <h2 className='text-xl font-bold truncate max-w-full'>
                            {user.name}
                        </h2>
                        <span className='text-xs text-cream-dim'>
                            {getAvatar(avatarId).label}
                            {user.is_dev && ' · dev'}
                        </span>
                    </div>

                    <ActionButton text='Trocar avatar'
                        variant='secondary'
                        icon={ICONS.user}
                        action={() => setIsPicking(true)}
                    />
                    {/* Erro de gravacao com o modal aberto ja aparece la
                        dentro, ao lado da grade que o causou. */}
                    {error && !isPicking && <ErrorMessage error={error} />}
                </section>

                <section className='grid grid-cols-2 gap-2.5 w-full shrink-0 animate-fade-rise'>
                    <Stat label='Coins' value={user.coins} icon={ICONS.coins} gold />
                    <Stat label='Cópias' value={user.cards.length} icon={ICONS.deck} />
                </section>

                <section className='w-full panel p-4 flex flex-col gap-3 shrink-0 animate-fade-rise'>
                    <div className='flex items-center justify-between gap-3'>
                        <h3 className='font-semibold'>Coleção</h3>
                        <span className='text-xs text-cream-dim'>
                            <strong className='text-cream'>{userCards.length}</strong> de {CARDS.length}
                        </span>
                    </div>
                    <div className='h-1.5 w-full rounded-full bg-elevated overflow-hidden'>
                        <div className={`
                            h-full rounded-full
                            bg-linear-to-r from-brand to-brand-light
                            transition-[width] duration-500
                        `}
                            style={{ width: `${totalProgress}%` }}
                        />
                    </div>

                    {/* Por pacote, e nao so o total: e o recorte que diz o que
                        ainda vale comprar na loja. */}
                    <ul className='flex flex-col gap-1.5'>
                        {PACKS.map(pack => {
                            const packCards = CARDS.filter(card => card.idPack === pack.id);
                            const owned = packCards.filter(card => userHaveCard(user, card.id)).length;
                            return (
                                <li key={pack.id}
                                    className='flex items-center justify-between gap-3 text-xs'
                                >
                                    <span className='text-cream-dim truncate'>
                                        {pack.name}
                                    </span>
                                    <span className='shrink-0 tabular-nums'>
                                        {owned}/{packCards.length}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <div className='w-full shrink-0 pb-2'>
                    <ActionButton text='Sair'
                        variant='danger'
                        icon={ICONS.logout}
                        action={async () => {
                            const res = await signOut();
                            if(!res.success){
                                setError(res);
                                return;
                            }
                            // replace, como no Header: voltar nao pode devolver
                            // uma tela autenticada e ja sem sessao.
                            router.replace('/');
                            router.refresh();
                        }}
                    />
                </div>
            </div>

            {isPicking && <AvatarPickerModal
                current={avatarId}
                saving={saving}
                error={error}
                onPick={handlePick}
                onClose={() => {
                    setIsPicking(false);
                    setError(null);
                }}
            />}
        </Main>
    );
}

function Stat({ label, value, icon: Icon, gold }){
    return (
        <div className={`
            flex items-center gap-3 p-3 panel
            ${gold ? 'border-gold/25' : ''}
        `}>
            <span className={`
                flex items-center justify-center shrink-0
                h-10 w-10 rounded-xl border
                ${gold
                    ? 'border-gold/30 bg-gold/10 text-gold'
                    : 'border-brand-light/25 bg-brand/25 text-brand-light'}
            `}>
                <Icon />
            </span>
            <span className='flex flex-col min-w-0'>
                <span className='text-lg font-bold tabular-nums leading-tight'>
                    {value}
                </span>
                <span className='text-[0.65rem] uppercase tracking-widest text-cream-dim'>
                    {label}
                </span>
            </span>
        </div>
    );
}
