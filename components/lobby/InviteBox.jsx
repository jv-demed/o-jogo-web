'use client'
import { useEffect, useState } from 'react';
import { ICONS } from '@/assets/icons';

/**
 * O convite da sala, para o host.
 *
 * Entrar numa partida sempre foi pelo link — a RLS nao deixa ser de outro
 * jeito: `matches_read_participant` so mostra partida de que o jogador ja
 * participa, entao nao existe procurar a sala de outra pessoa. O que faltava
 * era o link estar em algum lugar: ele so existia na barra de endereco, e num
 * telefone isso e copiar a URL de dentro do navegador.
 *
 * O endereco e montado no browser, dentro de um efeito, e nao no render: no
 * servidor nao ha `window`, e adivinhar o host daria uma marcacao diferente da
 * que o cliente monta na hidratacao.
 */
export function InviteBox({ id }){

    const [url, setUrl] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setUrl(`${window.location.origin}/lobby/${id}`);
    }, [id]);

    async function handleCopy(){
        try{
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }catch{
            // clipboard exige contexto seguro (https ou localhost) e permissao.
            // Sem ele, o link continua a vista e selecionavel: e por isso que
            // ele aparece escrito, e nao so como acao de um botao.
            setCopied(false);
        }
    }

    function handleWhatsApp(){
        const text = `Bora jogar O Jogo? Entra na partida ${id}: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    }

    return (
        <section className={`
            flex flex-col gap-2.5 w-full
            px-3 py-3 rounded-2xl
            border border-line bg-base/50
        `}>
            <div className='flex flex-col gap-0.5 min-w-0'>
                <span className='text-[0.65rem] uppercase tracking-widest text-cream-dim'>
                    Convide para a mesa
                </span>
                {/* `break-all` e nao `truncate`: quem nao conseguir copiar
                    precisa poder ler o endereco inteiro para digita-lo. */}
                <span className='text-xs text-cream-dim/80 break-all'>
                    {url || '...'}
                </span>
            </div>
            <div className='flex gap-2'>
                <button type='button'
                    onClick={handleCopy}
                    disabled={!url}
                    className={`
                        flex flex-1 items-center justify-center gap-2
                        h-11 rounded-xl
                        border border-line bg-elevated
                        text-sm font-semibold
                        transition-transform active:scale-[0.98]
                        disabled:opacity-40
                        focus:outline-none focus-visible:ring-2
                        focus-visible:ring-brand-light
                    `}
                >
                    <span className='text-base'>
                        {copied ? <ICONS.check /> : <ICONS.link />}
                    </span>
                    {copied ? 'Copiado' : 'Copiar link'}
                </button>
                <button type='button'
                    onClick={handleWhatsApp}
                    disabled={!url}
                    className={`
                        flex flex-1 items-center justify-center gap-2
                        h-11 rounded-xl
                        border border-[#25d366]/40 bg-[#25d366]/10
                        text-sm font-semibold text-[#25d366]
                        transition-transform active:scale-[0.98]
                        disabled:opacity-40
                        focus:outline-none focus-visible:ring-2
                        focus-visible:ring-brand-light
                    `}
                >
                    <span className='text-base'>
                        <ICONS.whatsapp />
                    </span>
                    WhatsApp
                </button>
            </div>
        </section>
    );
}
