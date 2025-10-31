import { CardType } from '@/models/CardType';

export const CARDS = [
    {
        number: 1,
        name: 'A Bebida Infinita',
        isShot: true,
        type: CardType.shot,
        text: `
            Foi descoberta uma fórmula mágica para beber infinitamente! Escolha 1 
            jogador para beber 1 shot, na vez dele, pelas próximas 3 rodadas.
        `,
        level: 3
    },{
        number: 2,
        name: 'Festinha de Sexta',
        isShot: true,
        type: CardType.shot,
        text: `
            Mais uma edição da festinha de sexta aconteceu, mas você não foi convidado. 
            Todos bebem 1 shot, menos você.
        `,
        level: 3
    },{
        number: 3,
        name: 'Um Bom Companheiro',
        isShot: true,
        type: CardType.shot,
        text: `
            A famosa tradição. Cante a musiquinha e escolha alguém para beber 1 shot.
        `,
        level: 1
    },{
        number: 4,
        name: 'Kitumbras',
        isShot: true,
        type: CardType.investigation,
        text: `
            Jp quer companhia para um kitumbras. Ao jogar, Sauzburg obrigatoriamente
            beberá 1 shot e os outros poderão escolher se querem beber ou não.
        `,
        level: 3
    },{
        number: 5,
        name: 'Cabeça Rachada',
        isShot: false,
        type: CardType.effect,
        text: `
            Jp, enfurecido, acaba de dar uma cabeçada em um taxista e fica maluco. 
            Ao jogar, a missão de Sauzburg passa a ser ter menos shots entre todos 
            os jogadores. A carta perde o efeito após uma troca de missão de Sauzburg.
        `,
        level: 5
    },{
        number: 6,
        name: 'É, Deve Ser',
        isShot: false,
        type: CardType.defense,
        text: `
            Por mais que tenham argumentos, você está completamente blindado. Diga 
            "é, deve ser" e anule qualquer troca de missão que tentarem realizar com
            você ou outro jogador.
        `,
        level: 3
    },{
        number: 7,
        name: 'Livro do Brasa',
        isShot: true,
        type: CardType.shot,
        text: `
            Você piscou e o Brasa lançou mais um livro!. Todos bebem 1 shot para 
            comemorar.
        `,
        level: 4
    },{
        number: 8,
        name: 'O Pai do Grupo',
        isShot: true,
        type: CardType.shot,
        text: `
            O Brasa é como um pai para todos nós e temos muito o que aprender com ele. 
            Como um bom pai, ele está oferecendo 1 shotzinho para seus filhos. Escolha 
            3 jogadores para beberem 1 shot cada.
        `,
        level: 2
    },{
        number: 9,
        name: 'Brasa Negrão',
        isShot: true,
        type: CardType.investigation,
        text: `
            O Brasa falou novamente que é negro. Por conta disso, Swarley será identificado, 
            beberá 1 shot e apontará outro jogador para beber 1 shot também.
        `,
        level: 2
    },{
        number: 10,
        name: 'César que Destruiu o Império',
        isShot: false,
        type: CardType.investigation,
        text: `
            César chegou e bagunçou tudo. Escolha outro jogador e, caso não seja o Swarley,
            troque de missão com ele. Caso seja o Swarley, a missão dele passa a ser ter mais
            shots que todos os outros jogadores. A carta perde o efeito após uma troca de missão 
            de Swarley.
        `,
        level: 6
    },{
        number: 11,
        name: 'Não Posso, Tenho que Codar',
        isShot: false,
        type: CardType.defense,
        text: `
            Hoje você está ocupado pro rolê. Fique em casa codando! Esta carta anulará o próximo 
            shot que mandarem você beber.
        `,
        level: 2
    },{
        number: 12,
        name: 'Renekton de Rei Destruído',
        isShot: true,
        type: CardType.shot,
        text: `
            Ao buildar errado, o Jax conseguiu feedar mais uma vez. Escolha 4 jogadores, companheiros 
            de time do Jax, para beberem 1 shot cada.
        `,
        level: 2
    },{
        number: 13,
        name: 'Roubando a Jurupinga',
        isShot: true,
        type: CardType.effect,
        text: `
            Roubaram uma jurupinga do Jax! Escolha 1 jogador para perde 1 shot de sua contagem e outro 
            para beber 1 shot.
        `,
        level: 3
    },{
        number: 14,
        name: 'Cortador de Unhas',
        isShot: false,
        type: CardType.investigation,
        text: `
            Estão ouvindo um "clak" no discord? O Jax está cortando suas unhas de novo. Escolha 1 jogador 
            e, se ele for o Sjehnsens, ele ficará sem jogar por 1 turno completo.
        `,
        level: 3
    },{
        number: 15,
        name: 'O Guerreiro Entregue',
        isShot: false,
        type: CardType.effect,
        text: `
            Parece que o guerreiro se entregou. Escolha 1 jogador para dormir e perder 2 turnos completos.
        `,
        level: 4
    },{
        number: 16,
        name: 'Não Dá Pra Tetudo',
        isShot: false,
        type: CardType.effect,
        text: `
            Não se pode tetudo nessa vida, porém, novas cartas sim. Descarte sua mão e pegue uma nova.
        `,
        level: 4
    }
]

/*
    1 shot = 1
    3 shots = 2
    5 shots = 3
    6+ shots = 4
    1 certo e outros duvidoso = 2
    -1 shot = 2

    durar + de um turno = 1
    durar até ser retirado = 3

    revelação duvidosa = 1
    invertida de missão = 2

    perda 1 turno = 1
    perda 2 turnos = 3

    compra 1 = 2
    compra 2 = 3
    compra 5 = 6
    descarte x = -2

    defesa = +1
    def 1 shot = 1
    def troca de missão = 2
*/

/*

    ricardo
    amigos 23 v shot
    todos a bordo 49 v shot
    cebola 19 v invest
    out 32 f def
    legume 45 f efe
    dj 66 f efe
    jogos 67 f efe

    jv
    arvore 22 v inv
    malas 27 f efe
    mentira 46 f def

    dron
    papai noel 7 v shot
    luvas 11 v shot
    velha hist 29 v shot
    peitos 62 v shot
    shoyu 17 v inv
    australia 48 f efe
    robin 51 f efe
    nissim 64 f efe
    disco 69 f efe
    cuidadron 53 f def

    grupo
    caipao 14 v shot
    role 20 v inv
    filtro 21 f inv
    drags 44 f inv
    luta 65 v inv

    outros
    client 10 v shot
    milton 12 v shot
    virar 15 v shot
    promo 16 v shot
    para 30 f def
    gemidinha 37 f efe
    modo deus 38 f efe
    louca 41 f efe
    cigarro 50 f efe
    mao 52 v shot
    gelson 55 f efe
    peido 56 f efe
    prisao 57 v efe
    caue 58 f efe
    politico 59 f efe
    ventilador 60 v shot
    prova 61 f efe
    joaquim 63 f efe
    o que 68 f efe
    fio 36 v div
    quinta 39 f div
    benção 43 f div
*/