import React from 'react';
import { ChannelStripProps } from './strip/ChannelStripBase';
import { MixStrip } from './strip/MixStrip';
import { GainStrip } from './strip/GainStrip';
import { AuxStrip } from './strip/AuxStrip';
import { FxStrip } from './strip/FxStrip';
import { ConsoleViewMode } from '@/types/mixer';

function getViewCategory(viewMode: ConsoleViewMode): 'mix' | 'gain' | 'aux' | 'fx' {
  if (viewMode === 'gain') return 'gain';
  if (viewMode.startsWith('aux')) return 'aux';
  if (viewMode.startsWith('fx')) return 'fx';
  return 'mix';
}

export const ChannelStrip = React.memo(function ChannelStrip(props: ChannelStripProps) {
  if (props.isMaster) return <MixStrip {...props} />;

  const category = getViewCategory(props.viewMode);
  switch (category) {
    case 'gain': return <GainStrip {...props} />;
    case 'aux':  return <AuxStrip {...props} />;
    case 'fx':   return <FxStrip {...props} />;
    default:     return <MixStrip {...props} />;
  }
});
