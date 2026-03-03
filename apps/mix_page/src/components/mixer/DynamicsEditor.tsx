import { GateSettings, CompressorSettings, DeesserSettings } from '@/types/mixer';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface DynamicsEditorProps {
  type: 'gate' | 'comp' | 'deesser';
  gate: GateSettings;
  compressor: CompressorSettings;
  deesser?: DeesserSettings;
  onGateChange: (gate: GateSettings) => void;
  onCompressorChange: (comp: CompressorSettings) => void;
  onDeesserChange?: (de: DeesserSettings) => void;
}

function ParamRow({ label, value, displayValue, min, max, step, onChange }: {
  label: string; value: number; displayValue: string; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[9px] font-bold text-muted-foreground">{label}</span>
        <span className="text-[9px] font-mono text-foreground">{displayValue}</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} />
    </div>
  );
}

export function DynamicsEditor({ type, gate, compressor, deesser, onGateChange, onCompressorChange, onDeesserChange }: DynamicsEditorProps) {
  if (type === 'gate') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">NOISE GATE</span>
          <button
            onClick={() => onGateChange({ ...gate, enabled: !gate.enabled })}
            className={cn('text-[10px] font-bold px-3 py-1 rounded', gate.enabled ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground')}
          >
            {gate.enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Simple gate curve */}
        <div className="bg-secondary/30 rounded-lg p-2 border border-border/50">
          <svg viewBox="0 0 200 80" className="w-full h-16">
            <line x1="0" y1="40" x2="200" y2="40" stroke="hsl(var(--border))" strokeWidth="0.5" />
            {gate.enabled && (
              <>
                <line x1="0" y1="70" x2={100 + gate.threshold} y2="70" stroke="hsl(var(--sc-green))" strokeWidth="2" />
                <line x1={100 + gate.threshold} y1="70" x2={105 + gate.threshold} y2="10" stroke="hsl(var(--sc-green))" strokeWidth="2" />
                <line x1={105 + gate.threshold} y1="10" x2="200" y2="10" stroke="hsl(var(--sc-green))" strokeWidth="2" />
              </>
            )}
          </svg>
        </div>

        <div className="space-y-3">
          <ParamRow label="THRESHOLD" value={gate.threshold} displayValue={`${gate.threshold} dB`} min={-80} max={0} step={1} onChange={(v) => onGateChange({ ...gate, threshold: v })} />
          <ParamRow label="ATTACK" value={gate.attack} displayValue={`${gate.attack} ms`} min={1} max={100} step={1} onChange={(v) => onGateChange({ ...gate, attack: v })} />
          <ParamRow label="HOLD" value={gate.hold} displayValue={`${gate.hold} ms`} min={10} max={2000} step={10} onChange={(v) => onGateChange({ ...gate, hold: v })} />
          <ParamRow label="RELEASE" value={gate.release} displayValue={`${gate.release} ms`} min={10} max={4000} step={10} onChange={(v) => onGateChange({ ...gate, release: v })} />
          <ParamRow label="DEPTH" value={gate.depth} displayValue={`${gate.depth} dB`} min={0} max={80} step={1} onChange={(v) => onGateChange({ ...gate, depth: v })} />
        </div>
      </div>
    );
  }

  if (type === 'comp') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">COMPRESSOR</span>
          <button
            onClick={() => onCompressorChange({ ...compressor, enabled: !compressor.enabled })}
            className={cn('text-[10px] font-bold px-3 py-1 rounded', compressor.enabled ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground')}
          >
            {compressor.enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Compression curve */}
        <div className="bg-secondary/30 rounded-lg p-2 border border-border/50">
          <svg viewBox="0 0 200 200" className="w-full h-32">
            <line x1="0" y1="200" x2="200" y2="0" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4,4" />
            {compressor.enabled && (() => {
              const th = ((compressor.threshold + 40) / 60) * 200;
              const ratio = compressor.ratio >= 100 ? Infinity : compressor.ratio;
              const endY = ratio === Infinity ? 200 - th : 200 - th - (200 - th) / ratio;
              return (
                <>
                  <line x1="0" y1="200" x2={th} y2={200 - th} stroke="hsl(var(--sc-blue))" strokeWidth="2" />
                  <line x1={th} y1={200 - th} x2="200" y2={Math.max(0, endY)} stroke="hsl(var(--sc-blue))" strokeWidth="2" />
                  <circle cx={th} cy={200 - th} r="3" fill="hsl(var(--sc-blue))" />
                </>
              );
            })()}
          </svg>
        </div>

        <div className="space-y-3">
          <ParamRow label="THRESHOLD" value={compressor.threshold} displayValue={`${compressor.threshold} dB`} min={-40} max={20} step={1} onChange={(v) => onCompressorChange({ ...compressor, threshold: v })} />
          <ParamRow label="RATIO" value={compressor.ratio} displayValue={compressor.ratio >= 100 ? '∞:1' : `${compressor.ratio}:1`} min={1} max={100} step={0.5} onChange={(v) => onCompressorChange({ ...compressor, ratio: v })} />
          <ParamRow label="ATTACK" value={compressor.attack} displayValue={`${compressor.attack} ms`} min={1} max={200} step={1} onChange={(v) => onCompressorChange({ ...compressor, attack: v })} />
          <ParamRow label="RELEASE" value={compressor.release} displayValue={`${compressor.release} ms`} min={10} max={5000} step={10} onChange={(v) => onCompressorChange({ ...compressor, release: v })} />
          <ParamRow label="MAKEUP GAIN" value={compressor.gain} displayValue={`+${compressor.gain} dB`} min={0} max={40} step={1} onChange={(v) => onCompressorChange({ ...compressor, gain: v })} />
          <ParamRow label="KNEE" value={compressor.knee} displayValue={compressor.knee < 0.3 ? 'Hard' : compressor.knee > 0.7 ? 'Soft' : 'Medium'} min={0} max={1} step={0.05} onChange={(v) => onCompressorChange({ ...compressor, knee: v })} />
        </div>
      </div>
    );
  }

  // De-esser
  if (type === 'deesser' && deesser && onDeesserChange) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">DE-ESSER</span>
          <button
            onClick={() => onDeesserChange({ ...deesser, enabled: !deesser.enabled })}
            className={cn('text-[10px] font-bold px-3 py-1 rounded', deesser.enabled ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground')}
          >
            {deesser.enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="space-y-3">
          <ParamRow label="FREQUENCY" value={deesser.frequency} displayValue={`${(deesser.frequency / 1000).toFixed(1)}k Hz`} min={2000} max={12000} step={100} onChange={(v) => onDeesserChange({ ...deesser, frequency: v })} />
          <ParamRow label="THRESHOLD" value={deesser.threshold} displayValue={`${deesser.threshold} dB`} min={-40} max={0} step={1} onChange={(v) => onDeesserChange({ ...deesser, threshold: v })} />
          <ParamRow label="RATIO" value={deesser.ratio} displayValue={`${deesser.ratio}:1`} min={1} max={10} step={0.5} onChange={(v) => onDeesserChange({ ...deesser, ratio: v })} />
        </div>
      </div>
    );
  }

  return null;
}
