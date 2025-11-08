import { CardType } from '@/types/CardType';

export const CARDS = [
    {
        id: 1,
        idPack: 1,
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
        id: 2,
        idPack: 1,
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
        id: 3,
        idPack: 1,
        number: 3,
        name: 'Um Bom Companheiro',
        isShot: true,
        type: CardType.shot,
        text: `
            A famosa tradição. Cante a musiquinha e escolha alguém para beber 1 shot.
        `,
        level: 1
    },{
        id: 4,
        idPack: 1,
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
        id: 5,
        idPack: 1,
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
        id: 6,
        idPack: 1,
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
        id: 7,
        idPack: 1,
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
        id: 8,
        idPack: 1,
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
        id: 9,
        idPack: 1,
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
        id: 10,
        idPack: 1,
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
        id: 11,
        idPack: 1,
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
        id: 12,
        idPack: 1,
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
        id: 13,
        idPack: 1,
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
        id: 14,
        idPack: 1,
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
        id: 15,
        idPack: 1,
        number: 15,
        name: 'O Guerreiro Entregue',
        isShot: false,
        type: CardType.effect,
        text: `
            Parece que o guerreiro se entregou. Escolha 1 jogador para dormir e perder 2 turnos completos.
        `,
        level: 3
    },{
        id: 16,
        idPack: 1,
        number: 16,
        name: 'Não Dá Pra Tetudo',
        isShot: false,
        type: CardType.effect,
        text: `
            Não se pode tetudo nessa vida, porém, novas cartas sim. Descarte sua mão e pegue uma nova.
        `,
        level: 4
    },{
        id: 17,
        idPack: 1,
        number: 17,
        name: 'Vão Chegar uns Amigos Aqui em Casa',
        isShot: true,
        type: CardType.shot,
        text: `
            Seus amigos chegaram e eles querem beber. Escolha 3 jogadores para beberem 1 shot cada.
        `,
        level: 2
    },{
        id: 18,
        idPack: 1,
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
        id: 19,
        idPack: 1,
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
        id: 20,
        idPack: 1,
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
        id: 21,
        idPack: 1,
        number: 21,
        name: 'Dj Vomitado',
        isShot: false,
        type: CardType.effect,
        text: `
            Seu amigo acabou de vomitar no Dj. Escolha 1 jogador para perder 2 shots de sua contagem.
        `,
        level: 3
    },{
        id: 22,
        idPack: 1,
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
        id: 23,
        idPack: 1,
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
        id: 24,
        idPack: 1,
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
        id: 25,
        idPack: 1,
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
        id: 26,
        idPack: 1,
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
    },{
        id: 27,
        idPack: 1,
        number: 27,
        name: 'Papai Noel',
        isShot: true,
        type: CardType.shot,
        text: `
            O Natal chegou! Presenteie outro jogador com 1 shot.
        `,
        level: 1
    },{
        id: 28,
        idPack: 1,
        number: 28,
        name: 'Luvas no Chão',
        isShot: true,
        type: CardType.shot,
        text: `
            Você encontrou as luvas do Dron no chão e há 1 shot dentro delas. Beba-o.
        `,
        level: 1
    },{
        id: 29,
        idPack: 1,
        number: 29,
        name: 'É Aquela Velha História',
        isShot: true,
        type: CardType.shot,
        text: `
            Não, sim, é o que eu digo pra vocês! Os 2 jogadores a sua esquerda devem beber 1 shot.
        `,
        level: 2
    },{
        id: 30,
        idPack: 1,
        number: 30,
        name: 'Peitos',
        isShot: true,
        type: CardType.shot,
        text: `
            Você acaba de perceber que seu amigo está encarando os peitos de uma guria e, por isso,
            ele deve beber. O jogador mais distante de você deve beber 1 shot.
        `,
        level: 1
    },{
        id: 31,
        idPack: 1,
        number: 31,
        name: 'Bêbado de Shoyu',
        isShot: true,
        type: CardType.investigation,
        text: `
            Todo mundo tem um fraco para alguma bebida. A do Dron é o Molho Shoyu. Escolha 1 jogador 
            para beber 1 shot e, se este jogador for o Sjamals, ele deverá beber 2 shots.
        `,
        level: 3
    },{
        id: 32,
        idPack: 1,
        number: 32,
        name: 'Quando Eu Fui pra Austrália...',
        isShot: false,
        type: CardType.effect,
        text: `
            Vivendo com os cangurus, o Dron obteve as mais intensas experiências, sexuais ou não, de sua
            vida. Escolha 2 jogadores para trocarem de missão entre si e terem também essa experiência
            marsupiana.
        `,
        level: 3
    },{
        id: 33,
        idPack: 1,
        number: 33,
        name: 'O Robin Brasileiro',
        isShot: false,
        type: CardType.effect,
        text: `
            Poucos sabem, mas há um super-herói entre nós. Sendo um menino prodígio, o Dron possui poderes
            de se transvestir que poucos superam. Ao jogar esta carta, você pode mimetizar os efeitos de 
            qualquer carta já jogada anteriormente.
        `,
        level: 4
    },{
        id: 34,
        idPack: 1,
        number: 34,
        name: 'Vamos pra Baleia',
        isShot: false,
        type: CardType.effect,
        text: `
            Pedron Ourfali quer viajar com seus amigos. Escolha até 4 jogadores para fazerem uma viagem e,
            a seu critério, mude suas posições no jogo.
        `,
        level: 3
    },{
        id: 35,
        idPack: 1,
        number: 35,
        name: 'Disco de Duelo',
        isShot: false,
        type: CardType.effect,
        text: `
            O Dron nunca entregou o disco de duelo que ele nos vendeu. Como indenização, você pode olhar
            a última carta do seu baralho e decidir se quer compra-la ou comprar a do topo.
        `,
        level: 3
    },{
        id: 36,
        idPack: 1,
        number: 36,
        name: 'Cuidadron',
        isShot: false,
        type: CardType.defense,
        text: `
            Faça como o Dron e seja sempre safe nos jogos. Jogue esta carta e anule uma carta de efeito
            jogada contra você.
        `,
        level: 3
    }
]

/*
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