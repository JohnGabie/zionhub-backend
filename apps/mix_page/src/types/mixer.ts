export type ChannelType = 'mic' | 'instrument' | 'playback' | 'line' | 'fx';

// === EQ Types ===
export interface EQBand {
  freq: number;      // 20-22000 Hz
  gain: number;      // -20 to +20 dB
  q: number;         // 0.05-15
  enabled: boolean;
}

export interface FilterSettings {
  enabled: boolean;
  frequency: number;  // Hz
}

export interface EQSettings {
  enabled: boolean;
  bands: [EQBand, EQBand, EQBand, EQBand]; // 4 bands
  hpf: FilterSettings;
  lpf: FilterSettings;
}

// === Dynamics Types ===
export interface GateSettings {
  enabled: boolean;
  threshold: number;  // dB (-80 to 0)
  attack: number;     // ms (1-100)
  hold: number;       // ms (10-2000)
  release: number;    // ms (10-4000)
  depth: number;      // dB (0-80)
}

export interface CompressorSettings {
  enabled: boolean;
  threshold: number;  // dB (-40 to +20)
  ratio: number;      // 1-100 (100 = inf)
  attack: number;     // ms (1-200)
  release: number;    // ms (10-5000)
  gain: number;       // dB makeup gain (0-40)
  knee: number;       // 0 (hard) to 1 (soft)
}

export interface DeesserSettings {
  enabled: boolean;
  frequency: number;  // Hz
  threshold: number;  // dB
  ratio: number;      // 1-10
}

// === Send Types ===
export interface AuxSend {
  level: number;      // 0-100
  preFader: boolean;
}

export interface FXSend {
  level: number;      // 0-100
  preFader: boolean;
}

// === Channel ===
export interface Channel {
  id: number;
  name: string;
  type: ChannelType;
  icon: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  active: boolean;
  isLive: boolean;
  isVirtual: boolean;
  level: number;       // 0-100 for meter display
  pan: number;         // -100 to 100
  // New advanced fields
  gain: number;        // 0-100
  phantom: boolean;    // +48V
  hiZ: boolean;        // channels 1-2 only
  stereoLink: number | null;
  eq: EQSettings;
  gate: GateSettings;
  compressor: CompressorSettings;
  deesser: DeesserSettings;
  auxSends: AuxSend[];   // 8 aux sends
  fxSends: FXSend[];     // 4 fx sends
  subgroup: number | null;
  vca: number | null;
  grMeter: number;       // 0-100 gain reduction
  peakHold: number;      // peak level hold
}

// === FX Processor Types ===
export type FXType = 'reverb' | 'delay' | 'chorus';

export interface FXProcessor {
  id: number;
  name: string;
  type: FXType;
  enabled: boolean;
  preset: string;
  params: Record<string, number>;
}

// === Shows & Snapshots ===
export interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  channelData: Pick<Channel, 'id' | 'volume' | 'muted' | 'pan' | 'gain' | 'eq' | 'gate' | 'compressor'>[];
  masterVolume: number;
}

export interface Show {
  id: string;
  name: string;
  snapshots: Snapshot[];
  activeSnapshotId: string | null;
}

// === View Groups ===
export interface ViewGroup {
  id: string;
  name: string;
  channelIds: number[];
}

// === Preset (existing, kept compatible) ===
export interface Preset {
  id: string;
  name: string;
  channels: Pick<Channel, 'id' | 'volume' | 'muted'>[];
  masterVolume: number;
}

// === Console View Mode ===
export type ConsoleViewMode = 'mix' | 'gain' | 'aux1' | 'aux2' | 'aux3' | 'aux4' | 'aux5' | 'aux6' | 'aux7' | 'aux8' | 'fx1' | 'fx2' | 'fx3' | 'fx4';

// === Mixer State ===
export interface MixerState {
  channels: Channel[];
  masterVolume: number;
  masterMuted: boolean;
  activePreset: string | null;
  presets: Preset[];
  isRecording: boolean;
  recordingTime: number;
  mode: 'basic' | 'advanced';
  activeTab: string;
  effectsActive: number;
  groupsActive: number;
  consoleView: ConsoleViewMode;
  editingChannelId: number | null;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTrack: string;
  artist: string;
  progress: number;
  duration: number;
}

export const CHANNEL_ICONS: Record<ChannelType, string> = {
  mic: '🎤',
  instrument: '🎸',
  playback: '🎵',
  line: '📻',
  fx: '✨',
};

export const EMOJI_PICKER_OPTIONS = [
  '🎤', '🎙️', '🎵', '🎶', '🎸', '🎹', '🎺', '🎻',
  '🥁', '🪘', '🎷', '🪗', '🪕', '🔔', '🔊', '🔉',
  '🔈', '📻', '🎧', '🎼', '🪈', '🪇', '🎚️', '🎛️',
];

// === Default Factories ===
const defaultEQBand = (freq: number): EQBand => ({
  freq, gain: 0, q: 1, enabled: true,
});

const defaultEQ = (): EQSettings => ({
  enabled: false,
  bands: [defaultEQBand(100), defaultEQBand(500), defaultEQBand(2000), defaultEQBand(8000)],
  hpf: { enabled: false, frequency: 80 },
  lpf: { enabled: false, frequency: 18000 },
});

const defaultGate = (): GateSettings => ({
  enabled: false, threshold: -40, attack: 5, hold: 50, release: 100, depth: 40,
});

const defaultCompressor = (): CompressorSettings => ({
  enabled: false, threshold: -10, ratio: 4, attack: 10, release: 100, gain: 0, knee: 0.5,
});

const defaultDeesser = (): DeesserSettings => ({
  enabled: false, frequency: 6000, threshold: -20, ratio: 3,
});

const defaultAuxSends = (): AuxSend[] =>
  Array.from({ length: 8 }, () => ({ level: 0, preFader: false }));

const defaultFXSends = (): FXSend[] =>
  Array.from({ length: 4 }, () => ({ level: 0, preFader: false }));

function makeChannel(
  id: number, name: string, type: ChannelType, icon: string,
  overrides: Partial<Channel> = {}
): Channel {
  return {
    id, name, type, icon,
    volume: 75, muted: false, solo: false, active: true,
    isLive: false, isVirtual: false, level: 50, pan: 0,
    gain: 50, phantom: false, hiZ: false, stereoLink: null,
    eq: defaultEQ(), gate: defaultGate(), compressor: defaultCompressor(),
    deesser: defaultDeesser(), auxSends: defaultAuxSends(), fxSends: defaultFXSends(),
    subgroup: null, vca: null, grMeter: 0, peakHold: 0,
    ...overrides,
  };
}

export const DEFAULT_CHANNELS: Channel[] = Array.from({ length: 24 }, (_, i) =>
  makeChannel(i + 1, `Ch ${i + 1}`, 'mic', '🎤')
);

export const DEFAULT_PRESETS: Preset[] = [];
