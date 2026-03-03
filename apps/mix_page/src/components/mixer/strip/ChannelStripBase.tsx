import React, { useRef, useCallback, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Channel, ConsoleViewMode, ChannelType } from '@/types/mixer';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

/* ─── Types ────────────────────────────────────────────────── */

export interface ChannelStripProps {
  channel: Channel;
  meter?: { level: number; grMeter: number; peakHold: number };
  displayValue: number;
  viewMode: ConsoleViewMode;
  onValueChange: (value: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onEditClick: () => void;
  onPanChange: (pan: number) => void;
  onNameChange?: (name: string) => void;
  onStereoLink?: () => void;
  isMaster?: boolean;
  zoom?: number;
}

export interface StripBaseData {
  mLevel: number;
  mPeakHold: number;
  mGrMeter: number;
  isActive: boolean;
  db: string;
  typeColor: string;
  capScale: number;
  isPanDragging: boolean;
  setIsPanDragging: (v: boolean) => void;
  panText: string | null;
  ctxMenu: { x: number; y: number } | null;
  closeCtx: () => void;
  handleContextMenu: (e: React.MouseEvent) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent) => void;
}

/* ─── Fader Curves ─────────────────────────────────────────── */

export const GAP_END = 4.7;

export const FADER_CURVE = [
  { pos: 4.7,  db: -60 },
  { pos: 16.6, db: -40 },
  { pos: 28.5, db: -26 },
  { pos: 40.4, db: -16 },
  { pos: 52.3, db: -9  },
  { pos: 64.2, db: -1  },
  { pos: 76.1, db: 4.3 },
  { pos: 88.1, db: 7.8 },
  { pos: 100,  db: 10  },
];

export function positionToDb(pos: number): number {
  if (pos < GAP_END) return -Infinity;
  if (pos >= 100) return FADER_CURVE[FADER_CURVE.length - 1].db;
  for (let i = 1; i < FADER_CURVE.length; i++) {
    if (pos <= FADER_CURVE[i].pos) {
      const prev = FADER_CURVE[i - 1];
      const curr = FADER_CURVE[i];
      const t = (pos - prev.pos) / (curr.pos - prev.pos);
      return prev.db + t * (curr.db - prev.db);
    }
  }
  return FADER_CURVE[FADER_CURVE.length - 1].db;
}

export function dbToPosition(db: number): number {
  if (db <= FADER_CURVE[0].db) return FADER_CURVE[0].pos;
  if (db >= FADER_CURVE[FADER_CURVE.length - 1].db) return 100;
  for (let i = 1; i < FADER_CURVE.length; i++) {
    if (db <= FADER_CURVE[i].db) {
      const prev = FADER_CURVE[i - 1];
      const curr = FADER_CURVE[i];
      const t = (db - prev.db) / (curr.db - prev.db);
      return prev.pos + t * (curr.pos - prev.pos);
    }
  }
  return 100;
}

export function volumeToDb(volume: number): string {
  if (volume === 0) return '-∞';
  const db = positionToDb(volume);
  if (!isFinite(db) || db <= -100) return '-∞';
  if (db > 0) return `+${db.toFixed(1)}`;
  return db.toFixed(1);
}

export const DB_MARKS = [
  { label: -80 }, { label: -70 }, { label: -60 },
  { label: -50 }, { label: -40 }, { label: -24 },
  { label: -12 }, { label: -6 },  { label: 0 },
].map((m, i) => ({
  label: m.label,
  pos: FADER_CURVE[i].pos,
  actualDb: FADER_CURVE[i].db,
}));

/* ─── Gain Fader Curve ─────────────────────────────────────── */

export const GAIN_FADER_CURVE = [
  { pos: 0,    db: -6 },
  { pos: 9.4,  db: -2 },
  { pos: 23,   db: 6 },
  { pos: 36.5, db: 16 },
  { pos: 49.4, db: 24 },
  { pos: 62.9, db: 38 },
  { pos: 76.3, db: 49 },
  { pos: 100,  db: 57 },
];

export function positionToGainDb(pos: number): number {
  if (pos <= 0) return GAIN_FADER_CURVE[0].db;
  if (pos >= 100) return GAIN_FADER_CURVE[GAIN_FADER_CURVE.length - 1].db;
  for (let i = 1; i < GAIN_FADER_CURVE.length; i++) {
    if (pos <= GAIN_FADER_CURVE[i].pos) {
      const prev = GAIN_FADER_CURVE[i - 1];
      const curr = GAIN_FADER_CURVE[i];
      const t = (pos - prev.pos) / (curr.pos - prev.pos);
      return prev.db + t * (curr.db - prev.db);
    }
  }
  return GAIN_FADER_CURVE[GAIN_FADER_CURVE.length - 1].db;
}

export function gainDbToPosition(db: number): number {
  if (db <= GAIN_FADER_CURVE[0].db) return GAIN_FADER_CURVE[0].pos;
  if (db >= GAIN_FADER_CURVE[GAIN_FADER_CURVE.length - 1].db) return 100;
  for (let i = 1; i < GAIN_FADER_CURVE.length; i++) {
    if (db <= GAIN_FADER_CURVE[i].db) {
      const prev = GAIN_FADER_CURVE[i - 1];
      const curr = GAIN_FADER_CURVE[i];
      const t = (db - prev.db) / (curr.db - prev.db);
      return prev.pos + t * (curr.pos - prev.pos);
    }
  }
  return 100;
}

export function gainToDb(volume: number): string {
  const db = positionToGainDb(volume);
  if (db > 0) return `+${db.toFixed(1)}`;
  return db.toFixed(1);
}

export const GAIN_DB_MARKS = [
  { label: -6 }, { label: -2 }, { label: 6 },
  { label: 16 }, { label: 24 }, { label: 38 },
  { label: 49 }, { label: 57 },
].map((m, i) => ({
  label: m.label,
  pos: GAIN_FADER_CURVE[i].pos,
  actualDb: GAIN_FADER_CURVE[i].db,
}));

/* ─── Constants ────────────────────────────────────────────── */

export const TYPE_COLORS: Record<ChannelType, string> = {
  mic: 'text-sc-blue',
  instrument: 'text-purple-400',
  playback: 'text-sc-green',
  line: 'text-muted-foreground',
  fx: 'text-sc-yellow',
};

const METER_COLORS = {
  red: { bg: 'bg-sc-red', glow: '0 0 4px hsl(0 84% 60% / 0.5)' },
  yellow: { bg: 'bg-sc-yellow', glow: '0 0 4px hsl(45 100% 60% / 0.4)' },
  green: { bg: 'bg-accent', glow: '0 0 3px hsl(165 100% 43% / 0.4)' },
  peak: { bg: 'bg-sc-red', glow: '0 0 6px hsl(0 84% 60% / 0.7)' },
  off: { bg: 'bg-secondary/30', glow: undefined },
};

const GAIN_METER_COLORS = {
  hot: { bg: 'bg-red-500', glow: '0 0 6px hsl(0 84% 50% / 0.7)' },
  warm: { bg: 'bg-red-400', glow: '0 0 4px hsl(0 70% 55% / 0.5)' },
  mid: { bg: 'bg-orange-400', glow: '0 0 4px hsl(25 100% 55% / 0.4)' },
  low: { bg: 'bg-orange-300', glow: '0 0 3px hsl(30 100% 60% / 0.3)' },
  peak: { bg: 'bg-red-600', glow: '0 0 8px hsl(0 90% 45% / 0.8)' },
  off: { bg: 'bg-secondary/30', glow: undefined },
};

function getMeterSegmentStyle(segDb: number, isLit: boolean, isPeak: boolean, isGain = false) {
  if (isGain) {
    if (isPeak) return GAIN_METER_COLORS.peak;
    if (!isLit) return GAIN_METER_COLORS.off;
    if (segDb > -6) return GAIN_METER_COLORS.hot;
    if (segDb > -18) return GAIN_METER_COLORS.warm;
    if (segDb > -40) return GAIN_METER_COLORS.mid;
    return GAIN_METER_COLORS.low;
  }
  if (isPeak) return METER_COLORS.peak;
  if (!isLit) return METER_COLORS.off;
  if (segDb > -6) return METER_COLORS.red;
  if (segDb > -18) return METER_COLORS.yellow;
  return METER_COLORS.green;
}

/* ─── Meter Components ─────────────────────────────────────── */

export function VerticalMeter({ level, peakHold, isActive, style, isGain = false }: { level: number; peakHold: number; isActive: boolean; style?: React.CSSProperties; isGain?: boolean }) {
  const segments = 30;
  const activeSegments = Math.floor((level / 100) * segments);
  const peakSegment = Math.floor((peakHold / 100) * segments);

  return (
    <div
      className="flex flex-col-reverse gap-[1px] w-[4px]"
      style={{
        height: `${100 - GAP_END - 3}%`,
        alignSelf: 'flex-start',
        ...style,
      }}
    >
      {Array.from({ length: segments }).map((_, i) => {
        const segPos = GAP_END + (i / segments) * (100 - GAP_END);
        const segDb = positionToDb(segPos);
        const isPeak = i === peakSegment && isActive && peakHold > 5;
        const isLit = i < activeSegments && isActive;
        const segStyle = getMeterSegmentStyle(segDb, isLit, isPeak, isGain);
        return (
          <div
            key={i}
            className={cn('flex-1 min-h-[2px] rounded-[1px] transition-colors duration-75', segStyle.bg)}
            style={segStyle.glow ? { boxShadow: segStyle.glow } : undefined}
          />
        );
      })}
    </div>
  );
}

export function GRMeter({ grLevel }: { grLevel: number }) {
  const segments = 15;
  const active = Math.floor((grLevel / 100) * segments);

  return (
    <div className="flex flex-col gap-[1px] w-[5px]">
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-[5px] rounded-[1px] transition-colors duration-75',
            i < active ? 'bg-sc-orange' : 'bg-secondary/20'
          )}
          style={i < active ? { boxShadow: '0 0 3px hsl(25 100% 55% / 0.4)' } : undefined}
        />
      ))}
    </div>
  );
}

const GAIN_RETURN_SEGMENTS = [
  { label: '',   threshold: 15, color: 'bg-orange-300', glow: '0 0 3px hsl(30 100% 60% / 0.3)' },
  { label: '1',  threshold: 30, color: 'bg-orange-400', glow: '0 0 4px hsl(25 100% 55% / 0.4)' },
  { label: '5',  threshold: 50, color: 'bg-red-400',    glow: '0 0 4px hsl(0 70% 55% / 0.5)' },
  { label: '10', threshold: 70, color: 'bg-red-500',    glow: '0 0 6px hsl(0 84% 50% / 0.7)' },
  { label: '20', threshold: 85, color: 'bg-red-600',    glow: '0 0 8px hsl(0 90% 45% / 0.8)' },
];

export function GainReturnMeter({ level, isActive }: { level: number; isActive: boolean }) {
  return (
    <div className="flex flex-col gap-[2px]">
      {GAIN_RETURN_SEGMENTS.map((seg, i) => {
        const lit = isActive && level > seg.threshold;
        return (
          <div key={i} className="flex items-center gap-[2px]">
            <div
              className={cn(
                'w-[5px] h-[5px] rounded-[1px] transition-colors duration-75',
                lit ? seg.color : 'bg-secondary/20'
              )}
              style={lit ? { boxShadow: seg.glow } : undefined}
            />
            {seg.label && (
              <span className="text-[5px] font-mono text-white/40 leading-none w-[8px]">{seg.label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PeakDot({ isPeaking }: { isPeaking: boolean }) {
  return (
    <div
      className={cn(
        'w-[5px] h-[5px] rounded-full transition-colors duration-100 my-[3px] -translate-x-[5px]',
        isPeaking ? 'bg-sc-red' : 'bg-secondary/20'
      )}
      style={isPeaking ? { boxShadow: '0 0 6px hsl(0 84% 60% / 0.8)' } : undefined}
    />
  );
}

/* ─── Context Menu ─────────────────────────────────────────── */

const CONTEXT_MENU_OPTIONS = [
  'CHANNEL PRESETS',
  'RENAME',
  'COPY SETTINGS',
  'STEREO LINK',
  'COLOR',
  'RESET CHANNEL',
] as const;

type ArrowSide = 'left' | 'right' | 'top' | 'bottom';
interface MenuLayout { left: number; top: number; arrowSide: ArrowSide; arrowOffset: number }

const ARROW = 8;
const BG = 'hsl(220,18%,9%)';

function getArrowStyle(side: ArrowSide, offset: number): React.CSSProperties {
  const base: React.CSSProperties = { position: 'absolute', width: 0, height: 0, filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.4))' };
  const t = `${ARROW}px solid transparent`;
  const s = `${ARROW}px solid ${BG}`;
  switch (side) {
    case 'left':  return { ...base, left: -ARROW, top: offset, transform: 'translateY(-50%)', borderTop: t, borderBottom: t, borderRight: s };
    case 'right': return { ...base, right: -ARROW, top: offset, transform: 'translateY(-50%)', borderTop: t, borderBottom: t, borderLeft: s };
    case 'top':   return { ...base, top: -ARROW, left: offset, transform: 'translateX(-50%)', borderLeft: t, borderRight: t, borderBottom: s };
    case 'bottom':return { ...base, bottom: -ARROW, left: offset, transform: 'translateX(-50%)', borderLeft: t, borderRight: t, borderTop: s };
  }
}

export function ChannelContextMenu({ x, y, channelId, channelName, isLinked, onClose, onRename, onStereoLink }: {
  x: number; y: number; channelId: number; channelName: string; isLinked?: boolean;
  onClose: () => void; onRename?: (name: string) => void; onStereoLink?: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<MenuLayout | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);

  useEffect(() => {
    const handle = (e: MouseEvent | TouchEvent) => {
      if (showRenameModal) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle);
    return () => { document.removeEventListener('mousedown', handle); document.removeEventListener('touchstart', handle); };
  }, [onClose, showRenameModal]);

  useEffect(() => {
    if (!menuRef.current) return;
    const r = menuRef.current.getBoundingClientRect();
    const pad = 6;
    const gap = ARROW;
    const flipH = x + r.width + pad > window.innerWidth;
    const flipV = y + r.height + pad > window.innerHeight;
    const left = flipH ? x - r.width - gap : x + gap;
    const top = flipV ? y - r.height - gap : y + gap;
    const arrowSide: ArrowSide = flipH ? 'right' : 'left';
    const arrowOffset = flipV
      ? Math.max(12, Math.min(r.height - 14, r.height - (top + r.height - y)))
      : Math.max(12, Math.min(r.height - 14, y - top));
    setLayout({ left: Math.max(pad, left), top: Math.max(pad, top), arrowSide, arrowOffset });
  }, [x, y]);

  return (
    <>
      {!showRenameModal && createPortal(
        <div ref={menuRef} style={{ position: 'fixed', left: layout?.left ?? -9999, top: layout?.top ?? -9999, zIndex: 9999, opacity: layout ? 1 : 0 }}>
          {layout && <div style={getArrowStyle(layout.arrowSide, layout.arrowOffset)} />}
          <div className="w-[110px] rounded-md border border-primary/20 bg-[hsl(220,18%,9%)] shadow-xl shadow-black/70 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
            <div className="py-1">
              {CONTEXT_MENU_OPTIONS.map((option, i) => (
                <button
                  key={option}
                  className={cn(
                    'w-full text-left px-2.5 py-[5px] text-[9px] font-medium tracking-wide text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors',
                    i === CONTEXT_MENU_OPTIONS.length - 1 && 'text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border-t border-border/40 mt-0.5 pt-[6px]'
                  )}
                  onClick={() => {
                    if (option === 'RENAME') { setShowRenameModal(true); return; }
                    if (option === 'STEREO LINK') { onStereoLink?.(); onClose(); return; }
                    console.log(`action: ${option}`, channelId);
                    onClose();
                  }}
                >
                  {option === 'STEREO LINK' && isLinked ? 'UNLINK STEREO' : option}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
      {showRenameModal && (
        <RenameModal
          channelId={channelId}
          channelName={channelName}
          onConfirm={(name) => { onRename?.(name); onClose(); }}
          onCancel={onClose}
        />
      )}
    </>
  );
}

/* ─── Rename Modal ────────────────────────────────────────── */

function RenameModal({ channelId, channelName, onConfirm, onCancel }: {
  channelId: number; channelName: string;
  onConfirm: (name: string) => void; onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(channelName);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const confirm = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
    else onCancel();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative w-[340px] rounded-xl border border-primary/20 bg-[hsl(220,18%,10%)] shadow-2xl shadow-black/80 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-primary/80 via-primary/40 to-transparent" />
        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">Renomear Canal</span>
            <span className="text-lg font-bold text-foreground">CH {channelId}</span>
          </div>

          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirm();
              if (e.key === 'Escape') onCancel();
            }}
            placeholder="Nome do canal..."
            className="w-full px-4 py-3 text-base bg-secondary/60 border border-border/60 rounded-lg text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40"
            maxLength={12}
          />

          <div className="flex gap-2 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg bg-secondary/60 hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirm}
              className="px-5 py-2 text-sm font-medium text-primary-foreground rounded-lg bg-primary hover:bg-primary/90 transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Shared UI Components ─────────────────────────────────── */

export function DbDisplay({ db, panText, isGain, isActive, capScale }: {
  db: string; panText: string | null; isGain: boolean; isActive: boolean; capScale: number;
}) {
  return (
    <div
      className={cn(
        'text-xs font-mono tabular-nums px-1.5 py-0.5 rounded min-w-[42px] text-center',
        isGain ? 'bg-red-950/50 text-red-400' : 'bg-secondary/70',
        !isGain && (isActive ? 'text-foreground' : 'text-muted-foreground')
      )}
      style={capScale < 1 ? { transform: `scale(${capScale})` } : undefined}
    >
      {panText ?? db}
    </div>
  );
}

export function PanControl({ pan, onPanChange, onDragStart, onDragEnd }: {
  pan: number; onPanChange: (pan: number) => void; onDragStart: () => void; onDragEnd: () => void;
}) {
  return (
    <div
      className="flex items-center gap-0.5 cursor-ew-resize select-none"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragStart();
        const track = e.currentTarget.querySelector('[data-pan-track]') as HTMLElement;
        if (!track) return;
        const update = (clientX: number) => {
          const rect = track.getBoundingClientRect();
          const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
          onPanChange(Math.round(pct * 200 - 100));
        };
        update(e.clientX);
        const onMove = (ev: MouseEvent) => { ev.preventDefault(); update(ev.clientX); };
        const onUp = () => { onDragEnd(); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      }}
      onDoubleClick={(e) => { e.stopPropagation(); onPanChange(0); }}
    >
      <span className="text-[7px] text-muted-foreground">L</span>
      <div data-pan-track className="w-7 h-1 bg-secondary/60 rounded-full relative overflow-visible">
        <div
          className="absolute w-1.5 h-1.5 bg-primary rounded-full pointer-events-none"
          style={{ left: `${16 + ((pan + 100) / 200) * (90 - 16)}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <span className="text-[7px] text-muted-foreground">R</span>
    </div>
  );
}

export function MuteButton({ muted, onClick }: { muted: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-[10px] font-bold rounded transition-colors flex-1 max-w-[28px] h-7 flex items-center justify-center',
        muted
          ? 'bg-sc-red text-white shadow-sm shadow-sc-red/30'
          : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
      )}
    >
      M
    </button>
  );
}

export function SoloButton({ solo, onClick }: { solo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-[10px] font-bold rounded transition-colors flex-1 max-w-[28px] h-7 flex items-center justify-center',
        solo
          ? 'bg-sc-yellow text-black shadow-sm shadow-sc-yellow/30'
          : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
      )}
    >
      S
    </button>
  );
}

export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] font-bold rounded transition-colors flex-1 max-w-[28px] h-7 flex items-center justify-center bg-secondary/50 text-muted-foreground hover:bg-primary/20 hover:text-primary"
    >
      Edit
    </button>
  );
}

export function FaderWithMarks({ displayValue, onValueChange, marks, faderClass, onDoubleClickReset, marksBottomStart }: {
  displayValue: number;
  onValueChange: (value: number) => void;
  marks: { label: number; pos: number; actualDb: number }[];
  faderClass?: string;
  onDoubleClickReset: () => void;
  marksBottomStart?: number;
}) {
  const start = marksBottomStart ?? (GAP_END + 3);
  return (
    <>
      {/* dB scale marks */}
      <div className="relative h-full w-6" style={{ transform: 'translateX(-14px)' }}>
        {marks.map((mark, i) => (
          <span
            key={mark.label}
            className={cn(
              'absolute text-[7px] leading-none tabular-nums font-mono right-0',
              mark.label === 0 ? 'text-white font-bold' : 'text-white/60'
            )}
            style={{
              bottom: `${start + (i / (marks.length - 1)) * (99 - start)}%`,
              transform: 'translateY(50%)',
              ...(mark.label === 0 ? { right: 'auto', left: 15 } : {}),
            }}
          >
            {mark.label}
          </span>
        ))}
      </div>

      {/* Fader */}
      <div
        className="relative h-full fader-track flex items-center justify-center ml-2"
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickReset(); }}
      >
        <Slider
          orientation="vertical"
          value={[displayValue]}
          onValueChange={([v]) => onValueChange(v)}
          max={100}
          step={0.1}
          className={cn('h-full channel-fader', faderClass)}
        />
      </div>
    </>
  );
}

export function ChannelLabel({ channel, isMaster, isActive, typeColor, labelColorOverride }: {
  channel: Channel; isMaster: boolean; isActive: boolean; typeColor: string; labelColorOverride?: string;
}) {
  const isLinked = channel.stereoLink != null;
  const isLeftChannel = isLinked && channel.stereoLink! > channel.id;
  const linkSide = isLeftChannel ? 'L' : 'R';

  return (
    <div className="flex flex-col mt-0.5 w-full pr-1">
      <div className="flex items-center justify-end gap-0.5">
        <span className={cn('font-bold', isMaster ? 'text-[10px] text-primary' : 'text-[8px] ' + (labelColorOverride ?? typeColor))}>
          {isMaster ? 'MASTER' : `CH ${channel.id}`}
        </span>
        {!isMaster && isLinked && (
          <span className="text-[7px] font-bold px-[3px] py-[1px] rounded bg-primary/20 text-primary leading-none">
            {linkSide}
          </span>
        )}
      </div>
      <span className={cn(
        'text-[9px] font-medium truncate max-w-[58px] text-center w-full',
        isActive ? 'text-foreground' : 'text-muted-foreground'
      )}>
        {channel.name}
      </span>
    </div>
  );
}

/* ─── Strip Wrapper ────────────────────────────────────────── */

export function StripWrapper({ channel, isMaster, onEditClick, onNameChange, onStereoLink, ctxMenu, closeCtx, handleContextMenu, handleTouchStart, handleTouchEnd, children }: {
  channel: Channel; isMaster: boolean; onEditClick: () => void; onNameChange?: (name: string) => void; onStereoLink?: () => void;
  ctxMenu: { x: number; y: number } | null; closeCtx: () => void;
  handleContextMenu: (e: React.MouseEvent) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 px-1.5 py-2 h-full flex-1 min-w-[80px] border-r border-border/40',
        isMaster && '!flex-none w-[100px] !max-w-none bg-primary/5 border-l-2 border-l-primary/40 border-r-0'
      )}
      onDoubleClick={!isMaster ? onEditClick : undefined}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      {ctxMenu && (
        <ChannelContextMenu
          x={ctxMenu.x} y={ctxMenu.y}
          channelId={channel.id} channelName={channel.name}
          isLinked={channel.stereoLink != null}
          onClose={closeCtx} onRename={onNameChange} onStereoLink={onStereoLink}
        />
      )}
      {children}
    </div>
  );
}

/* ─── Hook: shared strip state ─────────────────────────────── */

export function useStripBase(props: ChannelStripProps, dbFormatter: (v: number) => string = volumeToDb): StripBaseData {
  const { channel, meter, isMaster = false, zoom = 1 } = props;
  const mLevel = meter?.level ?? channel.level;
  const mPeakHold = meter?.peakHold ?? channel.peakHold;
  const mGrMeter = meter?.grMeter ?? channel.grMeter;
  const isActive = channel.active && !channel.muted;
  const db = dbFormatter(props.displayValue);
  const typeColor = TYPE_COLORS[channel.type] || 'text-muted-foreground';
  const capScale = zoom > 1.2 ? 1.2 / zoom : 1;

  const [isPanDragging, setIsPanDragging] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const formatPan = (pan: number) => {
    if (pan === 0) return 'CENTRO';
    return pan < 0 ? `L ${Math.abs(pan)}` : `R ${pan}`;
  };

  const openCtx = useCallback((x: number, y: number) => setCtxMenu({ x, y }), []);
  const closeCtx = useCallback(() => setCtxMenu(null), []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (isMaster) return;
    e.preventDefault();
    openCtx(e.clientX, e.clientY);
  }, [isMaster, openCtx]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isMaster) return;
    longPressTriggered.current = false;
    const touch = e.touches[0];
    const { clientX, clientY } = touch;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      openCtx(clientX, clientY);
    }, 500);
  }, [isMaster, openCtx]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (longPressTriggered.current) { e.preventDefault(); longPressTriggered.current = false; }
  }, []);

  const panText = isPanDragging ? formatPan(channel.pan) : null;

  return {
    mLevel, mPeakHold, mGrMeter, isActive, db, typeColor, capScale,
    isPanDragging, setIsPanDragging, panText,
    ctxMenu, closeCtx,
    handleContextMenu, handleTouchStart, handleTouchEnd,
  };
}

// Re-export cn for strip files
export { cn };
