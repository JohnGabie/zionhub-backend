# Mix Mind Studio - Conhecimento Adquirido

Documento com todo o conhecimento pesquisado e aprendido durante o desenvolvimento do projeto.

---

## 1. Anatomia de um Channel Strip Real

Em mesas de som profissionais (SSL, Neve, Allen & Heath, Soundcraft, Behringer X32), o channel strip segue um fluxo de sinal de cima para baixo:

1. **Topo**: Gain knob, phantom power (+48V), pad, phase, impedance
2. **Meio**: EQ knobs, dynamics (compressor/gate), aux sends
3. **Base**: Pan knob, botoes mute/solo, e o **fader** ocupando o maior espaco vertical

### Referencia de mesas reais
- **SSL Origin** - Faders motorizados de 100mm, meter bridge separado acima dos faders
- **Allen & Heath QU-16** - Faders ALPS de 100mm motorizados
- **Soundcraft Ui24R** - Interface 100% web browser, sem app dedicado
- **Behringer X32** - Software X32 Edit desktop + app X32-Mix para iPad

---

## 2. Fader Cap / Botao do Fader

### Caracteristicas fisicas
- **Formato**: Retangular com cantos levemente arredondados
- **Dimensoes tipicas**: 23.7mm largura x 9.5-11.5mm altura x 8.8-11mm profundidade
- **Proporcao**: O cap e ~5-6x mais largo que o sulco/track do fader
- **Material**: Plastico escuro (cinza/preto) com linha indicadora contrastante, ou acabamento cromado metalico
- **Superficie**: Levemente concava no topo (segue o contorno do dedo)

### Linha central indicadora
O elemento visual MAIS importante do fader cap. Uma linha branca/clara que passa pelo centro do topo e desce pelas laterais, indicando a posicao exata do fader na escala de dB.

### Implementacao CSS
```css
/* Gradiente metalico com linha central */
background: linear-gradient(to bottom,
  #d8d8d8 0%,      /* highlight do topo */
  #c0c0c0 20%,     /* corpo superior */
  #a8a8a8 40%,     /* transicao para o sulco */
  #888888 47%,     /* sombra do sulco (borda superior) */
  #f8f8f8 49%,     /* LINHA CENTRAL - branco brilhante */
  #f0f0f0 51%,     /* LINHA CENTRAL continuacao */
  #888888 53%,     /* sombra do sulco (borda inferior) */
  #b0b0b0 60%,     /* corpo inferior */
  #c8c8c8 80%,     /* highlight inferior */
  #606060 100%     /* sombra/borda de baixo */
);

/* Sombras em camadas para profundidade 3D */
box-shadow:
  0 2px 4px rgba(0,0,0,0.6),           /* sombra projetada */
  0 1px 1px rgba(0,0,0,0.3),           /* sombra apertada */
  inset 0 1px 0 rgba(255,255,255,0.4), /* highlight na borda superior */
  inset 0 -1px 0 rgba(0,0,0,0.2);     /* escurecimento na borda inferior */
```

### Dimensoes recomendadas para web
| Track (sulco) | Cap largura | Cap altura | Proporcao |
|---|---|---|---|
| 4px | 28-32px | 14-16px | ~7-8x |

### Interacao
- `cursor: grab` no estado normal
- `cursor: grabbing` quando arrastando (`:active`)
- Glow azul no `:hover` via `box-shadow`
- Estado pressed levemente mais escuro

### Fabricantes de fader caps
- **Knob Zone** (knobzone.co.uk) - Caps com linha de posicao
- **Pixel Pro Audio** - Fader caps pretos com linha branca
- **DJ TechTools** - Chroma Caps coloridos
- **Selco Products** - Slider knobs industriais

---

## 3. Track / Sulco do Fader

### Caracteristicas fisicas
- Slot estreito recuado na superficie da mesa (2-4mm de largura)
- Cor escura (preto/cinza escuro)
- Aparencia de "canal" escavado

### Implementacao CSS
```css
.channel-fader [data-orientation="vertical"] {
  width: 4px;
  background: #111;
  box-shadow: inset 0 0 4px rgba(0,0,0,0.9);
  border-radius: 2px;
}
```

A `box-shadow: inset` e crucial para simular a aparencia recuada do sulco real.

---

## 4. Escala de dB (Marcacoes)

### Escala logaritmica
Em faders reais, a escala e **logaritmica** - mais resolucao perto de 0 dB (unity):
- Os primeiros 50% do curso fisico cobrem ~-inf a -20 dB
- Os ultimos 50% cobrem -20 dB a +10 dB

### Marcacoes padrao
`+10, +5, 0, -5, -10, -20, -30, -50, -inf`

### Unity gain (0 dB)
- Posicionado a ~75-80% do curso total (contando de baixo)
- Deve ser visualmente distinto: cor mais brilhante, negrito, ou com tick mark

### Formula de conversao
```typescript
function volumeToDb(volume: number): string {
  if (volume === 0) return '-inf';
  const db = 20 * Math.log10(volume / 100);
  if (db > -0.05) return '0.0';
  return db.toFixed(1);
}
```

---

## 5. Volume Meters (Medidores de Nivel)

### Tipos de medidores
- **VU Meter** - Medicao RMS, resposta lenta (~300ms), mostra nivel "percebido"
- **PPM (Peak Programme Meter)** - Medicao de pico, resposta rapida
- **Digital Peak Meter** - O mais comum em DAWs, sample-accurate

### Aparencia em LEDs segmentados
A maioria dos mixers digitais usa barras de LEDs segmentados:
- Segmentos pequenos empilhados verticalmente
- Gap de 1-2px entre segmentos
- Segmento individual: 3-6px de altura

### Cores padrao (convencao universal)
| Faixa | Cor | Significado |
|---|---|---|
| 0-70% | Verde | Nivel seguro |
| 70-85% | Amarelo/Amber | Zona de atencao |
| 85-100% | Vermelho | Proximo ao clipping |

### Peak Hold
- Um segmento vermelho brilhante que marca o pico maximo
- Decai lentamente (~2-3 segundos) ou fica fixo ate reset
- Implementado com `peakHold * 0.98` por tick

### Largura recomendada
| Largura | Uso |
|---|---|
| 4-5px | Mixer muito denso, muitos canais |
| **8px** | Balanco ideal entre visibilidade e espaco |
| 10-12px | Master bus ou poucos canais |

### Efeito LED glow
Para simular LEDs reais, adicionar `box-shadow` sutil nos segmentos ativos:
```css
/* Verde */
box-shadow: 0 0 3px hsl(165 100% 43% / 0.4);
/* Amarelo */
box-shadow: 0 0 4px hsl(45 100% 60% / 0.4);
/* Vermelho */
box-shadow: 0 0 4px hsl(0 84% 60% / 0.5);
```

### Posicao relativa ao fader
| Software | Posicao do meter |
|---|---|
| **Logic Pro** | Esquerda do fader |
| **Pro Tools** | Direita do fader |
| **FL Studio** | Ao lado do fader |
| **Soundcraft Ui24R** | Ao lado no channel strip |
| **Mixing Station** | Configuravel pelo usuario |
| **SSL Origin** | Meter bridge separado acima |
| **Behringer X32** | LEDs acima da secao de faders |

**Padrao recomendado**: Um meter na esquerda para mono, L/R nas laterais para stereo.

### GR Meter (Gain Reduction)
- Mais fino que o meter principal (3-5px)
- Cor laranja/amber
- Cresce de cima para baixo (indica reducao)
- Posicionado a direita do fader

---

## 6. Metering Pre-fader vs Post-fader

### Pre-fader
- Mostra o nivel do sinal ANTES do fader
- Util para verificar se o sinal de entrada esta adequado
- Nao e afetado pela posicao do fader

### Post-fader
- Mostra o nivel APOS o fader
- Representa o que realmente esta sendo enviado para o bus/output
- E o padrao na maioria dos DAWs

### Dual metering
Mesas de alta qualidade mostram ambos:
- Meter esquerdo = pre-fader (nivel de entrada)
- Meter direito = post-fader (nivel de saida)

---

## 7. Implementacoes Web de Referencia

### Soundcraft Ui24R
- Mixer 100% baseado em browser (HTML5)
- Sem app nativo necessario
- Suporta ate 10 dispositivos simultaneos
- 24 inputs, 8 aux, 6 subgroups, 4 FX returns, 6 VCA masters
- Scroll horizontal para navegar entre canais

### Behringer X32 Edit
- Software desktop com UI funcional mas datada
- App iPad (X32-Mix) com GUI mais moderna
- Faders verticais com meters adjacentes

### Mixing Station (terceiros)
- Layout de channel strip totalmente configuravel
- Posicao do meter configuravel
- Suporte a gate e compressor GR meters
- Tap zones no fader para ajuste de 0.25 dB
- "Fine mode" para arrastar com precisao

### Bibliotecas web
- **web-audio-peak-meter** (esonderegger) - Meters de pico para Web Audio API
- **web-audio-mixer** (James Filtness) - Mixer basico com faders CSS

---

## 8. Responsividade em Mixers Web

### Desafios
- 24 channel strips x ~68px cada = ~1,632px minimo
- Faders precisam de altura suficiente para controle preciso
- Botoes pequenos sao dificeis em touch screens
- Meters precisam ser visiveis em qualquer tamanho

### Estrategias
- **Flex-grow nos strips**: Em vez de largura fixa, usar `flex-1` com `min-w` e `max-w`
- **Scroll horizontal**: Quando a tela e menor que o total de canais
- **Breakpoints**: Esconder elementos secundarios em mobile (sidebar, status de conexao)
- **Fader height flexivel**: Usar `flex-1` com `min-h` em vez de altura fixa
- **Touch targets**: Botoes minimo 44x44px para acessibilidade touch (WCAG)

### Breakpoints recomendados
| Breakpoint | Layout |
|---|---|
| < 640px (sm) | Esconder labels, sidebar, status text |
| < 768px (md) | Sidebar colapsada/hidden |
| < 1024px (lg) | Cards em 3 colunas |
| >= 1280px (xl) | Layout completo |

---

## 9. Bugs Comuns em Mixers Web

### Performance
- **localStorage a cada tick**: Nao salvar estado a cada 100ms (meter simulation). Usar debounce ou separar estado efemero.
- **Re-renders desnecessarios**: Meters causam re-render a cada 100ms. Separar estado de meters do estado de configuracao.
- **Objetos novos a cada render**: Master channel recriado inline causa re-renders. Usar `useMemo`.

### Estado
- **Stale closures**: Callbacks capturando estado antigo em `useCallback` sem deps corretas
- **peakHold defasado**: Calcular novo level antes de usar para peakHold (evitar referencia ao valor antigo)
- **Migracao de localStorage**: Sempre migrar campos novos ao carregar estado antigo

### UI
- **Mute sem unmute**: Funcao `muteAll` one-way sem UI para reverter
- **Grid columns fixo**: `grid-cols-6` quando tabs sao condicionais causa gap visual
- **Sheet animation cortada**: `return null` antes do Sheet impede animacao de fechar

---

## 10. Tecnologias Utilizadas

### Fader
- **Radix UI Slider** (`@radix-ui/react-slider`) com `orientation="vertical"`
- Seletor CSS `[data-orientation="vertical"]` para estilizacao especifica
- Seletor `[role="slider"]` para o thumb/cap
- Suporte nativo a teclado (arrow keys) e touch events

### Meter
- Implementacao custom com `div` flex column-reverse
- 30 segmentos empilhados com gap de 1px
- Cores via classes Tailwind CSS condicionais
- Glow via `box-shadow` inline style

### Alternativas consideradas
- **Custom div-based fader**: Controle total sobre DOM mas requer implementar ARIA, keyboard, touch manualmente
- **HTML input[type=range]**: Limitado em estilizacao cross-browser
- **Canvas/WebGL meters**: Melhor performance para muitos canais, mas mais complexo

---

## Fontes

### Hardware e design
- [Audio University - Channel Strip Guide](https://audiouniversityonline.com/channel-strip/)
- [Wikipedia - Channel Strip](https://en.wikipedia.org/wiki/Channel_strip)
- [Sound On Sound - Level Meters](https://www.soundonsound.com/techniques/level-meters)
- [GroupDIY - Fader Log Scale](https://groupdiy.com/threads/fader-log-scale-for-engraving.80001/)

### Fabricantes
- [Knob Zone - Fader Caps](https://knobzone.co.uk/products/kz0040)
- [Pixel Pro Audio - Fader Caps](https://www.pixelproaudio.com/collections/fader-caps)
- [DJ TechTools - Chroma Caps](https://store.djtechtools.com/products/chroma-caps-knobs-and-faders)
- [Selco Products - Slider Knobs](https://www.selcoproducts.com/knobs/slider-knobs)

### Software de referencia
- [Soundcraft Ui24R](https://www.soundcraft.com/en-US/products/ui24r)
- [Mixing Station Docs](https://mixingstation.app/ms-docs/settings/channel-strip/)
- [FL Studio Mixer](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/mixer.htm)
- [Apple Logic Pro - Pre-fader Metering](https://support.apple.com/guide/logicpro/set-pre-fader-metering-in-logic-pro-lgcpe21609ef/)
- [OBEDIA - Pro Tools Metering](https://obedia.com/pre-fader-and-post-fader-metering-in-pro-tools/)

### Implementacao web
- [Radix Slider Docs](https://www.radix-ui.com/primitives/docs/components/slider)
- [Web Audio Peak Meters](https://esonderegger.github.io/web-audio-peak-meter/)
- [James Filtness Web Audio Mixer](https://github.com/jamesfiltness/web-audio-mixer)
- [CSS-Tricks - Styling Range Inputs](https://css-tricks.com/styling-cross-browser-compatible-range-inputs-css/)
- [Creating Metallic Effects with CSS](https://ibelick.com/blog/creating-metallic-effect-with-css)
- [FreeFrontEnd - CSS Range Sliders](https://freefrontend.com/css-range-sliders/)
