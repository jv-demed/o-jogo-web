'use client'
import { ICONS } from '@/assets/icons';
import { ongoingFor } from '@/domain/match/state';
import { missionName } from './narrate';

/**
 * Quem vai jogar agora, em tela cheia por dois segundos.
 *
 * Existe porque a vez passa sozinha: sem o botao de "passar a vez", a troca de
 * turno nao tem gesto nenhum, e um marcador mudando de cadeira no meio do
 * feltro nao para a conversa da sala. Este anuncio faz o que a pessoa fazia —
 * dizer o nome em voz alta antes de comecar.
 *
 * O perfil e o publico, o mesmo da cadeira: nome, shots bebidos, cartas no
 * baralho, equipamentos, efeitos parados nele e a missao *se* foi revelada.
 * Missao secreta continua secreta — anunciar a vez nao pode ser a brecha que
 * abre o jogo.
 *
 * Nao intercepta toque: sao dois segundos, e travar o dedo de quem ja sabe o
 * que vai fazer atrasaria a mesa em vez de acompanha-la.
 */
export function TurnIntro({ player, state, you }){

    if(!player) return null;

    const isYou = player.id === you?.id;
    const ongoing = ongoingFor(state, player.id);

    return (
        <div role='status'
            aria-label={isYou ? 'Sua vez' : `Vez de ${player.name}`}
            className={`
                absolute inset-0 z-40
                flex flex-col items-center justify-center gap-3
                bg-black/80 backdrop-blur-[2px]
                pointer-events-none animate-fade-in
            `}
        >
            {/* A foto do jogador. Enquanto ninguem tem foto no perfil, e a
                inicial do nome dentro do circulo — o lugar dela ja fica de pe,
                e trocar por uma imagem depois e trocar o que vai aqui dentro. */}
            <span className={`
                flex items-center justify-center
                h-24 w-24 rounded-full
                border-2 ${isYou ? 'border-gold/70 bg-gold/15' : 'border-brand-light/60 bg-brand/20'}
                text-3xl font-bold uppercase
                ${isYou ? 'text-gold' : 'text-brand-light'}
                animate-fade-rise
            `}>
                {player.name?.trim()?.[0] ?? <ICONS.user />}
            </span>

            <div className='flex flex-col items-center gap-0.5'>
                <p className='text-2xl font-bold text-cream'>
                    {isYou ? 'Sua vez' : player.name}
                </p>
                <p className='text-xs uppercase tracking-widest text-cream-dim'>
                    joga agora
                </p>
            </div>

            <div className='flex flex-wrap items-center justify-center gap-1.5 px-6'>
                <Badge icon={ICONS.shot} text={player.shots} tone='gold' />
                <Badge icon={ICONS.deck} text={player.deck.length}
                    tone={player.deck.length === 0 ? 'danger' : 'plain'} />
                {player.equipment.length > 0
                    && <Badge icon={ICONS.equip} text={player.equipment.length} tone='plain' />}
                {ongoing.length > 0
                    && <Badge icon={ICONS.effect} text={ongoing.length} tone='gold' />}
            </div>

            {player.missionRevealed && <p className='text-[0.7rem] text-brand-light'>
                {missionName(player.mission)}
            </p>}
        </div>
    );
}

const TONES = {
    gold: 'border-gold/30 bg-gold/10 text-gold',
    danger: 'border-line bg-elevated text-danger',
    plain: 'border-line bg-elevated text-cream-dim',
};

function Badge({ icon: Icon, text, tone }){
    return (
        <span className={`
            flex items-center gap-1
            px-2 py-0.5 rounded-lg border
            text-xs font-semibold tabular-nums
            ${TONES[tone]}
        `}>
            <Icon />
            {text}
        </span>
    );
}
