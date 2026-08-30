'use client'
import { useCallback, useEffect } from 'react';
import { Command } from '@/domain/match/engine';
import { botCommand } from '@/domain/match/bot';
import { MatchStatus, Phase, currentPlayer } from '@/domain/match/state';
import { TURN_INTRO_MS } from '@/hooks/useTurnIntro';

/**
 * Quem faz a mesa andar sozinha: os bots, a passagem de vez e o relogio da
 * janela.
 *
 * Sao as tres unicas coisas que ninguem pede — o resto da partida acontece
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

// Quanto a mesa espera antes de passar a vez sozinha. O turno acabou e nao ha
// mais nada a decidir: o tempo aqui e so para a ultima carta terminar de ser
// lida antes de a tela trocar de dono.
const PASS_DELAY = 700;

// De quanto em quanto tempo o relogio da janela e conferido. O motor so fecha a
// janela quando alguem manda um tick.
const TICK_MS = 200;

export function useMatchDriver({ state, botIds, dispatch, active = true, botsPaused = false }){

    // Um comando por vez, na ordem da mesa: quem responde primeiro e quem esta
    // com a vez, e o resto so entra na janela.
    //
    // A passagem de vez vem depois dos bots e vale para qualquer cadeira, a de
    // humano inclusive: com o turno resolvido nao ha decisao nenhuma sobrando,
    // e o botao de "passar a vez" so cobrava um toque para dizer "acabou". Quem
    // passa e esta aba — a mesma que dirige os bots —, e nao o browser de quem
    // esta com a vez: se fosse dele, uma aba fechada deixaria a mesa parada
    // para sempre num turno que ja terminou.
    const nextCommand = useCallback(() => {
        if(!state) return null;
        const fromBot = botIds.map(id => botCommand(state, id, Date.now())).find(Boolean);
        if(fromBot) return fromBot;

        if(state.status !== MatchStatus.progress || state.phase !== Phase.end) return null;
        // Fila de shot ou de ritual segura a mesa: o motor recusa qualquer
        // comando ate a mesa beber, e insistir aqui so encheria a tela de erro.
        if(state.rituals?.length || state.drinks?.length) return null;
        const player = currentPlayer(state);
        return player ? { type: Command.endTurn, playerId: player.id } : null;
    }, [state, botIds]);

    // O bot da vez espera o anuncio de quem vai jogar sair da tela: soltar a
    // jogada por baixo dele seria apresentar alguem que ja jogou. A fase de
    // compra e o instante em que a vez acabou de virar, e e so ali que a espera
    // maior vale.
    useEffect(() => {
        if(!active || botsPaused || !state) return;
        const command = nextCommand();
        if(!command) return;

        const isTurnStart = state.phase === Phase.draw;
        const delay = command.type === Command.endTurn
            ? PASS_DELAY
            : BOT_DELAY + (isTurnStart ? TURN_INTRO_MS : 0);

        const timer = setTimeout(() => dispatch(command), delay);
        return () => clearTimeout(timer);
    }, [active, botsPaused, state, nextCommand, dispatch]);

    useEffect(() => {
        if(!active || state?.phase !== Phase.window) return;
        const timer = setInterval(() => dispatch({ type: Command.tick }), TICK_MS);
        return () => clearInterval(timer);
    }, [active, state?.phase, dispatch]);

    return {
        // Um passo da mesa, na mao. So faz sentido com os bots parados: solto,
        // o proprio efeito acima ja teria jogado por eles. Passar a vez entra
        // aqui junto — com a mesa pausada ela tambem nao passa sozinha, e sem
        // isto a partida ficaria presa no fim do turno de um humano.
        stepBots: () => {
            const command = nextCommand();
            if(command) dispatch(command);
        },
        hasBotCommand: Boolean(nextCommand()),
    };
}
