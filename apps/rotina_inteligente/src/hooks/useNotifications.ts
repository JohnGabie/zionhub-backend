import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

type NotificationPermission = 'default' | 'granted' | 'denied';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
}

export function useNotifications() {
  const [enabled, setEnabled] = useLocalStorage<boolean>('smart-office-notifications', false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      const perm = Notification.permission;
      setPermission(perm);
      // Sync: if permission was revoked, disable notifications
      if (perm === 'denied' && enabled) {
        setEnabled(false);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      setEnabled(true);
      return true;
    }
    return false;
  }, [setEnabled]);

  const sendNotification = useCallback(({ title, body, icon }: NotificationOptions) => {
    if (!enabled || permission !== 'granted') return;

    try {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
      });
    } catch {
      // Silent fail - notification may not be available
    }
  }, [enabled, permission]);

  const toggleNotifications = useCallback(async () => {
    if (permission === 'denied') {
      return;
    }
    if (!enabled && permission !== 'granted') {
      await requestPermission();
    } else {
      setEnabled(!enabled);
    }
  }, [enabled, permission, requestPermission, setEnabled]);

  return {
    enabled: enabled && permission === 'granted',
    permission,
    requestPermission,
    sendNotification,
    toggleNotifications,
  };
}
