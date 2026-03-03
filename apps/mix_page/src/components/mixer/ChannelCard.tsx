import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Channel } from '@/types/mixer';
import { Volume2, VolumeX, Headphones, Edit3, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmojiPicker } from './EmojiPicker';

interface ChannelCardProps {
  channel: Channel;
  mode: 'basic' | 'advanced';
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onActiveToggle: () => void;
  onNameChange: (name: string) => void;
  onIconChange?: (icon: string) => void;
}

function LevelMeter({ level, isActive }: { level: number; isActive: boolean }) {
  const getColor = (segmentLevel: number) => {
    if (!isActive) return 'bg-muted';
    if (segmentLevel > 85) return 'bg-sc-red';
    if (segmentLevel > 60) return 'bg-sc-yellow';
    return 'bg-accent';
  };

  const segments = 10;
  const activeSegments = Math.floor((level / 100) * segments);

  return (
    <div className="flex flex-col-reverse gap-0.5 h-24">
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-2 h-2 rounded-sm transition-colors',
            i < activeSegments ? getColor((i / segments) * 100) : 'bg-secondary'
          )}
        />
      ))}
    </div>
  );
}

export function ChannelCard({
  channel,
  mode,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onActiveToggle,
  onNameChange,
  onIconChange,
}: ChannelCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(channel.name);

  const handleSaveName = () => {
    onNameChange(editName);
    setIsEditing(false);
  };

  const isActive = channel.active && !channel.muted;

  return (
    <Card 
      className={cn(
        'p-4 bg-card border-border transition-all duration-200 hover:border-primary/50',
        isActive && 'border-primary/30 glow-blue',
        channel.muted && 'opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <EmojiPicker currentEmoji={channel.icon} onSelect={(emoji) => onIconChange?.(emoji)}>
            <button className="text-2xl hover:scale-110 transition-transform cursor-pointer">
              {channel.icon}
            </button>
          </EmojiPicker>
          <div className="flex flex-col">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-6 w-24 text-sm px-1"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveName}>
                  <Check className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <span className="font-medium text-foreground">{channel.name}</span>
            )}
            <span className="text-xs text-muted-foreground">Ch {channel.id}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {channel.isLive && (
            <Badge className="bg-sc-red text-white animate-pulse-live text-xs px-2 py-0.5">
              <span className="w-2 h-2 rounded-full bg-white inline-block" /> LIVE
            </Badge>
          )}
          {channel.isVirtual && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              Virtual
            </Badge>
          )}
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">
          {channel.active ? 'Ligado' : 'Desligado'}
        </span>
        <Switch
          checked={channel.active}
          onCheckedChange={onActiveToggle}
          className="data-[state=checked]:bg-accent"
        />
      </div>

      {/* Volume and Level */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Volume</span>
            <span className="text-sm font-medium text-foreground">{channel.volume}%</span>
          </div>
          <Slider
            value={[channel.volume]}
            onValueChange={([v]) => onVolumeChange(v)}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
        <LevelMeter level={channel.level} isActive={isActive} />
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={channel.muted ? 'destructive' : 'secondary'}
          onClick={onMuteToggle}
          className="flex-1 gap-1"
        >
          {channel.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          M
        </Button>
        
        {mode === 'advanced' && (
          <>
            <Button
              size="sm"
              variant={channel.solo ? 'default' : 'secondary'}
              onClick={onSoloToggle}
              className="flex-1 gap-1"
            >
              <Headphones className="w-4 h-4" />
              S
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsEditing(true)}
              className="flex-1 gap-1"
            >
              <Edit3 className="w-4 h-4" />
              E
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
