import { FXSend } from '@/types/mixer';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

const FX_NAMES = ['Reverb 1', 'Reverb 2', 'Delay', 'Chorus'];

interface FXSendsEditorProps {
  sends: FXSend[];
  onChange: (fxIndex: number, level: number) => void;
}

export function FXSendsEditor({ sends, onChange }: FXSendsEditorProps) {
  return (
    <div className="space-y-4">
      <span className="text-xs font-bold text-foreground">FX SENDS</span>
      <div className="space-y-3">
        {sends.map((send, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-16">
              <span className="text-[10px] font-bold text-muted-foreground">FX {i + 1}</span>
              <span className="text-[8px] text-muted-foreground/60 block">{FX_NAMES[i]}</span>
            </div>
            <div className="flex-1">
              <Slider
                value={[send.level]}
                onValueChange={([v]) => onChange(i, v)}
                max={100}
                step={1}
              />
            </div>
            <span className="text-[10px] font-mono text-foreground w-8 text-right">{send.level}</span>
            <span className={cn(
              'text-[8px] px-1.5 py-0.5 rounded',
              send.preFader ? 'bg-sc-yellow/20 text-sc-yellow' : 'bg-secondary text-muted-foreground'
            )}>
              {send.preFader ? 'PRE' : 'POST'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
