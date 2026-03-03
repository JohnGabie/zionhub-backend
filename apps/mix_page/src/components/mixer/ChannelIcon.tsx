import { Mic, Guitar, Music, Radio, Sparkles, Piano, Drum, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  '🎤': Mic,
  '🎙️': Mic,
  '🎸': Guitar,
  '🎹': Piano,
  '🎵': Music,
  '🎶': Music,
  '🥁': Drum,
  '📻': Radio,
  '✨': Sparkles,
  '🔊': Volume2,
};

interface ChannelIconProps {
  emoji: string;
  size?: number;
  className?: string;
}

export function ChannelIcon({ emoji, size = 16, className }: ChannelIconProps) {
  const Icon = ICON_MAP[emoji];
  if (Icon) return <Icon size={size} className={cn('shrink-0', className)} />;
  return <span className={className} style={{ fontSize: size }}>{emoji}</span>;
}
