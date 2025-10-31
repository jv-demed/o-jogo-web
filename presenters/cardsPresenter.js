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
    },{
        id: 3,
        name: 'Defesa',
        icon: <ICONS.defense />
    },{
        id: 4,
        name: 'Divino',
        icon: <ICONS.cross />
    },{
        id: 5,
        name: 'Equipamento',
        icon: <ICONS.equip />
    }
];

export function getCardTypeName(card) {
    return CARD_TYPES.find(t => t.id == card.type)?.name;
}

export function getCardTypeIcon(card) {
    return CARD_TYPES.find(t => t.id == card.type)?.icon;
}