import { useMixerState } from '@/hooks/useMixerState';
import { usePlayback } from '@/hooks/usePlayback';
import { Header } from '@/components/mixer/Header';

import { NavigationTabs, TabsContent } from '@/components/mixer/NavigationTabs';
import { ChannelGrid } from '@/components/mixer/ChannelGrid';
import { SidePanel } from '@/components/mixer/SidePanel';

import { PlaceholderTab } from '@/components/mixer/PlaceholderTab';
import { ChannelEditPanel } from '@/components/mixer/ChannelEditPanel';

const Index = () => {
  const {
    state,
    meters,
    masterMeter,

    setChannelVolume,
    toggleChannelMute,
    toggleChannelSolo,
    toggleChannelActive,
    setChannelName,
    setChannelGain,
    setChannelPan,
    setChannelEQ,
    setChannelGate,
    setChannelCompressor,
    setChannelDeesser,
    setAuxSendLevel,
    setFXSendLevel,
    setMasterVolume,
    muteAll,
    setMode,
    setActiveTab,
    setConsoleView,
    setEditingChannel,
    loadPreset,
    savePreset,

    toggleStereoLink,
    updateChannel,
  } = useMixerState();

  const { playback, togglePlay, nextTrack, prevTrack } = usePlayback();

  const editingChannel = state.editingChannelId
    ? state.channels.find(ch => ch.id === state.editingChannelId) ?? null
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header mode={state.mode} onModeChange={setMode} activeTab={state.activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 flex overflow-hidden">
        {editingChannel ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChannelEditPanel
              channel={editingChannel}
              onClose={() => setEditingChannel(null)}
              onEQChange={(eq) => setChannelEQ(editingChannel.id, eq)}
              onGateChange={(gate) => setChannelGate(editingChannel.id, gate)}
              onCompressorChange={(comp) => setChannelCompressor(editingChannel.id, comp)}
              onDeesserChange={(de) => setChannelDeesser(editingChannel.id, de)}
              onAuxSendChange={(idx, level) => setAuxSendLevel(editingChannel.id, idx, level)}
              onFXSendChange={(idx, level) => setFXSendLevel(editingChannel.id, idx, level)}
            />
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col overflow-hidden">
              <NavigationTabs activeTab={state.activeTab} onTabChange={setActiveTab}>
                <TabsContent value="channels" className="flex-1 overflow-hidden">
                  <ChannelGrid
                    channels={state.channels}
                    meters={meters}
                    masterMeter={masterMeter}
                    mode={state.mode}
                    consoleView={state.consoleView}
                    onVolumeChange={setChannelVolume}
                    onMuteToggle={toggleChannelMute}
                    onSoloToggle={toggleChannelSolo}
                    onActiveToggle={toggleChannelActive}
                    onNameChange={setChannelName}
                    onIconChange={(channelId, icon) => updateChannel(channelId, { icon })}
                    masterVolume={state.masterVolume}
                    masterMuted={state.masterMuted}
                    onMasterVolumeChange={setMasterVolume}
                    onMuteAll={muteAll}
                    onConsoleViewChange={setConsoleView}
                    onAuxSendChange={setAuxSendLevel}
                    onFXSendChange={setFXSendLevel}
                    onGainChange={setChannelGain}
                    onPanChange={setChannelPan}
                    onStereoLink={toggleStereoLink}
                    onEditChannel={setEditingChannel}
                  />
                </TabsContent>

                <TabsContent value="playback" className="flex-1">
                  <PlaceholderTab title="Playback" description="Controle de reprodução de áudio e playlists. Em breve!" />
                </TabsContent>
                <TabsContent value="groups" className="flex-1">
                  <PlaceholderTab title="Grupos" description="Gerenciamento de subgrupos e DCAs. Em breve!" />
                </TabsContent>
                <TabsContent value="effects" className="flex-1">
                  <PlaceholderTab title="Efeitos" description="FX Returns e configurações de efeitos. Em breve!" />
                </TabsContent>
                <TabsContent value="meters" className="flex-1">
                  <PlaceholderTab title="Medidores" description="Visualização de níveis de todos os canais. Em breve!" />
                </TabsContent>
              </NavigationTabs>
            </div>

            {state.mode !== 'advanced' && (
              <SidePanel
                className="hidden md:flex"
                masterVolume={state.masterVolume}
                masterMuted={state.masterMuted}
                presets={state.presets}
                activePreset={state.activePreset}
                playback={playback}
                onMasterVolumeChange={setMasterVolume}
                onMuteAll={muteAll}
                onPresetLoad={loadPreset}
                onPresetSave={savePreset}
                onPlayToggle={togglePlay}
                onNextTrack={nextTrack}
                onPrevTrack={prevTrack}
              />
            )}
          </>
        )}
      </div>

    </div>
  );
};

export default Index;
