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
        level: 4
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
        level: 3
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
        level: 2
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
        level: 2
    },{
        id: 37,
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
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
        idPack: 1,
        number: 55,
        name: 'A Queda',
        isShot: false,
        type: CardType.effect,
        text: `
            O Cauê caiu da escada e acabou levando junto 2 shots de alguém. Escolha 1 jogador para perder 2 shots 
            de sua contagem.
        `,
        level: 3
    },{
        id: 56,
        idPack: 1,
        number: 56,
        name: 'O Político',
        isShot: false,
        type: CardType.effect,
        text: `
            Faça como o Fabrício e filie-se a um partido. A sua escolha, todos os jogadores deverão passar sua 
            missão para o jogador anterior ou o seguinte.
        `,
        level: 4
    },{
        id: 57,
        idPack: 1,
        number: 57,
        name: 'A Prova Comida',
        isShot: false,
        type: CardType.effect,
        text: `
            Algumas pessoas resolveram comer sua prova. Escolha 1 jogador para perder o jogo, mesmo que ele 
            cumpra sua missão. A carta perde o efeito após 2 turnos a partir do momento em que foi jogada.
        `,
        level: 4
    },{
        id: 58,
        idPack: 1,
        number: 58,
        name: 'Tábua do Joaquim',
        isShot: false,
        type: CardType.effect,
        text: `
            Os guris pilharam de comprar mais uma tábua, mas a divisão do custo sairá cara. Escolha 3 jogadores 
            para descartarem 1 carta de suas mãos.
        `,
        level: 3
    },{
        id: 59,
        idPack: 1,
        number: 59,
        name: 'O Que?',
        isShot: false,
        type: CardType.defense,
        text: `
            Você acaba de ser confrontado, contudo está protegido perante sua total incredulidade. Anule até 2 
            shots que mandem você beber.
        `,
        level: 2
    },{
        id: 60,
        idPack: 1,
        number: 60,
        name: 'Ah Meu, Para!',
        isShot: false,
        type: CardType.defense,
        text: `
            Alguém já bebeu demais. Jogue está carta para bloquear 1 shot de qualquer jogador.
        `,
        level: 2
    },{
        id: 61,
        idPack: 1,
        number: 61,
        name: 'O Fio Vermelho',
        isShot: true,
        type: CardType.divine,
        text: `
            O Fio Vermelho é um grande mistério, mas definitivamente poderoso. Use o poder do Fio para conectar 2 
            jogadores. Sempre que um beber um número de shots, o outro deverá beber também o mesmo número de shots.
        `,
        level: 5
    },{
        id: 62,
        idPack: 1,
        number: 62,
        name: 'Quinta Dimensão',
        isShot: false,
        type: CardType.divine,
        text: `
            A partir da ativação desta carta, o próximo jogador a beber 5 shots, abrirá o portal para a Quinta 
            Dimensão, ocasionando no encerramento da jornada quadridimensional e do jogo.
        `,
        level: 5
    },{
        id: 63,
        idPack: 1,
        number: 63,
        name: 'Benção de Gladstone',
        isShot: false,
        type: CardType.divine,
        text: `
            "Nem Gladstone muda este game". As palavras mágicas foram ditas e agora você tem o poder de trocar 
            o número de shots de um jogador qualquer, com outro jogador qualquer.
        `,
        level: 5
    },{
        id: 64,
        idPack: 2,
        number: 1,
        name: 'Bitrix',
        isShot: false,
        type: CardType.equip,
        text: `
            Um relógio esquisito grudou no seu pulso vindo lá do infinito, o Bitrix! Com ele você poderá escolher 
            para si qualquer missão existente na partida, tendo esse efeito duradouro até o final do jogo ou até 
            esta carta ser destruída. Sua carta de missão ainda poderá ser trocada.
        `,
        level: 4
    },{
        id: 65,
        idPack: 2,
        number: 2,
        name: 'Baguga ou Morte?',
        isShot: true,
        type: CardType.shot,
        text: `
            Um náufrago azarado acaba de se deparar com uma tribo. Defina 1 jogador para escolher entre baguga 
            ou morte. Baguga: beber 1 shot para cada adversário jogando. Morte: ficar sem jogar por 2 turnos 
            completos, mas antes, baguga!
        `,
        level: 4
    },{
        id: 66,
        idPack: 2,
        number: 3,
        name: 'Que Papinho',
        isShot: false,
        type: CardType.defense,
        text: `
            Quando começarem de conversa mansa para cima de você, diga "que papinho". Isso negará o efeito de 
            de um equipamento jogado por outro jogador, o destruindo.
        `,
        level: 3
    },{
        id: 67,
        idPack: 2,
        number: 4,
        name: 'Ricardo Goleiro 1',
        isShot: false,
        type: CardType.defense,
        text: `
            Como bom pelotense, o Ricardo adora agarrar bolas. Ao ser alvejado por algum efeito divino, jogue 
            esta carta e seja defendido pelo melhor goleiro do Brasil. O efeito contra você será anulado.
        `,
        level: 3
    },{
        id: 68,
        idPack: 2,
        number: 5,
        name: 'Uma Noite de Fúria',
        isShot: false,
        type: CardType.investigation,
        text: `
            Cuidado! João Vitor está drogado na noite e está distribuindo socos! Selecione 2 jogadores e, se 
            algum deles for Smichaels, na rodada do fim, Smichaels ganhará caso todos os outros tenham perdido. 
            A carta perde o efeito após uma troca de missão de Smichaels.
        `,
        level: 4
    },{
        id: 69,
        idPack: 2,
        number: 6,
        name: 'Tchouameni',
        isShot: false,
        type: CardType.defense,
        text: `
            Faça como João Vitor e diga "Tchouameni". Essa ação pulará a jogada de qualquer jogador que estiver 
            prestes a jogar.
        `,
        level: 2
    },{
        id: 70,
        idPack: 2,
        number: 7,
        name: 'Alelo do Dron',
        isShot: true,
        type: CardType.equip,
        text: `
            Você adquiriu o cartão Alelo infinito do Dron e poderá pagar shots para si e para seus amigos. Uma 
            vez por turno, em sua vez, você poderá escolher entre beber 1 shot extra ou escolher outro jogador 
            para beber este shot extra.
        `,
        level: 3
    },{
        id: 71,
        idPack: 2,
        number: 8,
        name: 'Argentina Campeã',
        isShot: false,
        type: CardType.effect,
        text: `
            A Argentina acaba de ser campeã da Copa do Mundo e o Rafa enlouqueceu. Swelcows jogou tudo pro alto 
            e, ao chegar na rodada do fim, vencerá o Jogo. A carta perde o efeito após uma troca de missão de 
            Swelcows.
        `,
        level: 3
    },{
        id: 72,
        idPack: 2,
        number: 9,
        name: 'Boludos',
        isShot: true,
        type: CardType.investigation,
        text: `
            Argentinos são boludos e, por isso, Sjehnsens e Swelcows deverão beber 1 shot cada, sem revelar suas 
            identidades.
        `,
        level: 3
    },{
        id: 73,
        idPack: 2,
        number: 10,
        name: 'Pixuco',
        isShot: true,
        type: CardType.equip,
        text: `
            Um cachorro controverso. Equipe Pixuco a 1 jogador. Se este for Sjehnsens ou Swelcows, Pixuco cortará 
            pela metade seus futuros shots, arredondando para cima. Caso seja um dos outros jogadores, Pixuco o 
            obrigará a beber 1 shot extra a cada turno.
        `,
        level: 3
    },{
        id: 74,
        idPack: 2,
        number: 11,
        name: 'Extreme Zero',
        isShot: true,
        type: CardType.investigation,
        text: `
            A Extreme Zero voltou! Monte seu squad escolhendo 3 jogadores, pelas missões, para beber 1 shot com você. 
            Os jogadores que estiverem com as missões escolhidas devem beber 1 shot, mas sem revelar suas identidades.
        `,
        level: 3
    },{
        id: 75,
        idPack: 2,
        number: 12,
        name: 'Vai Virar Uma Carta',
        isShot: true,
        type: CardType.shot,
        text: `
            O grupo possui infinitas histórias. Sendo assim, invente uma nova carta que te permita escolher 1 jogador 
            para beber 2 shots. Caso os outros jogadores achem uma carta ruim, você que bebe os 2 shots.
        `,
        level: 2
    },{
        id: 76,
        idPack: 2,
        number: 13,
        name: 'Divide e Multiplica',
        isShot: true,
        type: CardType.shot,
        text: `
            Como bons alunos da Ana Ilha, todos nós sabemos que quem divide, multiplica. Beba 1 shot e escolha outro 
            jogador para beber também. Este jogador deverá escolher mais 1 jogador para beber outro shot.
        `,
        level: 2
    },{
        id: 77,
        idPack: 2,
        number: 14,
        name: 'Atirador de Feijão do Gil',
        isShot: true,
        type: CardType.equip,
        text: `
            Gil aprimorou seu atirador de feijão e agora ele atira shots. Uma vez por turno, na vez do jogador 
            equipado com esta carta, ele poderá escolher qualquer jogador para beber 1 shot extra.
        `,
        level: 3
    },{
        id: 78,
        idPack: 2,
        number: 15,
        name: 'O Senhor dos Anéis',
        isShot: false,
        type: CardType.effect,
        text: `
            Emersauron surgiu no rolê e está falando do seu precioso. Escolha 1 jogador para ser amaldiçoado 
            pelas palavras malignas de Emersauron e, por dois turnos completos, todo shot que ele beber, não 
            contará em sua contagem.
        `,
        level: 3
    },{
        id: 79,
        idPack: 2,
        number: 16,
        name: 'Largando a Medicina',
        isShot: false,
        type: CardType.effect,
        text: `
            Que tristeza, parece que o Inhos largou a medicina. Para consolá-lo, você deverá dar metade dos 
            shots de algum jogador para ele. Os shots remanescentes deverão ser arredondados para cima.
        `,
        level: 4
    },{
        id: 80,
        idPack: 2,
        number: 17,
        name: 'Bocejada da Fátima',
        isShot: false,
        type: CardType.effect,
        text: `
            A Fátima bocejou e acabou soprando o equipamento de um jogador. Transfira a posse de um equipamento 
            de qualquer jogador para qualquer outro jogador.
        `,
        level: 3
    },{
        id: 81,
        idPack: 2,
        number: 18,
        name: 'A Árvore da Berlim',
        isShot: false,
        type: CardType.divine,
        text: `
            Apesar de todas as intempéries do mundo: violência, guerras, desastres e a ganância da humanidade, 
            a grande Árvore da Berlim continua de pé, distribuindo seu poder de resiliência. Ao jogar esta 
            carta, anule todos os efeitos de ação prolongada ativas no momento.
        `,
        level: 5
    },{
        id: 82,
        idPack: 2,
        number: 19,
        name: 'FUDEU',
        isShot: false,
        type: CardType.divine,
        text: `
            Dron foi resgatar o soldado Ryan em pleno Dia D, contudo, fudeu: uma bomba estourou e destruiu 
            todos os equipamentos ativos no momento.
        `,
        level: 5
    },{
        id: 83,
        idPack: 3,
        number: 1,
        name: 'Pó de Pirlimpimpim',
        isShot: true,
        type: CardType.shot,
        text: `
            A sininho enlouqueceu e quer jogar pó de pirlimpimpim (5 shots) em alguém. Escolha 1 jogador para 
            beber 5 shots.
        `,
        level: 3
    },{
        id: 84,
        idPack: 3,
        number: 2,
        name: 'Freio de Ouro',
        isShot: false,
        type: CardType.effect,
        text: `
            Em plena segunda feira você está entendiado e resolveu, sem mais nem menos, ir na Freio de Ouro. Fique 
            sem jogar por 2 turnos, mas imune à qualquer jogada.
        `,
        level: 3
    },{
        id: 85,
        idPack: 3,
        number: 3,
        name: 'Jp da Ganância',
        isShot: false,
        type: CardType.effect,
        text: `
            Compre 2 cartas. Nas próximas rodadas, haverá uma chance de 50% de você não poder comprar uma nova carta. 
            Este efeito durará até o momento em que o número de cartas em sua mão se estabilize.
        `,
        level: 2
    },{
        id: 86,
        idPack: 3,
        number: 4,
        name: 'Caipirinha de Banana',
        isShot: true,
        type: CardType.shot,
        text: `
            A Caipirinha de Banana do Jax é traiçoeira: doce por fora e horrível por dentro. O jogador com o maior número 
            de shots fornecidos deve beber 2 shots extras.
        `,
        level: 1
    },{
        id: 87,
        idPack: 3,
        number: 5,
        name: 'Ao Infinito e Além',
        isShot: false,
        type: CardType.effect,
        text: `
            Buzz Lightyear levantou voo, rumo ao infinito e além. Escolha um jogador para ter sua contagem de shots elevada 
            ao infinito por 2 turnos completos.
        `,
        level: 4
    },{
        id: 88,
        idPack: 3,
        number: 6,
        name: 'Vamos Fazer um Sorteio?',
        isShot: false,
        type: CardType.investigation,
        text: `
            Ricardo quis criar uma dinâmica diferente pro amigue secrete e acabou levando um boleto pra pagar. Ao utilizar 
            essa carta, escolha 1 jogador para trocar de missão com ele. Este jogador escolherá outro jogador para trocar de 
            missão e assim sucessivamente. As trocas pararão até alguém tentar realizar uma troca com Stanley.
        `,
        level: 4
    },{
        id: 89,
        idPack: 3,
        number: 7,
        name: 'Foto do Frango',
        isShot: false,
        type: CardType.effect,
        text: `
            A foto do seu frango fez sucesso e ganhou muitos likes. Escolha um jogador para lhe entregar uma carta, à escolha 
            dele. Em seguida, você poderá jogar outra carta.
        `,
        level: 2
    },{
        id: 90,
        idPack: 3,
        number: 8,
        name: 'Tu Diz?',
        isShot: false,
        type: CardType.defense,
        text: `
            Ninguém entende direito essa expressão, mas ela tem poderes. Quando alguém usar alguma carta de shot contra você 
            ou outro jogador, reverta os shots para o jogador que utilizou a carta.
        `,
        level: 2
    },{
        id: 91,
        idPack: 3,
        number: 9,
        name: '#CriseNaDiretoria',
        isShot: true,
        type: CardType.shot,
        text: `
            Parece que o JV não conseguiu organizar o futebol de novo e o grupo está claramente em crise. Por conta disso, todos 
            os jogadores que que possuam 5 ou mais shots, devem beber mais 1 shot.
        `,
        level: 2
    },{
        id: 92,
        idPack: 3,
        number: 10,
        name: 'Slides?',
        isShot: false,
        type: CardType.effect,
        text: `
            Finalmente rolará o tão pedido rolê de slides! Todos os jogadores mostrarão uma carta aleatória de sua mão para todos 
            os outros jogadores.
        `,
        level: 2
    },{
        id: 93,
        idPack: 3,
        number: 11,
        name: 'Boleto do Dron',
        isShot: true,
        type: CardType.equip,
        text: `
            O Dron passou um boleto de presente para alguém. Equipe esta carta a 1 jogador. Este jogador deverá beber 1 shot extra 
            a cada turno. Após o primeiro shot, ele terá 50% de chance de beber outro. Caso beba o segundo, terá 25% de chance de 
            beber o terceiro. Se o jogador beber 3 shots, o boleto será quitado e a carta destruída.
        `,
        level: 3
    },{
        id: 94,
        idPack: 3,
        number: 12,
        name: 'Cama Embaixo da Mesa',
        isShot: false,
        type: CardType.effect,
        text: `
            O Dron sabe muito bem que o melhor lugar para se dormir é embaixo de uma mesa. Ao jogar esta carta, você dormirá por 1 
            turno completo, não podendo jogar. Contudo, ao retornar ao jogo, você estará tão descansado que poderá jogar 2 cartas 
            de uma vez.
        `,
        level: 1
    },{
        id: 95,
        idPack: 3,
        number: 13,
        name: 'Tatuagem de Shuriken',
        isShot: true,
        type: CardType.investigation,
        text: `
            O Rafa estava trovando uma menina, mas após ver sua tatuagem de otaku, resolveu pular fora. Por conta disso, Rafael 
            irá beber. Swelcows e mais outro jogador, escolhido aleatoriamente (pois estava com sede no momento), beberão 1 shot.
        `,
        level: 2
    },{
        id: 96,
        idPack: 3,
        number: 14,
        name: 'Enem',
        isShot: false,
        type: CardType.effect,
        text: `
            Hoje não é dia de beber, pois amanhã tem Enem! Escolha 1 jogador para sofrer uma penalidade caso beba algum shot 
            pelos próximos 2 turnos completos. Ao beber 1 shot, o jogador perderá aleatoriamente 1 carta de sua mão.
        `,
        level: 3
    },{
        id: 97,
        idPack: 3,
        number: 15,
        name: 'Maldição do Jogador',
        isShot: false,
        type: CardType.effect,
        text: `
            Não importa o quanto o Rafa se esforce, ele sempre acaba perdendo no futebol. Escolha 1 jogador para ser contaminado 
            pela maldição do Rafa e, até uma troca de missão deste jogador, ele perderá caso o jogo acabe.
        `,
        level: 3
    }
]


/*    
    gurias
    comendo uvas
    pedido de casamento
    menzinho

    grupo
    maionese vencida
    vamos pra argentina
    valeu valeu
    Leo Noites
    Vendedor de Drogas
    Gladsxódia

    outros
    eu sou o lucas
    boina
    vendedor de drogas

    divinas
    paz terrível
    petricor

*/