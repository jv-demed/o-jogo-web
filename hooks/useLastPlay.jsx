'use client'
import { useEffect, useState } from 'react';

/**
 * A ultima carta que a mesa viu ser jogada.
 *
 * O motor nao guarda isso: a carta fica na `stack` enquanto resolve e depois
 * cai no descarte do dono, sem nenhum campo dizendo "foi essa a ultima". Quem
 * precisa da informacao e so a tela — a pilha do centro e o anuncio em tela
 * cheia — entao ela mora aqui, e nao no estado da partida.
 *
 * O `uid` do item e a identidade da jogada: e ele que diz "essa e nova" quando
 * a mesma carta e jogada duas vezes seguidas.
 *
 * @returns {{uid: string, idCard: number, byId: number}|null}
 */
export function useLastPlay(state){

    const [play, setPlay] = useState(null);

    const top = state?.stack[state.stack.length - 1] ?? null;

    // Partida nova zera a pilha do centro: sem isto, recomeçar mostraria no
    // meio da mesa a ultima carta da partida anterior.
    const isFresh = Boolean(state) && state.turnCount === 0
        && state.stack.length === 0 && state.log.length === 0;

    useEffect(() => {
        if(!state || isFresh){
            setPlay(null);
            return;
        }
        if(!top) return;
        setPlay(prev => prev?.uid === top.uid
            ? prev
            : { uid: top.uid, idCard: top.idCard, byId: top.byId });
    }, [state, isFresh, top]);

    return play;
}
