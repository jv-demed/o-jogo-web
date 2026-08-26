'use client'
import { useCallback, useEffect, useState } from 'react';
import { Command, apply } from '@/domain/match/engine';
import { botCommand } from '@/domain/match/bot';
import { createSoloMatch } from '@/domain/match/solo';
import { MatchStatus, Phase, currentPlayer } from '@/domain/match/state';

/**
 * Conduz uma partida solo inteira no browser.
 *
 * A partida solo nao passa pelo Supabase: o motor e puro e roda em memoria, o
 * que e justamente o que permite jogar antes de a partida existir no banco
 * (ver PENDENCIAS.md). Nada aqui e persistido — recarregar a pagina recomeca.
 *
 * O hook faz tres coisas e nenhuma regra:
 *   - `dispatch` empurra o comando pelo `apply` e guarda o estado novo;
 *   - um efeito acorda os bots, um comando por vez, com atraso, para a mesa dar
 *     para acompanhar (sem o atraso a partida inteira resolve num frame);
 *   - outro efeito toca o relogio enquanto a janela de interferencia esta
 *     aberta, que e o unico jeito de ela fechar sozinha.
 */

// Quanto o bot "pensa". Nao e regra, e ritmo: rapido demais e a mesa nao le o
// que aconteceu, lento demais e a partida arrasta.
const BOT_DELAY = 900;

// De quanto em quanto tempo o relogio da janela e conferido. O motor so fecha a
// janela quando alguem manda um tick.
const TICK_MS = 200;

export function useSoloMatch(){

    const [match, setMatch] = useState(null);
    const [error, setError] = useState(null);

    const dispatch = useCallback(command => {
        setMatch(prev => {
            if(!prev) return prev;
            try{
                const state = apply(prev.state, { ...command, now: Date.now() });
                return { ...prev, state };
            }catch(err){
                // Jogada ilegal nao derruba a mesa: o motor recusou e o estado
                // anterior continua valendo. Mostrar e seguir e o certo aqui,
                // porque em solo o unico jeito de isso acontecer e bug nosso.
                setError(err);
                return prev;
            }
        });
    }, []);

    const start = useCallback(options => {
        setError(null);
        setMatch(createSoloMatch({ seed: Date.now(), ...options }));
    }, []);

    const leave = useCallback(() => {
        setMatch(null);
        setError(null);
    }, []);

    // Os bots. Um comando por vez, na ordem da mesa: quem responde primeiro e
    // quem esta com a vez, e o resto so entra na janela.
    useEffect(() => {
        if(!match) return;
        const command = match.botIds
            .map(id => botCommand(match.state, id, Date.now()))
            .find(Boolean);
        if(!command) return;

        const timer = setTimeout(() => dispatch(command), BOT_DELAY);
        return () => clearTimeout(timer);
    }, [match, dispatch]);

    // O relogio da janela de interferencia.
    useEffect(() => {
        if(match?.state.phase !== Phase.window) return;
        const timer = setInterval(() => dispatch({ type: Command.tick }), TICK_MS);
        return () => clearInterval(timer);
    }, [match?.state.phase, dispatch]);

    const state = match?.state ?? null;
    // Voce e o unico que nao e bot. Procurar assim, e nao pegar players[0],
    // sobrevive a qualquer carta que mexa na ordem da mesa.
    const you = state?.players.find(player => !match.botIds.includes(player.id)) ?? null;

    return {
        state,
        you,
        error,
        dismissError: () => setError(null),
        isYourTurn: Boolean(state && you && currentPlayer(state)?.id === you.id),
        isOver: state?.status === MatchStatus.finished,
        start,
        leave,
        dispatch,
    };
}
