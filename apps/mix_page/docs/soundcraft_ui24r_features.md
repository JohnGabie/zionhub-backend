# Soundcraft Ui24R - Documentacao Completa de Features

Referencia tecnica completa para desenvolvimento do frontend Mix Mind Studio.
Todas as features, parametros, ranges e paths WebSocket documentados.

---

## 1. Hardware - Visao Geral

### 1.1 Entradas e Saidas Fisicas

| I/O | Quantidade | Detalhes |
|---|---|---|
| **Mic/Line Inputs** | 20 | XLR combo jacks, canais 1-20 |
| **Hi-Z Inputs** | 2 | Canais 1-2 switchable (guitarra/baixo direto) |
| **Line Inputs (stereo)** | 2 pares | Canais 21-22 e 23-24, 1/4" TRS |
| **USB Playback** | 2 ch | Stereo playback de USB drive |
| **Main Outputs** | 2 (L/R) | XLR balanceado |
| **Aux Outputs** | 10 | XLR balanceado (Aux 1-10) |
| **Headphone Out** | 2 | 1/4" TRS |
| **AES/EBU Digital Out** | 1 | XLR |
| **USB-B** | 1 | 32x32 audio interface para DAW |
| **USB-A** | 1 | Gravacao/playback USB drive (2-track stereo) |
| **Ethernet** | 1 | RJ45 para controle via rede |
| **WiFi** | Built-in | Dual-band (2.4GHz + 5GHz) |

### 1.2 Especificacoes do Sistema

| Parametro | Valor |
|---|---|
| **Sample Rate** | 48 kHz |
| **Bit Depth** | 24-bit |
| **Frequencia de Resposta** | 20 Hz - 20 kHz (+/- 0.5 dB) |
| **Dynamic Range** | >110 dB |
| **THD+N** | < 0.005% |
| **Latencia (analog in to out)** | < 1.1 ms |
| **Processamento Interno** | 40-bit floating point |
| **Max Clientes Simultaneos** | 10 dispositivos via browser |

---

## 2. Arquitetura de Canais

### 2.1 Input Channels (24 total)

| Faixa | Tipo | Phantom | Hi-Z | Pad |
|---|---|---|---|---|
| CH 1-2 | Mic/Line | +48V | Sim | -20 dB |
| CH 3-10 | Mic/Line | +48V | Nao | -20 dB |
| CH 11-20 | Mic/Line | +48V | Nao | -20 dB |
| CH 21-22 | Line (stereo pair) | Nao | Nao | Nao |
| CH 23-24 | Line (stereo pair) | Nao | Nao | Nao |
| USB L/R | Digital playback | N/A | N/A | N/A |

### 2.2 Parametros por Canal

| Parametro | Range | Default | WebSocket Path |
|---|---|---|---|
| **Gain** | -6 dB a +57 dB | 0 dB | `i.{n}.gain` (0-1) |
| **Phantom Power** | On/Off | Off | `i.{n}.phantom` (0/1) |
| **Phase Invert** | Normal/Invertido | Normal | `i.{n}.polarity` (0/1) |
| **Hi-Z** (CH 1-2) | On/Off | Off | `i.{n}.hiz` (0/1) |
| **Pad** | -20 dB on/off | Off | `i.{n}.pad` (0/1) |
| **Fader Level** | -inf a +10 dB | -inf | `i.{n}.mix` (0-1) |
| **Pan** | L100 a R100 | Center | `i.{n}.pan` (0=L, 0.5=C, 1=R) |
| **Mute** | On/Off | Off | `i.{n}.mute` (0/1) |
| **Solo** | On/Off (PFL/AFL) | Off | `i.{n}.solo` (0/1) |
| **Stereo Link** | On/Off (pares impares/pares) | Off | `i.{n}.stereoIndex` |
| **Channel Name** | Ate 12 caracteres | "CH {n}" | `i.{n}.name` |

### 2.3 Buses de Saida

| Tipo de Bus | Quantidade | Detalhes |
|---|---|---|
| **Main L/R** | 1 stereo | Output master com processamento completo |
| **Aux Buses** | 10 | Mixes independentes (monitores, in-ear, etc.) |
| **Subgroups** | 6 | Buses de subgrupo stereo |
| **FX Buses** | 4 | Processadores send-return FX |
| **VCA/DCA Groups** | 6 | Controle de volume (sem roteamento de audio) |
| **Mute Groups** | 6 + "All" + "FX" | Sets rapidos de mute |
| **View Groups** | 8 | Visibilidade customizada de canais na UI |

### 2.4 Signal Flow (por canal de entrada)

```
Input (Mic/Line/Hi-Z)
  |-> Gain (+48V, Pad, Phase)
  |-> HPF (High-Pass Filter)
  |-> Gate/Expander
  |-> Compressor/Limiter
  |-> De-esser
  |-> 4-Band Parametric EQ + LPF
  |-> Pre-Fader Send (para Aux buses se modo pre-fader)
  |-> Fader
  |-> Pan
  |-> Post-Fader Send (para Aux buses se modo post-fader)
  |-> FX Sends (para 4 processadores FX)
  |-> Bus Assignment (Main L/R, Subgroups 1-6)
  |-> Main Mix / Subgroup
```

**Nota**: Ui24R permite trocar a ordem EQ/dynamics (pre/post EQ). Default: Gate -> Compressor -> EQ. Alternativo: EQ -> Gate -> Compressor.

### 2.5 Signal Flow dos Outputs (Master / AUX)

```
[Bus Sum] (Main L/R ou AUX 1-10)
  |-> 31-Band Graphic EQ
  |-> Compressor (dbx)
  |-> dbx AFS2 (Feedback Suppression)
  |-> Output Fader + Mute
  |-> D/A Converter -> Saida Fisica
```

---

## 3. Equalizer (EQ)

### 3.1 Parametric EQ por Canal (4-5 bandas + Filtros)

Cada canal de entrada tem **4-5 bandas parametricas** + HPF + LPF.

| Banda | Tipo | Freq Range | Gain Range | Q Range | WebSocket Path |
|---|---|---|---|---|---|
| **HPF** | High-Pass (6/12/18/24 dB/oct) | 20 Hz - 1 kHz | N/A | N/A | `i.{n}.eq.hpf.freq`, `i.{n}.eq.hpf.slope` |
| **Band 1 (Low)** | Parametric ou Low Shelf | 20 Hz - 20 kHz | -15 a +15 dB | 0.05 - 15 | `i.{n}.eq.b1.{gain\|freq\|q}` |
| **Band 2 (Low-Mid)** | Parametric | 20 Hz - 20 kHz | -15 a +15 dB | 0.05 - 15 | `i.{n}.eq.b2.{gain\|freq\|q}` |
| **Band 3 (Mid)** | Parametric | 20 Hz - 20 kHz | -15 a +15 dB | 0.05 - 15 | `i.{n}.eq.b3.{gain\|freq\|q}` |
| **Band 4 (High-Mid)** | Parametric | 20 Hz - 20 kHz | -15 a +15 dB | 0.05 - 15 | `i.{n}.eq.b4.{gain\|freq\|q}` |
| **Band 5 (High)** | Parametric ou High Shelf | 20 Hz - 20 kHz | -15 a +15 dB | 0.05 - 15 | `i.{n}.eq.b5.{gain\|freq\|q}` |
| **LPF** | Low-Pass Filter | 1 kHz - 20 kHz | N/A | N/A | `i.{n}.eq.lpf.freq` |

**Nota**: O modelo WebSocket do Soundcraft expoe **5 bandas EQ** (`b1` a `b5`), onde `b1` e `b5` podem funcionar como shelf. A UI padrao apresenta 4 bandas parametricas + HPF/LPF.

| Controle EQ | WebSocket Path | Range |
|---|---|---|
| EQ Enable/Bypass | `i.{n}.eq.bypass` | 0 (ativo) / 1 (bypass) |
| Band gain | `i.{n}.eq.b{1-5}.gain` | 0-1 (mapeia -15 a +15 dB) |
| Band frequency | `i.{n}.eq.b{1-5}.freq` | 0-1 (logaritmico 20-20000 Hz) |
| Band Q | `i.{n}.eq.b{1-5}.q` | 0-1 (mapeia 0.05-15) |
| HPF frequency | `i.{n}.eq.hpf.freq` | 0-1 (20-1000 Hz) |
| HPF slope | `i.{n}.eq.hpf.slope` | 0-1 (discreto: 6/12/18/24 dB/oct) |
| LPF frequency | `i.{n}.eq.lpf.freq` | 0-1 (1000-20000 Hz) |

### 3.2 EQ nos Buses de Saida

| Path Pattern | Descricao |
|---|---|
| `a.{n}.eq.b{1-5}.{gain\|freq\|q}` | EQ do Aux bus n |
| `m.eq.b{1-5}.{gain\|freq\|q}` | EQ do Master bus |
| `s.{n}.eq.b{1-5}.{gain\|freq\|q}` | EQ do Subgroup n |

### 3.3 31-Band Graphic EQ (GEQ)

Disponivel em **Aux outputs** e **Main L/R**.

| Parametro | Valor |
|---|---|
| **Bandas** | 31 (1/3 oitava ISO) |
| **Gain por banda** | -12 dB a +12 dB |
| **Frequencias centrais** | 20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1k, 1.25k, 1.6k, 2k, 2.5k, 3.15k, 4k, 5k, 6.3k, 8k, 10k, 12.5k, 16k, 20k Hz |
| **WebSocket Path** | `a.{n}.geq.b{0-30}` ou `m.geq.b{0-30}` (0-1, mapeia -12 a +12 dB) |
| **Enable** | `a.{n}.geq.on` / `m.geq.on` |

---

## 4. Dynamics Processing (dbx)

### 4.1 Gate / Expander (por canal de entrada)

| Parametro | Range | Default | WebSocket Path |
|---|---|---|---|
| **Enable** | On/Off | Off | `i.{n}.gate.enabled` (0/1) |
| **Threshold** | -80 dB a 0 dB | -40 dB | `i.{n}.gate.thresh` (0-1) |
| **Depth (Range)** | 0 dB a 80 dB | 40 dB | `i.{n}.gate.depth` (0-1) |
| **Attack** | 0.05 ms a 100 ms | 5 ms | `i.{n}.gate.attack` (0-1) |
| **Hold** | 10 ms a 2000 ms | 50 ms | `i.{n}.gate.hold` (0-1) |
| **Release** | 10 ms a 4000 ms | 100 ms | `i.{n}.gate.release` (0-1) |

### 4.2 Compressor / Limiter (por canal)

Disponivel em: todos os 24 canais, AUX 1-10, Master bus e Subgroups.

| Parametro | Range | Default | WebSocket Path |
|---|---|---|---|
| **Enable** | On/Off | Off | `i.{n}.dyn.enabled` (0/1) |
| **Threshold** | -40 dB a +20 dB | -10 dB | `i.{n}.dyn.threshold` (0-1) |
| **Ratio** | 1:1 a inf:1 | 4:1 | `i.{n}.dyn.ratio` (0-1, 1.0=inf) |
| **Attack** | 0.05 ms a 200 ms | 10 ms | `i.{n}.dyn.attack` (0-1) |
| **Release** | 10 ms a 5000 ms | 100 ms | `i.{n}.dyn.release` (0-1) |
| **Makeup Gain** | 0 dB a 40 dB | 0 dB | `i.{n}.dyn.gain` (0-1) |
| **Soft Knee** | Hard (0) a Soft (1) | 0.5 | `i.{n}.dyn.softknee` (0-1) |
| **Auto Gain** | On/Off | Off | `i.{n}.dyn.autogain` (0/1) |
| **Output Gain** | adjustable | 0 | `i.{n}.dyn.outgain` (0-1) |

**Dynamics nos buses de saida:**

| Path Pattern | Descricao |
|---|---|
| `a.{n}.dyn.{threshold\|ratio\|attack\|release\|gain\|softknee}` | Compressor do Aux bus n |
| `m.dyn.{threshold\|ratio\|attack\|release\|gain\|softknee}` | Compressor do Master bus |

### 4.3 De-esser (por canal de entrada)

| Parametro | Range | Default | WebSocket Path |
|---|---|---|---|
| **Enable** | On/Off | Off | `i.{n}.deesser.enabled` |
| **Frequency** | 2 kHz - 15 kHz | 6 kHz | `i.{n}.deesser.freq` (0-1) |
| **Threshold** | -40 dB a 0 dB | -20 dB | `i.{n}.deesser.threshold` (0-1) |
| **Ratio** | 1:1 a 10:1 | 3:1 | `i.{n}.deesser.ratio` (0-1) |

### 4.4 dbx AFS2 (Anti-Feedback Suppression)

Disponivel em Master e Aux outputs.

| Parametro | Path | Descricao |
|---|---|---|
| AFS Enable | `m.afs.on` | 0 ou 1 |
| Fixed Filters | `m.afs.fixed{n}` | 12 notch filters persistentes |
| Live Filters | `m.afs.live{n}` | 12 notch filters dinamicos |
| Mode | `m.afs.mode` | Setup / Live |

---

## 5. Effects (FX) - 4 Processadores Lexicon

### 5.1 Tipos de FX Disponiveis

Cada slot FX pode carregar um destes tipos:

| Categoria | FX Type ID | Nome | Descricao |
|---|---|---|---|
| **Reverb** | 0 | Hall | Reverb de espaco grande |
| **Reverb** | 1 | Plate | Simulacao de plate reverb |
| **Reverb** | 2 | Chamber | Reverb de camara |
| **Reverb** | 3 | Room | Reverb de sala pequena |
| **Reverb** | 4 | Ambience | Reverb ambiente curto |
| **Delay** | 5 | Stereo Delay | Delay stereo |
| **Delay** | 6 | Mono Delay | Delay mono |
| **Delay** | 7 | PingPong Delay | Delay ping-pong |
| **Delay** | 8 | Tape Delay | Simulacao de tape delay |
| **Chorus** | 9 | Chorus | Chorus classico |
| **Chorus** | 10 | Flanger | Efeito de flanging |
| **Chorus** | 11 | Tremolo | Efeito de tremolo |
| **Chorus** | 12 | Phaser | Phase shifting |

### 5.2 Parametros por Tipo de FX (6 parametros por processador)

**Reverb (Hall, Plate, Chamber, Room, Ambience):**

| Param | Nome | Range (0-1 mapeia para) |
|---|---|---|
| par1 | Pre-Delay | 0-200 ms |
| par2 | Decay Time | 0.1-10 segundos |
| par3 | Size | Small a Large |
| par4 | Damping (HF) | 0-100% |
| par5 | Low Cut | 20-500 Hz |
| par6 | High Cut | 1 kHz - 20 kHz |

**Delay (Stereo, Mono, PingPong, Tape):**

| Param | Nome | Range |
|---|---|---|
| par1 | Delay Time | 1-1000 ms (ou BPM-synced) |
| par2 | Feedback | 0-100% |
| par3 | Low Cut | 20-500 Hz |
| par4 | High Cut | 1 kHz - 20 kHz |
| par5 | Spread (stereo width) | 0-100% |
| par6 | Mix / Mod Depth | 0-100% |

**Chorus/Flanger/Phaser/Tremolo:**

| Param | Nome | Range |
|---|---|---|
| par1 | Rate / Speed | 0.01-20 Hz |
| par2 | Depth | 0-100% |
| par3 | Delay (chorus/flanger) | 0.1-50 ms |
| par4 | Feedback | -100% a +100% |
| par5 | Shape / Wave | Sine/Triangle |
| par6 | Mix | 0-100% |

### 5.3 Default dos 4 Slots FX

| Slot | Tipo Default |
|---|---|
| FX1 | Reverb Hall |
| FX2 | Reverb Plate |
| FX3 | Stereo Delay |
| FX4 | Chorus |

### 5.4 Paths WebSocket FX

| Controle | Path | Valor |
|---|---|---|
| FX type select | `f.{n}.fxtype` | Integer (0-12) |
| FX parameter 1-6 | `f.{n}.par1` ate `f.{n}.par6` | 0-1 |
| FX BPM | `f.{n}.bpm` | 20-400 |
| FX return level | `f.{n}.mix` | 0-1 |
| FX return mute | `f.{n}.mute` | 0/1 |
| FX return pan | `f.{n}.pan` | 0-1 |

### 5.5 FX Sends (por canal)

| Controle | Path | Valor |
|---|---|---|
| FX send level | `i.{ch}.fx.{n}.value` | 0-1 |
| FX send mute | `i.{ch}.fx.{n}.mute` | 0/1 |
| FX send pre/post | `i.{ch}.fx.{n}.post` | 0=pre, 1=post |

---

## 6. AUX Buses & Sends

### 6.1 Configuracao dos 10 Aux Buses

| Parametro | Range | WebSocket Path |
|---|---|---|
| Aux Fader Level | -inf a +10 dB | `a.{n}.mix` (0-1) |
| Aux Mute | On/Off | `a.{n}.mute` (0/1) |
| Aux Name | Ate 12 chars | `a.{n}.name` |
| Aux Pan | L-R | `a.{n}.pan` (0-1) |
| Aux Stereo Link | On/Off | `a.{n}.stereoIndex` |
| Aux Delay | ms | `a.{n}.delay` |

### 6.2 Sends por Canal (para cada Aux)

| Controle | Path | Valor |
|---|---|---|
| Aux send level | `i.{ch}.aux.{n}.value` | 0-1 |
| Aux send mute | `i.{ch}.aux.{n}.mute` | 0/1 |
| Aux send pre/post | `i.{ch}.aux.{n}.post` | 0=pre, 1=post |

### 6.3 Processamento por Aux Bus

Cada aux bus tem:
- 4-band parametric EQ (`a.{n}.eq.*`)
- Compressor/limiter (`a.{n}.dyn.*`)
- 31-band Graphic EQ (`a.{n}.geq.*`)
- Delay para alinhamento (`a.{n}.delay`)
- dbx AFS anti-feedback

### 6.4 Stereo Linking

Aux buses podem ser linkados em pares stereo: 1-2, 3-4, 5-6, 7-8, 9-10.

### 6.5 Usos Tipicos

- AUX 1-6: Monitor mixes no palco (pre-fader)
- AUX 7-8: In-ear monitors (pre-fader)
- AUX 9-10: Sends externos ou monitors adicionais

---

## 7. Subgroups & VCA/DCA

### 7.1 Subgroups (6 stereo)

| Parametro | Path | Descricao |
|---|---|---|
| Subgroup fader | `s.{n}.mix` | Level (0-1) |
| Subgroup mute | `s.{n}.mute` | 0/1 |
| Subgroup assignment | `i.{ch}.subgroup` | Assign canal ao subgroup |
| Subgroup EQ | `s.{n}.eq.*` | Mesmo EQ que inputs |
| Subgroup to Main | Routing | Subgroups alimentam Main L/R |

**Usos**: Agrupar bateria, agrupar vocais, agrupar instrumentos.

### 7.2 VCA/DCA Groups (6)

| Aspecto | Descricao |
|---|---|
| VCA fader | Controla nivel de todos canais assignados proporcionalmente |
| VCA mute | Muta todos canais assignados |
| Assignment | Qualquer input pode ser assignado a um VCA |
| **Importante** | VCA NAO passa audio; controla parametros dos canais assignados |

**Diferenca chave**: Subgroups somam audio (muda routing). VCA/DCA so controla faders remotamente (sem routing).

### 7.3 Mute Groups

| Grupo | Path / API | Descricao |
|---|---|---|
| All Mute | `conn.muteGroup('all')` | Muta tudo |
| FX Mute | `conn.muteGroup('fx')` | Muta todos FX returns |
| Mute Group 1-6 | `conn.muteGroup('grp{n}')` | Sets definidos pelo usuario |

---

## 8. Master Bus

| Parametro | Range | WebSocket Path |
|---|---|---|
| Master Fader | -inf a +10 dB | `m.mix` (0-1) |
| Master Mute | On/Off | `m.mute` (0/1) |
| Master Dim | On/Off | `m.dim` |
| Master EQ | 4-band parametric | `m.eq.b{1-5}.*` |
| Master Compressor | Full compressor | `m.dyn.*` |
| Master GEQ | 31-band graphic | `m.geq.b{0-30}` |
| Master Delay | Speaker alignment | `m.delay` |
| Master AFS | Anti-feedback | `m.afs.*` |

---

## 9. Metering

### 9.1 VU/Level Meters

| Tipo | Descricao | API |
|---|---|---|
| Input meter | Nivel pre-fader por canal | `conn.vuProcessor.input(n)` |
| Output meter | Nivel post-fader (main, aux) | `conn.vuProcessor.master()`, `conn.vuProcessor.aux(n)` |
| FX meter | Nivel FX bus | `conn.vuProcessor.fx(n)` |
| Sub meter | Nivel subgroup | `conn.vuProcessor.sub(n)` |
| GR meter | Gain reduction do compressor | Extraido dos dados VU |
| Peak Hold | Indicador de pico | Calculo client-side |

### 9.2 Estrutura VuData

```typescript
interface VuData {
  vuPre: number;      // Nivel pre-fader (0..1)
  vuPost: number;     // Nivel post-fader (0..1)
  vuPreL: number;     // Pre-fader left (stereo)
  vuPreR: number;     // Pre-fader right (stereo)
  vuPostL: number;    // Post-fader left (stereo)
  vuPostR: number;    // Post-fader right (stereo)
}
```

**Nota**: Dados VU NAO sao transmitidos via SETD. Vem como blob binario em mensagem separada. A biblioteca parseia internamente. Taxa de update: ~20-50ms.

### 9.3 Cores dos Meters (Convencao)

| Faixa | Cor | dB Range |
|---|---|---|
| Normal | Verde | -inf a -12 dB |
| Quente | Amarelo/Amber | -12 dB a -3 dB |
| Clipando | Vermelho | -3 dB a 0 dB |

---

## 10. DigiTech Amp Modeling (Canais 1-2)

Disponivel apenas nos canais 1-2 (entradas Hi-Z).

| Parametro | Descricao |
|---|---|
| Amp Model | Selecao de simulacoes de amp guitarra/baixo |
| Cabinet Model | Simulacoes de gabinete |
| Drive/Gain | Quantidade de overdrive |
| Tone Controls | Bass, Mid, Treble |
| Effects | Chain adicional de efeitos |
| WebSocket Path | `i.{n}.digitech.*` (documentacao limitada) |

---

## 11. Recording & Playback

### 11.1 USB 2-Track Recording

| Feature | Detalhes | API |
|---|---|---|
| Formato | WAV (16/24-bit) | |
| Source | Main L/R output | |
| Storage | USB-A drive | |
| Record Toggle | | `conn.recorderDualTrack.recordToggle()` |
| Recording State | | `conn.recorderDualTrack.recording$` |
| Busy State | | `conn.recorderDualTrack.busy$` |
| Elapsed | | `conn.recorderDualTrack.elapsed$` |

### 11.2 USB Playback

| Feature | Detalhes | API |
|---|---|---|
| Formatos | WAV, MP3 | |
| Play | | `conn.player.play()` |
| Pause | | `conn.player.pause()` |
| Stop | | `conn.player.stop()` |
| Next/Prev | | `conn.player.next()` / `.prev()` |
| Shuffle | | `conn.player.toggleShuffle()` |
| Player State | 0=parado, 2=tocando, 3=pausado | `conn.player.state$` |
| Track Name | | `conn.player.track$` |
| Track Length | | `conn.player.length$` |
| Elapsed Time | | `conn.player.elapsedTime$` |
| Remaining Time | | `conn.player.remainingTime$` |
| Playlist | | `conn.player.playlist$` |
| Shuffle State | | `conn.player.shuffle$` |

### 11.3 Multitrack USB-B Recording (para DAW)

| Feature | Detalhes | API |
|---|---|---|
| Canais | 32x32 via USB-B | |
| Interface | Class-compliant USB audio | |
| Record Toggle | | `conn.recorderMultiTrack.recordToggle()` |
| Recording State | | `conn.recorderMultiTrack.recording$` |

---

## 12. Shows & Snapshots

### 12.1 Shows

| Feature | Descricao | API |
|---|---|---|
| Show | Container para multiplos snapshots | |
| Load Show | | `conn.shows.loadShow(name)` |
| Save Show | | `conn.shows.saveShow(name)` |
| Show List | | `conn.shows.showList$` |
| Current Show | | `conn.shows.currentShow$` |

### 12.2 Snapshots

| Feature | Descricao | API |
|---|---|---|
| Snapshot | Captura completa do estado do mixer | |
| Load Snapshot | | `conn.shows.loadSnapshot(name)` |
| Save Snapshot | | `conn.shows.saveSnapshot(name)` |
| Update Current | | `conn.shows.updateCurrentSnapshot()` |
| Snapshot List | | `conn.shows.snapshotList$` |
| Current Snapshot | | `conn.shows.currentSnapshot$` |

### 12.3 Cues

| Feature | Descricao | API |
|---|---|---|
| Cue List | Lista ordenada de snapshots | |
| Load Cue | | `conn.shows.loadCue(name)` |
| Next/Prev Cue | | `conn.shows.nextCue()` / `.previousCue()` |
| Cue List | | `conn.shows.cueList$` |

### 12.4 Recall Scope

Snapshots podem recall seletivo:
- Por canal (quais canais restaurar)
- Por tipo de parametro (faders, EQ, dynamics, FX, aux sends, routing)

---

## 13. Automix (Dugan-style)

| Feature | Descricao | API |
|---|---|---|
| Funcao | Gain sharing automatico entre microfones | |
| Enable/Disable | | `conn.automix.enable()` / `.disable()` |
| Toggle | | `conn.automix.toggle()` |
| Assign Channel | | `conn.automix.setGroupAssign(ch, group)` |
| Set Weight | | `conn.automix.setGroupWeight(ch, weight)` |
| Groups State | | `conn.automix.groups$` |

Paths WebSocket:
```
i.{n}.amix           -> automix enable por canal (0/1)
i.{n}.amixgroup      -> assignment do grupo automix
var.automix.enabled   -> enable global
```

---

## 14. Solo Modes

| Modo | Descricao |
|---|---|
| **PFL** (Pre-Fader Listen) | Monitora canal pre-fader |
| **AFL** (After-Fader Listen) | Monitora canal post-fader |
| **SIP** (Solo-In-Place) | Muta todos os canais nao-solados no mix principal (destrutivo!) |

---

## 15. Features Adicionais

### 15.1 Real-Time Analyzer (RTA)

- Analise de espectro FFT
- Overlay sobre visualizacao EQ (GEQ ou PEQ)
- Source selecionavel (qualquer input, bus ou output)
- Usado para afinacao acustica e deteccao de feedback

### 15.2 Channel Sync

- Copia settings de um canal para outro
- Grupos de parametros selecionaveis
- API: `conn.channelSync.syncChannels(source, target)`

### 15.3 Talkback

- Microfone talkback built-in no hardware
- Roteavel para qualquer aux bus
- Botao talk (momentary ou latching)

### 15.4 Signal Generator

- Gerador de tom built-in
- Pink noise, white noise, sine wave
- Roteavel para qualquer canal/bus para teste

### 15.5 Channel Linking

- Pares adjacentes impar/par podem ser stereo-linked: 1-2, 3-4, 5-6... 23-24
- Quando linkados: gain, EQ, dynamics, mute, solo sao ganged; pan vira balance

### 15.6 Device Info

| Observable | Descricao | API |
|---|---|---|
| Modelo | "Ui24R", "Ui16", "Ui12" | `conn.deviceInfo.model$` |
| Firmware | Versao do firmware | `conn.deviceInfo.firmware$` |
| IP | IP do mixer | `conn.deviceInfo.ip$` |

---

## 16. Protocolo WebSocket - Referencia Completa

### 16.1 Conexao

| Detalhe | Valor |
|---|---|
| Protocolo | WebSocket (ws://) |
| URL Default | `ws://10.10.1.1/socket.io/1/websocket/` |
| Biblioteca | `soundcraft-ui-connection` (npm) |
| Delimitador de mensagem | `^` (caret) |
| Keep-alive | `3:::ALIVE` |
| Ping/Pong | `2::` |

### 16.2 Formato de Mensagens

```
SETD^{path}^{value}         // Setar parametro
GETD^{path}                 // Ler parametro
3:::ALIVE                    // Keep-alive
2::                          // Ping-pong
BMSG^{binary_data}           // Dados VU meter (binario)
PLAYER^{command}             // Comandos do player
PLISTS^                      // Request playlists
SHOWLIST^                    // Request shows
SNAPSHOTLIST^                // Request snapshots
CUELIST^                     // Request cues
LOADSNAPSHOT^{name}          // Carregar snapshot
SAVESNAPSHOT^{name}          // Salvar snapshot
LOADSHOW^{name}              // Carregar show
LOADCUE^{name}               // Carregar cue
```

### 16.3 Mapa Completo de Paths SETD

**Input Channels** (prefixo: `i.{n}.`, n = 0-indexed):

```
// Basico
i.{n}.name               // Nome do canal (string)
i.{n}.mix                // Fader level (0-1)
i.{n}.gain               // Input gain (0-1) [Ui12/Ui16]
i.{n}.mute               // Mute (0/1)
i.{n}.solo               // Solo (0/1)
i.{n}.pan                // Pan (0=L, 0.5=C, 1=R)
i.{n}.phantom            // +48V phantom (0/1)
i.{n}.polarity           // Phase invert (0/1)
i.{n}.hiz                // High impedance (0/1) [CH 1-2]
i.{n}.pad                // -20dB pad (0/1)
i.{n}.stereoIndex        // Stereo link index
i.{n}.color              // Cor do canal
i.{n}.forOn              // Forced on (0/1)

// EQ (5 bandas parametricas)
i.{n}.eq.bypass          // EQ bypass (0/1)
i.{n}.eq.b{1-5}.gain     // Gain da banda (0-1)
i.{n}.eq.b{1-5}.freq     // Frequencia da banda (0-1)
i.{n}.eq.b{1-5}.q        // Q factor da banda (0-1)
i.{n}.eq.hpf.freq        // HPF frequencia (0-1)
i.{n}.eq.hpf.slope       // HPF slope
i.{n}.eq.lpf.freq        // LPF frequencia (0-1)
i.{n}.eq.lpf.slope       // LPF slope

// Dynamics (Compressor)
i.{n}.dyn.enabled        // Compressor on/off (0/1)
i.{n}.dyn.threshold      // Threshold (0-1)
i.{n}.dyn.ratio          // Ratio (0-1)
i.{n}.dyn.attack         // Attack (0-1)
i.{n}.dyn.release        // Release (0-1)
i.{n}.dyn.gain           // Makeup gain (0-1)
i.{n}.dyn.softknee       // Soft knee (0-1)
i.{n}.dyn.outgain        // Output gain (0-1)
i.{n}.dyn.hold           // Hold time (0-1)
i.{n}.dyn.autogain       // Auto gain (0/1)

// Gate
i.{n}.gate.enabled       // Gate on/off (0/1)
i.{n}.gate.thresh        // Threshold (0-1)
i.{n}.gate.depth         // Depth/range (0-1)
i.{n}.gate.attack        // Attack (0-1)
i.{n}.gate.release       // Release (0-1)
i.{n}.gate.hold          // Hold (0-1)

// De-esser
i.{n}.deesser.enabled    // De-esser on/off (0/1)
i.{n}.deesser.freq       // Frequencia (0-1)
i.{n}.deesser.threshold  // Threshold (0-1)
i.{n}.deesser.ratio      // Ratio (0-1)

// AUX sends (por bus)
i.{n}.aux.{bus}.value    // Nivel do send (0-1)
i.{n}.aux.{bus}.mute     // Mute do send (0/1)
i.{n}.aux.{bus}.pan      // Pan do send (0-1)
i.{n}.aux.{bus}.post     // Pre/post fader (0/1)
i.{n}.aux.{bus}.postproc // Post-proc

// FX sends (por bus)
i.{n}.fx.{bus}.value     // Nivel do send (0-1)
i.{n}.fx.{bus}.mute      // Mute do send (0/1)
i.{n}.fx.{bus}.post      // Pre/post fader (0/1)

// Automix
i.{n}.amix               // Automix enabled (0/1)
i.{n}.amixgroup          // Grupo automix

// DigiTech (CH 1-2)
i.{n}.digitech.*         // Parametros amp modeling
```

**Line Inputs** (`l.{n}.*`): Mesmos sub-paths que input channels.

**Player Channels** (`p.{n}.*`): Mesmos sub-paths de routing.

**Subgroups** (`s.{n}.*`):
```
s.{n}.mix                // Fader (0-1)
s.{n}.mute               // Mute (0/1)
s.{n}.pan                // Pan (0-1)
s.{n}.name               // Nome
s.{n}.eq.*               // EQ
```

**FX Processors** (`f.{n}.*`):
```
f.{n}.fxtype             // Tipo FX (integer 0-12)
f.{n}.par1 - f.{n}.par6  // 6 parametros (0-1 cada)
f.{n}.bpm                // BPM para sync
f.{n}.mix                // Return level (0-1)
f.{n}.mute               // Return mute (0/1)
f.{n}.pan                // Return pan (0-1)
f.{n}.name               // Nome
```

**AUX Buses** (`a.{n}.*`):
```
a.{n}.mix                // Fader (0-1)
a.{n}.mute               // Mute (0/1)
a.{n}.pan                // Pan (0-1)
a.{n}.name               // Nome
a.{n}.delay              // Delay (0-1)
a.{n}.eq.*               // EQ (mesmos sub-paths)
a.{n}.dyn.*              // Dynamics
a.{n}.geq.on             // GEQ enable (0/1)
a.{n}.geq.b{0-30}        // GEQ 31 bandas (0-1)
a.{n}.afs.*              // Anti-feedback
```

**Master** (`m.*`):
```
m.mix                    // Fader (0-1)
m.mute                   // Mute (0/1)
m.dim                    // Dim
m.pan                    // Pan (0-1)
m.solo                   // Solo
m.eq.*                   // EQ
m.dyn.*                  // Dynamics
m.geq.*                  // GEQ 31 bandas
m.delay                  // Delay
m.afs.*                  // Anti-feedback
```

**Hardware Inputs** (`hw.{n}.*`):
```
hw.{n}.gain              // Preamp gain (0-1) [-6 a +57 dB]
hw.{n}.phantom           // Phantom +48V (0/1)
```

**Variaveis Globais** (`var.*`):
```
var.player.state         // Player state (0/2/3)
var.player.track         // Track name
var.player.length        // Track length
var.player.elapsed       // Elapsed time
var.player.shuffle       // Shuffle state

var.mtk.rec.currentState       // Dual-track recorder state
var.mtk.rec.busy               // Recorder busy
var.mtk.rec.elapsed            // Recording elapsed

var.mtk.multitrack.currentState  // Multi-track recorder state
var.mtk.multitrack.busy          // Multi-track busy
var.mtk.multitrack.elapsed       // Multi-track elapsed

var.mtk.all.mute         // Mute all
var.mtk.fx.mute          // Mute all FX
var.automix.enabled      // Automix global enable
settings.block.pass      // Master password
```

**Mute Groups**: Usam sistema de bitmask (`mgmask`).

---

## 17. Formulas de Conversao de Valores

Todos os valores WebSocket sao normalizados **0 a 1**.

### 17.1 Fader Level

```typescript
// Curva logaritmica piecewise linear
// Pontos de referencia chave:
const DB_REFERENCE_POINTS = [
  { value: 0.0,    db: -Infinity },
  { value: 0.001,  db: -90 },
  { value: 0.125,  db: -60 },
  { value: 0.25,   db: -40 },
  { value: 0.375,  db: -30 },
  { value: 0.5,    db: -20 },
  { value: 0.625,  db: -10 },
  { value: 0.75,   db: -5 },
  { value: 0.764,  db: 0 },     // Unity gain
  { value: 0.875,  db: 5 },
  { value: 1.0,    db: 10 },
];
```

### 17.2 Hardware Gain

```typescript
// Gain: 0-1 -> dB
function gainValueToDB(value: number): number {
  return value * 63 - 6;  // -6 dB a +57 dB
}

function DBToGainValue(db: number): number {
  return (db + 6) / 63;
}
```

### 17.3 Pan

```typescript
// Pan: 0-1
// 0.0 = full left
// 0.5 = center
// 1.0 = full right
```

### 17.4 Resumo de Ranges

| Parametro | Protocol Range | Human Range | Notas |
|---|---|---|---|
| Fader level | 0..1 | -Inf..+10 dB | Curva logaritmica |
| Pan | 0..1 | L..R | 0.5 = center |
| Mute | 0/1 | Off/On | 1 = muted |
| Solo | 0/1 | Off/On | 1 = soloed |
| Post | 0/1 | Pre/Post | 1 = post-fader |
| Phantom | 0/1 | Off/On | 1 = +48V on |
| HW Gain | 0..1 | -6..+57 dB | Linear |
| EQ Gain | 0..1 | -15..+15 dB | 0.5 = 0 dB |
| EQ Freq | 0..1 | 20..20000 Hz | Logaritmico |
| EQ Q | 0..1 | 0.05..15 | Logaritmico |
| HPF Freq | 0..1 | 20..500 Hz | |
| LPF Freq | 0..1 | 500..22000 Hz | |
| Dyn Threshold | 0..1 | -60..0 dB | |
| Dyn Ratio | 0..1 | 1:1..Inf:1 | |
| Dyn Attack | 0..1 | 0.1..200 ms | |
| Dyn Release | 0..1 | 10..2000 ms | |
| Dyn Gain | 0..1 | 0..+40 dB | Makeup gain |
| Gate Threshold | 0..1 | -80..0 dB | |
| Gate Depth | 0..1 | 0..80 dB | |
| Gate Attack | 0..1 | 0.1..100 ms | |
| Gate Release | 0..1 | 10..4000 ms | |
| Gate Hold | 0..1 | 10..2000 ms | |
| FX Params | 0..1 | Varia por tipo | 6 params |
| FX BPM | 20..400 | 20..400 BPM | NAO normalizado |

---

## 18. API da Biblioteca - Quick Reference

Mapeamento da API `soundcraft-ui-connection` para necessidades do frontend:

| Necessidade | API | Notas |
|---|---|---|
| Channel fader | `conn.master.input(n).setFaderLevelDB(db)` | n = 1-indexed |
| Channel fader read | `conn.master.input(n).faderLevelDB$` | Observable |
| Channel mute | `conn.master.input(n).mute()` | |
| Channel solo | `conn.master.input(n).solo()` | |
| Channel pan | `conn.master.input(n).setPan(0.5)` | 0..1 |
| Channel name | `conn.master.input(n).name$` | Observable |
| Master fader | `conn.master.setFaderLevelDB(db)` | |
| Master mute | `conn.master.mute()` | |
| AUX send level | `conn.aux(bus).input(ch).setFaderLevelDB(db)` | Ambos 1-indexed |
| AUX send pre/post | `conn.aux(bus).input(ch).pre()` / `.post()` | |
| AUX bus output | `conn.aux(bus).setFaderLevelDB(db)` | |
| FX send level | `conn.fx(bus).input(ch).setFaderLevelDB(db)` | Ambos 1-indexed |
| FX parameter | `conn.fx(bus).setParam(paramNum, value)` | param 1-6, val 0..1 |
| FX type read | `conn.fx(bus).fxType$` | Observable (numerico) |
| FX BPM | `conn.fx(bus).setBpm(value)` | 20-400 |
| HW Gain | `conn.hw(ch).setGainDB(db)` | Ui24R only, 1-indexed |
| Phantom +48V | `conn.hw(ch).phantomOn()` | Ui24R only |
| VU meter | `conn.vuProcessor.input(ch)` | Observable VuData |
| Master VU | `conn.vuProcessor.master()` | |
| Mute group | `conn.muteGroup('all').mute()` | |
| Player play | `conn.player.play()` | |
| Player state | `conn.player.state$` | 0/2/3 |
| Record toggle | `conn.recorderDualTrack.recordToggle()` | |
| Load snapshot | `conn.shows.loadSnapshot(name)` | |
| EQ (raw) | `conn.conn.sendMessage('SETD^i.0.eq.b1.gain^0.5')` | Via raw |
| Compressor (raw) | `conn.conn.sendMessage('SETD^i.0.dyn.threshold^0.6')` | Via raw |
| Gate (raw) | `conn.conn.sendMessage('SETD^i.0.gate.thresh^0.5')` | Via raw |
| Qualquer param | `conn.conn.sendMessage('SETD^{path}^{value}')` | Fallback universal |

### Lendo parametros raw do state store

```typescript
import { map, distinctUntilChanged } from 'rxjs';

// Ler EQ band 1 gain do canal 1 (index 0)
const eqBand1Gain$ = conn.store.state$.pipe(
  map(state => state['i.0.eq.b1.gain']),
  distinctUntilChanged()
);

// Ler compressor threshold do canal 1
const compThreshold$ = conn.store.state$.pipe(
  map(state => state['i.0.dyn.threshold']),
  distinctUntilChanged()
);

// Escrever
conn.conn.sendMessage('SETD^i.0.eq.b1.gain^0.75');
```

---

## 19. Contagem de Canais por Modelo

| Tipo | Ui12 | Ui16 | Ui24R |
|---|---|---|---|
| Input channels (`i`) | 12 | 16 | 24 |
| Line inputs (`l`) | 2 | 2 | 2 |
| Player channels (`p`) | 2 | 2 | 2 |
| Subgroups (`s`) | 4 | 4 | 6 |
| FX buses (`f`) | 4 | 4 | 4 |
| AUX buses (`a`) | 4 | 6 | 10 |
| Hardware inputs (`hw`) | -- | -- | 24 |
| Mute groups | 4 | 4 | 6 |

---

## 20. Gaps entre o Modelo Atual do Mix Mind Studio e a Ui24R Real

| Modelo Atual (mixer.ts) | Realidade Ui24R | Acao |
|---|---|---|
| 4 EQ bands | 5 EQ bands (b1-b5) com shelf | Adicionar 5a banda + modo shelf |
| `FXType = 'reverb' \| 'delay' \| 'chorus'` | 13 tipos distintos (0-12) | Expandir para todos 13 |
| 4 FX sends | 4 FX sends | OK |
| **8 aux sends** | **10 aux sends** | **Aumentar para 10** |
| Sem GEQ | 31-band GEQ nos outputs | **Adicionar** |
| Sem AFS | dbx AFS2 nos outputs | **Adicionar** |
| Sem DigiTech | Amp modeling CH 1-2 | **Adicionar** |
| `vca: number \| null` | 6 VCA groups com fader/mute | **Adicionar gerenciamento** |
| Sem automix | Dugan automix | **Adicionar** |
| Sem talkback | Mic talkback hardware | **Adicionar routing** |
| Sem signal generator | Gerador built-in | **Adicionar** |
| Sem solo mode selection | PFL/AFL/SIP | **Adicionar** |
| Sem RTA | Analisador de espectro | **Adicionar** |
| EQ gain range: +/-20 dB | +/-15 dB | **Corrigir** |
| Sem phase/polarity | Phase invert por canal | **Adicionar** |
| `ConsoleViewMode` incompleto | Views para subgroups, VCA | **Expandir** |

---

## Fontes

- [soundcraft-ui-connection - GitHub](https://github.com/fmalcher/soundcraft-ui)
- [soundcraft-ui-connection - NPM](https://www.npmjs.com/package/soundcraft-ui-connection)
- [soundcraft-ui-connection - Docs](https://fmalcher.github.io/soundcraft-ui/)
- [Soundcraft Ui24R Manual](https://www.manualslib.com/manual/1316472/Soundcraft-Ui24r.html)
- [Soundcraft Ui24R Product Page](https://www.soundcraft.com/en-US/products/ui24r)
- [Sound On Sound - Ui24R Review](https://www.soundonsound.com/reviews/soundcraft-ui24r)
- [HARMAN Forums - WebSocket](https://proforums.harman.com/soundcraft/discussion/138204/ui12-websocket-connection)
- [Blechtrottel - JS WebSockets](https://blechtrottel.net/en/jswebsockets.html)
- [Sweetwater - Ui Series Tutorials](https://www.sweetwater.com/sweetcare/articles/soundcraft-ui-series-tutorials/)
- [HARMAN - FX & AUX Sends Config](https://help.harmanpro.com/configuring-fx-sends-aux-sends-with-soundcraft-ui-mixers)
