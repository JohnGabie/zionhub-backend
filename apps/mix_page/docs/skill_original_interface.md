# Soundcraft Ui - Interface Original (Estudo do MyUiPro)

Estudo aprofundado do projeto [MyUiPro](https://github.com/NaturalDevCR/MyUiPro) e da interface original do Soundcraft Ui series (Ui12, Ui16, Ui24R).

---

## 1. O Que e o MyUiPro

**Descoberta importante**: O MyUiPro NAO e uma replica da interface do Soundcraft. E um **wrapper de iframes** que carrega a interface web real do mixer em paineis redimensionaveis lado a lado.

### Arquitetura
- Carrega `http://<IP_DO_MIXER>/mixer.html` em 1 a 6 iframes simultaneos
- Cada iframe e uma instancia independente da interface real
- O app adiciona: gerenciamento de layouts, MIDI, shortcuts, player remoto

### O que ele FAZ
- Gerencia conexao WebSocket com o mixer
- Multi-view: ate 6 instancias lado a lado
- Ponte MIDI: mapeia controladores fisicos para funcoes do mixer
- Shortcuts de mute rapido
- Controle de playback USB
- Deploy como arquivo HTML unico

### O que ele NAO FAZ
- NAO implementa faders customizados
- NAO renderiza meters/VU bars
- NAO tem channel strips proprios
- NAO redesenha a interface do mixer
- O arquivo `_faders.scss` esta VAZIO (0 bytes)

---

## 2. Stack Tecnologico do MyUiPro

| Tecnologia | Versao | Uso |
|---|---|---|
| Vue 3 | 3.6.0-alpha.2 | Framework UI (Composition API) |
| Quasar | 2.18.2 | Component library (Material Design) |
| TypeScript | 5.5.3 | Tipagem |
| Vite | - | Build tool |
| Pinia | 2.3.1 | State management (com persistencia) |
| soundcraft-ui-connection | 4.0.0 | WebSocket pro mixer |
| webmidi | 3.1.12 | Controle MIDI |
| vue-i18n | 11.1.11 | Internacionalizacao (EN/ES) |
| vite-plugin-singlefile | 2.3.0 | Build single HTML |

---

## 3. Protocolo WebSocket do Soundcraft Ui

### Biblioteca: soundcraft-ui-connection
- Repo: https://github.com/fmalcher/soundcraft-ui
- Docs: https://fmalcher.github.io/soundcraft-ui/
- NPM: soundcraft-ui-connection v4.0.0

### Formato de Mensagens
Delimitador: `^` (caret)

```
SETD^{path}^{value}     // Setar valor
GETD^{path}             // Ler valor
3:::ALIVE                // Keep-alive
2::                      // Ping-pong
PLISTS^                  // Request playlists
```

### Paths de Estado
- Input channels: `i.{n}.{property}` (n = 0-indexed)
  - `i.0.name` = nome do canal 1
  - `i.0.gain` = gain do canal 1
  - `i.0.mute` = mute do canal 1
- Settings: `settings.block.pass` = senha master

### Conexao
```typescript
import { SoundcraftUI } from 'soundcraft-ui-connection';

const conn = new SoundcraftUI({
  targetIP: '10.10.1.1',     // WiFi default
  webSocketCtor: WebSocket
});

await conn.connect();
```

### Status de Conexao
```typescript
enum ConnectionStatus {
  Opening,
  Open,
  Reconnecting,
  Closing,
  Close,
  Error
}
```

---

## 4. Modelo de Dados Completo do Mixer

### Master Channel
```typescript
conn.master
  .faderLevelDB$    // Observable: nivel em dB
  .setFaderLevelDB(db)  // Setar nivel
  .mute() / .unmute()
  .vu$              // Observable: nivel VU meter
```

### Input Channels (1 a 24)
```typescript
conn.master.input(n)  // n = 1-indexed
  .faderLevelDB$      // Nivel do fader em dB
  .gainDB$            // Gain de entrada em dB
  .solo()
  .mute() / .unmute()
  .phantom            // 48V phantom power
  .polarity           // Phase flip
  .hiz                // High impedance
  .pan                // Panorama
```

### Disponibilidade por Modelo
| Canal | Ui12 | Ui16 | Ui24R |
|---|---|---|---|
| CH 1-12 | Sim | Sim | Sim |
| CH 13-16 | Nao | Sim | Sim |
| CH 17-24 | Nao | Nao | Sim |

### Hardware Inputs (Gain)
```typescript
// UI24R: via conn.hw()
conn.hw(n).setGainDB(db)
conn.hw(n).gainDB$

// UI12/UI16: via mensagem SETD direta
SETD^i.{channel}.gain^{value}
```

### Mute Groups
```typescript
conn.muteGroup('all')   // Mute geral
conn.muteGroup('fx')    // Mute todos FX
conn.muteGroup('grp1')  // Grupo 1
conn.muteGroup('grp2')  // Grupo 2
  .mute() / .unmute()
  .state$               // Observable: 0 ou 1
```

### Player / Recorder
```typescript
// Player USB
conn.player
  .play() / .pause() / .stop()
  .next() / .prev()
  .toggleShuffle()
  .state$           // 0=parado, 2=tocando, 3=pausado
  .track$           // Nome da faixa
  .length$          // Duracao total
  .elapsedTime$     // Tempo decorrido
  .playlist$        // Lista de faixas

// Gravador
conn.recorderDualTrack
  .recordToggle()
  .recording$       // Boolean
  .busy$            // Boolean
```

### FX Sends (por canal)
- `reverbFX` - Reverb send
- `delayFX` - Delay send
- `chorusFX` - Chorus send
- `roomFX` - Room send

---

## 5. Niveis de Fader - Representacao

### Faixas de dB
```typescript
// Fader de volume (master e canais)
level: { min: -101, max: 10 }    // -inf a +10 dB

// Gain de entrada (hardware)
gain: { min: -40, max: 63 }      // -40 a +63 dB
```

### Funcoes de Conversao
```typescript
// dB para valor linear 0-1 (para UI12/UI16)
function DBToGainValue(gain: number): number {
  return (gain + 6) / 63;
}

// Valor linear 0-1 para dB
function gainValueToDB(value: number): number {
  return value * 63 - 6;
}

// dB para porcentagem 0-100
function dbToPercentage(db: number, type: 'level'|'gain'): number {
  const range = ranges[type];
  return ((db - range.min) / (range.max - range.min)) * 100;
}

// Porcentagem para dB
function percentageToDb(pct: number, type: 'level'|'gain'): number {
  const range = ranges[type];
  return range.min + (pct / 100) * (range.max - range.min);
}

// MIDI velocity (0-127) para dB
function velocityToDb(velocity: number, dbType: string): number {
  const pct = (velocity / 127) * 100;
  return percentageToDb(pct, dbType);
}

// dB para MIDI velocity (0-127)
function dbToVelocity(db: number, dbType: string): number {
  const pct = dbToPercentage(db, dbType);
  return Math.round((pct / 100) * 127);
}
```

---

## 6. Integracao MIDI

### Modelo de Mapeamento
```typescript
interface MidiMapping {
  uid: string;                    // ID unico da mensagem MIDI
  mapping: {
    channel: number;              // Canal MIDI (1-16)
    command: string;              // Comando MIDI
    controller: number;           // Numero CC (0-119)
  };
  number: number;                 // Numero do input (0-15)
  type: 'input' | 'gain' | 'hiz'; // Tipo de controle
  dbType: 'level' | 'gain';      // Para conversao dB
}
```

### Controles Mapeaveis
- Master volume
- Channel faders (1-16): `masterInput0` a `masterInput15`
- Channel gains (1-16): `gainInput0` a `gainInput15`
- High impedance toggle: `hizInput0` a `hizInput15`

### Fluxo Bidirecional
```
Controlador MIDI  →  CC message  →  velocityToDb()  →  setFaderLevelDB()  →  Mixer
      ↑                                                                        |
      └─────── sendMidiMessage()  ←  dbToVelocity()  ←  faderLevelDB$  ←──────┘
```

### MIDI Learn
1. Usuario clica no controle na interface
2. Move o fader/knob no controlador MIDI
3. App captura CC number + canal MIDI
4. Mapeamento salvo no localStorage
5. Feedback bidirecional ativado

---

## 7. Sistema de Layouts (Multi-View)

### 10 Layouts Pre-definidos
| # | Nome | Estrutura |
|---|---|---|
| 1 | One Frame | 100% unica view |
| 2 | Two Frames | 50/50 split horizontal |
| 3 | Three Frames V1 | 40% topo split + 60% base |
| 4 | Three Frames V2 | 60% topo + 40% base split |
| 5 | Four Frames | Grid 2x2 |
| 6 | Five Frames V1 | 30% + 35% split + 35% split |
| 7 | Five Frames V2 | 35% split + 30% + 35% split |
| 8 | Five Frames V3 | 35% split + 35% split + 30% |
| 9 | Six Frames V1 | 2-1-1-2 alternado |
| 10 | Six Frames V2 | 1-2-2-1 alternado |

### Implementacao
- Usa `QSplitter` do Quasar para paineis redimensionaveis
- Splitters aninhados: vertical dentro de horizontal
- Posicoes salvas no `localStorage`
- Iframes carregam a mesma URL do mixer com instancias independentes

---

## 8. Design System

### Paleta de Cores
```scss
$primary   : #1976D2  // Azul (splitters, acentos)
$secondary : #26A69A  // Teal (botoes)
$accent    : #9C27B0  // Roxo (hover states)
$dark      : #1D1D1D  // Cinza escuro
$dark-page : #121212  // Quase preto (background)
$positive  : #21BA45  // Verde (sucesso)
$negative  : #C10015  // Vermelho (erros, mute)
$info      : #31CCEC  // Ciano (player ativo)
$warning   : #F2C037  // Amarelo/dourado

// Top Bar
background: #343434   // Cinza carvao
```

### Knob CSS (Rotary Controls)
```scss
.wheel {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: linear-gradient(330.65deg, #e2e8f0 13%, #f8fafc 92.84%);
  box-shadow:
    2px 4px 6px rgba(0, 0, 0, 0.15),
    inset 1px 1px 2px #ffffff;
  cursor: pointer;
}

.wheel__dot-element {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #e5ebf0;
  box-shadow:
    -1px -1px 2px rgba(0, 0, 0, 0.03),
    inset 1px 1px 4px rgba(147, 147, 147, 0.4);
  position: absolute;
  left: 70%;
  top: 20%;
}
```

### Iframe Styling
```scss
// Loading overlay
background: rgba(0, 0, 0, 0.8);

// Splitters
background: $primary com 0.6 opacity;
hover: $accent;
transition: 0.3s;

// Border radius
desktop: 4px;
mobile: 2px;
```

### Scrollbar (Mac OS style)
```scss
::-webkit-scrollbar {
  width: 16px;
  height: 16px;
}
::-webkit-scrollbar-thumb {
  background-color: #a0a0a5;
  border-radius: 16px;
  border: 5px solid transparent;
  background-clip: content-box;
}
// Transparente por padrao, visivel no hover
```

---

## 9. Gerenciamento de Visibilidade

### Otimizacao de Performance
Quando a aba do browser esta oculta:

**On Hide (aba oculta)**:
- Para monitoramento de conexao
- Pausa subscricoes de VU meters
- Reduz frequencia de updates (30s)
- Limpa timeouts de reconexao

**On Show (aba visivel)**:
- Verifica saude da conexao (timeout 5s)
- Forca reconexao se stale (>5 minutos oculto)
- Restaura todos os listeners
- Retoma checks a cada 10s

### Reconexao Automatica
- Backoff exponencial: 2s, 4s, 8s... max 30s
- Maximo 3 tentativas antes de desistir
- Reload de iframes se conteudo vazio detectado
- Deteccao de conexao stale (>30s desde ultimo check)

```typescript
async verifyConnectionHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 5000);
    const subscription = this.conn!.store.state$
      .pipe(first())
      .subscribe(() => {
        clearTimeout(timeout);
        resolve(true);
      });
  });
}
```

---

## 10. Responsividade

### Adaptacoes Mobile
```typescript
if ($q.platform.is.mobile) {
  fabPos.value = 'top-left';
  // Esconde language switcher
  // Mostra FAB centralizado
}
```

### Breakpoints
```scss
@media (max-width: 768px) {
  .iframe-wrapper { border-radius: 2px; }
  :deep(.q-splitter__separator) {
    width: 8px;
    height: 8px;
  }
}
```

### Acessibilidade
```scss
@media (prefers-contrast: high) {
  :deep(.q-splitter__separator) { background: white; }
}

@media (prefers-reduced-motion: reduce) {
  .mixer-iframe,
  :deep(.q-splitter__separator) { transition: none; }
}
```

---

## 11. Persistencia (localStorage)

| Chave | Conteudo |
|---|---|
| `mixerStore.ip` | Ultimo IP usado |
| `layoutsStore.selectedLayout` | Layout ativo |
| `midiStore.selectedDevice` | Dispositivo MIDI |
| `midiStore.currentMidiMapping` | Mapeamentos de controle |
| `commonStore.lang` | Idioma (en/es) |
| `iframe-splitter-position` | Posicao do splitter |
| `iframe-horizontal-splitter-{n}` | Splitters horizontais |
| `iframe-vertical-splitter-{id}` | Splitters verticais |

---

## 12. Demo URLs do Soundcraft

Para testar sem mixer fisico:
- **Ui12/Ui16**: `https://soundcraft.com/ui-demo/mixer.html`
- **Ui24R**: `https://www.soundcraft.com/ui24-software-demo/mixer.html`

Estes URLs carregam a interface real do mixer em modo demo.

---

## 13. Licoes para o Mix Mind Studio

### O que podemos aprender
1. **WebSocket e o protocolo certo** para comunicacao com mixers Soundcraft reais
2. **Mute groups** sao essenciais: all, fx, group1, group2
3. **MIDI bidirecional** e crucial para controladores fisicos
4. **Visibility management** evita desperdicio de recursos quando a aba esta oculta
5. **Multi-view layouts** com splitters permitem workflows profissionais
6. **Reconexao automatica** com backoff exponencial e essencial para producao ao vivo
7. **Single-file deploy** simplifica instalacao em ambientes de producao

### Diferencas de abordagem
| Aspecto | MyUiPro | Mix Mind Studio |
|---|---|---|
| Faders | Iframe (interface real) | Custom React + Radix Slider |
| Meters | Iframe (interface real) | Custom segmented LED |
| Conexao | WebSocket real | Simulado (localStorage) |
| Framework | Vue 3 + Quasar | React 18 + shadcn/ui |
| Build | Vite + single-file | Vite |
| State | Pinia + RxJS | React useState + useCallback |

### Funcionalidades para implementar futuramente
1. Conexao WebSocket real com `soundcraft-ui-connection`
2. Integracao MIDI via WebMIDI API
3. Mute groups (all, fx, grp1, grp2)
4. Player USB com controles de playback
5. Gravacao dual-track
6. Multi-view com splitters redimensionaveis
7. Visibility management para performance
8. Deploy single-file HTML

---

## Fontes

- [MyUiPro - GitHub](https://github.com/NaturalDevCR/MyUiPro)
- [soundcraft-ui-connection - NPM](https://www.npmjs.com/package/soundcraft-ui-connection)
- [soundcraft-ui - GitHub](https://github.com/fmalcher/soundcraft-ui)
- [soundcraft-ui - Docs](https://fmalcher.github.io/soundcraft-ui/)
- [Soundcraft Ui24R](https://www.soundcraft.com/en-US/products/ui24r)
- [HARMAN Forums - Ui12 WebSocket](https://proforums.harman.com/soundcraft/discussion/138204/ui12-websocket-connection)
- [JS WebSockets in Soundcraft UI](https://blechtrottel.net/en/jswebsockets.html)
