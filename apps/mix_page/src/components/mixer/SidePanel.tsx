import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Preset, PlaybackState } from '@/types/mixer';
import { AlertTriangle, SkipBack, Play, Pause, SkipForward, Volume2, Save, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidePanelProps {
  className?: string;
  masterVolume: number;
  masterMuted: boolean;
  presets: Preset[];
  activePreset: string | null;
  playback: PlaybackState;
  onMasterVolumeChange: (volume: number) => void;
  onMuteAll: () => void;
  onPresetLoad: (presetId: string) => void;
  onPresetSave: (name: string) => void;
  onPlayToggle: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SidePanel({
  className,
  masterVolume,
  masterMuted,
  presets,
  activePreset,
  playback,
  onMasterVolumeChange,
  onMuteAll,
  onPresetLoad,
  onPlayToggle,
  onNextTrack,
  onPrevTrack,
}: SidePanelProps) {
  return (
    <aside className={cn("w-72 border-l border-border bg-card p-4 flex flex-col gap-4 overflow-y-auto scrollbar-thin", className)}>
      {/* Master Control */}
      <Card className="p-4 bg-secondary border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          Controle Rápido
        </h3>
        
        {/* Master Fader */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <span className="text-3xl font-bold text-foreground">{masterVolume}%</span>
          <span className="text-xs text-muted-foreground">Master Volume</span>
          <Slider
            value={[masterVolume]}
            onValueChange={([v]) => onMasterVolumeChange(v)}
            max={100}
            step={1}
            className="w-full mt-2"
          />
        </div>

        {/* Emergency Mute */}
        <Button
          variant="destructive"
          onClick={onMuteAll}
          className={cn(
            'w-full gap-2 font-bold',
            masterMuted && 'glow-red animate-pulse'
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          MUTE GERAL
        </Button>
      </Card>

      {/* Presets */}
      <Card className="p-4 bg-secondary border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Save className="w-4 h-4 text-primary" />
          Presets Rápidos
        </h3>
        <div className="flex flex-col gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.id}
              variant={activePreset === preset.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPresetLoad(preset.id)}
              className={cn(
                'justify-start',
                activePreset === preset.id && 'bg-primary text-primary-foreground'
              )}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </Card>

      {/* Playback */}
      <Card className="p-4 bg-secondary border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Music className="w-4 h-4 text-primary" />
          Playback Ativo
        </h3>
        
        <div className="mb-3">
          <p className="font-medium text-foreground truncate">{playback.currentTrack}</p>
          <p className="text-xs text-muted-foreground">{playback.artist}</p>
        </div>

        <div className="mb-3">
          <Progress value={(playback.progress / playback.duration) * 100} className="h-1.5" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatTime(playback.progress)}</span>
            <span>{formatTime(playback.duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button size="icon" variant="ghost" onClick={onPrevTrack}>
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="default" onClick={onPlayToggle} className="h-10 w-10">
            {playback.isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>
          <Button size="icon" variant="ghost" onClick={onNextTrack}>
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </aside>
  );
}
