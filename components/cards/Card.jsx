'use client'
import Image from 'next/image'
import { useState } from 'react';
import { getCardTypeIcon, getCardTypeName } from '@/types/CardType';
import { AutoFitText } from '@/components/elements/AutoFitText';
import { SpinLoader } from '@/components/elements/SpinLoader';
import { ICONS } from '@/assets/icons';

export function Card({ 
    card, 
    scale = 1,
    onClick
}) {

    const baseWidth = 300;
    const baseHeight = 440;

    // Carta sem handler (o visor do CardNavigation) continua sendo uma div:
    // um <button> ali seria focavel e nao faria nada.
    const isInteractive = Boolean(onClick);
    const Root = isInteractive ? 'button' : 'div';

    // Nas grades a carta e reduzida por transform, que o browser nao enxerga:
    // sem `sizes` o next/image fixa o srcset em 250/500 e a grade nao baixa
    // arte grande para exibir a 72px. No visor a arte ocupa os 234px de fato,
    // entao declaramos o tamanho e deixamos o browser pedir a variante da
    // densidade da tela dele.
    const isDetail = scale >= 1;

    // Trocar de carta no CardNavigation reusa este mesmo componente: nome,
    // nivel e texto trocam no mesmo frame, mas o <img> segue pintando a arte
    // anterior ate a nova decodificar. Guardar de qual carta e a arte carregada
    // faz o estado se resetar sozinho na troca -- sem efeito, sem carta hibrida.
    const [loadedArtId, setLoadedArtId] = useState(null);
    const isArtLoaded = loadedArtId === card.id;

    return (
        <Root
            {...(isInteractive && {
                type: 'button',
                'aria-label': card.name,
                onClick: () => onClick(card)
            })}
            className={`
                relative origin-top-left select-none
                transition-[filter] duration-150
                ${isInteractive ? `
                    active:brightness-75
                    focus:outline-none focus-visible:ring-2
                    focus-visible:ring-cream
                ` : ''}
            `}
            style={{
                width: baseWidth * scale,
                height: baseHeight * scale,
                overflow: 'hidden',
            }}
            onContextMenu={e => e.preventDefault()}
        >
            <div style={{
                width: baseWidth,
                height: baseHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
            }}>
                <div className='relative' 
                    style={{ 
                        width: baseWidth, 
                        height: baseHeight 
                    }}
                >
                    <Image
                        src={`/cards-models/${card?.isShot ? 'trap' : 'spell'}-card.jpg`}
                        alt='Card frame'
                        className='object-cover'
                        fill
                        sizes='300px'
                    />
                    <AutoFitText 
                        className={`
                            absolute top-[25px] left-[20px] right-[20px] 
                             text-left text-black
                        `}
                    >
                        {card.name}
                    </AutoFitText>
                    <div className={`
                        absolute top-[56px] left-[20px] 
                        flex text-black text-xs    
                    `}>
                        {Array.from({ length: card.level }).map((_, i) => (
                            <ICONS.star key={i} />
                        ))}
                    </div>
                    <div className={`
                        absolute top-[56px] right-[42px] 
                        text-black text-xs    
                    `}>
                        {getCardTypeName(card.type)}
                    </div>
                    <div className={`
                        absolute top-[54px] right-[20px] 
                        text-gray-900    
                    `}>
                        {getCardTypeIcon(card.type)}
                    </div>
                    <div className={`
                        flex items-center justify-center 
                        absolute top-[80px] left-[33px] 
                        w-[234px] h-[231px] 
                        bg-white overflow-hidden    
                    `}>
                        {!isArtLoaded && <div className={`
                            absolute inset-0
                            flex items-center justify-center
                        `}>
                            <SpinLoader color='text-gray-400' />
                        </div>}
                        <Image
                            // A key remonta o <img> na troca: nem por um frame
                            // sobra pixel da carta anterior.
                            key={card.id}
                            className={`object-contain ${isArtLoaded ? '' : 'opacity-0'}`}
                            src={`/cards/${card.id}.webp`}
                            alt={card.name}
                            width={250}
                            height={250}
                            quality={90}
                            onLoad={() => setLoadedArtId(card.id)}
                            // Sem isto uma arte que falha deixa o loader
                            // girando para sempre.
                            onError={() => setLoadedArtId(card.id)}
                            {...(isDetail && { sizes: '234px' })}
                        />
                    </div>
                    <AutoFitText 
                        maxHeight={82}
                        className={`
                            absolute bottom-[29px] left-[25px] right-[26px] 
                            h-[78px] overflow-hidden 
                            text-black text-justify leading-tight
                        `}
                    >
                        {card.text}
                    </AutoFitText>
                    <span className={`
                        absolute bottom-[7px] right-[9px]
                        text-gray-800 text-[0.56rem]
                    `}>
                        {card.number}
                    </span>
                </div>
            </div>
        </Root>
    )
}