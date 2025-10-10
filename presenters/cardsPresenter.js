import { ICONS } from '@/assets/icons';

export const CARD_TYPES = [
    {
        id: 0,
        name: 'Shot',
        icon: <ICONS.shot />
    },{
        id: 1,
        name: 'Investigação',
        icon: <ICONS.investigation />
    },{
        id: 2,
        name: 'Efeito',
        icon: <ICONS.effect />
    }
];

export function getCardTypeName(card) {
    return CARD_TYPES.find(t => t.id == card.type)?.name;
}

export function getCardTypeIcon(card) {
    return CARD_TYPES.find(t => t.id == card.type)?.icon;
}