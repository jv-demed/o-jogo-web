import { CARDS } from '@/assets/cards';
import { MISSIONS } from '@/domain/match/missions';

/**
 * Traduz o log do motor em frases de mesa.
 *
 * O motor registra fato, nao prosa: `{ type: 'drink', playerId, amount }`. A
 * narracao mora aqui, e nao no motor, porque e a unica parte disto que e
 * portugues — o motor precisa continuar puro e sem depender de assets.
 *
 * Evento sem frase devolve null e some da lista, em vez de aparecer como
 * `[object Object]`: o log tem entradas que sao contabilidade interna
 * (`ongoing`, `chance.miss`) e nao interessam a mesa.
 */

const CARD_NAMES = new Map(CARDS.map(card => [card.id, card.name]));

export const cardName = id => CARD_NAMES.get(id) ?? `carta #${id}`;

export const cardById = id => CARDS.find(card => card.id === id) ?? null;

export const missionName = id => MISSIONS[id]?.name ?? id;

const shots = amount => `${amount} shot${amount === 1 ? '' : 's'}`;

export function narrate(entry, nameOf){
    const who = id => nameOf(id) ?? 'alguem';
    const list = ids => (ids ?? []).map(who).join(', ');

    switch(entry.type){
        case 'drink':
            return entry.counted
                ? `${who(entry.playerId)} bebeu ${shots(entry.amount)}.`
                : `${who(entry.playerId)} bebeu ${shots(entry.amount)}, mas não contou.`;
        case 'shots.transfer':
            return `${shots(entry.amount)} de ${who(entry.from)} passaram para ${who(entry.to)}.`;
        case 'mission.swap':
            return `${list(entry.between)} trocaram de missão.`;
        case 'mission.swap.blocked':
            return `A troca de missão entre ${list(entry.between)} foi barrada.`;
        case 'mission.rotate':
            return 'As missões giraram na mesa.';
        case 'mission.reveal':
            return `A missão de ${list(entry.targets)} foi revelada.`;
        case 'mission.peek':
            return `${who(entry.by)} espiou a missão de ${list(entry.targets)}.`;
        case 'mission.setGoal':
            return `${missionName(entry.mission)} agora joga por outro objetivo.`;
        case 'cancelled':
            return `${who(entry.by)} cancelou ${cardName(entry.idCard)}.`;
        case 'negate':
            return `${who(entry.by)} tentou cancelar a jogada.`;
        case 'redirect':
            return `${who(entry.by)} devolveu a jogada para ${list(entry.to)}.`;
        case 'equip':
            return `${cardName(entry.idCard)} foi equipada em ${list(entry.targets)}.`;
        case 'equipment.destroy':
            return `${cardName(entry.idCard)} de ${who(entry.playerId)} foi destruída.`;
        case 'hand.steal':
            return `${who(entry.to)} roubou ${entry.count} carta(s) de ${who(entry.from)}.`;
        case 'hand.redraw':
            return `${who(entry.playerId)} trocou a mão inteira.`;
        case 'hand.reveal':
            return `${who(entry.playerId)} revelou ${entry.cards.map(cardName).join(', ')}.`;
        case 'deck.peek':
            return `${who(entry.by)} espiou o baralho de ${who(entry.playerId)}.`;
        case 'order.reverse':
            return 'A ordem da mesa inverteu.';
        case 'order.rearrange':
            return 'Os lugares na mesa mudaram.';
        case 'turn.skipped':
            return `${who(entry.playerId)} perdeu a vez.`;
        case 'game.endIn':
            return `A partida acaba em ${entry.turns} turno(s).`;
        case 'game.win':
            return `${list(entry.targets)} ganhou na hora.`;
        case 'game.lose':
            return `${list(entry.targets)} perdeu na hora.`;
        case 'deck.empty':
            return `O baralho de ${who(entry.playerId)} acabou. Fim de partida.`;
        // Efeito prolongado e informacao de mesa desde que a carta passou a
        // ficar na area do alvo em vez de ir para o descarte: quem le o log
        // precisa saber quando ela entrou e quando ela saiu.
        case 'ongoing':
            return entry.idCard
                ? `${cardName(entry.idCard)} ficou valendo sobre ${list(entry.targets)}.`
                : null;
        case 'ongoing.end':
            if(!entry.idCard) return null;
            return entry.returned
                ? `${cardName(entry.idCard)} parou de valer e foi para o descarte.`
                : `${cardName(entry.idCard)} parou de valer.`;
        case 'ritual':
            return `Ritual: ${entry.text}`;
        case 'manual':
            return `A mesa resolve: ${entry.instruction}`;
        // Cirurgia de dev. Aparece no log como qualquer outro fato, e de
        // proposito: sem isso, meia hora depois, a mesa estranha vira cacada a
        // um bug que foi voce quem plantou.
        case 'dev.stackDeck':
            return entry.from === 'deck'
                ? `[dev] ${cardName(entry.idCard)} subiu para o topo do baralho de ${who(entry.playerId)}.`
                : `[dev] ${cardName(entry.idCard)} entrou no topo do baralho de ${who(entry.playerId)}.`;
        case 'dev.giveCard':
            return `[dev] ${cardName(entry.idCard)} foi para a mão de ${who(entry.playerId)}.`;
        case 'dev.window.close':
            return '[dev] A janela de interferência foi fechada na marra.';
        case 'match.end':
            return entry.winners.length
                ? `Fim. Ganhou: ${list(entry.winners)}.`
                : 'Fim. Ninguém ganhou.';
        default:
            return null;
    }
}

/**
 * Quando um efeito prolongado dispara, em uma frase curta.
 *
 * O que ele *faz* nao se narra aqui: quem diz isso e o texto da propria carta,
 * que esta ao lado na tela. O que a carta nao diz, e que so o estado sabe, e
 * quando ela cobra e quanto ainda falta.
 */
export function ongoingTiming(ongoing, targetName){
    switch(ongoing.timing){
        case 'onTargetTurn': return `Na vez de ${targetName}`;
        case 'eachTurn':     return 'A cada turno da mesa';
        case 'delayed':      return 'Daqui a alguns turnos';
        case 'passive':      return 'Enquanto estiver em jogo';
        default:             return 'Em jogo';
    }
}

/** Quanto ainda falta de uma duracao, do jeito que ela e contada. */
export function ongoingDuration(ongoing){
    if(ongoing.turnsLeft !== null && ongoing.turnsLeft !== undefined){
        const turns = Math.max(0, ongoing.turnsLeft);
        // `onTargetTurn` conta as vezes do alvo; o resto conta turnos de mesa.
        return ongoing.timing === 'onTargetTurn'
            ? `mais ${turns} vez${turns === 1 ? '' : 'es'} dele`
            : `mais ${turns} turno${turns === 1 ? '' : 's'}`;
    }
    if(ongoing.drinksLeft !== null && ongoing.drinksLeft !== undefined){
        return `até beber ${shots(Math.max(0, ongoing.drinksLeft))}`;
    }
    switch(ongoing.duration?.kind){
        case 'untilMissionChange': return 'até uma troca de missão';
        case 'untilDestroyed':     return 'até ser destruída';
        case 'permanent':          return 'até o fim da partida';
        default:                   return 'sem prazo';
    }
}

/** O pedido pendente, em uma frase. */
export function promptText(request){
    switch(request.kind){
        case 'optIn':
            return 'Você quer entrar nessa?';
        case 'option':
            return 'Escolha uma opção.';
        case 'cards':
            return 'Escolha as cartas.';
        case 'manual':
            return request.description ?? 'A mesa aponta quem é.';
        default:
            return request.upTo
                ? `Escolha até ${request.count} jogador(es).`
                : `Escolha ${request.count} jogador(es).`;
    }
}
