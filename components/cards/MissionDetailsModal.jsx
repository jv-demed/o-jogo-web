'use client'
import { Modal } from '@/components/containers/Modal';
import { CardNavigation } from '@/components/cards/CardNavigation';

/**
 * A carta da missao aberta, com as setas para percorrer as sete.
 *
 * Nao e o CardDetailsModal: aquele existe para a colecao e termina num botao de
 * vender, e missao nao se vende nem se possui — ela e sorteada. O que sobra e a
 * carta e a navegacao, que ja sao componentes.
 */
export function MissionDetailsModal({
    missions,
    selectedIndex,
    setSelectedIndex
}){

    if(selectedIndex == null) return null;

    return (
        <Modal onClose={() => setSelectedIndex(null)}
            label={missions[selectedIndex].name}
        >
            <CardNavigation
                cards={missions}
                index={selectedIndex}
                setIndex={setSelectedIndex}
            />
        </Modal>
    );
}
