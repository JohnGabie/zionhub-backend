import { useRef, useCallback, useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { Channel, ConsoleViewMode } from '@/types/mixer';
import { ChannelStrip } from './ChannelStrip';
import { cn } from '@/lib/utils';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface MixerConsoleProps {
  channels: Channel[];
  meters?: { level: number; grMeter: number; peakHold: number }[];
  masterMeter?: { level: number; grMeter: number; peakHold: number };
  masterVolume: number;
  masterMuted: boolean;
  consoleView: ConsoleViewMode;
  onVolumeChange: (channelId: number, volume: number) => void;
  onMuteToggle: (channelId: number) => void;
  onSoloToggle: (channelId: number) => void;
  onMasterVolumeChange: (volume: number) => void;
  onMuteAll: () => void;
  onConsoleViewChange: (view: ConsoleViewMode) => void;
  onAuxSendChange: (channelId: number, auxIndex: number, level: number) => void;
  onFXSendChange: (channelId: number, fxIndex: number, level: number) => void;
  onGainChange: (channelId: number, gain: number) => void;
  onPanChange: (channelId: number, pan: number) => void;
  onNameChange: (channelId: number, name: string) => void;
  onStereoLink?: (channelId: number) => void;
  onEditChannel: (channelId: number) => void;
}

const AUX_TABS: { label: string; value: ConsoleViewMode }[] = [
  { label: 'AUX 1', value: 'aux1' },
  { label: 'AUX 2', value: 'aux2' },
  { label: 'AUX 3', value: 'aux3' },
  { label: 'AUX 4', value: 'aux4' },
  { label: 'AUX 5', value: 'aux5' },
  { label: 'AUX 6', value: 'aux6' },
  { label: 'AUX 7', value: 'aux7' },
  { label: 'AUX 8', value: 'aux8' },
];

const FX_TABS: { label: string; value: ConsoleViewMode }[] = [
  { label: 'FX 1 Reverb', value: 'fx1' },
  { label: 'FX 2 Reverb', value: 'fx2' },
  { label: 'FX 3 Delay', value: 'fx3' },
  { label: 'FX 4 Room', value: 'fx4' },
];

const NOOP = () => {};

function getStripValue(channel: Channel, view: ConsoleViewMode): number {
  if (view === 'mix') return channel.volume;
  if (view === 'gain') return channel.gain;
  if (view.startsWith('aux')) {
    const idx = parseInt(view.replace('aux', '')) - 1;
    return channel.auxSends[idx]?.level ?? 0;
  }
  if (view.startsWith('fx')) {
    const idx = parseInt(view.replace('fx', '')) - 1;
    return channel.fxSends[idx]?.level ?? 0;
  }
  return channel.volume;
}

export function MixerConsole({
  channels,
  meters,
  masterMeter: masterMeterProp,
  masterVolume,
  masterMuted,
  consoleView,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onMasterVolumeChange,
  onMuteAll,
  onConsoleViewChange,
  onAuxSendChange,
  onFXSendChange,
  onGainChange,
  onPanChange,
  onNameChange,
  onStereoLink,
  onEditChannel,
}: MixerConsoleProps) {
  // Stable refs for callbacks
  const consoleViewRef = useRef(consoleView);
  consoleViewRef.current = consoleView;
  const onVolumeChangeRef = useRef(onVolumeChange);
  onVolumeChangeRef.current = onVolumeChange;
  const onGainChangeRef = useRef(onGainChange);
  onGainChangeRef.current = onGainChange;
  const onAuxSendChangeRef = useRef(onAuxSendChange);
  onAuxSendChangeRef.current = onAuxSendChange;
  const onFXSendChangeRef = useRef(onFXSendChange);
  onFXSendChangeRef.current = onFXSendChange;
  const onMuteToggleRef = useRef(onMuteToggle);
  onMuteToggleRef.current = onMuteToggle;
  const onSoloToggleRef = useRef(onSoloToggle);
  onSoloToggleRef.current = onSoloToggle;
  const onEditChannelRef = useRef(onEditChannel);
  onEditChannelRef.current = onEditChannel;
  const onPanChangeRef = useRef(onPanChange);
  onPanChangeRef.current = onPanChange;

  const handleStripChange = useCallback((channelId: number, value: number) => {
    const view = consoleViewRef.current;
    if (view === 'mix') return onVolumeChangeRef.current(channelId, value);
    if (view === 'gain') return onGainChangeRef.current(channelId, value);
    if (view.startsWith('aux')) {
      const idx = parseInt(view.replace('aux', '')) - 1;
      return onAuxSendChangeRef.current(channelId, idx, value);
    }
    if (view.startsWith('fx')) {
      const idx = parseInt(view.replace('fx', '')) - 1;
      return onFXSendChangeRef.current(channelId, idx, value);
    }
  }, []);

  const handleMuteToggle = useCallback((channelId: number) => onMuteToggleRef.current(channelId), []);
  const handleSoloToggle = useCallback((channelId: number) => onSoloToggleRef.current(channelId), []);
  const handleEditClick = useCallback((channelId: number) => onEditChannelRef.current(channelId), []);
  const handlePanChange = useCallback((channelId: number, pan: number) => onPanChangeRef.current(channelId, pan), []);

  const [channelZoom, setChannelZoom] = useState(1.2);

  // Drag-to-scroll state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, [role="slider"]')) return;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    scrollStartX.current = scrollRef.current?.scrollLeft ?? 0;
  }, []);

  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    const dx = e.clientX - dragStartX.current;
    scrollRef.current.scrollLeft = scrollStartX.current - dx;
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const isMixGain = consoleView === 'mix' || consoleView === 'gain';
  const isAux = consoleView.startsWith('aux');
  const isFx = consoleView.startsWith('fx');

  // Sound wave tab indicator — slides behind the active button
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const [wavePos, setWavePos] = useState({ left: 0, width: 0 });
  const [waveActive, setWaveActive] = useState(false);
  const waveColor = consoleView === 'gain' ? 'hsl(0 70% 22%)' : isMixGain ? 'hsl(212 100% 45%)' : isAux ? 'hsl(45 100% 35%)' : 'hsl(220 60% 25%)';
  const isFirstWave = useRef(true);

  useLayoutEffect(() => {
    const container = tabContainerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector('[data-tab-active="true"]') as HTMLElement;
    if (!activeBtn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = activeBtn.getBoundingClientRect();
    setWavePos({ left: bRect.left - cRect.left, width: bRect.width });

    if (!isFirstWave.current) {
      setWaveActive(true);
      const t = setTimeout(() => setWaveActive(false), 600);
      return () => clearTimeout(t);
    }
    isFirstWave.current = false;
  }, [consoleView]);

  // Master channel object — memoized
  const masterChannel = useMemo<Channel>(() => ({
    id: 0, name: 'Master', type: 'line', icon: '🔊',
    volume: masterVolume, muted: masterMuted, solo: false,
    active: true, isLive: false, isVirtual: false,
    level: 0, pan: 0,
    gain: 50, phantom: false, hiZ: false, stereoLink: null,
    eq: { enabled: false, bands: [{ freq: 100, gain: 0, q: 1, enabled: true }, { freq: 500, gain: 0, q: 1, enabled: true }, { freq: 2000, gain: 0, q: 1, enabled: true }, { freq: 8000, gain: 0, q: 1, enabled: true }], hpf: { enabled: false, frequency: 80 }, lpf: { enabled: false, frequency: 18000 } },
    gate: { enabled: false, threshold: -40, attack: 5, hold: 50, release: 100, depth: 40 },
    compressor: { enabled: false, threshold: -10, ratio: 4, attack: 10, release: 100, gain: 0, knee: 0.5 },
    deesser: { enabled: false, frequency: 6000, threshold: -20, ratio: 3 },
    auxSends: Array.from({ length: 8 }, () => ({ level: 0, preFader: false })),
    fxSends: Array.from({ length: 4 }, () => ({ level: 0, preFader: false })),
    subgroup: null, vca: null, grMeter: 0, peakHold: 0,
  }), [masterVolume, masterMuted]);

  const masterMeter = masterMeterProp ?? {
    level: masterMuted ? 0 : masterVolume * 0.9,
    grMeter: 0,
    peakHold: 0,
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex flex-col border-b border-border bg-secondary/30">
        {/* Main tabs */}
        <div ref={tabContainerRef} className="relative flex items-center gap-0.5 px-2 py-1.5">
          {/* Sound wave indicator */}
          <div
            className="absolute wave-indicator"
            style={{
              left: 0,
              width: wavePos.width,
              height: 'calc(100% - 12px)',
              top: '6px',
              background: waveColor,
              color: waveColor,
              transform: `translateX(${wavePos.left}px)`,
              transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1), width 400ms cubic-bezier(0.4, 0, 0.2, 1), background-color 500ms ease',
              willChange: 'transform, width',
              zIndex: 0,
            }}
          >
            <div className="wave-bars" style={{ opacity: waveActive ? 0.3 : 0, transition: 'opacity 200ms ease' }}>
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className="wave-bar"
                  style={{
                    '--wave-delay': `${i * 0.12}s`,
                    '--wave-speed': `${1.5 + Math.sin(i * 0.7) * 0.5}s`,
                    '--wave-min': '0.15',
                    '--wave-max': `${0.5 + (i % 3) * 0.2}`,
                    animationPlayState: waveActive ? 'running' : 'paused',
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </div>

          {/* MIX/GAIN toggle */}
          <button
            data-tab-active={isMixGain}
            onClick={() => onConsoleViewChange(consoleView === 'mix' ? 'gain' : consoleView === 'gain' ? 'mix' : 'mix')}
            className="relative z-10 text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-1 rounded whitespace-nowrap transition-colors duration-400"
            style={{ color: consoleView === 'gain' ? '#fca5a5' : isMixGain ? '#fff' : 'hsl(215 20% 55%)' }}
          >
            <span style={{ opacity: consoleView === 'gain' ? 0.5 : 1, transition: 'opacity 400ms' }}>MIX</span>
            <span style={{ opacity: 0.3, margin: '0 2px' }}>/</span>
            <span style={{ opacity: consoleView === 'gain' ? 1 : 0.5, transition: 'opacity 400ms' }}>GAIN</span>
          </button>

          {/* AUX SENDS toggle */}
          <button
            data-tab-active={isAux}
            onClick={() => onConsoleViewChange(isAux ? (consoleView === 'aux8' ? 'aux1' : `aux${parseInt(consoleView.replace('aux', '')) + 1}` as ConsoleViewMode) : 'aux1')}
            className="relative z-10 text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-1 rounded whitespace-nowrap transition-colors duration-400"
            style={{ color: isAux ? '#1a1a1a' : 'hsl(215 20% 55%)' }}
          >
            AUX SENDS
          </button>

          {/* FX toggle */}
          <button
            data-tab-active={isFx}
            onClick={() => onConsoleViewChange(isFx ? (consoleView === 'fx4' ? 'fx1' : `fx${parseInt(consoleView.replace('fx', '')) + 1}` as ConsoleViewMode) : 'fx1')}
            className="relative z-10 text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-1 rounded whitespace-nowrap transition-colors duration-400"
            style={{ color: isFx ? '#c0d0ff' : 'hsl(215 20% 55%)' }}
          >
            FX
          </button>
        </div>

      </div>

      {/* View label + sub-tabs + zoom control */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-border/50 bg-secondary/20">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-muted-foreground">
            {consoleView === 'mix' ? 'MAIN MIX — Volume Faders' :
             consoleView === 'gain' ? 'INPUT GAIN — Pre-Amp Level' :
             ''}
          </span>

          {/* AUX sub-tabs inline (yellow) */}
          {isAux && (
            <div className="flex items-center gap-0.5 ml-1">
              {AUX_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => onConsoleViewChange(tab.value)}
                  className={cn(
                    'text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors whitespace-nowrap',
                    consoleView === tab.value
                      ? 'bg-yellow-600/80 text-yellow-100'
                      : 'bg-secondary/40 text-muted-foreground/70 hover:text-yellow-300 hover:bg-yellow-900/30'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* FX sub-tabs inline (navy/blue) */}
          {isFx && (
            <div className="flex items-center gap-0.5 ml-1">
              {FX_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => onConsoleViewChange(tab.value)}
                  className={cn(
                    'text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors whitespace-nowrap',
                    consoleView === tab.value
                      ? 'bg-blue-800/80 text-blue-200'
                      : 'bg-secondary/40 text-muted-foreground/70 hover:text-blue-300 hover:bg-blue-900/30'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setChannelZoom(z => Math.max(0.8, +(z - 0.1).toFixed(1)))}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[9px] font-mono text-muted-foreground w-8 text-center">{Math.round(channelZoom * 100)}%</span>
          <button
            onClick={() => setChannelZoom(z => Math.min(2, +(z + 0.1).toFixed(1)))}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable strip area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Channels — scrollable with drag-to-scroll */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin select-none"
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <div style={{ width: `${channelZoom * 100}%`, height: '100%' }}>
            <div
              className="flex"
              style={{
                transform: `scale(${channelZoom})`,
                transformOrigin: 'top left',
                width: `${100 / channelZoom}%`,
                height: `${100 / channelZoom}%`,
              }}
            >
              {channels.map((channel, i) => (
                <ChannelStrip
                  key={channel.id}
                  channel={channel}
                  meter={meters?.[i]}
                  displayValue={getStripValue(channel, consoleView)}
                  viewMode={consoleView}
                  onValueChange={(v) => handleStripChange(channel.id, v)}
                  onMuteToggle={() => handleMuteToggle(channel.id)}
                  onSoloToggle={() => handleSoloToggle(channel.id)}
                  onEditClick={() => handleEditClick(channel.id)}
                  onPanChange={(pan) => handlePanChange(channel.id, pan)}
                  onNameChange={(name) => onNameChange(channel.id, name)}
                  onStereoLink={() => onStereoLink?.(channel.id)}
                  zoom={channelZoom}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Master strip — fixed right */}
        <div className="flex-shrink-0 w-[100px] h-full">
          <ChannelStrip
            channel={masterChannel}
            meter={masterMeter}
            displayValue={masterVolume}
            viewMode="mix"
            onValueChange={onMasterVolumeChange}
            onMuteToggle={onMuteAll}
            onSoloToggle={NOOP}
            onEditClick={NOOP}
            onPanChange={NOOP}
            isMaster
          />
        </div>
      </div>

      {/* Mini meter overview */}
      <div className="flex items-end gap-px px-2 py-1 border-t border-border bg-secondary/20 h-8">
        {channels.map((ch, i) => {
          const m = meters?.[i];
          return (
            <div key={ch.id} className="flex-1 max-w-[12px] flex flex-col-reverse">
              <div
                className={cn(
                  'rounded-[1px] transition-all duration-75',
                  ch.active && !ch.muted ? 'bg-accent' : 'bg-secondary/40'
                )}
                style={{ height: `${((m?.level ?? ch.level) / 100) * 20}px` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
