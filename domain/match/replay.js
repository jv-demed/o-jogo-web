import { apply } from './engine.js';

/**
 * Refaz a partida a partir do inicio.
 *
 * Existe porque o log de comandos (`o_jogo.match_commands`, migration 0011)
 * so vale alguma coisa se ele reproduzir: guardar o que foi jogado sem
 * conseguir rejogar e guardar um texto.
 *
 * E possivel por duas propriedades que o resto da pasta ja garantia, e e por
 * isso que este arquivo cabe em tres linhas: `apply` e puro, e a aleatoriedade
 * e semeada (`rng.js`, nunca Math.random). Dado o mesmo estado e o mesmo
 * comando, sai o mesmo estado — sempre, em qualquer maquina.
 *
 * O `now` precisa vir dentro de cada comando, e nao ser recarimbado aqui: o
 * relogio muda o que a janela de interferencia faz, entao um replay com relogio
 * novo seria outra partida. E por isso que a linha guarda o `applied_now` que o
 * host carimbou.
 *
 * @param {object} initialState  a mesa recem-montada (`matches.initial_state`).
 * @param {object[]} commands    os comandos aplicados, em ordem de `seq`.
 * @returns {object} o estado depois do ultimo comando.
 */
export function replayMatch(initialState, commands){
    return commands.reduce((state, command) => apply(state, command), initialState);
}
