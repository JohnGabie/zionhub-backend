import { useState, useCallback, useEffect } from 'react';
import { AuthUser, LoginResponse, User } from '@/lib/api/types';
import { API_ENDPOINTS } from '@/lib/api/config';
import { apiClient, ApiError } from '@/lib/api/client';

const STORAGE_KEY = 'rotina-inteligente-session';

interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: number;
}

// Helper: Convert API User to AuthUser format
const userToAuthUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});

// Helper: Validate stored session
const getStoredSession = (): AuthSession | null => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as AuthSession;
    if (parsed.expiresAt > Date.now()) {
      return parsed;
    }
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Monitor token expiration
  useEffect(() => {
    if (!session) return;

    const checkExpiration = () => {
      if (session.expiresAt <= Date.now()) {
        logout();
      }
    };

    const interval = setInterval(checkExpiration, 60000);
    return () => clearInterval(interval);
  }, [session]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Call real API endpoint
      const response = await apiClient.post<LoginResponse>(
        API_ENDPOINTS.AUTH_LOGIN,
        { email, password },
        false // Don't include auth token for login
      );

      if (response.success && response.data) {
        const { access_token, user, expires_in } = response.data;

        const newSession: AuthSession = {
          token: access_token,
          user: userToAuthUser(user),
          expiresAt: Date.now() + (expires_in * 1000),
        };

        // Persist session
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
        setSession(newSession);
        setIsLoading(false);
        return true;
      } else {
        // API respondeu mas com success=false
        const errorMsg = response.message || response.error;
        setError(errorMsg || 'Credenciais inválidas');
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      console.error('Login error:', err);

      if (err instanceof ApiError) {
        // Mensagens específicas por status HTTP
        switch (err.status) {
          case 401:
            setError('Email ou senha incorretos');
            break;
          case 403:
            setError('Usuário inativo. Entre em contato com o administrador.');
            break;
          case 422:
            setError('Dados inválidos. Verifique o email e senha.');
            break;
          case 500:
            setError('Erro interno do servidor. Tente novamente.');
            break;
          default:
            setError(err.message || 'Erro ao fazer login');
        }
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Servidor indisponível. Verifique sua conexão.');
      } else {
        setError('Erro inesperado. Tente novamente.');
      }

      setIsLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try to notify backend, but always clear local session
      await apiClient.post(API_ENDPOINTS.AUTH_LOGOUT);
    } catch {
      // Ignore logout errors (expired token, server down, etc)
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      setSession(null);
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    isAuthenticated: !!session,
    user: session?.user || null,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };
}
