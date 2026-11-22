'use client'
import { useCallback, useState } from 'react';
import { apply } from '@/domain/match/engine';
import { applyDev } from '@/domain/match/dev';
import { createSoloMatch } from '@/domain/match/solo';
import { MatchStatus, currentPlayer } from '@/domain/match/state';
import { useMatchDriver } from '@/hooks/useMatchDriver';

/**
 * Conduz uma partida solo inteira no browser.
 *
 * A partida solo nao passa pelo Supabase: o motor e puro e roda em memoria, e
 * nada aqui e persistido — recarregar a pagina recomeca. Ela continua existindo
 * depois de a partida ir para o banco porque e a unica que comeca em um toque,
 * sem sala, sem link e sem ninguem do outro lado.
 *
 * O hook faz duas coisas e nenhuma regra: `dispatch` empurra o comando pelo
 * `apply` e guarda o estado novo, e o `useMatchDriver` acorda os bots e toca o
 * relogio da janela. Aqui esta aba dirige sempre — e a unica que existe.
 */

// Fora do componente: uma lista nova a cada render remarcaria o temporizador
// dos bots antes de ele disparar, e nenhum bot chegaria a jogar.
const EMPTY = [];

/** @param {{botDelay?: number}} [options] ritmo dos bots (ver `useMatchDriver`). */
export function useSoloMatch({ botDelay } = {}){

    const [match, setMatch] = useState(null);
    const [error, setError] = useState(null);
    // Ferramenta de dev: com os bots parados da para ler a pilha e a janela sem
    // a mesa andando por baixo. Nao congela o relogio da janela — esse e da
    // mesa, nao dos bots, e congelar os dois junto e o que trava a partida sem
    // dizer por que.
    const [botsPaused, setBotsPaused] = useState(false);

    const dispatch = useCallback(command => {
        setMatch(prev => {
            if(!prev) return prev;
            try{
                const state = apply(prev.state, { ...command, now: Date.now() });
                // A jogada do roteiro de abertura sai da fila quando entra.
                const opening = command === prev.opening?.[0] ? prev.opening.slice(1) : prev.opening;
                return { ...prev, state, opening };
            }catch(err){
                // Jogada ilegal nao derruba a mesa: o motor recusou e o estado
                // anterior continua valendo. Mostrar e seguir e o certo aqui,
                // porque em solo o unico jeito de isso acontecer e bug nosso.
                setError(err);
                return prev;
            }
        });
    }, []);

    /**
     * Poder de dev. Nao passa pelo `apply` de proposito — o motor nao conhece
     * dev, e e assim que ele continua seguro para rodar no servidor.
     *
     * Recebe um comando `dev.*`, e nao mais uma funcao: e o mesmo formato que
     * a mesa do lobby manda pela rede desde a partida com cheats (migration
     * 0013), e o mesmo que o painel produz. Aqui o comando nem sai da aba, mas
     * ter uma forma so evita o painel ter dois jeitos de pedir a mesma coisa.
     */
    const devDispatch = useCallback(command => {
        setMatch(prev => {
            if(!prev) return prev;
            try{
                return { ...prev, state: applyDev(prev.state, { ...command, now: Date.now() }) };
            }catch(err){
                setError(err);
                return prev;
            }
        });
    }, []);

    const start = useCallback(options => {
        setError(null);
        setMatch(createSoloMatch({ seed: Date.now(), ...options }));
    }, []);

    /**
     * Comeca de uma partida ja montada (`{ state, botIds }`), em vez de
     * sortear uma. E a porta do laboratorio de carta: ele monta a mesa com
     * `createLabMatch` e entrega aqui, e dai em diante e um solo como os
     * outros. Carregar o mesmo objeto de novo e o "repetir" — o estado e
     * imutavel (o `apply` clona), entao o montado continua intacto.
     *
     * `opening` (opcional) sao jogadas de bot ja decididas, que o driver solta
     * antes de qualquer outra e no mesmo ritmo — o gatilho do laboratorio.
     */
    const load = useCallback(prepared => {
        setError(null);
        setMatch(prepared);
    }, []);

    const leave = useCallback(() => {
        setMatch(null);
        setError(null);
    }, []);

    const state = match?.state ?? null;
    const { stepBots, hasBotCommand } = useMatchDriver({
        state,
        botIds: match?.botIds ?? EMPTY,
        script: match?.opening ?? EMPTY,
        dispatch,
        botsPaused,
        botDelay,
    });

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
        load,
        leave,
        dispatch,
        devDispatch,
        botsPaused,
        setBotsPaused,
        stepBots,
        hasBotCommand,
    };
}
