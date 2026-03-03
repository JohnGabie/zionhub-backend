export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// === VU Data Types ===
export interface InputVu { vuPre: number; vuPost: number; vuPostFader: number; }
export interface AuxVu { vuPost: number; vuPostFader: number; }
export interface StereoVu { vuPostL: number; vuPostR: number; vuPostFaderL: number; vuPostFaderR: number; }
export interface VuData {
  input: InputVu[];
  player: InputVu[];
  sub: StereoVu[];
  fx: StereoVu[];
  aux: AuxVu[];
  master: AuxVu[];
  line: InputVu[];
}

type MessageListener = (path: string, value: string) => void;
type VuListener = (data: VuData) => void;
type StatusListener = (status: ConnectionStatus) => void;

const KEEP_ALIVE_INTERVAL = 5000;
const RECONNECT_DELAY = 3000;
const POLL_INTERVAL = 150;

// VU normalization factor (from soundcraft-ui-connection library)
const VU_NORM = 0.004167508166392142;

// Block sizes per channel type
const BLOCK_SIZES: Record<string, number> = {
  input: 6, player: 6, sub: 7, fx: 7, aux: 5, master: 5, line: 6,
};

// Channel type order in the binary header (bytes 0-6)
const CHANNEL_TYPES = ['input', 'player', 'sub', 'fx', 'aux', 'master', 'line'] as const;

/** Decode base64 string to Uint8Array */
function b64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

/** Parse VU binary data into structured VuData */
function parseVuMessage(bytes: Uint8Array): VuData {
  // Bytes 0-6: channel counts per type
  const counts: Record<string, number> = {};
  for (let i = 0; i < CHANNEL_TYPES.length; i++) {
    counts[CHANNEL_TYPES[i]] = bytes[i] || 0;
  }

  const result: VuData = { input: [], player: [], sub: [], fx: [], aux: [], master: [], line: [] };
  let offset = 8; // data starts at byte 8

  for (const type of CHANNEL_TYPES) {
    const count = counts[type];
    const blockSize = BLOCK_SIZES[type];

    for (let ch = 0; ch < count; ch++) {
      if (type === 'input' || type === 'player' || type === 'line') {
        result[type].push({
          vuPre: (bytes[offset] || 0) * VU_NORM,
          vuPost: (bytes[offset + 1] || 0) * VU_NORM,
          vuPostFader: (bytes[offset + 2] || 0) * VU_NORM,
        });
      } else if (type === 'sub' || type === 'fx') {
        result[type].push({
          vuPostL: (bytes[offset] || 0) * VU_NORM,
          vuPostR: (bytes[offset + 1] || 0) * VU_NORM,
          vuPostFaderL: (bytes[offset + 2] || 0) * VU_NORM,
          vuPostFaderR: (bytes[offset + 3] || 0) * VU_NORM,
        });
      } else {
        // aux, master
        result[type].push({
          vuPost: (bytes[offset] || 0) * VU_NORM,
          vuPostFader: (bytes[offset + 1] || 0) * VU_NORM,
        });
      }
      offset += blockSize;
    }
  }

  return result;
}

class SoundcraftConnection {
  private ws: WebSocket | null = null;
  private _status: ConnectionStatus = 'disconnected';
  private ip: string = '';
  private messageListeners = new Set<MessageListener>();
  private vuListeners = new Set<VuListener>();
  private statusListeners = new Set<StatusListener>();
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  get status() {
    return this._status;
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status;
    this.statusListeners.forEach(cb => cb(status));
  }

  async connect(ip: string): Promise<void> {
    if (this._status === 'connected' || this._status === 'connecting') return;
    this.ip = ip;
    this.shouldReconnect = true;
    this.setStatus('connecting');

    try {
      const res = await fetch(`http://${ip}/socket.io/1/`, { method: 'GET' });
      if (!res.ok) throw new Error(`Handshake failed: ${res.status}`);
      const text = await res.text();
      const sessionId = text.split(':')[0];
      if (!sessionId) throw new Error('No session ID in handshake response');
      this.openWebSocket(ip, sessionId);
    } catch (err) {
      console.warn('[Soundcraft] Handshake error:', err);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  private msgCount = 0;
  private logAllAfter = 0; // timestamp: log every message after initial dump settles

  private openWebSocket(ip: string, sessionId: string) {
    const url = `ws://${ip}/socket.io/1/websocket/${sessionId}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.msgCount = 0;
      this.logAllAfter = Date.now() + 8000; // start verbose logging 8s after connect
      console.log('[Soundcraft] WebSocket connected');
      this.setStatus('connected');
      this.startKeepAlive();
      this.requestInitialState();
      this.startPolling();
    };

    ws.onmessage = (event) => {
      const data = event.data;
      if (typeof data !== 'string') {
        console.log('[WS-BINARY]', typeof data, data instanceof ArrayBuffer ? data.byteLength : '?');
        return;
      }

      // Socket.IO v1 ping — respond with pong
      if (data === '2::') { ws.send('2::'); return; }
      // Socket.IO v1 connect ack
      if (data === '1::') return;

      // Data message: 3:::{payload}
      if (data.startsWith('3:::')) {
        const payload = data.slice(4);

        // VU meter data: VUA^{base64} (some firmware sends VU2^)
        if (payload.startsWith('VUA^') || payload.startsWith('VU2^')) {
          try {
            const b64 = payload.slice(4);
            const bytes = b64ToUint8(b64);
            const vuData = parseVuMessage(bytes);
            this.vuListeners.forEach(cb => cb(vuData));
          } catch { /* ignore corrupt VU packets */ }
          return;
        }

        // Skip RTA (Real-Time Analyzer) data
        if (payload.startsWith('RTA^')) return;

        this.msgCount++;
        const verbose = Date.now() > this.logAllAfter;
        if (verbose || this.msgCount % 200 === 1) console.log('[WS-MSG]', this.msgCount, payload.substring(0, 60));
        this.handlePayload(payload);
        return;
      }

      if (data.startsWith('SETD^') || data.startsWith('SETS^')) {
        this.msgCount++;
        const verbose = Date.now() > this.logAllAfter;
        if (verbose || this.msgCount % 200 === 1) console.log('[WS-MSG]', this.msgCount, data.substring(0, 60));
        this.handlePayload(data);
        return;
      }

      // Catch-all: log any unrecognized message format
      console.log('[WS-UNKNOWN]', data.substring(0, 80));
    };

    ws.onclose = () => {
      console.log('[Soundcraft] WebSocket closed');
      // Only cleanup if this is the CURRENT WebSocket (not an orphaned one)
      if (ws === this.ws) {
        this.cleanup();
        if (this.shouldReconnect) {
          this.setStatus('disconnected');
          this.scheduleReconnect();
        }
      }
    };

    ws.onerror = (err) => {
      console.warn('[Soundcraft] WebSocket error:', err);
      this.setStatus('error');
    };
  }

  private handlePayload(payload: string) {
    const lines = payload.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('SETD^') && !trimmed.startsWith('SETS^')) continue;
      const parts = trimmed.split('^');
      if (parts.length >= 3) {
        this.messageListeners.forEach(cb => cb(parts[1], parts[2]));
      }
    }
  }

  private requestInitialState() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    for (let i = 0; i < 24; i++) {
      this.ws.send(`3:::GETD^i.${i}.mix`);
      this.ws.send(`3:::GETD^i.${i}.mute`);
      this.ws.send(`3:::GETD^i.${i}.solo`);
      this.ws.send(`3:::GETD^i.${i}.pan`);
      this.ws.send(`3:::GETS^i.${i}.name`);
      this.ws.send(`3:::GETD^i.${i}.stereoIndex`);
    }
    this.ws.send('3:::GETD^m.mix');
    this.ws.send('3:::GETD^m.mute');
  }

  private startKeepAlive() {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send('3:::ALIVE');
    }, KEEP_ALIVE_INTERVAL);
  }

  private stopKeepAlive() {
    if (this.keepAliveTimer) { clearInterval(this.keepAliveTimer); this.keepAliveTimer = null; }
  }

  private pollCount = 0;

  private startPolling() {
    this.stopPolling();
    this.pollCount = 0;
    this.pollTimer = setInterval(() => {
      this.pollCount++;
      const shouldLog = this.pollCount % 33 === 0;
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        if (shouldLog) console.log('[POLL] ws not open, state:', this.ws?.readyState);
        return;
      }
      if (shouldLog) console.log('[POLL] ok, listeners:', this.messageListeners.size);
      for (let i = 0; i < 24; i++) {
        this.ws.send(`3:::GETD^i.${i}.mix`);
        this.ws.send(`3:::GETD^i.${i}.mute`);
      }
      this.ws.send('3:::GETD^m.mix');
      this.ws.send('3:::GETD^m.mute');
      // Poll stereoIndex every ~5s (33 cycles × 150ms)
      if (shouldLog) {
        for (let i = 0; i < 24; i++) {
          this.ws.send(`3:::GETD^i.${i}.stereoIndex`);
        }
      }
    }, POLL_INTERVAL);
  }

  private stopPolling() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect && this.ip) this.connect(this.ip);
    }, RECONNECT_DELAY);
  }

  private cleanup() {
    this.stopKeepAlive();
    this.stopPolling();
    this.ws = null;
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.stopKeepAlive();
    this.stopPolling();
    if (this.ws) { this.ws.close(); this.ws = null; }
    this.setStatus('disconnected');
  }

  send(path: string, value: number | string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(`3:::SETD^${path}^${value}`);
    }
  }

  sendString(path: string, value: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(`3:::SETS^${path}^${value}`);
    }
  }

  onMessage(cb: MessageListener): () => void {
    this.messageListeners.add(cb);
    return () => { this.messageListeners.delete(cb); };
  }

  onVuData(cb: VuListener): () => void {
    this.vuListeners.add(cb);
    return () => { this.vuListeners.delete(cb); };
  }

  onStatusChange(cb: StatusListener): () => void {
    this.statusListeners.add(cb);
    return () => { this.statusListeners.delete(cb); };
  }
}

export const soundcraft = new SoundcraftConnection();
