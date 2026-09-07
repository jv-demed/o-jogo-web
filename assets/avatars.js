import { ICONS } from '@/assets/icons';

/**
 * O catalogo de avatares.
 *
 * Sao placeholders de proposito: um glifo sobre um fundo tingido, desenhado em
 * CSS. Nao ha arquivo de imagem ainda, e um <img> quebrado seria pior que um
 * simbolo honesto.
 *
 * Quando as artes chegarem, o caminho e adicionar `art: '/avatars/<id>.webp'`
 * na entrada — o componente Avatar ja prefere a arte quando ela existe, e cai
 * no glifo enquanto nao existir. Nenhuma outra tela precisa saber.
 *
 * O `id` e o que vai para o banco (o_jogo.users.avatar), entao ele e estavel:
 * mudar um id aqui apaga a escolha de quem estava usando. Trocar `label`,
 * `icon` ou `tint` e livre.
 */
export const AVATARS = [
    { id: 'copo',    label: 'Copo',      icon: ICONS.shot,          tint: '#2f8dc4' },
    { id: 'baralho', label: 'Baralho',   icon: ICONS.deck,          tint: '#7a5cc4' },
    { id: 'espia',   label: 'Espiã',     icon: ICONS.investigation, tint: '#3fa88a' },
    { id: 'escudo',  label: 'Escudo',    icon: ICONS.defense,       tint: '#c47a2f' },
    { id: 'chama',   label: 'Chama',     icon: ICONS.effect,        tint: '#d4574f' },
    { id: 'lamina',  label: 'Lâmina',    icon: ICONS.equip,         tint: '#8a93a3' },
    { id: 'estrela', label: 'Estrela',   icon: ICONS.star,          tint: '#e8b44a' },
    { id: 'raio',    label: 'Raio',      icon: ICONS.quick,         tint: '#4fa8d4' },
    { id: 'moeda',   label: 'Moeda',     icon: ICONS.coins,         tint: '#c4a02f' },
    { id: 'cruz',    label: 'Cruz',      icon: ICONS.cross,         tint: '#a3708a' },
    { id: 'livro',   label: 'Livro',     icon: ICONS.collection,    tint: '#5c8ac4' },
    { id: 'rosto',   label: 'Anônimo',   icon: ICONS.user,          tint: '#6b7280' }
];

export const DEFAULT_AVATAR_ID = AVATARS[0].id;

/**
 * Nunca devolve undefined: avatar nulo (quem nunca escolheu) e avatar de um id
 * que saiu do catalogo caem os dois no primeiro. A tela sempre tem o que
 * desenhar, e a escolha antiga so se perde na proxima gravacao.
 */
export function getAvatar(id){
    return AVATARS.find(avatar => avatar.id === id) ?? AVATARS[0];
}
