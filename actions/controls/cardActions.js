import { ICONS } from '@/assets/icons';

export const CARD_TYPES = [
    {
        id: 1,
        name: 'Shot',
        icon: ICONS.shot,
        bg: 'radial-gradient(circle at 90.56% -7.92%, #ff82ca 0, #f77ace 16.67%, #e973d3 33.33%, #d86cd8 50%, #c467dd 66.67%, #ae64e2 83.33%, #9462e7 100%)'
    }
];

export function getBackground(card){
    switch(card.type){
        case 1:
            return CARD_TYPES[0].bg;
    }
}