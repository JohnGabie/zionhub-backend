import { EQSettings, EQBand } from '@/types/mixer';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface EQEditorProps {
  eq: EQSettings;
  onChange: (eq: EQSettings) => void;
}

const BAND_COLORS = ['text-sc-red', 'text-sc-yellow', 'text-sc-green', 'text-sc-blue'];
const BAND_BG = ['bg-sc-red/20', 'bg-sc-yellow/20', 'bg-sc-green/20', 'bg-sc-blue/20'];

function freqLabel(f: number): string {
  return f >= 1000 ? `${(f / 1000).toFixed(1)}k` : `${f}`;
}

export function EQEditor({ eq, onChange }: EQEditorProps) {
  const toggleEnabled = () => onChange({ ...eq, enabled: !eq.enabled });

  const updateBand = (idx: number, update: Partial<EQBand>) => {
    const bands = [...eq.bands] as [EQBand, EQBand, EQBand, EQBand];
    bands[idx] = { ...bands[idx], ...update };
    onChange({ ...eq, bands });
  };

  // Simple EQ curve SVG
  const svgW = 380, svgH = 120;
  const curvePoints = () => {
    const pts: string[] = [];
    for (let x = 0; x <= svgW; x += 2) {
      const freq = 20 * Math.pow(22000 / 20, x / svgW);
      let totalGain = 0;
      eq.bands.forEach((band) => {
        if (!band.enabled) return;
        const logDist = Math.log2(freq / band.freq);
        const response = band.gain * Math.exp(-0.5 * Math.pow(logDist * band.q * 2, 2));
        totalGain += response;
      });
      const y = svgH / 2 - (totalGain / 20) * (svgH / 2);
      pts.push(`${x},${Math.max(2, Math.min(svgH - 2, y))}`);
    }
    return pts.join(' ');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">PARAMETRIC EQ</span>
        <button
          onClick={toggleEnabled}
          className={cn(
            'text-[10px] font-bold px-3 py-1 rounded transition-colors',
            eq.enabled ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
          )}
        >
          {eq.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* EQ Curve visualization */}
      <div className="bg-secondary/30 rounded-lg p-2 border border-border/50">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-24">
          {/* Grid lines */}
          <line x1="0" y1={svgH / 2} x2={svgW} y2={svgH / 2} stroke="hsl(var(--border))" strokeWidth="0.5" />
          <line x1="0" y1={svgH / 4} x2={svgW} y2={svgH / 4} stroke="hsl(var(--border))" strokeWidth="0.3" strokeDasharray="4,4" />
          <line x1="0" y1={svgH * 3 / 4} x2={svgW} y2={svgH * 3 / 4} stroke="hsl(var(--border))" strokeWidth="0.3" strokeDasharray="4,4" />
          {/* Curve */}
          {eq.enabled && (
            <polyline
              points={curvePoints()}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {/* Band markers */}
          {eq.bands.map((band, i) => {
            const x = (Math.log2(band.freq / 20) / Math.log2(22000 / 20)) * svgW;
            const y = svgH / 2 - (band.gain / 20) * (svgH / 2);
            const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'];
            return band.enabled ? (
              <circle key={i} cx={x} cy={y} r="5" fill={colors[i]} opacity={eq.enabled ? 0.9 : 0.3} />
            ) : null;
          })}
        </svg>
      </div>

      {/* HPF / LPF */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-muted-foreground">HPF</span>
            <button
              onClick={() => onChange({ ...eq, hpf: { ...eq.hpf, enabled: !eq.hpf.enabled } })}
              className={cn('text-[8px] px-1.5 py-0.5 rounded', eq.hpf.enabled ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground')}
            >
              {eq.hpf.enabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <Slider value={[eq.hpf.frequency]} onValueChange={([v]) => onChange({ ...eq, hpf: { ...eq.hpf, frequency: v } })} min={20} max={500} step={5} />
          <span className="text-[9px] text-muted-foreground">{eq.hpf.frequency} Hz</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-muted-foreground">LPF</span>
            <button
              onClick={() => onChange({ ...eq, lpf: { ...eq.lpf, enabled: !eq.lpf.enabled } })}
              className={cn('text-[8px] px-1.5 py-0.5 rounded', eq.lpf.enabled ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground')}
            >
              {eq.lpf.enabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <Slider value={[eq.lpf.frequency]} onValueChange={([v]) => onChange({ ...eq, lpf: { ...eq.lpf, frequency: v } })} min={2000} max={20000} step={100} />
          <span className="text-[9px] text-muted-foreground">{freqLabel(eq.lpf.frequency)} Hz</span>
        </div>
      </div>

      {/* 4 Bands */}
      <div className="space-y-3">
        {eq.bands.map((band, i) => (
          <div key={i} className={cn('rounded-lg p-3 border border-border/30', BAND_BG[i])}>
            <div className="flex items-center justify-between mb-2">
              <span className={cn('text-[10px] font-bold', BAND_COLORS[i])}>BAND {i + 1}</span>
              <button
                onClick={() => updateBand(i, { enabled: !band.enabled })}
                className={cn('text-[8px] px-1.5 py-0.5 rounded', band.enabled ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground')}
              >
                {band.enabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <span className="text-[8px] text-muted-foreground">FREQ</span>
                <Slider value={[band.freq]} onValueChange={([v]) => updateBand(i, { freq: v })} min={20} max={22000} step={10} />
                <span className="text-[9px] font-mono text-foreground">{freqLabel(band.freq)} Hz</span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] text-muted-foreground">GAIN</span>
                <Slider value={[band.gain]} onValueChange={([v]) => updateBand(i, { gain: v })} min={-20} max={20} step={0.5} />
                <span className="text-[9px] font-mono text-foreground">{band.gain > 0 ? '+' : ''}{band.gain} dB</span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] text-muted-foreground">Q</span>
                <Slider value={[band.q]} onValueChange={([v]) => updateBand(i, { q: v })} min={0.05} max={15} step={0.05} />
                <span className="text-[9px] font-mono text-foreground">{band.q.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
