/**
 * TypeScript Types para API do Backend
 * Sincronizado com o backend FastAPI
 */

// ============= ENUMS =============

export type DeviceType = 'tuya' | 'snmp';
export type DeviceStatus = 'online' | 'offline';
export type DeviceIcon = 
  | 'plug' | 'monitor' | 'tv' | 'air-vent' | 'printer'
  | 'server' | 'router' | 'lightbulb' | 'camera'
  | 'coffee' | 'fan' | 'speaker' | 'refrigerator';

export type TriggerType = 'time' | 'manual' | 'routine_complete' | 'device_state';
export type WeekDay = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';
export type TriggerDeviceState = 'on' | 'off';

export type ActivityType = 
  | 'device_on' | 'device_off'
  | 'device_added' | 'device_updated' | 'device_deleted'
  | 'routine_activated' | 'routine_deactivated'
  | 'routine_created' | 'routine_updated' | 'routine_deleted'
  | 'routine_executed'
  | 'master_switch';

export type UserRole = 'admin' | 'user';

// ============= API RESPONSE =============

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ============= USER =============

export interface User {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  role: UserRole;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role?: UserRole;
}

export interface UserCreateRequest {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}

export interface UserUpdateRequest {
  name?: string;
  email?: string;
  is_active?: boolean;
  role?: UserRole;
}

export interface UserPasswordResetRequest {
  new_password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// ============= DEVICE =============

export interface ApiDevice {
  id: string;
  name: string;
  type: DeviceType;
  icon: DeviceIcon;
  is_on: boolean;
  status: DeviceStatus;
  // Tuya
  device_id?: string;
  local_key?: string;
  // SNMP
  ip?: string;
  community_string?: string;
  port?: number;
  snmp_base_oid?: string;
  snmp_outlet_number?: number;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface DeviceCreateRequest {
  name: string;
  type: DeviceType;
  icon?: DeviceIcon;
  // Tuya
  device_id?: string;
  local_key?: string;
  // SNMP
  ip?: string;
  community_string?: string;
  port?: number;
  snmp_base_oid?: string;
  snmp_outlet_number?: number;
}

export interface DeviceUpdateRequest {
  name?: string;
  icon?: DeviceIcon;
}

export interface DeviceToggleRequest {
  state: boolean;
}

export interface DeviceToggleResponse {
  device_id: string;
  new_state: boolean;
  executed_at: string;
}

export interface DeviceToggleAllRequest {
  state: boolean;
}

export interface DeviceToggleAllResponse {
  toggled_count: number;
  failed_count: number;
  new_state: boolean;
  failed_devices: string[];
}

// ============= ROUTINE =============

export interface ApiRoutineAction {
  id?: string;
  device_id: string;
  turn_on: boolean;
  order: number;
  delay: number;
}

export interface RoutineActionCreate {
  device_id: string;
  turn_on: boolean;
  order: number;
  delay: number;
}

export interface ApiRoutine {
  id: string;
  name: string;
  is_active: boolean;
  trigger_type: TriggerType;
  // Time trigger
  trigger_time?: string;
  week_days: WeekDay[];
  // Routine trigger
  trigger_routine_id?: string;
  // Device trigger
  trigger_device_id?: string;
  trigger_device_state?: TriggerDeviceState;
  trigger_cooldown_minutes: number;
  // Actions
  actions: ApiRoutineAction[];
  last_executed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RoutineCreateRequest {
  name: string;
  trigger_type: TriggerType;
  trigger_time?: string;
  week_days?: WeekDay[];
  trigger_routine_id?: string;
  trigger_device_id?: string;
  trigger_device_state?: TriggerDeviceState;
  trigger_cooldown_minutes?: number;
  actions: RoutineActionCreate[];
}

export interface RoutineUpdateRequest {
  name?: string;
  is_active?: boolean;
  trigger_type?: TriggerType;
  trigger_time?: string;
  week_days?: WeekDay[];
  trigger_routine_id?: string;
  trigger_device_id?: string;
  trigger_device_state?: TriggerDeviceState;
  trigger_cooldown_minutes?: number;
  actions?: RoutineActionCreate[];
}

export interface RoutineToggleRequest {
  is_active: boolean;
}

export interface RoutineExecuteResponse {
  routine_id: string;
  executed_actions: number;
  failed_actions: number;
  execution_time_ms: number;
  executed_at: string;
  results: Array<{
    device_id: string;
    success: boolean;
    executed_at: string;
    error?: string;
  }>;
}

// ============= ACTIVITY LOG =============

export interface ApiActivityLog {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  device_name?: string;
  routine_name?: string;
  timestamp: number; // Unix timestamp em ms
  created_at: string;
}

// ============= MONITORING =============

export interface MonitoringStatus {
  is_running: boolean;
  uptime_seconds: number;
  check_count: number;
  last_check?: string;
  check_interval_seconds: number;
}

export interface ScheduledJob {
  id: string;
  name: string;
  next_run?: string;
}

// ============= WEBSOCKET =============

export interface WsMessage {
  type: 'device_update' | 'monitoring_status' | 'routine_executed' | 'error' | 'ping';
  payload: unknown;
}

export interface WsDeviceUpdate {
  device_id: string;
  is_on: boolean;
  status: DeviceStatus;
}

export interface WsRoutineExecuted {
  routine_id: string;
  executed_actions: number;
  failed_actions: number;
}

// ============= ANALYTICS =============

export type AnalyticsPeriod = '7d' | '30d' | '90d';
export type TriggerSource = 'manual' | 'routine' | 'scheduled' | 'master_switch';

export interface DeviceUsageItem {
  device_id: string;
  device_name: string;
  total_seconds: number;
  total_hours: number;
  session_count: number;
}

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  total_seconds: number;
  total_hours: number;
}

export interface DeviceUsageResponse {
  period_start: string;
  period_end: string;
  by_device: DeviceUsageItem[];
  daily_usage: DailyUsage[];
  total_hours: number;
}

export interface RoutineExecutionItem {
  id: string;
  routine_id: string | null;
  routine_name: string;
  executed_at: string;
  timestamp: number;
  success: boolean;
  duration_ms?: number;
  trigger_type?: string;
}

export interface RoutineExecutionStats {
  routine_id: string;
  routine_name: string;
  total_executions: number;
  successful: number;
  failed: number;
  success_rate: number;
}

export interface RoutineExecutionsResponse {
  period_start: string;
  period_end: string;
  executions: RoutineExecutionItem[];
  stats_by_routine: RoutineExecutionStats[];
  total_executions: number;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: number;
  datetime: string;
  device_id?: string;
  device_name?: string;
  routine_id?: string;
  routine_name?: string;
  duration_seconds?: number;
  end_timestamp?: number;
}

export interface TimelineSession {
  device_id: string;
  device_name: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  is_active: boolean;
  trigger_source: TriggerSource;
}

export interface TimelineResponse {
  date: string;
  events: TimelineEvent[];
  sessions: TimelineSession[];
}

export interface AnalyticsSummary {
  period_start: string;
  period_end: string;
  total_sessions: number;
  total_routine_executions: number;
  total_hours_on: number;
  active_devices: number;
}
