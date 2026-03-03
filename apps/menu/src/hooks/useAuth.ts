import { useState, useEffect } from 'react';
import { getSession, clearSession } from '@/lib/api';

export interface AuthSession {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role?: string;
  };
  expiresAt: number;
}

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const raw = getSession();
    if (raw && raw.expiresAt > Date.now()) {
      setSession(raw as AuthSession);
    } else if (raw) {
      clearSession();
    }
  }, []);

  const logout = () => {
    clearSession();
    setSession(null);
    window.location.href = '/login';
  };

  return {
    session,
    isAuthenticated: !!session && session.expiresAt > Date.now(),
    user: session?.user ?? null,
    logout,
  };
}
