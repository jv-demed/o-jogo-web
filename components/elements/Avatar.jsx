import Image from 'next/image';
import { getAvatar } from '@/assets/avatars';

/**
 * A foto do jogador, do tamanho que pedirem.
 *
 * O tamanho vem em pixels e vai para o style, e nao para uma classe do
 * Tailwind: o mesmo componente serve o cabecalho (32px) e a tela de perfil
 * (96px), e classe dinamica montada por interpolacao nao existe no CSS gerado.
 *
 * @param {string} [props.id] id do avatar em o_jogo.users.avatar.
 * @param {number} [props.size] lado do circulo, em px.
 */
export function Avatar({
    id,
    size = 40,
    className = ''
}){

    const avatar = getAvatar(id);
    const Icon = avatar.icon;

    return (
        <span
            style={{
                width: size,
                height: size,
                fontSize: size * 0.44,
                // O tinte pinta borda e fundo em opacidades diferentes da
                // mesma cor, entao ele mora aqui e nao em classe: sao doze
                // cores de catalogo, e o Tailwind so gera o que ve escrito.
                borderColor: `${avatar.tint}66`,
                backgroundColor: `${avatar.tint}26`,
                color: avatar.tint
            }}
            className={`
                relative inline-flex items-center justify-center shrink-0
                overflow-hidden rounded-full border
                ${className}
            `}
        >
            {avatar.art
                ? <Image src={avatar.art}
                    alt=''
                    fill
                    sizes={`${size}px`}
                    className='object-cover'
                />
                : <Icon />}
        </span>
    );
}
