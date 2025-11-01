import { CardType } from '@/types/CardType';

export const CARDS = [
    {
        number: 1,
        name: 'A Bebida Infinita',
        isShot: true,
        type: CardType.shot,
        text: `
            Foi descoberta uma fórmula mágica para beber infinitamente! Escolha 1 
            jogador para beber 1 shot, na vez dele, pelos próximos 3 turnos.
        `,
        level: 2
    },{
        number: 2,
        name: 'Festinha de Sexta',
        isShot: true,
        type: CardType.shot,
        text: `
            Mais uma edição da festinha de sexta aconteceu, mas você não foi convidado. 
            Todos bebem 1 shot, menos você.
        `,
        level: 2
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
        level: 3
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
        level: 2
    },{
        number: 7,
        name: 'Livro do Brasa',
        isShot: true,
        type: CardType.shot,
        text: `
            Você piscou e o Brasa lançou mais um livro!. Todos bebem 1 shot para 
            comemorar.
        `,
        level: 2
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
        level: 4
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
        level: 4
    },{
        number: 11,
        name: 'Não Posso, Tenho que Codar',
        isShot: false,
        type: CardType.defense,
        text: `
            Hoje você está ocupado pro rolê. Fique em casa codando! Esta carta anulará o próximo 
            shot que mandarem você beber.
        `,
        level: 1
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
        level: 2
    },{
        number: 14,
        name: 'Cortador de Unhas',
        isShot: false,
        type: CardType.investigation,
        text: `
            Estão ouvindo um "clak" no discord? O Jax está cortando suas unhas de novo. Escolha 1 jogador 
            e, se ele for o Sjehnsens, ele ficará sem jogar por 1 turno completo.
        `,
        level: 2
    },{
        number: 15,
        name: 'O Guerreiro Entregue',
        isShot: false,
        type: CardType.effect,
        text: `
            Parece que o guerreiro se entregou. Escolha 1 jogador para dormir e perder 2 turnos completos.
        `,
        level: 3
    },{
        number: 16,
        name: 'Não Dá Pra Tetudo',
        isShot: false,
        type: CardType.effect,
        text: `
            Não se pode tetudo nessa vida, porém, novas cartas sim. Descarte sua mão e pegue uma nova.
        `,
        level: 4
    },{
        number: 17,
        name: 'Vão Chegar uns Amigos Aqui em Casa',
        isShot: true,
        type: CardType.shot,
        text: `
            Seus amigos chegaram e eles querem beber. Escolha 3 jogadores para beberem 1 shot cada.
        `,
        level: 2
    },{
        number: 18,
        name: 'Todos a Bordo!',
        isShot: true,
        type: CardType.shot,
        text: `
            Piuííííí!!! Preparem-se para embarcar em uma grande aventura com o maquinista Stanley! Todos
            devem beber 1 shot.
        `,
        level: 2
    },{
        number: 19,
        name: 'Cebola Amiga',
        isShot: true,
        type: CardType.investigation,
        text: `
            O Ricardo finalmente fez as pazes com a cebola que quase o matou. Para comemorar essa 
            reconciliação, Stanley se revelará, tomando 2 shot.
        `,
        level: 4
    },{
        number: 20,
        name: 'Dia do Legume',
        isShot: false,
        type: CardType.effect,
        text: `
            O dia do legume chegou e o pequeno Ricardinho vai ser um menino bonzinho e obediente!
            Após jogar esta carta, após 3 turnos, a missão de Stanley passará a depender da vitória
            de mais 2 jogadores.
        `,
        level: 4
    },{
        number: 21,
        name: 'Dj Vomitado',
        isShot: false,
        type: CardType.effect,
        text: `
            Seu amigo acabou de vomitar no Dj. Escolha 1 jogador para perder 2 shots de sua contagem.
        `,
        level: 3
    },{
        number: 22,
        name: 'Jogos Desnecessários',
        isShot: false,
        type: CardType.effect,
        text: `
            O Ricardo não compra jogos desnecessários, apenas os necessários. Por isso, você deve
            escolher 2 cartas, necessárias, que já foram usadas por você, e recolocar no seu baralho.
            Após a escolha, o baralho será embaralhado.
        `,
        level: 4
    },{
        number: 23,
        name: 'Tô Out',
        isShot: false,
        type: CardType.defense,
        text: `
            Hoje você quer ficar só na aguinha. Escolha outro jogador para beber 1 shot que você 
            deveria beber.
        `,
        level: 2
    },{
        number: 24,
        name: 'Abraço na Árvore',
        isShot: true,
        type: CardType.investigation,
        text: `
            Faça como o Camelinho e celebre o amor pelo meio ambiente! Para isso, escolha 1 jogador 
            para beber 1 shot. Se você ou o jogador escolhido for o Smichaels, você também toma 1 shot.
        `,
        level: 3
    },{
        number: 25,
        name: 'Viagem no Porta-Malas',
        isShot: false,
        type: CardType.effect,
        text: `
            Você foi viajar com o pessoal, mas acabou indo no porta-malas. Como recompensa, você deverá 
            comprar 1 carta extra.
        `,
        level: 1
    },{
        number: 26,
        name: 'Que Mentira!',
        isShot: false,
        type: CardType.defense,
        text: `
            O jogo travou! Aumentou o FPS bem na hora! Tão usando hack! Esse boneco engordou! Seja qual
            for a razão, todos sabemos que habilidade não nos falta e, por este motivo, você pode cancelar
            qualquer jogada contra você que não tenha a ver com shots.
        `,
        level: 4
    }
]

/*
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
    luta 65 v inv
    filtro 21 f inv
    drags 44 f inv

    outros
    client 10 v shot
    milton 12 v shot
    virar 15 v shot
    promo 16 v shot
    mao 52 v shot
    ventilador 60 v shot
    prisao 57 v efe
    gemidinha 37 f efe
    modo deus 38 f efe
    louca 41 f efe
    cigarro 50 f efe
    gelson 55 f efe
    peido 56 f efe
    caue 58 f efe
    politico 59 f efe
    prova 61 f efe
    joaquim 63 f efe
    o que 68 f efe
    para 30 f def

    fio 36 v div
    quinta 39 f div
    benção 43 f div
*/