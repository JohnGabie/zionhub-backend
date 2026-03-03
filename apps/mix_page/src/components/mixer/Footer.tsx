import { Circle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FooterProps {
  isRecording: boolean;
  recordingTime: number;
  onToggleRecording: () => void;
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function Footer({ isRecording, recordingTime, onToggleRecording }: FooterProps) {
  return (
    <footer className="flex items-center justify-between px-3 py-2 md:px-6 md:py-3 border-t border-border bg-card">
      {/* Recording Status */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleRecording}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary hover:bg-muted transition-colors"
        >
          <Circle 
            className={cn(
              'w-3 h-3',
              isRecording ? 'fill-sc-red text-sc-red animate-pulse' : 'fill-muted-foreground text-muted-foreground'
            )} 
          />
          <span className="text-sm text-foreground">
            {isRecording ? 'Gravando' : 'Parado'}
          </span>
        </button>
        
        {isRecording && (
          <span className="text-sm font-mono text-muted-foreground">
            {formatTime(recordingTime)}
          </span>
        )}
      </div>

      {/* Advanced Link */}
      <Button variant="ghost" size="sm" className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground">
        <ExternalLink className="w-4 h-4" />
        Abrir mesa completa (avançado)
      </Button>
    </footer>
  );
}
