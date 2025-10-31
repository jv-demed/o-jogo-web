import { ICONS } from '@/assets/icons';

export const CardType = Object.freeze({
    defense: 'defesa',
    divine: 'divino',
    effect: 'efeito',
    equip: 'equipamento',
    investigation: 'investigacao',
    shot: 'shot',
});

export const CARD_TYPE_DATA = {
    [CardType.defense]: { 
        name: 'Defesa', 
        icon: <ICONS.defense /> 
    },
    [CardType.divine]: { 
        name: 'Divino', 
        icon: <ICONS.cross /> 
    },
    [CardType.effect]: { 
        name: 'Efeito', 
        icon: <ICONS.effect /> 
    },
    [CardType.equip]: { 
        name: 'Equipamento', 
        icon: <ICONS.equip /> 
    },
    [CardType.investigation]: { 
        name: 'Investigação', 
        icon: <ICONS.investigation /> 
    },
    [CardType.shot]: { 
        name: 'Shot', 
        icon: <ICONS.shot /> 
    },
};

export function getCardTypeName(type) {
    return CARD_TYPE_DATA[type]?.name ?? 'Desconhecido';
}

export function getCardTypeIcon(type) {
    return CARD_TYPE_DATA[type]?.icon ?? null;
}