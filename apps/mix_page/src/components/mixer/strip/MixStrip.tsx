import React from 'react';
import {
  ChannelStripProps,
  useStripBase,
  volumeToDb,
  dbToPosition,
  DB_MARKS,
  DbDisplay,
  PanControl,
  MuteButton,
  SoloButton,
  EditButton,
  FaderWithMarks,
  ChannelLabel,
  StripWrapper,
  VerticalMeter,
  GRMeter,
  GainReturnMeter,
  PeakDot,
} from './ChannelStripBase';

export const MixStrip = React.memo(function MixStrip(props: ChannelStripProps) {
  const { channel, displayValue, onValueChange, onMuteToggle, onSoloToggle, onEditClick, onPanChange, onNameChange, onStereoLink, isMaster = false } = props;
  const base = useStripBase(props, volumeToDb);

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
      {/* dB display */}
      <DbDisplay db={base.db} panText={base.panText} isGain={false} isActive={base.isActive} capScale={base.capScale} />

      {/* Pan control */}
      <PanControl pan={channel.pan} onPanChange={onPanChange} onDragStart={() => base.setIsPanDragging(true)} onDragEnd={() => base.setIsPanDragging(false)} />

      {/* M / S / Edit buttons */}
      <div className="flex gap-0.5 w-full justify-center" style={base.capScale < 1 ? { transform: `scale(${base.capScale})` } : undefined}>
        <MuteButton muted={channel.muted} onClick={onMuteToggle} />
        <SoloButton solo={channel.solo} onClick={onSoloToggle} />
        {!isMaster && <EditButton onClick={onEditClick} />}
      </div>

      {/* Fader + meter */}
      <div className="flex items-center gap-0.5 flex-1 min-h-[240px]">
        {isMaster ? (
          <div className="flex flex-col items-center gap-0.5 h-full" style={{ transform: 'translateX(-3px)' }}>
            <div className="flex gap-[8px] flex-1">
              <VerticalMeter level={base.mLevel} peakHold={base.mPeakHold} isActive={base.isActive} />
              <VerticalMeter level={Math.max(0, base.mLevel * 0.95)} peakHold={base.mPeakHold * 0.95} isActive={base.isActive} />
            </div>
            <div className="flex gap-[5px] text-[6px] text-muted-foreground font-bold">
              <span className="w-[4px] text-center">L</span>
              <span className="w-[4px] text-center">R</span>
            </div>
          </div>
        ) : (
          <div className="relative h-full" style={{ transform: 'translateX(-3px)' }}>
            <VerticalMeter level={base.mLevel} peakHold={base.mPeakHold} isActive={base.isActive} />
            <div className="absolute -bottom-2.5 left-0 flex flex-col items-center">
              <PeakDot isPeaking={base.isActive && base.mPeakHold > 85} />
              <GainReturnMeter level={base.mLevel} isActive={base.isActive} />
            </div>
          </div>
        )}

        <FaderWithMarks
          displayValue={displayValue}
          onValueChange={onValueChange}
          marks={DB_MARKS}
          onDoubleClickReset={() => onValueChange(dbToPosition(0))}
        />

        {/* GR meter (only if compressor active) */}
        {channel.compressor.enabled && <GRMeter grLevel={base.mGrMeter} />}
      </div>

      {/* Channel label */}
      <ChannelLabel channel={channel} isMaster={isMaster} isActive={base.isActive} typeColor={base.typeColor} />
    </StripWrapper>
  );
});
