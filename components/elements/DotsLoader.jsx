/**
 * Tres pontinhos, um depois do outro.
 *
 * Existe porque o `SpinLoader` estava dizendo a coisa errada no lobby do
 * convidado: roda-roda e promessa de carregamento — alguma coisa esta vindo, e
 * ja vai chegar. La nao esta carregando nada; esta se esperando uma pessoa do
 * outro lado decidir comecar, e isso pode levar o tempo que levar. Ponto que
 * pisca em fila e espera, nao progresso.
 *
 * Continua havendo lugar para o spinner: o que carrega de verdade — a partida
 * abrindo, o botao que foi ao banco — segue com ele.
 */
export function DotsLoader({ color = 'text-cream-dim', label = 'Aguardando' }){
    return (
        <div role='status'
            aria-label={label}
            className={`flex items-center justify-center gap-1.5 w-full ${color}`}
        >
            {[0, 1, 2].map(i => (
                <span key={i}
                    aria-hidden='true'
                    className='h-2 w-2 rounded-full bg-current animate-dot-step'
                    style={{ animationDelay: `${i * 0.16}s` }}
                />
            ))}
        </div>
    );
}
