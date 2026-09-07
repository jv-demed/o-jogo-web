import { Mission } from '@/domain/cards/vocabulary';
import { MISSIONS } from '@/domain/match/missions';

/**
 * As missoes como carta: numero, arte e o texto que vai no corpo.
 *
 * Espelha assets/cards.js, e e por isso que mora aqui e nao junto da regra: a
 * regra e de domain/match/missions.js, que nao importa nada de assets — o
 * `goal` e a linha curta que a apuracao mostra. O sabor, a arte e o numero sao
 * catalogo, e catalogo e a camada de cima. Quando os dois discordarem, a regra
 * ganha e esta entrada e que esta errada.
 *
 * `text` segue a convencao das cartas (assets/cards.js): uma frase de sabor e,
 * na sequencia, o objetivo em palavras de regra. E o que a carta mostra na
 * mesa, entao ele repete o objetivo de proposito — quem le a carta nao deveria
 * precisar de uma segunda tela para saber o que precisa fazer.
 *
 * `title` e o nome da missao *dentro da ficcao*, acima da descricao no corpo da
 * carta. Nao se confunde com `name`, que e a identidade: o `name` e o que a
 * mesa acusa ("o Swelcows ganhou"), o `title` e o que a carta chama de si
 * mesma. Sao dois campos porque so o `name` e regra, e so ele tem que bater
 * com domain/match/missions.js.
 *
 * A arte sai de public/missions/<Nome>.webp, derivada do `name`: os arquivos
 * sao nomeados pela missao, e um campo a mais por missao seria a mesma string
 * escrita duas vezes.
 */

const card = (id, number, title, text) => ({
    id,
    number,
    // Lido pelo componente Card para escolher a moldura e para saber que esta
    // carta nao tem nivel nem tipo.
    frame: 'mission',
    name: MISSIONS[id].name,
    objective: MISSIONS[id].text,
    art: `/missions/${MISSIONS[id].name}.webp`,
    title,
    text,
});

export const MISSION_CARDS = [
    card(Mission.sauzburg, 1, 
        'Missão: Passamento', `
        Sauzburg é o bêbado rei, pois só se vive um vez! Seja o jogador com 
        mais shots no final.
    `),
    card(Mission.swarley, 2, 
        'Missão: Barack Obama', `
        Swarley não é bêbado, e sim, um amigo do verde. Seja o jogador com 
        menos shots no final.
    `),
    card(Mission.sjehnsens, 3, 
        'Missão: Networking', `
        Sjehnsens é um bêbado empreendedor e adora um happy hour. Ao final 
        da partida, acerte a identidade de todos os jogadores.
    `),
    card(Mission.stanley, 4, 
        'Missão: O Glads dos Jogos', `
        Stanley é um bêbado muito competitivo e quer humilhar seus adversários, 
        pois se considera o Glads dos jogos. Vence se todos os outros jogadores 
        perderem.
    `),
    card(Mission.smichaels, 5, 
        'Missão: Perdigotos', `
        Smichaels é um bêbado amoroso, sempre demonstrando seu afeto através 
        famosas gotículas que saem da sua boca. Vence se ao menos 2 outros 
        jogadores vencerem o jogo.
    `),
    card(Mission.sjamals, 6, 
        'Missão: Eu Pago!', `
        Sjamals é um bêbado muito solícito e quer ver seus amigos bem felizes. 
        Seja o jogador que mais fez os outros beberem durante a partida.
    `),
    card(Mission.swelcows, 7, 
        'Missão: Vestibulando', `
        Swelcows é um bêbado que não deveria estar jogando o Jogo, pois amanhã 
        fará vestibular e Enem. Livre-se desta missão o quanto antes, ou 
        perderá a partida.
    `),
];

const BY_ID = Object.fromEntries(MISSION_CARDS.map(entry => [entry.id, entry]));

/** A carta de uma missao. `null` quando o id nao e de missao. */
export const missionCard = id => BY_ID[id] ?? null;
