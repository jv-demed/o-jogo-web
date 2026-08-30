'use client'
import { useEffect, useRef, useState } from 'react';
import { MatchStatus } from '@/domain/match/state';

// Quanto tempo a apresentacao de quem vai jogar fica na tela. E o mesmo numero
// que o `useMatchDriver` espera antes de soltar o bot da vez: se o bot jogasse
// por baixo do anuncio, a mesa leria o nome de alguem que ja tinha jogado.
export const TURN_INTRO_MS = 2000;

/**
 * Quem vai jogar agora, para a tela apresentar antes da jogada.
 *
 * A vez passa sozinha desde que o botao de "passar a vez" saiu: sem nada no
 * meio, a mesa nao percebe a troca — o feltro e o mesmo, e o unico sinal era um
 * marcador de 8px mudando de cadeira. Este anuncio e a pausa que a mesa fazia
 * quando alguem dizia "agora e voce".
 *
 * O gatilho e o `turnCount`, e nao o jogador da vez: com dois na mesa a vez
 * volta para o mesmo id o tempo todo, e comparar id nao acusaria a virada. O
 * primeiro turno tambem e apresentado, mas so em mesa recem-montada — quem
 * recarrega a pagina no meio da partida cai direto na mesa, sem um anuncio de
 * uma vez que ja estava correndo.
 *
 * @returns {object|null} o jogador a apresentar, ou null quando nao ha anuncio.
 */
export function useTurnIntro(state){

    const [turn, setTurn] = useState(null);

    const seenRef = useRef(null);
    const turnCount = state?.turnCount ?? null;
    const status = state?.status ?? null;
    // Mesa recem-montada: ninguem comprou nem jogou nada ainda. Vive num ref
    // porque muda a cada carta jogada, e entrar nas dependencias faria o efeito
    // refazer no meio do turno — a limpeza dele apagaria o temporizador e o
    // anuncio nunca sairia da tela.
    const freshRef = useRef(false);
    freshRef.current = Boolean(state) && state.turnCount === 0 && state.log.length === 0;

    useEffect(() => {
        if(turnCount === null || status !== MatchStatus.progress){
            seenRef.current = null;
            setTurn(null);
            return;
        }

        const first = seenRef.current === null;
        const changed = seenRef.current !== turnCount;
        seenRef.current = turnCount;
        if(!changed || (first && !freshRef.current)) return;

        setTurn(turnCount);
        const timer = setTimeout(() => setTurn(null), TURN_INTRO_MS);
        return () => clearTimeout(timer);
    }, [turnCount, status]);

    if(turn === null || turn !== turnCount) return null;
    return state.players.find(player => player.id === state.order[state.turnIndex]) ?? null;
}
