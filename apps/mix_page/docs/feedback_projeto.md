# Feedback - Mix Mind Studio

Analise do estado atual do projeto (UI ainda em desenvolvimento, sem integracao WebSocket).

---

## O que esta muito bom

### Arquitetura de tipos
O `mixer.ts` e solido. 24 interfaces bem definidas, factory functions (`makeChannel`, `defaultEQ`, etc.), e os 24 canais default com dados realistas (Pastor, Lider Louvor, Kick, etc.). Isso vai facilitar muito a integracao com WebSocket depois porque os tipos ja espelham a estrutura real do Soundcraft.

### Dois modos (Basic/Advanced)
Boa decisao. O modo basico com cards e acessivel pra quem nao e tecnico, e o modo avancado com channel strips horizontais e o que um operador de som espera. A transicao entre eles e limpa.

### Fader styling
O CSS do fader cap metalico com grip ridges, a curva logaritmica real de dB com 9 pontos de referencia, e o metering de 30 segmentos com peak hold sao detalhes profissionais. Mostra estudo de mesas reais (documentado em `docs/skill.md`).

### ChannelEditPanel com EQ/Dynamics
O EQ de 4 bandas com visualizacao SVG, gate, compressor com knee, de-esser, 8 aux sends e 4 FX sends esta completo. Os ranges dos parametros batem com o que o Soundcraft usa.

---

## O que melhorar

### 1. State management vai virar gargalo

O `useMixerState` e um hook gigante com ~276 linhas que gerencia tudo: 24 canais, master, presets, recording, mode, view, editing. Cada `updateChannel` causa re-render de **todos** os componentes que consomem esse hook.

```
Index.tsx usa useMixerState()
  -> passa props pra ChannelGrid
    -> passa props pra MixerConsole
      -> passa props pra cada ChannelStrip (x24)
```

Isso e prop drilling profundo. Quando conectar WebSocket com updates a 30-60fps (VU meters), vai travar.

**Sugestao:**
- Separar estado efemero (meters, levels, peakHold, grMeter) do estado de configuracao (volume, EQ, mute, presets)
- Considerar `useContext` + `useReducer` ou Zustand pra evitar prop drilling
- Meters deveriam ter seu proprio loop de update isolado

### 2. localStorage a cada mudanca

No `useMixerState`, o `useEffect` salva no localStorage toda vez que o estado muda — incluindo quando os meters simulados atualizam a cada 100ms. Isso sao ~10 writes/segundo no localStorage sem necessidade. Separar o estado de meters resolve isso automaticamente.

### 3. Console view modes subutilizados

`ConsoleViewMode` tem 14 opcoes (mix, gain, aux1-8, fx1-4), mas no `MixerConsole` o fader so alterna entre `volume` e `gain`. Os modos AUX e FX mostram o nivel do send mas nao permitem editar diretamente no fader.

Em mesas reais (X32, Ui24R), selecionar "AUX 1" faz os faders **virarem** os sends do AUX 1. Seria mais intuitivo implementar assim.

### 4. Tabs placeholder

Playback, Groups, Effects e Meters mostram "Em breve!". Quando for implementar:
- **Effects tab**: Mostrar os 4 FX processors (tipo, presets, os 6 params)
- **Groups tab**: Mute groups, VCA/DCA assignments
- **Meters tab**: Overview de todos os canais tipo "meter bridge"

### 5. Sem feedback visual de conexao real

O header mostra "Soundcraft Ui24" com um dot verde fixo — e estatico. Quando integrar WebSocket, esse status precisa refletir `ConnectionStatus` real (Opening, Open, Reconnecting, Error). Ja deixar preparado.

### 6. Componentes grandes demais

- `ChannelStrip.tsx` tem ~345 linhas com toda a logica de render, dB conversion, metering e UI inline
- `MixerConsole.tsx` tem ~317 linhas com scroll handling, zoom, drag e render

Extrair a logica de conversao dB e metering pra hooks/utils dedicados vai facilitar quando conectar dados reais.

---

## Preparacao pra WebSocket

O projeto ja esta **bem posicionado** porque:

- Os tipos em `mixer.ts` mapeiam quase 1:1 com os paths do Soundcraft
- EQ tem 4 bandas (Soundcraft tem 5, facil adicionar)
- Gate/Compressor/De-esser ja estao modelados
- AUX/FX sends ja existem

### O que vai precisar mudar

| Atual | Com WebSocket |
|---|---|
| `useState` local | Observables RxJS do `soundcraft-ui-connection` |
| `updateChannel(id, {volume})` | `conn.master.input(n).setFaderLevelDB(db)` |
| Meters simulados (random) | `vuProcessor` real do mixer |
| localStorage persistence | Estado vive no mixer, UI e reflexo |
| Valores 0-100 | Valores 0-1 (normalizados) ou dB |

---

## Resumo

| Aspecto | Nota | Comentario |
|---|---|---|
| Tipos/Modelagem | Excelente | Espelha hardware real |
| UI/UX | Muito bom | Profissional, dois modos |
| Fader/Metering | Muito bom | Curva real, styling detalhado |
| Editores (EQ/Dyn) | Bom | Completo, faltam ajustes finos |
| State management | Precisa refatorar | Prop drilling + localStorage excessivo |
| Performance | OK por agora | Vai precisar otimizar pra WebSocket |
| Preparacao pra hardware | Boa base | Tipos compativeis, arquitetura precisa adaptar |

O projeto tem uma base solida. O maior trabalho antes de integrar WebSocket e **separar estado efemero de estado de configuracao** — isso vai destravar tanto performance quanto a integracao com dados reais.
