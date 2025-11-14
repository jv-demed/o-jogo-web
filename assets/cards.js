import { CardType } from '@/types/CardType';

export const CARDS = [
    {
        id: 1,
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
        number: 36,
        name: 'Cuidadron',
        isShot: false,
        type: CardType.defense,
        text: `
            Faça como o Dron e seja sempre safe nos jogos. Jogue esta carta e anule uma carta de efeito
            jogada contra você.
        `,
        level: 3
    },{
        id: 37,
        number: 37,
        name: 'Caipa Dupla do Céu',
        isShot: true,
        type: CardType.shot,
        text: `
            Hoje a caipa é dupla no Céu! Escolha 1 jogador para beber 1 shot com você.
        `,
        level: 1
    },{
        id: 38,
        number: 38,
        name: 'Rolê',
        isShot: true,
        type: CardType.investigation,
        text: `
            Brasa, Jv e Jp estão no vip do Rolê, bebendo muita tequila. Os jogadores Swarley, Smichaels e 
            Sauzburg deverão beber 1 shot cada, mas sem revelar suas identidades.
        `,
        level: 3
    },{
        id: 39,
        number: 39,
        name: 'A Luta do Século',
        isShot: true,
        type: CardType.investigation,
        text: `
            Foi marcada a luta para finalmente decidir quem ganhou a briga na casa do Yuri. Para assistir 
            esse duelo, todos os jogadores, com exceção de Sauzburg e Swarley, devem beber 1 shot.
        `,
        level: 3
    },{
        id: 40,
        number: 40,
        name: 'Filtro do Snapchat',
        isShot: false,
        type: CardType.investigation,
        text: `
            Brasa e Jp adoram brincar com as novas tecnologias e se mamar depois. Sem revelar suas identidades, 
            Swarley e Sauzburg deverão trocar suas missões um com o outro.
        `,
        level: 3
    },{
        id: 41,
        number: 41,
        name: 'Show das Drags',
        isShot: false,
        type: CardType.investigation,
        text: `
            João Vitor e Brasa foram a um show de Drags na Cucko e se surpreenderam ao ver que seus amigos que
            eram as Drags. Os jogadores Sauzburg, Stanley e Sjehnsens deverão trocar de missão entre si, sem 
            revelar suas identidades.
        `,
        level: 3
    },{
        id: 42,
        number: 42,
        name: 'Client Perfeito',
        isShot: true,
        type: CardType.shot,
        text: `
            Escolha 1 jogador para beber 2 shots. Era pra ser 1, mas o client bugou.
        `,
        level: 1
    },{
        id: 43,
        number: 43,
        name: 'Piada do Milton',
        isShot: true,
        type: CardType.shot,
        text: `
            O Senhor Milton é um piadista nato e, para homenagea-lo, o jogador anterior deve contar uma piada 
            ou beber 2 shots.
        `,
        level: 2
    },{
        id: 44,
        number: 44,
        name: 'Vamo virar? Vamo!',
        isShot: true,
        type: CardType.shot,
        text: `
            Alguém lançou a ordem. Todos os jogadores bebem 1 shot. Simples.
        `,
        level: 2
    },{
        id: 45,
        number: 45,
        name: 'Promoshare',
        isShot: true,
        type: CardType.shot,
        text: `
            Você foi o grande sorteado da promoshare da Cucko, parabéns! Você e 2 acompanhantes ganharão free 
            e 1 shot cada. Escolha 2 jogadores para beberem 1 shot com você.
        `,
        level: 2
    },{
        id: 46,
        number: 46,
        name: 'Mãozinha',
        isShot: true,
        type: CardType.shot,
        text: `
            Ao jogar esta carta, o último jogador desatento deverá beber 2 shots.
        `,
        level: 2
    },{
        id: 47,
        number: 47,
        name: 'Ventilador Assassino',
        isShot: true,
        type: CardType.shot,
        text: `
            O fim do ano chegou e mais um ventilador do Anne Frank caiu. Dessa vez, ele caiu no próximo jogador
            a jogar e ele deverá beber 1 shot para se curar.
        `,
        level: 1
    },{
        id: 48,
        number: 48,
        name: 'Prisão',
        isShot: true,
        type: CardType.effect,
        text: `
            Assim como o sor de artes, um dos jogadores é um bandido. Escolha 1 jogador para ficar preso e sem 
            poder jogar por 3 turnos completos, ou até que ele beba 2 shots.
        `,
        level: 3
    },{
        id: 49,
        number: 49,
        name: 'Gemidinha',
        isShot: false,
        type: CardType.effect,
        text: `
            Ain!. Dê um gemidinho e anule qualquer jogada de qualquer jogador. Caso essa carta for usada fora da 
            sua vez, o jogo continuará pelo jogador seguinte a você.
        `,
        level: 4
    },{
        id: 50,
        number: 50,
        name: 'Modo Deus',
        isShot: false,
        type: CardType.effect,
        text: `
            Você acaba de ativar o "Modo Deus", um hack para jogadores medianos. Escolha 1 jogador e veja sua 
            missão em segredo. Caso queira, você poderá trocar de missão com este jogador.
        `,
        level: 4
    },{
        id: 51,
        number: 51,
        name: 'Sou Louca Sim!',
        isShot: false,
        type: CardType.effect,
        text: `
            O Jax duvidou, mas a vó Chucha mostrou pra ele quem é que manda, tirando este joguinho da tomada. 
            A partir da ativação desta carta, o jogo durará mais 2 turnos completos e então terminará.
        `,
        level: 4
    },{
        id: 52,
        number: 52,
        name: 'Cigarro no Olho',
        isShot: false,
        type: CardType.effect,
        text: `
            Se você quer foder seu adversário, apague um cigarro no olho dele. Escolha 1 jogador para roubar 
            uma carta, sem vê-la. A carta será jogada imediatamente.
        `,
        level: 3
    },{
        id: 53,
        number: 53,
        name: 'Xis do Gelson',
        isShot: false,
        type: CardType.effect,
        text: `
            O próximo jogador a jogar comeu um xis do Gelson e está de barriga cheia. Ele ficará sem jogar por 2 
            turnos completos para fazer a digestão.
        `,
        level: 3
    },{
        id: 54,
        number: 54,
        name: 'Peido do Exequiel',
        isShot: false,
        type: CardType.effect,
        text: `
            Exequiel soltou um peido tão fedido que acabou confundindo os jogadores. A ordem de jogo será invertida.
        `,
        level: 2
    },{
        id: 55,
        number: 55,
        name: 'A Queda',
        isShot: false,
        type: CardType.effect,
        text: `
            O Cauê caiu da escada e acabou levando junto 2 shots de alguém. Escolha 1 jogador para perder 2 shots 
            de sua contagem.
        `,
        level: 3
    }
]

/*
    outros
    politico 59 f efe
    prova 61 f efe
    joaquim 63 f efe
    o que 68 f efe
    para 30 f def

    fio 36 v div
    quinta 39 f div
    benção 43 f div
*/