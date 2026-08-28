'use client'
import { useCallback, useEffect } from 'react';
import { Command } from '@/domain/match/engine';
import { botCommand } from '@/domain/match/bot';
import { Phase } from '@/domain/match/state';

/**
 * Quem faz a mesa andar sozinha: os bots e o relogio da janela.
 *
 * Sao as duas unicas coisas que ninguem pede — o resto da partida acontece
 * porque alguem tocou na tela. Estao aqui, e nao dentro de um hook de partida,
 * porque valem para as duas: no solo quem dirige e a unica aba aberta; na mesa
 * do lobby quem dirige e o host, e o cliente do convidado passa `active:
 * false` e nao dirige nada. Sem isso, dois bots jogariam a mesma jogada duas
 * vezes, uma por aba.
 *
 * @param {boolean} params.active  se esta aba dirige a mesa.
 * @param {number[]} params.botIds assentos comandados por esta aba. Precisa ser
 *        estavel entre renders, ou os efeitos remarcam o temporizador a cada um.
 */

// Quanto o bot "pensa". Nao e regra, e ritmo: rapido demais e a mesa nao le o
// que aconteceu, lento demais e a partida arrasta.
const BOT_DELAY = 900;

// De quanto em quanto tempo o relogio da janela e conferido. O motor so fecha a
// janela quando alguem manda um tick.
const TICK_MS = 200;

export function useMatchDriver({ state, botIds, dispatch, active = true, botsPaused = false }){

    // Um comando por vez, na ordem da mesa: quem responde primeiro e quem esta
    // com a vez, e o resto so entra na janela.
    const nextBotCommand = useCallback(() => {
        if(!state) return null;
        return botIds.map(id => botCommand(state, id, Date.now())).find(Boolean) ?? null;
    }, [state, botIds]);

    useEffect(() => {
        if(!active || botsPaused || !state) return;
        const command = nextBotCommand();
        if(!command) return;

        const timer = setTimeout(() => dispatch(command), BOT_DELAY);
        return () => clearTimeout(timer);
    }, [active, botsPaused, state, nextBotCommand, dispatch]);

    useEffect(() => {
        if(!active || state?.phase !== Phase.window) return;
        const timer = setInterval(() => dispatch({ type: Command.tick }), TICK_MS);
        return () => clearInterval(timer);
    }, [active, state?.phase, dispatch]);

    return {
        // Um comando de bot, na mao. So faz sentido com os bots parados: solto,
        // o proprio efeito acima ja teria jogado por eles.
        stepBots: () => {
            const command = nextBotCommand();
            if(command) dispatch(command);
        },
        hasBotCommand: Boolean(nextBotCommand()),
    };
}
