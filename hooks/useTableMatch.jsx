'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@/providers/UserProvider';
import { getRealtime, removeChannel } from '@/supabase/realtime';
import {
    clearMatchCommands,
    getMatchCommands,
    getMatchPlayers,
    getMatchRow,
    pushMatchCommand,
    saveMatchState
} from '@/presenters/matchesPresenter';
import { Command, apply } from '@/domain/match/engine';
import { isBot } from '@/domain/match/bot';
import { createSeatedMatch } from '@/domain/match/setup';
import { MatchStatus, currentPlayer } from '@/domain/match/state';
import { useMatchDriver } from '@/hooks/useMatchDriver';

// Fora do componente: uma lista nova a cada render remarcaria o temporizador
// dos bots antes de ele disparar, e nenhum bot chegaria a jogar.
const EMPTY = [];

/**
 * A partida da mesa do lobby: humanos e bots, com o estado vivendo no banco.
 *
 * **O host e a autoridade** (migration 0010). O browser dele roda o mesmo
 * `apply` do solo, grava o estado em `matches.state` e comanda os bots; quem
 * nao e host le o estado por realtime e joga enfileirando comando em
 * `match_commands`, que o host consome. Nao e o desenho final — o servidor
 * autoritativo esta em PENDENCIAS.md — mas e o que poe a mesa de pe sem
 * duplicar a regra em plpgsql: o `apply` continua sendo a unica porta.
 *
 * Tres coisas so o host faz, e e por isso que elas sao condicionais aqui:
 * aplicar comando, gravar estado e dirigir a mesa (bots e relogio da janela).
 * Se o convidado tambem dirigisse, cada bot jogaria uma vez por aba aberta.
 *
 * @param {number} idMatch
 * @param {number[]} pool ids de carta para sortear os baralhos (o catalogo).
 */
export function useTableMatch(idMatch, pool){

    const { user } = useUser();

    const [match, setMatch] = useState(null);
    const [seats, setSeats] = useState([]);
    const [state, setState] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // O estado que o host aplica em cima. Vive num ref, e nao so no state do
    // React, porque o `dispatch` precisa do estado *agora* — dentro do
    // atualizador do setState ele nao poderia gravar no banco, que e efeito
    // colateral, e fora dele leria um valor velho.
    const stateRef = useRef(null);
    const versionRef = useRef(0);
    // O host monta a mesa uma vez. Sem isto, o efeito que monta correria de
    // novo entre o `setState` e a chegada do estado gravado.
    const buildingRef = useRef(false);

    // Do objeto `match` so o dono importa para os efeitos, e so ele e estavel:
    // a linha inteira e reescrita a cada estado novo que chega.
    const idHost = match?.id_host ?? null;
    const isHost = idHost === user.id;
    const status = match?.status ?? null;
    // So a existencia importa para os efeitos; o estado em si muda o tempo todo.
    const hasState = Boolean(state);

    const applyState = useCallback(next => {
        stateRef.current = next;
        setState(next);
    }, []);

    const readMatch = useCallback(async () => {
        const row = await getMatchRow(idMatch);
        if(!row) throw new Error('Partida não encontrada.');
        setMatch(row);
        // O host e a autoridade: o que o banco tem e o que ele mesmo gravou, e
        // reler por cima do que ele acabou de aplicar seria voltar no tempo.
        if(row.id_host !== user.id && row.state_version >= versionRef.current){
            versionRef.current = row.state_version;
            applyState(row.state);
        }
        return row;
    }, [idMatch, user.id, applyState]);

    useEffect(() => {
        let isMounted = true;
        Promise.all([readMatch(), getMatchPlayers(idMatch)])
            .then(([row, list]) => {
                if(!isMounted) return;
                setSeats(list);
                // O host carrega o que ja gravou; o `readMatch` nao faz isso
                // por ele, e na montagem e justamente o que ele precisa.
                if(row.id_host === user.id && row.state){
                    versionRef.current = row.state_version;
                    applyState(row.state);
                }
            })
            .catch(err => isMounted && setError(err))
            .finally(() => isMounted && setIsLoading(false));
        return () => { isMounted = false; };
    }, [idMatch, user.id, readMatch, applyState]);

    const persist = useCallback(async next => {
        const version = versionRef.current + 1;
        versionRef.current = version;
        try{
            await saveMatchState(idMatch, next, version);
        }catch(err){
            setError(err);
        }
    }, [idMatch]);

    /**
     * A porta de entrada da partida, para os dois lados. O host aplica na hora
     * e grava; o convidado enfileira e espera o estado voltar. O convidado nao
     * aplica localmente de proposito: previsao otimista aqui significaria duas
     * verdades sobre a mesma mesa, e a que perdesse teria que ser desfeita.
     */
    const dispatch = useCallback(command => {
        if(!isHost){
            pushMatchCommand(idMatch, user.id, command).catch(setError);
            return;
        }

        const prev = stateRef.current;
        if(!prev) return;
        try{
            const next = apply(prev, { ...command, now: Date.now() });
            applyState(next);

            // O tick nao vale ida ao banco: ele bate cinco vezes por segundo e,
            // fora do instante em que a janela vence, o proprio motor o trata
            // como inofensivo. Quando vence, ele muda a fase — e e essa mudanca
            // que os outros precisam ver.
            if(command.type !== Command.tick || next.phase !== prev.phase){
                persist(next);
            }
        }catch(err){
            setError(err);
        }
    }, [isHost, idMatch, user.id, applyState, persist]);

    // O host monta a mesa na primeira vez que entra. E aqui, e nao no
    // `start_match`, porque montar exige o motor: sortear missao, embaralhar e
    // distribuir sao JS, e reescrever isso em plpgsql seria a segunda
    // implementacao da regra que a camada pura existe para evitar.
    useEffect(() => {
        if(!isHost || state || !seats.length || buildingRef.current) return;
        if(status !== 'progress') return;

        buildingRef.current = true;
        try{
            const built = createSeatedMatch({
                seed: Date.now(),
                // Bot entra com id negativo (ver `isBot`): o id do assento
                // serve, porque e unico e nunca colide com id de usuario.
                seats: seats.map(seat => ({
                    id: seat.isBot ? -seat.id : seat.idUser,
                    name: seat.name
                })),
                pool
            });
            applyState(built);
            persist(built);
        }catch(err){
            setError(err);
            buildingRef.current = false;
        }
    }, [isHost, state, seats, status, pool, applyState, persist]);

    /**
     * A fila dos convidados. O comando e reassinado com o `id_user` da linha,
     * e nao com o `playerId` que veio dentro dele: quem inseriu a linha e o
     * unico dado que a RLS garantiu, e aceitar a assinatura de dentro deixaria
     * qualquer um jogar pela mao alheia.
     *
     * O que o motor recusar sai da fila do mesmo jeito. Um comando ilegal ja
     * foi respondido — com erro — e deixa-lo ali o faria ser recusado de novo a
     * cada volta.
     */
    const drain = useCallback(async () => {
        // Sem mesa montada nao ha onde aplicar, e aplicar no vazio apagaria o
        // comando sem que ele tivesse acontecido. Ele fica na fila; o efeito
        // abaixo drena de novo assim que o estado existe.
        if(!stateRef.current) return;
        try{
            const queued = await getMatchCommands(idMatch);
            if(!queued.length) return;
            for(const row of queued){
                dispatch({ ...row.command, playerId: row.idUser });
            }
            await clearMatchCommands(queued.map(row => row.id));
        }catch(err){
            setError(err);
        }
    }, [idMatch, dispatch]);

    // Dois canais: o convidado escuta o estado novo, o host escuta a fila. Na
    // montagem o host ainda drena uma vez, para o comando que chegou enquanto
    // ele estava fora nao ficar esperando um evento que ja passou.
    useEffect(() => {
        if(idHost === null) return;

        if(!isHost){
            const channel = getRealtime({
                table: 'matches',
                filter: `id=eq.${idMatch}`,
                event: 'UPDATE',
                callback: () => { readMatch().catch(setError); }
            });
            return () => removeChannel(channel);
        }

        drain();
        const channel = getRealtime({
            table: 'match_commands',
            filter: `id_match=eq.${idMatch}`,
            event: 'INSERT',
            callback: drain
        });
        return () => removeChannel(channel);
    }, [idHost, isHost, idMatch, hasState, readMatch, drain]);

    // Os assentos que esta aba comanda: os bots, e so para o host.
    const botIds = useMemo(() => (isHost && state)
        ? state.players.filter(player => isBot(player.id)).map(player => player.id)
        : EMPTY, [isHost, state]);

    const { stepBots, hasBotCommand } = useMatchDriver({
        state,
        botIds,
        dispatch,
        active: isHost
    });

    // Voce e quem tem o seu id. Diferente do solo, que procurava "o unico que
    // nao e bot" — com dois humanos na mesa isso apontaria para o outro.
    const you = state?.players.find(player => player.id === user.id) ?? null;

    return {
        state,
        you,
        seats,
        isHost,
        isLoading,
        error,
        dismissError: () => setError(null),
        isYourTurn: Boolean(state && you && currentPlayer(state)?.id === you.id),
        isOver: state?.status === MatchStatus.finished,
        dispatch,
        stepBots,
        hasBotCommand
    };
}
