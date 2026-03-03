import { useState, useEffect } from 'react';
import { soundcraft, ConnectionStatus } from '@/lib/soundcraft-ws';

export function useSoundcraft() {
  const [status, setStatus] = useState<ConnectionStatus>(soundcraft.status);

  useEffect(() => {
    const ip = import.meta.env.VITE_IP_SOUNDCRAFT;
    if (!ip) return;

    soundcraft.connect(ip);
    const unsub = soundcraft.onStatusChange(setStatus);

    return () => {
      unsub();
      soundcraft.disconnect();
    };
  }, []);

  return { status, connection: soundcraft };
}
