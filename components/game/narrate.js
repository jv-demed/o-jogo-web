import { CARDS } from '@/assets/cards';
import { getCardEffects } from '@/domain/cards/effects';
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
        case 'ongoing.trigger':
            return entry.idCard
                ? `${cardName(entry.idCard)} cobrou de ${who(entry.playerId)}.`
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
 * O que a carta vai fazer com quem foi apontado, em uma frase.
 *
 * Sai do efeito estruturado (`domain/cards/effects/`), e nao de uma coluna
 * nova: o `amount`, o `timing` e a `duration` ja estao modelados como dado —
 * "beber 1, na vez dele, por 3 turnos" e exatamente o que a carta 1 diz em
 * `pack1.js`. Guardar a frase pronta seria guardar duas versoes da mesma regra,
 * e uma delas ia envelhecer.
 *
 * So fala do efeito *escolhido* (alvo `choose`/`manual`), que e o unico que a
 * declaracao aponta. Acao que ainda nao tem frase devolve null e a tela mostra
 * so o nome — melhor faltar frase do que narrar errado.
 */
export function declaredEffectText(idCard){
    const effects = getCardEffects(idCard)?.effects ?? [];
    for(const effect of effects){
        const kind = effect.target?.kind ?? effect.between?.kind;
        if(kind !== 'choose' && kind !== 'manual') continue;
        const phrase = actionText(effect);
        if(phrase) return phrase + durationTail(effect);
    }
    return null;
}

/**
 * O que a carta de efeito prolongado faz quando cobra, sem o prazo.
 *
 * A mesma frase da declaracao, menos a cauda de duracao: na hora do disparo o
 * "pelas proximas 3 rodadas" ja nao e verdade, e quanto ainda falta e um dado
 * do estado (`turnsLeft`), nao da carta.
 */
export function ongoingEffectText(idCard){
    const effects = getCardEffects(idCard)?.effects ?? [];
    for(const effect of effects){
        if(NOW_TIMINGS.has(effect.timing ?? 'immediate')) continue;
        const phrase = actionText(effect);
        if(phrase) return phrase;
    }
    return null;
}

const NOW_TIMINGS = new Set(['immediate', 'reaction', 'passive', 'endgame']);

/** `amount` em shots, incluindo as palavras do vocabulario. */
function shotsOf(effect){
    const amount = effect.amount ?? 1;
    if(typeof amount === 'number') return shots(amount);
    switch(amount){
        case 'half':        return 'metade dos shots';
        case 'all':         return 'todos os shots';
        case 'infinity':    return 'infinitos shots';
        case 'perOpponent': return '1 shot por adversário';
        default:            return '1 shot';
    }
}

/** `amount` contando outra coisa (carta, vez, equipamento). */
function countOf(effect, noun){
    const amount = effect.amount ?? 1;
    if(typeof amount !== 'number') return `${noun}s`;
    return `${amount} ${noun}${amount === 1 ? '' : 's'}`;
}

function actionText(effect){
    switch(effect.action){
        case 'drink':          return `Irá beber ${shotsOf(effect)}`;
        case 'shots.add':      return `Vai somar ${shotsOf(effect)} à conta`;
        case 'shots.remove':   return `Vai tirar ${shotsOf(effect)} da conta`;
        case 'shots.set':      return effect.amount === 'infinity'
            ? 'Vai ficar com shots infinitos'
            : `Vai ficar com ${shotsOf(effect)}`;
        case 'shots.halve':    return 'Vai ficar com metade dos shots';
        case 'shots.swap':     return 'Vai trocar os shots com quem jogou';
        // `between` com um alvo so completa a dupla com quem jogou, e a
        // transferencia sai de quem jogou para o escolhido.
        case 'shots.transfer': return `Vai receber ${shotsOf(effect)} de quem jogou`;
        case 'shots.ignore':   return 'Vai beber sem contar';
        case 'turn.skip':      return `Vai perder ${countOf(effect, 'vez')}`;
        case 'turn.extraPlay': return `Vai jogar mais ${countOf(effect, 'vez')}`;
        case 'hand.draw':      return `Vai comprar ${countOf(effect, 'carta')}`;
        case 'hand.discard':   return `Vai descartar ${countOf(effect, 'carta')}`;
        case 'hand.redraw':    return 'Vai trocar a mão inteira';
        case 'hand.steal':     return `Vai perder ${countOf(effect, 'carta')} da mão`;
        case 'hand.give':      return `Vai receber ${countOf(effect, 'carta')}`;
        case 'hand.reveal':    return `Vai revelar ${countOf(effect, 'carta')} da mão`;
        case 'deck.peek':      return 'Vai ter o baralho espiado';
        case 'deck.return':    return `Vai devolver ${countOf(effect, 'carta')} ao baralho`;
        case 'mission.swap':   return 'Vai trocar de missão';
        case 'mission.rotate': return 'Vai passar a missão adiante';
        case 'mission.take':   return 'Vai ter a missão tomada';
        case 'mission.peek':   return 'Vai ter a missão espiada';
        case 'mission.reveal': return 'Vai ter a missão revelada para a mesa';
        case 'mission.setGoal':return 'Vai jogar por outro objetivo';
        case 'mission.lock':   return 'Fica com a missão trancada';
        case 'equip':          return 'Fica com a carta equipada';
        case 'equipment.destroy':  return 'Vai perder um equipamento';
        case 'equipment.transfer': return 'Vai passar um equipamento';
        case 'link.shots':     return 'Fica com os shots ligados a quem jogou';
        case 'link.fate':      return 'Fica com o destino ligado a quem jogou';
        case 'game.win':       return 'Ganha a partida na hora';
        case 'game.lose':      return 'Perde a partida na hora';
        case 'manual':         return effect.instruction ?? null;
        default:               return null;
    }
}

/** Quando e por quanto tempo, colado no fim da frase. */
function durationTail(effect){
    const turns = effect.duration?.kind === 'turns' ? effect.duration.turns : null;

    if(effect.timing === 'onTargetTurn'){
        if(turns === null) return ', na vez dele';
        return turns === 1
            ? ', na próxima rodada dele'
            : `, nas próximas ${turns} rodadas dele`;
    }
    if(effect.timing === 'eachTurn'){
        return turns === null
            ? ', a cada turno'
            : `, a cada turno, pelos próximos ${turns} turnos`;
    }
    if(effect.timing === 'delayed' && turns !== null){
        return turns === 1 ? ', daqui a 1 turno' : `, daqui a ${turns} turnos`;
    }

    switch(effect.duration?.kind){
        case 'turns':              return `, pelos próximos ${turns} turnos`;
        case 'untilDrinks':        return `, até beber ${shots(effect.duration.amount)}`;
        case 'untilMissionChange': return ', até uma troca de missão';
        case 'untilDestroyed':     return ', enquanto a carta estiver na mesa';
        case 'permanent':          return ', até o fim da partida';
        default:                   return '';
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
