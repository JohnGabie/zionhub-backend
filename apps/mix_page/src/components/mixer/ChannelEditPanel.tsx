import { Channel, EQSettings, GateSettings, CompressorSettings, DeesserSettings } from '@/types/mixer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EQEditor } from './EQEditor';
import { DynamicsEditor } from './DynamicsEditor';
import { AuxSendsEditor } from './AuxSendsEditor';
import { FXSendsEditor } from './FXSendsEditor';
import { ArrowLeft } from 'lucide-react';
import { ChannelIcon } from './ChannelIcon';

interface ChannelEditPanelProps {
  channel: Channel | null;
  onClose: () => void;
  onEQChange: (eq: EQSettings) => void;
  onGateChange: (gate: GateSettings) => void;
  onCompressorChange: (comp: CompressorSettings) => void;
  onDeesserChange: (de: DeesserSettings) => void;
  onAuxSendChange: (auxIndex: number, level: number) => void;
  onFXSendChange: (fxIndex: number, level: number) => void;
}

export function ChannelEditPanel({
  channel,
  onClose,
  onEQChange,
  onGateChange,
  onCompressorChange,
  onDeesserChange,
  onAuxSendChange,
  onFXSendChange,
}: ChannelEditPanelProps) {
  if (!channel) return null;

  const showDeesser = channel.type === 'mic' || channel.type === 'instrument';

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with back button */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-secondary/30">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Voltar</span>
        </button>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2">
          <ChannelIcon emoji={channel.icon} size={20} />
          <span className="text-sm font-bold">CH {channel.id} — {channel.name}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <Tabs defaultValue="eq">
          <TabsList className="w-full grid grid-cols-6 h-8 mb-4">
            <TabsTrigger value="eq" className="text-[10px] font-bold">EQ</TabsTrigger>
            <TabsTrigger value="gate" className="text-[10px] font-bold">GATE</TabsTrigger>
            <TabsTrigger value="comp" className="text-[10px] font-bold">COMP</TabsTrigger>
            {showDeesser && (
              <TabsTrigger value="deesser" className="text-[10px] font-bold">DE-ESS</TabsTrigger>
            )}
            <TabsTrigger value="aux" className="text-[10px] font-bold">AUX</TabsTrigger>
            <TabsTrigger value="fx" className="text-[10px] font-bold">FX</TabsTrigger>
          </TabsList>

          <TabsContent value="eq" className="mt-3">
            <EQEditor eq={channel.eq} onChange={onEQChange} />
          </TabsContent>

          <TabsContent value="gate" className="mt-3">
            <DynamicsEditor
              type="gate"
              gate={channel.gate}
              compressor={channel.compressor}
              onGateChange={onGateChange}
              onCompressorChange={onCompressorChange}
            />
          </TabsContent>

          <TabsContent value="comp" className="mt-3">
            <DynamicsEditor
              type="comp"
              gate={channel.gate}
              compressoFr={channel.compressor}
              onGateChange={onGateChange}
              onCompressorChange={onCompressorChange}
            />
          </TabsContent>

          {showDeesser && (
            <TabsContent value="deesser" className="mt-3">
              <DynamicsEditor
                type="deesser"
                gate={channel.gate}
                compressor={channel.compressor}
                deesser={channel.deesser}
                onGateChange={onGateChange}
                onCompressorChange={onCompressorChange}
                onDeesserChange={onDeesserChange}
              />
            </TabsContent>
          )}

          <TabsContent value="aux" className="mt-3">
            <AuxSendsEditor sends={channel.auxSends} onChange={onAuxSendChange} />
          </TabsContent>

          <TabsContent value="fx" className="mt-3">
            <FXSendsEditor sends={channel.fxSends} onChange={onFXSendChange} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
