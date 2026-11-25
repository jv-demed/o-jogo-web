/**
 * O que um efeito que esta valendo muda num jogador, lido na hora.
 *
 * Os passivos nao escrevem flag no jogador: ficam em `state.ongoing` (ou na
 * cadeira, se for equipamento), e quem precisa saber pergunta aqui. Assim o fim
 * de um efeito — duracao, troca, dissipar, equipamento destruido, a 103 — e so
 * tirar a entrada da lista, e nao existe flag esquecida ligada depois que a
 * carta foi embora. Sem import nenhum de proposito: estado, apuracao e alvo
 * leem daqui, e nenhum deles pode importar o outro em circulo.
 */

// "Infinitos shots" precisa sobreviver ao JSON.stringify que leva o estado ate
// o banco. Infinity vira null no JSON; este numero, nao.
export const INFINITE_SHOTS = Number.MAX_SAFE_INTEGER;

export const OngoingKind = Object.freeze({
    turnDrink: 'turnDrink', // carta 1: cobra na vez do alvo
    goalTable: 'goalTable', // 5, 10, 68, 71: meta de uma missao, na mesa
    goalLater: 'goalLater', // 20: meta que muda depois de N rodadas
    ignore:    'ignore',    // 78: bebe e nao conta
    lose:      'lose',      // 57, 97: perde se a partida acabar
    peace:     'peace',     // 109: so quem jogou ganha se acabar
    endIn:     'endIn',     // 51: a partida acaba em N rodadas
    endWhen:   'endWhen',   // 62: o primeiro a beber 5 encerra
    link:      'link',      // 61: bebem juntos
    fate:      'fate',      // 99: o destino do escolhido segue o de quem jogou
    immune:    'immune',    // 84: ninguem mira
    infinity:  'infinity',  // 87: contagem infinita por cima da real
    enem:      'enem',      // 96: cada shot custa uma carta
    prison:    'prison',    // 48, 102: nao joga ate beber
    greed:     'greed',     // 85: a compra da vez pode falhar
});

const ongoingOf = (state, kind) => (state.ongoing ?? []).filter(o => o.kind === kind);

/** Algum efeito deste tipo pesa sobre o jogador? */
export const hasMark = (state, kind, playerId) =>
    ongoingOf(state, kind).some(o => (o.targets ?? []).includes(playerId));

export const isImmune = (state, playerId) => hasMark(state, OngoingKind.immune, playerId);

export const isPrisoner = (state, playerId) => hasMark(state, OngoingKind.prison, playerId);

/** O equipamento que o jogador carrega, pelo que ele faz (`as`), e nao pela carta. */
export const equipped = (player, idCard) =>
    (player?.equipment ?? []).filter(item => (item.as ?? item.idCard) === idCard);

/** Missao trancada: a 108 equipada, ou a marca antiga de partida gravada. */
export const isLocked = (state, player) =>
    Boolean(player?.missionLocked) || equipped(player, 108).length > 0;

/**
 * A contagem que vale para a apuracao e para a tela: a real, ou o infinito da
 * 87 por cima dela enquanto durar. O que se bebe no meio soma na real.
 */
export const effectiveShots = (state, player) =>
    hasMark(state, OngoingKind.infinity, player.id) ? INFINITE_SHOTS : (player.shots ?? 0);
