const API_BASE = '/api/v1';

const STORAGE_KEY = 'rotina-inteligente-session';

export function getAuthToken(): string | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw).token ?? null;
  } catch {
    return null;
  }
}

export function getSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: unknown, expiresIn: number) {
  const expiresAt = Date.now() + expiresIn * 1000;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user, expiresAt }));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = true
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearSession();
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || json?.detail || `Erro ${res.status}`);
  }
  return json;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ success: boolean; data: { access_token: string; expires_in: number; user: unknown } }>(
      'POST',
      '/auth/login',
      { email, password },
      false
    ),

  me: () => request<{ success: boolean; data: unknown }>('GET', '/auth/me'),

  modules: () =>
    request<{ success: boolean; data: { modules: string[] } }>('GET', '/organizations/me/modules'),

  acceptInvite: (token: string, body: unknown) =>
    request<{ success: boolean; data: unknown }>('POST', `/auth/accept-invite/${token}`, body, false),
};
