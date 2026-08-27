'use client'
import { useEffect, useRef, useState } from 'react';

// Quanto tempo o anuncio fica na tela. E relogio de exibicao, e nao de regra:
// o efeito prolongado ja cobrou dentro do `apply` quando a vez virou, e nao ha
// nada no motor esperando por isto. Longo o bastante para a mesa ler a carta,
// curto o bastante para nao atrasar quem esta com a vez.
const SHOW_MS = 3600;

/**
 * O efeito prolongado que acabou de cobrar, para a tela anunciar.
 *
 * Carta de efeito prolongado fica parada na cadeira de quem sofre e cobra
 * sozinha quando a vez dele chega — dentro do `advanceTurn`, antes da compra.
 * Sem anuncio, o unico sinal disso e um shot a mais no contador de alguem, e
 * ninguem liga o shot a uma carta que caiu na mesa tres turnos atras.
 *
 * Le do log (`ongoing.trigger`), e nao de um campo de estado: o disparo e um
 * fato que aconteceu, nao uma situacao que dura. O indice da entrada e a
 * identidade — o estado inteiro e clonado a cada comando, entao comparar o
 * objeto acusaria evento novo a cada tick da janela.
 *
 * `hold` segura o aviso na tela em vez de conta-lo: quando o efeito mandou
 * beber, quem decide quando o aviso sai e a pessoa apertando "bebi", e nao o
 * relogio. Solto o hold, os 3,6s comecam a correr.
 *
 * @returns {{idCard: number, playerId: number, turnsLeft: number|null}|null}
 */
export function useTurnEffect(state, hold = false){

    const [shown, setShown] = useState(null);

    const logRef = useRef([]);
    logRef.current = state?.log ?? [];

    let index = -1;
    for(let i = logRef.current.length - 1; i >= 0; i--){
        if(logRef.current[i].type === 'ongoing.trigger'){
            index = i;
            break;
        }
    }

    useEffect(() => {
        // Partida nova (ou nenhum disparo ainda) limpa o que estava na tela.
        if(index < 0){
            setShown(null);
            return;
        }
        // Dois efeitos cobrando na mesma vez mostram o ultimo: sao dois avisos
        // de 3,6s empilhados numa vez so, e o segundo cobriria o primeiro de
        // qualquer jeito.
        setShown({ index, ...logRef.current[index] });
        if(hold) return;
        const timer = setTimeout(() => setShown(null), SHOW_MS);
        return () => clearTimeout(timer);
    }, [index, hold]);

    return shown?.index === index ? shown : null;
}
