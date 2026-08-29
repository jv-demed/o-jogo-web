'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@/providers/UserProvider';
import { getRealtime, removeChannel } from '@/supabase/realtime';
import {
    getMatchPlayers,
    getMatchRow,
    getPendingCommands,
    logMatchCommand,
    markCommandApplied,
    markCommandRefused,
    pushMatchCommand,
    saveMatchState,
    seedMatchState
} from '@/presenters/matchesPresenter';
import { Command, apply } from '@/domain/match/engine';
import { applyDev, isDevCommand } from '@/domain/match/dev';
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
 * **O host e a autoridade** (migrations 0010 e 0011). O browser dele roda o
 * mesmo `apply` do solo, escreve cada comando aplicado no log e regrava o
 * estado; quem nao e host le o estado por realtime e joga mandando comando sem
 * numero, que fica esperando o host aplicar. Nao e o desenho final — o servidor
 * autoritativo esta em PENDENCIAS.md — mas e o que poe a mesa de pe sem
 * duplicar a regra em plpgsql: o `apply` continua sendo a unica porta.
 *
 * Duas coisas ficam gravadas, e vale saber qual e qual: a **verdade** da
 * partida e `matches.initial_state` mais o log de `match_commands`, que
 * reproduz tudo porque o motor e puro e a semente e fixa; o `matches.state` e
 * **cache** dela, para o convidado nao refazer 400 comandos a cada mudanca e
 * para quem recarrega a pagina comecar na hora.
 *
 * Tres coisas so o host faz: aplicar comando, gravar estado e dirigir a mesa
 * (bots e relogio da janela). Se o convidado tambem dirigisse, cada bot jogaria
 * uma vez por aba aberta.
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
    // Ferramenta de dev, e so do host: os bots sao dele, e pausa-los na tela do
    // convidado nao pararia mesa nenhuma.
    const [botsPaused, setBotsPaused] = useState(false);

    // O estado que o host aplica em cima. Vive num ref, e nao so no state do
    // React, porque o `applyAsHost` precisa do estado *agora*: dentro do
    // atualizador do setState ele nao poderia gravar no banco, que e efeito
    // colateral, e fora dele leria um valor velho.
    const stateRef = useRef(null);
    // O numero do ultimo comando aplicado. E o mesmo numero que vai para o
    // `seq` da linha e para o `state_version` da partida — sao a mesma coisa
    // dita duas vezes, e e por isso que o banco consegue conferir uma contra a
    // outra.
    const seqRef = useRef(0);
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

    /**
     * As escritas do host, uma de cada vez e na ordem em que ele aplicou.
     *
     * Precisa ser fila, e nao chamada solta, por causa do invariante que a 0011
     * poe no banco: o estado so pode apontar para um comando que ja esta no
     * log. Duas jogadas rapidas soltas na rede chegariam em qualquer ordem, e a
     * gravacao do estado da segunda poderia passar na frente do comando dela.
     */
    const writeChain = useRef(Promise.resolve());
    const enqueueWrite = useCallback(task => {
        writeChain.current = writeChain.current
            .then(task)
            .catch(err => setError(err));
    }, []);

    const readMatch = useCallback(async () => {
        const row = await getMatchRow(idMatch);
        if(!row) throw new Error('Partida não encontrada.');
        setMatch(row);
        // O host e a autoridade: o que o banco tem e o que ele mesmo gravou, e
        // reler por cima do que ele acabou de aplicar seria voltar no tempo.
        if(row.id_host !== user.id && row.state_version >= seqRef.current){
            seqRef.current = row.state_version;
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
                    seqRef.current = row.state_version;
                    applyState(row.state);
                }
            })
            .catch(err => isMounted && setError(err))
            .finally(() => isMounted && setIsLoading(false));
        return () => { isMounted = false; };
    }, [idMatch, user.id, readMatch, applyState]);

    /**
     * O host aplicando um comando: roda o motor, escreve o comando no log e
     * regrava o estado — nessa ordem, que e a ordem que o banco cobra.
     *
     * @param {object} command
     * @param {number|null} idRow  a linha que ja existe, quando o comando veio
     *        de um convidado. Nesse caso o host nao insere: ele *marca* onde o
     *        comando entrou na historia, ou por que nao entrou.
     */
    const applyAsHost = useCallback((command, idRow = null) => {
        const prev = stateRef.current;
        if(!prev) return;

        const now = Date.now();
        const isDev = isDevCommand(command);
        let next;
        try{
            // Poder de dev nao passa pelo motor: `apply` nao conhece dev, e e
            // assim que ele continua seguro para rodar no servidor quando a
            // partida sair do browser do host. O que a partida com cheats muda
            // nao e isso — e o comando dev.* ser gravado no log como qualquer
            // outro, com autor e lugar na ordem, em vez de acontecer so na tela
            // de quem clicou.
            if(isDev && !match?.cheats) throw new Error('Esta partida não aceita cheats.');
            next = isDev ? applyDev(prev, { ...command, now }) : apply(prev, { ...command, now });
        }catch(err){
            setError(err);
            // Comando recusado nao aconteceu: fica sem `seq`, fora do replay, e
            // com o motivo escrito. Antes ele era simplesmente apagado, e quem
            // mandou nunca ficava sabendo por que a jogada sumiu.
            if(idRow) enqueueWrite(() => markCommandRefused(idRow, String(err.message ?? err)));
            return;
        }

        applyState(next);

        // O tick nao vale ida ao banco: ele bate cinco vezes por segundo e, fora
        // do instante em que a janela vence, o proprio motor o trata como
        // inofensivo. Quando vence, ele muda a fase — e ai ele fez parte da
        // partida, entao entra no log como qualquer outro comando.
        if(command.type === Command.tick && next.phase === prev.phase) return;

        const seq = seqRef.current + 1;
        seqRef.current = seq;

        enqueueWrite(async () => {
            if(idRow){
                await markCommandApplied(idRow, seq, now);
            }else{
                // Bot nao tem conta: a linha fica sem dono, e quem responde por
                // ela e o host. O `tick` tambem e dele — e o relogio da mesa.
                await logMatchCommand({
                    idMatch,
                    idUser: isBot(command.playerId) ? null : user.id,
                    command,
                    seq,
                    now
                });
            }
            await saveMatchState(idMatch, next, seq);
        });
    }, [idMatch, user.id, match?.cheats, applyState, enqueueWrite]);

    /**
     * A porta de entrada da partida, para os dois lados. O host aplica na hora;
     * o convidado manda o comando sem numero e espera o estado voltar. O
     * convidado nao aplica localmente de proposito: previsao otimista aqui
     * significaria duas verdades sobre a mesma mesa, e a que perdesse teria que
     * ser desfeita.
     */
    const dispatch = useCallback(command => {
        if(!isHost){
            pushMatchCommand(idMatch, user.id, command).catch(setError);
            return;
        }
        applyAsHost(command);
    }, [isHost, idMatch, user.id, applyAsHost]);

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
            seqRef.current = 0;
            applyState(built);
            // Vai para `initial_state`, que e o ponto de partida do replay e
            // nao pode ser reescrito depois: mexer nele invalidaria o log
            // inteiro de uma vez.
            enqueueWrite(() => seedMatchState(idMatch, built));
        }catch(err){
            setError(err);
            buildingRef.current = false;
        }
    }, [isHost, state, seats, status, idMatch, pool, applyState, enqueueWrite]);

    /**
     * Os comandos que os convidados mandaram e ainda ninguem aplicou.
     *
     * O comando e reassinado com o `id_user` da linha, e nao com o `playerId`
     * que veio dentro dele: quem inseriu a linha e o unico dado que a RLS
     * garantiu, e aceitar a assinatura de dentro deixaria qualquer um jogar
     * pela mao alheia.
     */
    const drain = useCallback(async () => {
        // Sem mesa montada nao ha onde aplicar. Os comandos ficam esperando; o
        // efeito abaixo drena de novo assim que o estado existe — que e
        // justamente o que a fila permanente permite.
        if(!stateRef.current) return;
        try{
            const pending = await getPendingCommands(idMatch);
            for(const row of pending){
                applyAsHost({ ...row.command, playerId: row.idUser }, row.id);
            }
        }catch(err){
            setError(err);
        }
    }, [idMatch, applyAsHost]);

    // Dois canais: o convidado escuta o estado novo, o host escuta o que
    // chegou. Na montagem o host ainda drena uma vez, para o comando que chegou
    // enquanto ele estava fora nao ficar esperando um evento que ja passou.
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

    /**
     * Poder de dev, pela mesma porta da jogada. O host aplica na hora; o
     * convidado manda e espera — igualzinho a jogar uma carta, e de proposito:
     * duas portas seriam duas ordens possiveis para os mesmos eventos.
     *
     * Quem autoriza nao e esta linha: o trigger `match_commands_check_dev`
     * recusa comando `dev.*` fora de partida com cheats ou de quem nao e dev.
     */
    const devDispatch = useCallback(command => {
        dispatch(command);
    }, [dispatch]);

    // Os assentos que esta aba comanda: os bots, e so para o host.
    const botIds = useMemo(() => (isHost && state)
        ? state.players.filter(player => isBot(player.id)).map(player => player.id)
        : EMPTY, [isHost, state]);

    const { stepBots, hasBotCommand } = useMatchDriver({
        state,
        botIds,
        dispatch,
        active: isHost,
        botsPaused
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
        cheats: Boolean(match?.cheats),
        dispatch,
        devDispatch,
        botsPaused,
        setBotsPaused,
        stepBots,
        hasBotCommand
    };
}
