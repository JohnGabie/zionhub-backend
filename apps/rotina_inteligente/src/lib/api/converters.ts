/**
 * API <-> Frontend Format Converters
 * Convert between API (snake_case) and frontend (camelCase) formats
 */

import { ApiDevice, ApiRoutine, ApiRoutineAction, DeviceCreateRequest } from './types';
import { Device, Routine, RoutineAction, WeekDay, DeviceIcon } from '@/types/device';

// ============================================
// DEVICE CONVERTERS
// ============================================

// Convert API device format to frontend format
export const apiDeviceToDevice = (apiDevice: ApiDevice): Device => ({
  id: apiDevice.id,
  name: apiDevice.name,
  type: apiDevice.type.toLowerCase() as Device['type'],
  icon: apiDevice.icon as DeviceIcon | undefined,
  isOn: apiDevice.is_on,
  status: apiDevice.status.toLowerCase() as Device['status'],
  deviceId: apiDevice.device_id,
  localKey: apiDevice.local_key,
  ip: apiDevice.ip,
  communityString: apiDevice.community_string,
  port: apiDevice.port,
  snmpBaseOid: apiDevice.snmp_base_oid,
  snmpOutletNumber: apiDevice.snmp_outlet_number,
  createdAt: apiDevice.created_at,
  updatedAt: apiDevice.updated_at,
});

// Convert frontend device format to API format (for updates)
export const deviceToApiDevice = (device: Device): Partial<ApiDevice> => ({
  id: device.id,
  name: device.name,
  type: device.type,
  icon: device.icon,
  is_on: device.isOn,
  status: device.status,
  device_id: device.deviceId,
  local_key: device.localKey,
  ip: device.ip,
  community_string: device.communityString,
  port: device.port,
  snmp_base_oid: device.snmpBaseOid,
  snmp_outlet_number: device.snmpOutletNumber,
});

// Convert frontend device format to API update request (only sends defined fields)
export const deviceToUpdateRequest = (device: Partial<Device>): Record<string, unknown> => {
  const request: Record<string, unknown> = {};

  if (device.name !== undefined) request.name = device.name;
  if (device.icon !== undefined) request.icon = device.icon;

  // Campos Tuya
  if (device.deviceId !== undefined) request.device_id = device.deviceId;
  if (device.localKey !== undefined) request.local_key = device.localKey;

  // Campos SNMP
  if (device.ip !== undefined) request.ip = device.ip;
  if (device.communityString !== undefined) request.community_string = device.communityString;
  if (device.port !== undefined) request.port = device.port;
  if (device.snmpBaseOid !== undefined) request.snmp_base_oid = device.snmpBaseOid;
  if (device.snmpOutletNumber !== undefined) request.snmp_outlet_number = device.snmpOutletNumber;

  return request;
};

// Convert frontend device format to API create request (only allowed fields)
export const deviceToCreateRequest = (device: Omit<Device, 'id'>): DeviceCreateRequest => {
  const base: DeviceCreateRequest = {
    name: device.name,
    type: device.type,
    icon: device.icon,
  };

  if (device.type === 'tuya') {
    return {
      ...base,
      device_id: device.deviceId,
      local_key: device.localKey,
    };
  }

  return {
    ...base,
    ip: device.ip,
    community_string: device.communityString,
    port: device.port,
    snmp_base_oid: device.snmpBaseOid,
    snmp_outlet_number: device.snmpOutletNumber,
  };
};

// ============================================
// ROUTINE CONVERTERS
// ============================================

// Convert API routine action to frontend format
export const apiRoutineActionToRoutineAction = (apiAction: ApiRoutineAction): RoutineAction => ({
  id: apiAction.id,
  deviceId: apiAction.device_id,
  turnOn: apiAction.turn_on,
  order: apiAction.order,
  delay: apiAction.delay,
});

// Convert frontend routine action to API format
export const routineActionToApiRoutineAction = (action: RoutineAction): ApiRoutineAction => ({
  id: action.id,
  device_id: action.deviceId,
  turn_on: action.turnOn,
  order: action.order,
  delay: action.delay,
});

// Convert API routine to frontend format
export const apiRoutineToRoutine = (apiRoutine: ApiRoutine): Routine => ({
  id: apiRoutine.id,
  name: apiRoutine.name,
  isActive: apiRoutine.is_active,
  triggerType: apiRoutine.trigger_type,
  triggerTime: apiRoutine.trigger_time,
  weekDays: apiRoutine.week_days as WeekDay[],
  triggerRoutineId: apiRoutine.trigger_routine_id,
  triggerDeviceId: apiRoutine.trigger_device_id,
  triggerDeviceState: apiRoutine.trigger_device_state,
  triggerCooldownMinutes: apiRoutine.trigger_cooldown_minutes,
  actions: apiRoutine.actions.map(apiRoutineActionToRoutineAction),
  lastExecutedAt: apiRoutine.last_executed_at,
  createdAt: apiRoutine.created_at,
  updatedAt: apiRoutine.updated_at,
});

// Convert frontend routine to API format
export const routineToApiRoutine = (routine: Routine): Partial<ApiRoutine> => ({
  id: routine.id,
  name: routine.name,
  is_active: routine.isActive,
  trigger_type: routine.triggerType,
  trigger_time: routine.triggerTime,
  week_days: routine.weekDays,
  trigger_routine_id: routine.triggerRoutineId,
  trigger_device_id: routine.triggerDeviceId,
  trigger_device_state: routine.triggerDeviceState,
  trigger_cooldown_minutes: routine.triggerCooldownMinutes ?? 0,
  actions: routine.actions.map(routineActionToApiRoutineAction),
});
