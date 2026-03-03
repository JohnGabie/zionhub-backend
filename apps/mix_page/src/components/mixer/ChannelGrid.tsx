import { Channel, ConsoleViewMode } from '@/types/mixer';
import { ChannelCard } from './ChannelCard';
import { MixerConsole } from './MixerConsole';

interface ChannelGridProps {
  channels: Channel[];
  meters?: { level: number; grMeter: number; peakHold: number }[];
  masterMeter?: { level: number; grMeter: number; peakHold: number };
  mode: 'basic' | 'advanced';
  consoleView: ConsoleViewMode;
  onVolumeChange: (channelId: number, volume: number) => void;
  onMuteToggle: (channelId: number) => void;
  onSoloToggle: (channelId: number) => void;
  onActiveToggle: (channelId: number) => void;
  onNameChange: (channelId: number, name: string) => void;
  onIconChange: (channelId: number, icon: string) => void;
  masterVolume?: number;
  masterMuted?: boolean;
  onMasterVolumeChange?: (volume: number) => void;
  onMuteAll?: () => void;
  onConsoleViewChange: (view: ConsoleViewMode) => void;
  onAuxSendChange: (channelId: number, auxIndex: number, level: number) => void;
  onFXSendChange: (channelId: number, fxIndex: number, level: number) => void;
  onGainChange: (channelId: number, gain: number) => void;
  onPanChange: (channelId: number, pan: number) => void;
  onStereoLink?: (channelId: number) => void;
  onEditChannel: (channelId: number) => void;
}

export function ChannelGrid({
  channels,
  meters,
  masterMeter,
  mode,
  consoleView,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onActiveToggle,
  onNameChange,
  onIconChange,
  masterVolume = 85,
  masterMuted = false,
  onMasterVolumeChange,
  onMuteAll,
  onConsoleViewChange,
  onAuxSendChange,
  onFXSendChange,
  onGainChange,
  onPanChange,
  onStereoLink,
  onEditChannel,
}: ChannelGridProps) {
  if (mode === 'advanced') {
    return (
      <MixerConsole
        channels={channels}
        meters={meters}
        masterMeter={masterMeter}
        masterVolume={masterVolume}
        masterMuted={masterMuted}
        consoleView={consoleView}
        onVolumeChange={onVolumeChange}
        onMuteToggle={onMuteToggle}
        onSoloToggle={onSoloToggle}
        onMasterVolumeChange={onMasterVolumeChange ?? (() => {})}
        onMuteAll={onMuteAll ?? (() => {})}
        onConsoleViewChange={onConsoleViewChange}
        onAuxSendChange={onAuxSendChange}
        onFXSendChange={onFXSendChange}
        onGainChange={onGainChange}
        onPanChange={onPanChange}
        onNameChange={onNameChange}
        onStereoLink={onStereoLink}
        onEditChannel={onEditChannel}
      />
    );
  }

  const displayChannels = channels.filter(ch => ch.active || ch.id <= 12).slice(0, 12);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6 overflow-auto scrollbar-thin">
      {displayChannels.map((channel) => (
        <ChannelCard
          key={channel.id}
          channel={channel}
          mode={mode}
          onVolumeChange={(volume) => onVolumeChange(channel.id, volume)}
          onMuteToggle={() => onMuteToggle(channel.id)}
          onSoloToggle={() => onSoloToggle(channel.id)}
          onActiveToggle={() => onActiveToggle(channel.id)}
          onNameChange={(name) => onNameChange(channel.id, name)}
          onIconChange={(icon) => onIconChange(channel.id, icon)}
        />
      ))}
    </div>
  );
}
