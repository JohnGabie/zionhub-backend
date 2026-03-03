import { AuxSend } from '@/types/mixer';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface AuxSendsEditorProps {
  sends: AuxSend[];
  onChange: (auxIndex: number, level: number) => void;
}

export function AuxSendsEditor({ sends, onChange }: AuxSendsEditorProps) {
  return (
    <div className="space-y-4">
      <span className="text-xs font-bold text-foreground">AUX SENDS</span>
      <div className="space-y-3">
        {sends.map((send, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-muted-foreground w-10">AUX {i + 1}</span>
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
