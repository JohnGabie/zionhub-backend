// API Configuration - uses relative URLs so nginx proxies to backend
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// API version prefix
const API_PREFIX = '/api/v1';

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: `${API_PREFIX}/auth/login`,
  AUTH_LOGOUT: `${API_PREFIX}/auth/logout`,
  AUTH_ME: `${API_PREFIX}/auth/me`,
  
  // Devices
  DEVICES: `${API_PREFIX}/devices`,
  DEVICE_BY_ID: (id: string) => `${API_PREFIX}/devices/${id}`,
  DEVICE_TOGGLE: (id: string) => `${API_PREFIX}/devices/${id}/toggle`,
  DEVICE_SYNC: (id: string) => `${API_PREFIX}/devices/${id}/sync`,
  DEVICES_TOGGLE_ALL: `${API_PREFIX}/devices/toggle-all`,
  
  // Routines
  ROUTINES: `${API_PREFIX}/routines`,
  ROUTINE_BY_ID: (id: string) => `${API_PREFIX}/routines/${id}`,
  ROUTINE_TOGGLE: (id: string) => `${API_PREFIX}/routines/${id}/toggle`,
  ROUTINE_EXECUTE: (id: string) => `${API_PREFIX}/routines/${id}/execute`,
  
  // Activities
  ACTIVITIES: `${API_PREFIX}/activities`,
  
  // Monitoring
  MONITORING_STATUS: `${API_PREFIX}/monitoring/status`,
  MONITORING_START: `${API_PREFIX}/monitoring/start`,
  MONITORING_STOP: `${API_PREFIX}/monitoring/stop`,

  // Analytics
  ANALYTICS_DEVICE_USAGE: `${API_PREFIX}/analytics/device-usage`,
  ANALYTICS_ROUTINE_EXECUTIONS: `${API_PREFIX}/analytics/routine-executions`,
  ANALYTICS_TIMELINE: `${API_PREFIX}/analytics/timeline`,
  ANALYTICS_SUMMARY: `${API_PREFIX}/analytics/summary`,

  // Users (admin)
  USERS: `${API_PREFIX}/users`,
  USER_BY_ID: (id: string) => `${API_PREFIX}/users/${id}`,
  USER_PASSWORD: (id: string) => `${API_PREFIX}/users/${id}/password`,

  // WebSocket
  WS: '/ws',
} as const;

export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

export const getWsUrl = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${API_ENDPOINTS.WS}`;
};
