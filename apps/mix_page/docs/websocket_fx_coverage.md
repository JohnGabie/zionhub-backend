# WebSocket - Cobertura de Features da Mesa Soundcraft Ui

Pesquisa sobre viabilidade de controlar efeitos e features do mixer Soundcraft Ui (Ui12, Ui16, Ui24R) via WebSocket usando a biblioteca `soundcraft-ui-connection`.

---

## 1. Editar Efeitos via WebSocket - E Possivel?

**Sim.** A biblioteca `soundcraft-ui-connection` expoe `conn` (MixerConnection) com `sendMessage()`, permitindo enviar **qualquer comando SETD raw** para o mixer. Isso abre acesso a praticamente todos os parametros.

### Formato do protocolo

```
SETD^{path}^{value}     // Setar valor
GETD^{path}             // Ler valor
3:::ALIVE                // Keep-alive
```

### FX Processors (4 engines Lexicon)

- `conn.fx(n).fxType$` — ler o tipo de FX ativo (Reverb, Delay, Chorus, Room)
- `conn.fx(n).setParam(param, value)` — setar parametros do FX (valores 0-1, **6 parametros por FX**)
- `conn.fx(n).getParam(param)` — ler parametro
- `conn.fx(n).setBpm(value)` — setar BPM (20-400)

### Paths de estado disponiveis (modelo do mixer)

- **EQ**: 5 bandas parametricas (`b1-b5`) com `gain`, `q`, `freq` + HPF/LPF com `slope` e `freq`
- **Dynamics (Compressor)**: `ratio`, `gain`, `threshold`, `attack`, `release`, `softknee`, `outgain`, `hold`, `autogain`
- **Gate**: `depth`, `thresh`, `hold`, `release`, `attack`, `enabled`
- **De-esser**: parametros disponiveis
- **FX sends por canal**: `mute`, `value` (nivel), `post` (pre/post fader)

### Exemplo de uso

```typescript
// EQ de um canal via WebSocket raw
conn.sendMessage(`SETD^i.0.eq.b1.gain^0.75`);   // EQ band 1 gain
conn.sendMessage(`SETD^i.0.eq.b1.freq^0.5`);    // EQ band 1 freq
conn.sendMessage(`SETD^i.0.eq.b1.q^0.3`);       // EQ band 1 Q

// Compressor
conn.sendMessage(`SETD^i.0.dyn.threshold^0.6`);
conn.sendMessage(`SETD^i.0.dyn.ratio^0.4`);
conn.sendMessage(`SETD^i.0.dyn.attack^0.2`);

// Gate
conn.sendMessage(`SETD^i.0.gate.thresh^0.5`);

// FX processor (API dedicada)
conn.fx(1).setParam(1, 0.7);  // param 1 do FX 1
conn.fx(1).setParam(2, 0.3);  // param 2 do FX 1
```

---

## 2. Limitacoes Conhecidas

| Limitacao | Detalhe |
|---|---|
| **Biblioteca nao expoe EQ/Dynamics diretamente** | Os modelos de estado TEM os paths, mas a API nao tem metodos dedicados para EQ, compressor e gate. So FX bus tem `setParam()`. |
| **Solucao**: mensagens SETD raw | Enviar `SETD^i.0.eq.b1.gain^0.5` direto via `conn.sendMessage()`. |
| **Valores normalizados (0-1)** | Todos os parametros usam valores lineares 0-1. Precisa converter de/para dB, Hz, etc. |
| **Sem lista oficial de paths** | Protocolo WebSocket do Soundcraft nao e documentado oficialmente. Paths descobertos por engenharia reversa. |
| **FX type nao e setavel pela lib** | `fxType$` e observable (leitura), mas nao tem `setFxType()`. Possivel via SETD raw (`f.{n}.fxtype`). |
| **Latencia** | WebSocket tipico: 1-5ms em rede local. Mais que suficiente para controle de parametros (aceitavel ate ~50ms). |
| **Sem streaming de audio** | WebSocket controla parametros, nao transporta audio. Processamento acontece no hardware do mixer. |

---

## 3. Cobertura de Features - Veredicto: ~85-90%

### Tier 1 — Ja pronto na biblioteca (esforco minimo)

| Feature | Metodo | Esforco |
|---|---|---|
| Faders (volume) | `setFaderLevelDB()` | Zero |
| Mute/Solo | `mute()`, `solo()` | Zero |
| Pan | `setPan()` | Zero |
| Phantom +48V | `hw(n).phantom` | Zero |
| Gain | `hw(n).setGainDB()` | Zero |
| FX sends (nivel por canal) | `fx(n).input(ch)` | Zero |
| AUX sends (nivel por canal) | `aux(n).input(ch)` | Zero |
| FX params (6 por engine) | `fx(n).setParam()` | Zero |
| FX BPM | `fx(n).setBpm()` | Zero |
| FX type (leitura) | `fx(n).fxType$` | Zero |
| Mute groups | `muteGroup()` | Zero |
| VU meters | `vuProcessor` | Zero |
| Shows/Snapshots | `shows` | Zero |
| Player USB | `player` | Zero |
| Recorder | `recorderDualTrack/MultiTrack` | Zero |
| Automix | `automix` | Zero |
| Device info | `deviceInfo` | Zero |
| Channel sync | `channelSync` | Zero |

### Tier 2 — Via SETD raw (esforco baixo-medio)

Os paths existem no modelo de estado. Basta enviar via `conn.sendMessage()`:

| Feature | Path pattern | Esforco |
|---|---|---|
| **EQ 5 bandas** (gain, freq, Q) | `i.{ch}.eq.b{1-5}.{gain\|freq\|q}` | Baixo |
| **EQ HPF/LPF** | `i.{ch}.eq.hpf.freq`, `i.{ch}.eq.lpf.freq` | Baixo |
| **EQ bypass** | `i.{ch}.eq.bypass` | Baixo |
| **Compressor** | `i.{ch}.dyn.{threshold\|ratio\|attack\|release\|gain\|softknee}` | Baixo |
| **Gate** | `i.{ch}.gate.{thresh\|depth\|attack\|release\|hold}` | Baixo |
| **De-esser** | paths no modelo de estado | Baixo |
| **FX type (escrita)** | `f.{n}.fxtype` | Baixo |
| **Pre/Post fader sends** | `i.{ch}.{aux\|fx}.{n}.post` | Baixo |
| **EQ/Dyn nos AUX/Master** | `a.{n}.eq.*`, `m.eq.*`, `m.dyn.*` | Medio |
| **Stereo link** | `i.{ch}.stereoIndex` | Baixo |
| **Channel delay** | `a.{n}.delay` | Baixo |

**Esforco real:**
1. Criar funcoes wrapper para converter valores humanos (dB, Hz) para valores normalizados (0-1)
2. Criar observables para ler o estado de volta (subscribe no `store.state$`)
3. Mapear os 6 `par` do FX para nomes legiveis conforme o `fxtype` ativo

### Tier 3 — Possivel mas requer mais trabalho

| Feature | Desafio | Esforco |
|---|---|---|
| **GR Meter** (gain reduction visual) | Precisa extrair do stream de VU | Medio |
| **AFS (Anti-Feedback)** | Paths existem (`m.afs.*`) mas pouco documentado | Medio-Alto |
| **GEQ 31 bandas** (nos outputs) | 31 paths por output, muita UI | Medio |
| **Matrix routing** | Paths `mtx` existem, logica complexa | Alto |
| **DigiTech effects** | Modelo tem `digitech`, pouca documentacao | Alto |

### Tier 4 — Impossivel ou impraticavel

| Feature | Por que |
|---|---|
| **Streaming/gravacao de audio** | Audio e processado no hardware, WebSocket so controla parametros |
| **Firmware update** | Protocolo separado, nao via WebSocket |
| **WiFi/Network config** | Configuracao de rede do mixer em si |
| **DSP custom** | Processamento e no chip do mixer, nao programavel |

---

## 4. Estimativa de Esforco

```
Tier 1 (ja pronto)     → ~60% das features  → 1-2 dias (integrar)
Tier 2 (SETD raw)      → ~25% das features  → 1-2 semanas
Tier 3 (mais trabalho) → ~5-8% das features  → 2-4 semanas
                                    TOTAL     → ~85-90% em ~1 mes
```

---

## 5. Por que e Viavel

1. **`conn.sendMessage()` e a porta de entrada** — qualquer path do modelo de estado pode ser lido/escrito
2. **O modelo de estado ja mapeia TUDO** — EQ, dynamics, gate, FX, routing, matrix... os paths existem
3. **`store.state$` da feedback** — da pra criar observables custom pra qualquer parametro
4. **Protocolo e simples** — `SETD^path^value` pra escrever, subscribe no state pra ler
5. **Valores sao todos 0-1** — padrao consistente, so precisa das formulas de conversao

---

## 6. Maior Risco

O protocolo **nao e documentado oficialmente pela Harman/Soundcraft**. Tudo foi descoberto por reverse engineering:
- Uma atualizacao de firmware pode mudar paths (raro, mas possivel)
- Alguns paths podem se comportar de forma inesperada
- Nao ha garantia de estabilidade da API

Na pratica, a comunidade usa isso ha anos e o protocolo se manteve estavel entre versoes.

---

## 7. Conclusao

Com a biblioteca + SETD raw, da pra cobrir **praticamente tudo que a interface web original do Soundcraft faz** — porque a interface original usa o **mesmo protocolo WebSocket**. O Mix Mind Studio estaria essencialmente recriando o `mixer.html` deles com uma UI melhor em React.

---

## Fontes

- [soundcraft-ui-connection - GitHub](https://github.com/fmalcher/soundcraft-ui)
- [soundcraft-ui-connection - NPM](https://www.npmjs.com/package/soundcraft-ui-connection)
- [soundcraft-ui-connection - Docs](https://fmalcher.github.io/soundcraft-ui/)
- [HARMAN Forums - UI12 WebSocket](https://proforums.harman.com/soundcraft/discussion/138204/ui12-websocket-connection)
- [Blechtrottel - JS WebSockets in Soundcraft UI](https://blechtrottel.net/en/jswebsockets.html)
- [Soundcraft Ui24R Manual](https://www.manualslib.com/manual/1316472/Soundcraft-Ui24r.html)
- [Soundcraft Ui24R - ManualsLib EQ Page](https://www.manualslib.com/manual/1316472/Soundcraft-Ui24r.html?page=70)
