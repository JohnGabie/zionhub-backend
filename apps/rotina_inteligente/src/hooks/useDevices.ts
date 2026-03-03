import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Device } from '@/types/device';
import { toast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { apiDeviceToDevice, deviceToCreateRequest, deviceToUpdateRequest } from '@/lib/api/converters';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import { ApiDevice, DeviceToggleResponse, DeviceToggleAllResponse } from '@/lib/api/types';

const STORAGE_KEY = 'rotina-inteligente-devices';

export function useDevices() {
  const queryClient = useQueryClient();
  const [localDevices, setLocalDevices] = useLocalStorage<Device[]>(STORAGE_KEY, []);
  const { addLog } = useActivityLog();
  const { sendNotification } = useNotificationContext();

  // Query to fetch devices from API
  const { data: devices = [], isLoading, error, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: async (): Promise<Device[]> => {
      const response = await apiClient.get<ApiDevice[]>(API_ENDPOINTS.DEVICES);
      if (response.success && response.data) {
        const devicesData = response.data.map(apiDeviceToDevice);
        setLocalDevices(devicesData); // Cache locally for offline fallback
        return devicesData;
      }
      throw new Error(response.error || 'Erro ao carregar dispositivos');
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Mutation for toggling a single device
  const toggleMutation = useMutation({
    mutationFn: async ({ id, newState }: { id: string; newState: boolean }): Promise<{ device: Device; newState: boolean }> => {
      const device = devices.find(d => d.id === id);
      if (!device) throw new Error('Dispositivo não encontrado');

      if (device.status === 'offline') {
        throw new Error('Dispositivo desconectado');
      }

      const response = await apiClient.post<DeviceToggleResponse>(
        API_ENDPOINTS.DEVICE_TOGGLE(id),
        { state: newState }
      );
      if (!response.success) {
        throw new Error(response.error || 'Erro ao alternar dispositivo');
      }

      return { device, newState };
    },
    onMutate: async ({ id, newState }) => {
      await queryClient.cancelQueries({ queryKey: ['devices'] });
      const previousDevices = queryClient.getQueryData<Device[]>(['devices']);

      const device = previousDevices?.find(d => d.id === id);
      if (device && device.status !== 'offline') {
        queryClient.setQueryData<Device[]>(['devices'], (old) =>
          old?.map(d => d.id === id ? { ...d, isOn: newState } : d)
        );
        setLocalDevices(prev =>
          prev.map(d => d.id === id ? { ...d, isOn: newState } : d)
        );
      }

      return { previousDevices };
    },
    onSuccess: ({ device, newState }) => {
      addLog({
        type: newState ? 'device_on' : 'device_off',
        title: newState ? 'Dispositivo ligado' : 'Dispositivo desligado',
        description: `${device.name} foi ${newState ? 'ligado' : 'desligado'}`,
        deviceName: device.name,
      });

      sendNotification({
        title: newState ? '🟢 Dispositivo ligado' : '⚪ Dispositivo desligado',
        body: `${device.name} foi ${newState ? 'ligado' : 'desligado'} com sucesso.`,
      });

      toast({
        title: newState ? 'Dispositivo ligado' : 'Dispositivo desligado',
        description: `${device.name} foi ${newState ? 'ligado' : 'desligado'} com sucesso.`,
      });
    },
    onError: (error: Error, { id }, context) => {
      if (context?.previousDevices) {
        queryClient.setQueryData(['devices'], context.previousDevices);
        setLocalDevices(context.previousDevices);
      }

      const device = devices.find(d => d.id === id);
      toast({
        title: error.message === 'Dispositivo desconectado' ? 'Dispositivo desconectado' : 'Erro',
        description: error.message === 'Dispositivo desconectado'
          ? `${device?.name} não está respondendo. Verifique a conexão.`
          : error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation for toggling all devices
  const toggleAllMutation = useMutation({
    mutationFn: async (turnOn: boolean): Promise<{ onlineCount: number; offlineCount: number; failedDevices?: string[] }> => {
      const response = await apiClient.post<DeviceToggleAllResponse>(
        API_ENDPOINTS.DEVICES_TOGGLE_ALL, 
        { state: turnOn }
      );
      if (!response.success) {
        throw new Error(response.error || 'Erro ao alternar dispositivos');
      }
      return { 
        onlineCount: response.data?.toggled_count ?? 0, 
        offlineCount: response.data?.failed_count ?? 0,
        failedDevices: response.data?.failed_devices
      };
    },
    onMutate: async (turnOn: boolean) => {
      await queryClient.cancelQueries({ queryKey: ['devices'] });
      const previousDevices = queryClient.getQueryData<Device[]>(['devices']);

      queryClient.setQueryData<Device[]>(['devices'], (old) =>
        old?.map(d => d.status === 'online' ? { ...d, isOn: turnOn } : d)
      );
      setLocalDevices(prev =>
        prev.map(d => d.status === 'online' ? { ...d, isOn: turnOn } : d)
      );

      return { previousDevices, turnOn };
    },
    onSuccess: ({ onlineCount, offlineCount }, turnOn) => {
      addLog({
        type: 'master_switch',
        title: turnOn ? 'Master Switch: Tudo ligado' : 'Master Switch: Tudo desligado',
        description: `${onlineCount} dispositivos ${turnOn ? 'ligados' : 'desligados'}${offlineCount > 0 ? ` (${offlineCount} offline)` : ''}`,
      });

      sendNotification({
        title: turnOn ? '🟢 Todos os dispositivos ligados' : '⚪ Todos os dispositivos desligados',
        body: `${onlineCount} dispositivos foram ${turnOn ? 'ligados' : 'desligados'}.`,
      });

      toast({
        title: turnOn ? 'Todos ligados' : 'Todos desligados',
        description: offlineCount > 0
          ? `${onlineCount} dispositivos ${turnOn ? 'ligados' : 'desligados'}. ${offlineCount} offline.`
          : `${onlineCount} dispositivos ${turnOn ? 'ligados' : 'desligados'}.`,
      });
    },
    onError: (error: Error, _turnOn, context) => {
      if (context?.previousDevices) {
        queryClient.setQueryData(['devices'], context.previousDevices);
        setLocalDevices(context.previousDevices);
      }
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation for adding a device
  const addMutation = useMutation({
    mutationFn: async (device: Omit<Device, 'id'>): Promise<Device> => {
      const createRequest = deviceToCreateRequest(device);
      const response = await apiClient.post<ApiDevice>(API_ENDPOINTS.DEVICES, createRequest);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erro ao adicionar dispositivo');
      }
      return apiDeviceToDevice(response.data);
    },
    onSuccess: (newDevice) => {
      queryClient.setQueryData<Device[]>(['devices'], (old) => [...(old || []), newDevice]);
      setLocalDevices(prev => [...prev, newDevice]);

      addLog({
        type: 'device_added',
        title: 'Novo dispositivo adicionado',
        description: `${newDevice.name} foi cadastrado`,
        deviceName: newDevice.name,
      });

      toast({
        title: 'Dispositivo adicionado',
        description: `${newDevice.name} foi cadastrado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation for updating a device
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Device> }): Promise<{ id: string; updates: Partial<Device>; oldDevice?: Device }> => {
      const oldDevice = devices.find(d => d.id === id);

      const updateRequest = deviceToUpdateRequest(updates);
      const response = await apiClient.put<ApiDevice>(
        API_ENDPOINTS.DEVICE_BY_ID(id),
        updateRequest
      );
      if (!response.success) {
        throw new Error(response.error || 'Erro ao atualizar dispositivo');
      }

      return { id, updates, oldDevice };
    },
    onSuccess: ({ id, updates, oldDevice }) => {
      const updatedDevice = { ...updates, updatedAt: new Date().toISOString() };
      queryClient.setQueryData<Device[]>(['devices'], (old) =>
        old?.map(d => d.id === id ? { ...d, ...updatedDevice } : d)
      );
      setLocalDevices(prev =>
        prev.map(d => d.id === id ? { ...d, ...updatedDevice } : d)
      );

      addLog({
        type: 'device_updated',
        title: 'Dispositivo atualizado',
        description: `${updates.name || oldDevice?.name || 'Dispositivo'} foi atualizado`,
        deviceName: updates.name || oldDevice?.name,
      });

      toast({
        title: 'Dispositivo atualizado',
        description: 'As alterações foram salvas.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation for deleting a device
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<{ id: string; device?: Device }> => {
      const device = devices.find(d => d.id === id);

      const response = await apiClient.delete(API_ENDPOINTS.DEVICE_BY_ID(id));
      if (!response.success) {
        throw new Error(response.error || 'Erro ao remover dispositivo');
      }

      return { id, device };
    },
    onSuccess: ({ id, device }) => {
      queryClient.setQueryData<Device[]>(['devices'], (old) =>
        old?.filter(d => d.id !== id)
      );
      setLocalDevices(prev => prev.filter(d => d.id !== id));

      addLog({
        type: 'device_deleted',
        title: 'Dispositivo removido',
        description: device ? `${device.name} foi removido` : 'Dispositivo removido',
        deviceName: device?.name,
      });

      toast({
        title: 'Dispositivo removido',
        description: device ? `${device.name} foi removido.` : 'Dispositivo removido.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Wrapper functions
  const toggleDevice = useCallback((id: string) => {
    const device = devices.find(d => d.id === id);
    if (device) {
      const newState = !device.isOn;
      toggleMutation.mutate({ id, newState });
    }
  }, [devices, toggleMutation]);

  const toggleAllDevices = useCallback((turnOn: boolean) => {
    toggleAllMutation.mutate(turnOn);
  }, [toggleAllMutation]);

  const addDevice = useCallback((device: Omit<Device, 'id'>) => {
    addMutation.mutate(device);
  }, [addMutation]);

  const updateDevice = useCallback((id: string, updates: Partial<Device>) => {
    updateMutation.mutate({ id, updates });
  }, [updateMutation]);

  const deleteDevice = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  return {
    devices,
    isLoading,
    error,
    refetch,
    toggleDevice,
    toggleAllDevices,
    isTogglingDevice: toggleMutation.isPending,
    togglingDeviceId: (toggleMutation.variables as { id: string; newState: boolean } | undefined)?.id,
    isTogglingAll: toggleAllMutation.isPending,
    addDevice,
    updateDevice,
    deleteDevice,
  };
}
