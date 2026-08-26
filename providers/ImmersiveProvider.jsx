'use client'
import { createContext, useContext, useEffect, useState } from 'react';
import { Header } from '@/components/containers/Header';

/**
 * O cabecalho do app e o modo imersivo.
 *
 * Durante a partida a tela inteira e mesa: cabecalho do app e titulo da pagina
 * saem de cena, porque cada pixel que eles ocupam e pixel que falta para os
 * lugares e para a mao. Como o Header vive no layout e a partida vive na
 * pagina, quem esta la embaixo precisa de um jeito de apagar o de cima — e
 * este contexto e esse jeito.
 *
 * Some o Header *e* o `--header-h` junto: o Main mede a altura util com essa
 * variavel, e deixar 3.5rem descontados de uma barra que nao existe mais daria
 * uma faixa morta no rodape.
 */

const ImmersiveContext = createContext(() => {});

export function ImmersiveProvider({ children }){

    const [isImmersive, setIsImmersive] = useState(false);

    return (
        <ImmersiveContext.Provider value={setIsImmersive}>
            <div className={isImmersive ? '[--header-h:0px]' : '[--header-h:3.5rem]'}>
                {!isImmersive && <Header />}
                {children}
            </div>
        </ImmersiveContext.Provider>
    );
}

/** Liga o modo imersivo enquanto `active` for verdadeiro. */
export function useImmersive(active = true){

    const setIsImmersive = useContext(ImmersiveContext);

    useEffect(() => {
        setIsImmersive(active);
        // Sair da pagina devolve o cabecalho: sem isto, navegar de dentro da
        // partida deixaria o app inteiro sem menu.
        return () => setIsImmersive(false);
    }, [active, setIsImmersive]);
}
