export type DeviceType = 'tuya' | 'snmp';

export type DeviceStatus = 'online' | 'offline';

export type DeviceIcon = 
  | 'plug' 
  | 'monitor' 
  | 'tv' 
  | 'air-vent' 
  | 'printer' 
  | 'server' 
  | 'router' 
  | 'lightbulb' 
  | 'camera' 
  | 'coffee' 
  | 'fan' 
  | 'speaker' 
  | 'refrigerator';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  icon?: DeviceIcon;
  isOn: boolean;
  status: DeviceStatus;
  // Tuya specific
  deviceId?: string;
  localKey?: string;
  // SNMP specific
  ip?: string;
  communityString?: string;
  port?: number;
  snmpBaseOid?: string;
  snmpOutletNumber?: number;
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export type TriggerType = 'time' | 'manual' | 'routine_complete' | 'device_state';

export type WeekDay = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export type TriggerDeviceState = 'on' | 'off';

export interface Routine {
  id: string;
  name: string;
  isActive: boolean;
  triggerType: TriggerType;
  // Gatilho: Horário
  triggerTime?: string; // HH:mm format
  weekDays: WeekDay[];
  // Gatilho: Outra rotina
  triggerRoutineId?: string;
  // Gatilho: Estado de dispositivo
  triggerDeviceId?: string;
  triggerDeviceState?: TriggerDeviceState;
  triggerCooldownMinutes?: number;
  // Ações
  actions: RoutineAction[];
  // Timestamps
  lastExecutedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoutineAction {
  id?: string;
  deviceId: string;
  turnOn: boolean;
  order: number;
  delay: number; // Segundos de espera antes do próximo (0 = simultâneo)
}
