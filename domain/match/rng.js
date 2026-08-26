// Aleatoriedade deterministica da partida.
//
// Nada aqui usa Math.random. O motivo nao e purismo: quem embaralha o baralho e
// sorteia as missoes vai ser o servidor, e o cliente precisa poder reconstruir a
// mesma partida a partir do mesmo estado para conferir o que aconteceu. Uma
// semente guardada na linha da partida faz isso; Math.random nao.
//
// Efeito colateral util: teste de mesa vira reproduzivel — mesma semente, mesma
// mao, mesma missao, mesmo sorteio de `target: random`.

// mulberry32. 32 bits de estado, distribuicao boa o suficiente para embaralhar
// 40 cartas, e escrevivel em cinco linhas — nao vale trazer dependencia.
export function nextRandom(seed){
    let t = (seed + 0x6D2B79F5) | 0;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return { seed: t | 0, value };
}

/** Inteiro em [0, max). Devolve a semente nova junto: o estado e do chamador. */
export function nextInt(seed, max){
    const { seed: next, value } = nextRandom(seed);
    return { seed: next, value: Math.floor(value * max) };
}

/**
 * Fisher-Yates. Nao mexe no array recebido — o estado da partida e tratado
 * como imutavel na fronteira de cada comando.
 */
export function shuffle(seed, items){
    const out = [...items];
    let current = seed;
    for(let i = out.length - 1; i > 0; i--){
        const { seed: next, value } = nextInt(current, i + 1);
        current = next;
        [out[i], out[value]] = [out[value], out[i]];
    }
    return { seed: current, items: out };
}

/** Um elemento sorteado. Devolve `null` para lista vazia, em vez de undefined. */
export function pick(seed, items){
    if(items.length === 0) return { seed, item: null };
    const { seed: next, value } = nextInt(seed, items.length);
    return { seed: next, item: items[value] };
}

/** `count` elementos distintos, na ordem sorteada. */
export function sample(seed, items, count){
    const { seed: next, items: shuffled } = shuffle(seed, items);
    return { seed: next, items: shuffled.slice(0, count) };
}
