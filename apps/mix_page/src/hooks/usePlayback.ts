import { useState } from 'react';
import { PlaybackState } from '@/types/mixer';

const DEFAULT_PLAYBACK: PlaybackState = {
  isPlaying: true,
  currentTrack: 'Aleluia',
  artist: 'Hillsong',
  progress: 45,
  duration: 240,
};

export function usePlayback() {
  const [playback, setPlayback] = useState<PlaybackState>(DEFAULT_PLAYBACK);

  const togglePlay = () => {
    setPlayback(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const nextTrack = () => {
    setPlayback(prev => ({
      ...prev,
      progress: 0,
      currentTrack: 'Quão Grande É o Meu Deus',
      artist: 'Soraya Moraes',
    }));
  };

  const prevTrack = () => {
    setPlayback(prev => ({
      ...prev,
      progress: 0,
      currentTrack: 'Grandioso És Tu',
      artist: 'Aline Barros',
    }));
  };

  const seek = (progress: number) => {
    setPlayback(prev => ({ ...prev, progress }));
  };

  return {
    playback,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
  };
}
