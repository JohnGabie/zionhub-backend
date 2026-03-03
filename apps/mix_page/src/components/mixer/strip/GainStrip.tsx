import React from 'react';
import {
  ChannelStripProps,
  useStripBase,
  gainToDb,
  gainDbToPosition,
  DB_MARKS,
  DbDisplay,
  PanControl,
  EditButton,
  FaderWithMarks,
  ChannelLabel,
  StripWrapper,
  VerticalMeter,
} from './ChannelStripBase';

export const GainStrip = React.memo(function GainStrip(props: ChannelStripProps) {
  const { channel, displayValue, onValueChange, onEditClick, onPanChange, onNameChange, onStereoLink, isMaster = false } = props;
  const base = useStripBase(props, gainToDb);

  return (
    <StripWrapper
      channel={channel}
      isMaster={isMaster}
      onEditClick={onEditClick}
      onNameChange={onNameChange}
      onStereoLink={onStereoLink}
      ctxMenu={base.ctxMenu}
      closeCtx={base.closeCtx}
      handleContextMenu={base.handleContextMenu}
      handleTouchStart={base.handleTouchStart}
      handleTouchEnd={base.handleTouchEnd}
    >
      {/* dB display (red tint) */}
      <DbDisplay db={base.db} panText={base.panText} isGain={true} isActive={base.isActive} capScale={base.capScale} />

      {/* Pan control */}
      <PanControl pan={channel.pan} onPanChange={onPanChange} onDragStart={() => base.setIsPanDragging(true)} onDragEnd={() => base.setIsPanDragging(false)} />

      {/* Edit only (no M/S) */}
      <div className="flex gap-0.5 w-full justify-center" style={base.capScale < 1 ? { transform: `scale(${base.capScale})` } : undefined}>
        {!isMaster && <EditButton onClick={onEditClick} />}
      </div>

      {/* Fader + meter */}
      <div className="flex items-center gap-0.5 flex-1 min-h-[240px]">
        <div className="relative h-full" style={{ transform: 'translateX(-3px)' }}>
          <VerticalMeter level={base.mLevel} peakHold={base.mPeakHold} isActive={base.isActive} isGain={true} style={{ height: '100%' }} />
        </div>

        <FaderWithMarks
          displayValue={displayValue}
          onValueChange={onValueChange}
          marks={DB_MARKS}
          faderClass="gain-fader"
          onDoubleClickReset={() => onValueChange(gainDbToPosition(0))}
          marksBottomStart={0}
        />
      </div>

      {/* Channel label (red CH number) */}
      <ChannelLabel channel={channel} isMaster={isMaster} isActive={base.isActive} typeColor={base.typeColor} labelColorOverride="text-red-400" />
    </StripWrapper>
  );
});
