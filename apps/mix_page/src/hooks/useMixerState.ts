import { useState, useEffect, useCallback, useRef } from 'react';
import { MixerState, Channel, Preset, ConsoleViewMode, DEFAULT_CHANNELS, DEFAULT_PRESETS, EQSettings, GateSettings, CompressorSettings, DeesserSettings } from '@/types/mixer';
import { soundcraft, VuData } from '@/lib/soundcraft-ws';

const STORAGE_KEY = 'soundcontrol-mixer-state';

const STORAGE_VERSION = 2; // bump to force reset of stale localStorage

const getInitialState = (): MixerState => {
  if (typeof window === 'undefined') return createDefaultState();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Force reset if storage version changed
      if (parsed._version !== STORAGE_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        return createDefaultState();
      }
      if (!parsed.consoleView) parsed.consoleView = 'mix';
      if (parsed.editingChannelId === undefined) parsed.editingChannelId = null;
      return parsed;
    } catch {
      return createDefaultState();
    }
  }
  return createDefaultState();
};

const createDefaultState = (): MixerState => ({
  channels: DEFAULT_CHANNELS,
  masterVolume: 85,
  masterMuted: false,
  activePreset: null,
  presets: DEFAULT_PRESETS,
  isRecording: false,
  recordingTime: 0,
  mode: 'basic',
  activeTab: 'channels',
  effectsActive: 3,
  groupsActive: 2,
  consoleView: 'mix',
  editingChannelId: null,
});

export function useMixerState() {
  const [state, setState] = useState<MixerState>(getInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, _version: STORAGE_VERSION }));
  }, [state]);

  // Separate meter state — updates don't trigger channel re-renders
  type MeterData = { level: number; grMeter: number; peakHold: number };
  const [meters, setMeters] = useState<MeterData[]>(() =>
    state.channels.map(() => ({ level: 0, grMeter: 0, peakHold: 0 }))
  );
  const [masterMeter, setMasterMeter] = useState<MeterData>({ level: 0, grMeter: 0, peakHold: 0 });
  const channelsRef = useRef(state.channels);
  channelsRef.current = state.channels;

  // Real VU data from Soundcraft — updated via WebSocket callback
  const latestVuRef = useRef<VuData | null>(null);

  useEffect(() => {
    return soundcraft.onVuData((data) => {
      latestVuRef.current = data;
    });
  }, []);

  // Meter rAF loop — uses real VU when connected, falls back to simulation
  useEffect(() => {
    let rafId: number;
    let lastTime = 0;
    const MIN_INTERVAL = 1000 / 60; // 60fps is plenty for meters

    const tick = (time: number) => {
      const dt = time - lastTime;
      if (dt >= MIN_INTERVAL) {
        const scale = dt / 100;
        lastTime = time;
        const vu = latestVuRef.current;

        setMeters(prev => {
          const chs = channelsRef.current;
          return prev.map((m, i) => {
            const ch = chs[i];
            if (!ch) return m;

            const level = (vu && vu.input[i])
              ? vu.input[i].vuPost * 100
              : m.level * (1 - 0.15 * scale); // decay to 0 when no data

            return {
              level,
              grMeter: ch.compressor.enabled
                ? Math.min(100, Math.max(0, m.grMeter + (Math.random() - 0.5) * 10 * scale))
                : m.grMeter * (1 - 0.3 * scale),
              peakHold: Math.max(m.peakHold * (1 - 0.03 * scale), level),
            };
          });
        });

        // Master meter
        setMasterMeter(prev => {
          const level = (vu && vu.master[0])
            ? vu.master[0].vuPost * 100
            : prev.level * (1 - 0.15 * scale);
          return {
            level,
            grMeter: prev.grMeter * (1 - 0.3 * scale),
            peakHold: Math.max(prev.peakHold * (1 - 0.03 * scale), level),
          };
        });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // --- Soundcraft bidirectional sync ---
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    let cbCount = 0;
    const unsub = soundcraft.onMessage((path, value) => {
      cbCount++;
      if (cbCount % 200 === 1) console.log('[CB]', cbCount, path, value);
      isRemoteUpdate.current = true;

      // Input channel name: i.{n}.name (string value)
      const inputName = path.match(/^i\.(\d+)\.name$/);
      if (inputName) {
        const chId = parseInt(inputName[1]) + 1;
        const name = value && value.trim() ? value.trim() : `Ch ${chId}`;
        setState(prev => ({
          ...prev,
          channels: prev.channels.map(ch =>
            ch.id === chId ? { ...ch, name } : ch
          ),
        }));
        isRemoteUpdate.current = false;
        return;
      }

      const numVal = parseFloat(value);
      if (isNaN(numVal)) {
        isRemoteUpdate.current = false;
        return;
      }

      // Input channel fader: i.{n}.mix
      const inputMix = path.match(/^i\.(\d+)\.mix$/);
      if (inputMix) {
        const chId = parseInt(inputMix[1]) + 1;
        const volume = Math.round(numVal * 100);
        console.log('[MIX]', chId, volume);
        setState(prev => ({
          ...prev,
          channels: prev.channels.map(ch =>
            ch.id === chId ? { ...ch, volume } : ch
          ),
        }));
        isRemoteUpdate.current = false;
        return;
      }

      // Input channel mute: i.{n}.mute
      const inputMute = path.match(/^i\.(\d+)\.mute$/);
      if (inputMute) {
        const chId = parseInt(inputMute[1]) + 1;
        const muted = numVal >= 0.5;
        setState(prev => ({
          ...prev,
          channels: prev.channels.map(ch =>
            ch.id === chId ? { ...ch, muted } : ch
          ),
        }));
        isRemoteUpdate.current = false;
        return;
      }

      // Input channel solo: i.{n}.solo
      const inputSolo = path.match(/^i\.(\d+)\.solo$/);
      if (inputSolo) {
        const chId = parseInt(inputSolo[1]) + 1;
        const solo = numVal >= 0.5;
        setState(prev => ({
          ...prev,
          channels: prev.channels.map(ch =>
            ch.id === chId ? { ...ch, solo } : ch
          ),
        }));
        isRemoteUpdate.current = false;
        return;
      }

      // Input channel pan: i.{n}.pan (0=L, 0.5=C, 1=R → -100 to 100)
      const inputPan = path.match(/^i\.(\d+)\.pan$/);
      if (inputPan) {
        const chId = parseInt(inputPan[1]) + 1;
        const pan = Math.round((numVal - 0.5) * 200); // 0-1 → -100 to 100
        setState(prev => ({
          ...prev,
          channels: prev.channels.map(ch =>
            ch.id === chId ? { ...ch, pan } : ch
          ),
        }));
        isRemoteUpdate.current = false;
        return;
      }

      // Input channel stereo link: i.{n}.stereoIndex
      // Protocol: -1 = unlinked, 0 = LEFT of pair, 1 = RIGHT of pair
      const stereoIdx = path.match(/^i\.(\d+)\.stereoIndex$/);
      if (stereoIdx) {
        const chIdx = parseInt(stereoIdx[1]); // 0-indexed
        const chId = chIdx + 1; // 1-indexed
        let linkedTo: number | null = null;
        if (numVal === 0) {
          // This channel is LEFT → partner is the next channel
          linkedTo = chId + 1;
        } else if (numVal === 1) {
          // This channel is RIGHT → partner is the previous channel
          linkedTo = chId - 1;
        }
        // numVal === -1 → unlinked (linkedTo stays null)
        setState(prev => ({
          ...prev,
          channels: prev.channels.map(ch => {
            if (ch.id === chId) return { ...ch, stereoLink: linkedTo };
            return ch;
          }),
        }));
        isRemoteUpdate.current = false;
        return;
      }

      // Master fader: m.mix
      if (path === 'm.mix') {
        setState(prev => ({ ...prev, masterVolume: Math.round(numVal * 100) }));
        isRemoteUpdate.current = false;
        return;
      }

      // Master mute: m.mute
      if (path === 'm.mute') {
        setState(prev => ({ ...prev, masterMuted: numVal >= 0.5 }));
        isRemoteUpdate.current = false;
        return;
      }

      isRemoteUpdate.current = false;
    });
    return unsub;
  }, []);

  const updateChannel = useCallback((channelId: number, update: Partial<Channel>) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(ch =>
        ch.id === channelId ? { ...ch, ...update } : ch
      ),
    }));
  }, []);

  const setChannelVolume = useCallback((channelId: number, volume: number) => {
    const clamped = Math.max(0, Math.min(100, volume));
    setState(prev => {
      const ch = prev.channels.find(c => c.id === channelId);
      const ids = [channelId];
      if (ch?.stereoLink) ids.push(ch.stereoLink);
      if (!isRemoteUpdate.current) {
        ids.forEach(id => soundcraft.send(`i.${id - 1}.mix`, (clamped / 100).toFixed(4)));
      }
      return {
        ...prev,
        channels: prev.channels.map(c =>
          ids.includes(c.id) ? { ...c, volume: clamped } : c
        ),
      };
    });
  }, []);

  const toggleChannelMute = useCallback((channelId: number) => {
    setState(prev => {
      const ch = prev.channels.find(c => c.id === channelId);
      const newMuted = ch ? !ch.muted : false;
      const ids = [channelId];
      if (ch?.stereoLink) ids.push(ch.stereoLink);
      if (!isRemoteUpdate.current) {
        ids.forEach(id => soundcraft.send(`i.${id - 1}.mute`, newMuted ? 1 : 0));
      }
      return {
        ...prev,
        channels: prev.channels.map(c =>
          ids.includes(c.id) ? { ...c, muted: newMuted } : c
        ),
      };
    });
  }, []);

  const toggleChannelSolo = useCallback((channelId: number) => {
    setState(prev => {
      const ch = prev.channels.find(c => c.id === channelId);
      const newSolo = ch ? !ch.solo : false;
      const ids = [channelId];
      if (ch?.stereoLink) ids.push(ch.stereoLink);
      if (!isRemoteUpdate.current) {
        ids.forEach(id => soundcraft.send(`i.${id - 1}.solo`, newSolo ? 1 : 0));
      }
      return {
        ...prev,
        channels: prev.channels.map(c =>
          ids.includes(c.id) ? { ...c, solo: newSolo } : c
        ),
      };
    });
  }, []);

  const toggleStereoLink = useCallback((channelId: number) => {
    // Read current state to decide action, then send + update separately
    const current = stateRef.current;
    const ch = current.channels.find(c => c.id === channelId);
    if (!ch) return;

    if (ch.stereoLink != null) {
      // Unlink
      const partnerId = ch.stereoLink;
      soundcraft.send(`i.${channelId - 1}.stereoIndex`, -1);
      soundcraft.send(`i.${partnerId - 1}.stereoIndex`, -1);
      setState(prev => ({
        ...prev,
        channels: prev.channels.map(c => {
          if (c.id === channelId || c.id === partnerId) {
            return { ...c, stereoLink: null, pan: 0 };
          }
          return c;
        }),
      }));
    } else {
      // Link with adjacent channel
      const leftId = channelId % 2 === 1 ? channelId : channelId - 1;
      const rightId = leftId + 1;
      if (rightId > 24) return;

      const rightCh = current.channels.find(c => c.id === rightId);
      if (rightCh?.stereoLink != null) return;

      soundcraft.send(`i.${leftId - 1}.stereoIndex`, 0);
      soundcraft.send(`i.${rightId - 1}.stereoIndex`, 1);
      setState(prev => ({
        ...prev,
        channels: prev.channels.map(c => {
          if (c.id === leftId) return { ...c, stereoLink: rightId, pan: -100, volume: ch.volume, muted: ch.muted, solo: ch.solo };
          if (c.id === rightId) return { ...c, stereoLink: leftId, pan: 100, volume: ch.volume, muted: ch.muted, solo: ch.solo };
          return c;
        }),
      }));
    }
  }, []);

  const toggleChannelActive = useCallback((channelId: number) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(ch =>
        ch.id === channelId ? { ...ch, active: !ch.active, muted: ch.active ? true : ch.muted } : ch
      ),
    }));
  }, []);

  const setChannelName = useCallback((channelId: number, name: string) => {
    updateChannel(channelId, { name });
    // Don't send fallback names (Ch 1, Ch 2...) to the mixer
    if (!/^Ch \d+$/.test(name)) {
      soundcraft.sendString(`i.${channelId - 1}.name`, name);
    }
  }, [updateChannel]);

  const setChannelGain = useCallback((channelId: number, gain: number) => {
    updateChannel(channelId, { gain: Math.max(0, Math.min(100, gain)) });
  }, [updateChannel]);

  const setChannelPan = useCallback((channelId: number, pan: number) => {
    updateChannel(channelId, { pan: Math.max(-100, Math.min(100, pan)) });
  }, [updateChannel]);

  const togglePhantom = useCallback((channelId: number) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(ch =>
        ch.id === channelId ? { ...ch, phantom: !ch.phantom } : ch
      ),
    }));
  }, []);

  const setChannelEQ = useCallback((channelId: number, eq: EQSettings) => {
    updateChannel(channelId, { eq });
  }, [updateChannel]);

  const setChannelGate = useCallback((channelId: number, gate: GateSettings) => {
    updateChannel(channelId, { gate });
  }, [updateChannel]);

  const setChannelCompressor = useCallback((channelId: number, compressor: CompressorSettings) => {
    updateChannel(channelId, { compressor });
  }, [updateChannel]);

  const setChannelDeesser = useCallback((channelId: number, deesser: DeesserSettings) => {
    updateChannel(channelId, { deesser });
  }, [updateChannel]);

  const setAuxSendLevel = useCallback((channelId: number, auxIndex: number, level: number) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(ch => {
        if (ch.id !== channelId) return ch;
        const auxSends = [...ch.auxSends];
        auxSends[auxIndex] = { ...auxSends[auxIndex], level: Math.max(0, Math.min(100, level)) };
        return { ...ch, auxSends };
      }),
    }));
  }, []);

  const setFXSendLevel = useCallback((channelId: number, fxIndex: number, level: number) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(ch => {
        if (ch.id !== channelId) return ch;
        const fxSends = [...ch.fxSends];
        fxSends[fxIndex] = { ...fxSends[fxIndex], level: Math.max(0, Math.min(100, level)) };
        return { ...ch, fxSends };
      }),
    }));
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(100, volume));
    setState(prev => ({ ...prev, masterVolume: clamped }));
    if (!isRemoteUpdate.current) {
      soundcraft.send('m.mix', (clamped / 100).toFixed(4));
    }
  }, []);

  const toggleMasterMute = useCallback(() => {
    setState(prev => {
      const newMuted = !prev.masterMuted;
      if (!isRemoteUpdate.current) {
        soundcraft.send('m.mute', newMuted ? 1 : 0);
      }
      return { ...prev, masterMuted: newMuted };
    });
  }, []);

  const muteAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      masterMuted: true,
      channels: prev.channels.map(ch => ({ ...ch, muted: true })),
    }));
  }, []);

  const setMode = useCallback((mode: 'basic' | 'advanced') => {
    setState(prev => ({ ...prev, mode }));
  }, []);

  const setActiveTab = useCallback((activeTab: string) => {
    setState(prev => ({ ...prev, activeTab }));
  }, []);

  const setConsoleView = useCallback((consoleView: ConsoleViewMode) => {
    setState(prev => ({ ...prev, consoleView }));
  }, []);

  const setEditingChannel = useCallback((editingChannelId: number | null) => {
    setState(prev => ({ ...prev, editingChannelId }));
  }, []);

  const loadPreset = useCallback((presetId: string) => {
    setState(prev => {
      const preset = prev.presets.find(p => p.id === presetId);
      if (!preset) return prev;
      return {
        ...prev,
        activePreset: presetId,
        masterVolume: preset.masterVolume,
        channels: prev.channels.map(ch => {
          const pc = preset.channels.find(p => p.id === ch.id);
          return pc ? { ...ch, volume: pc.volume, muted: pc.muted } : ch;
        }),
      };
    });
  }, []);

  const savePreset = useCallback((name: string) => {
    setState(prev => {
      const newPreset: Preset = {
        id: `preset-${Date.now()}`, name,
        masterVolume: prev.masterVolume,
        channels: prev.channels.map(ch => ({ id: ch.id, volume: ch.volume, muted: ch.muted })),
      };
      return { ...prev, presets: [...prev.presets, newPreset], activePreset: newPreset.id };
    });
  }, []);

  const toggleRecording = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRecording: !prev.isRecording,
      recordingTime: prev.isRecording ? prev.recordingTime : 0,
    }));
  }, []);

  useEffect(() => {
    if (!state.isRecording) return;
    const interval = setInterval(() => {
      setState(prev => ({ ...prev, recordingTime: prev.recordingTime + 1 }));
    }, 1000);
    return () => clearInterval(interval);
  }, [state.isRecording]);

  const activeChannelsCount = state.channels.filter(ch => ch.active && !ch.muted).length;

  return {
    state,
    meters,
    masterMeter,
    activeChannelsCount,
    setChannelVolume,
    toggleChannelMute,
    toggleChannelSolo,
    toggleChannelActive,
    setChannelName,
    setChannelGain,
    setChannelPan,
    togglePhantom,
    setChannelEQ,
    setChannelGate,
    setChannelCompressor,
    setChannelDeesser,
    setAuxSendLevel,
    setFXSendLevel,
    setMasterVolume,
    toggleMasterMute,
    muteAll,
    setMode,
    setActiveTab,
    setConsoleView,
    setEditingChannel,
    loadPreset,
    savePreset,
    toggleRecording,
    toggleStereoLink,
    updateChannel,
  };
}
