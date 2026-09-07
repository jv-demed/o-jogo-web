'use client'
import { AVATARS } from '@/assets/avatars';
import { ICONS } from '@/assets/icons';
import { Modal } from '@/components/containers/Modal';
import { Avatar } from '@/components/elements/Avatar';
import { ErrorMessage } from '@/components/elements/ErrorMessage';

/**
 * A grade de avatares.
 *
 * Escolher ja grava: nao ha botao de confirmar porque nao ha nada a compor —
 * um toque, um campo. Quem se arrepende toca em outro.
 *
 * O avatar em gravacao aparece marcado antes da resposta do banco (o `saving`
 * vem do pai, que ja pintou o otimismo), e a grade inteira trava enquanto isso:
 * dois toques rapidos em avatares diferentes chegariam fora de ordem.
 */
export function AvatarPickerModal({
    current,
    saving,
    error,
    onPick,
    onClose
}){
    return (
        <Modal label='Escolher avatar' onClose={onClose}>
            <div className='w-full panel p-4 flex flex-col gap-3'>
                <div>
                    <h2 className='font-semibold'>Escolher avatar</h2>
                    <p className='text-xs text-cream-dim mt-0.5'>
                        As artes definitivas ainda estão por vir; por enquanto,
                        um símbolo.
                    </p>
                </div>

                <ul className='grid grid-cols-4 gap-2'>
                    {AVATARS.map(avatar => {
                        const isCurrent = avatar.id === current;
                        return (
                            <li key={avatar.id}>
                                <button type='button'
                                    disabled={saving != null}
                                    aria-pressed={isCurrent}
                                    onClick={() => onPick(avatar.id)}
                                    className={`
                                        relative flex flex-col items-center gap-1
                                        w-full py-2 rounded-2xl border
                                        transition-transform
                                        enabled:active:scale-95
                                        disabled:opacity-60
                                        disabled:cursor-not-allowed
                                        focus:outline-none focus-visible:ring-2
                                        focus-visible:ring-brand-light
                                        ${isCurrent
                                            ? 'border-gold/60 bg-gold/10'
                                            : 'border-line bg-elevated'}
                                    `}
                                >
                                    <Avatar id={avatar.id} size={44} />
                                    <span className='text-[0.65rem] text-cream-dim truncate max-w-full px-1'>
                                        {avatar.label}
                                    </span>
                                    {isCurrent && <span className={`
                                        absolute right-1 top-1
                                        text-[0.6rem] text-gold
                                    `}>
                                        <ICONS.check />
                                    </span>}
                                </button>
                            </li>
                        );
                    })}
                </ul>

                {error && <ErrorMessage error={error} />}
            </div>
        </Modal>
    );
}
