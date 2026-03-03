export type ActivityType = 
  | 'device_on'
  | 'device_off'
  | 'device_added'
  | 'device_updated'
  | 'device_deleted'
  | 'routine_activated'
  | 'routine_deactivated'
  | 'routine_created'
  | 'routine_updated'
  | 'routine_deleted'
  | 'routine_executed'
  | 'master_switch';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: number; // Unix timestamp em ms
  deviceName?: string;
  routineName?: string;
  createdAt?: string;
}
