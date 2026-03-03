import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Routine } from '@/types/device';
import { toast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import { ApiRoutine, RoutineExecuteResponse, RoutineCreateRequest, RoutineUpdateRequest } from '@/lib/api/types';
import { apiRoutineToRoutine } from '@/lib/api/converters';

const STORAGE_KEY = 'rotina-inteligente-routines';

export function useRoutines() {
  const queryClient = useQueryClient();
  const [localRoutines, setLocalRoutines] = useLocalStorage<Routine[]>(STORAGE_KEY, []);
  const { addLog } = useActivityLog();
  const { sendNotification } = useNotificationContext();

  // Query to fetch routines from API
  const { data: routines = [], isLoading, error, refetch } = useQuery({
    queryKey: ['routines'],
    queryFn: async (): Promise<Routine[]> => {
      const response = await apiClient.get<ApiRoutine[]>(API_ENDPOINTS.ROUTINES);
      if (response.success && response.data) {
        const routinesData = response.data.map(apiRoutineToRoutine);
        setLocalRoutines(routinesData); // Cache locally for offline fallback
        return routinesData;
      }
      throw new Error(response.error || 'Erro ao carregar rotinas');
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  // Mutation for toggling routine active state
  const toggleMutation = useMutation({
    mutationFn: async (id: string): Promise<{ routine: Routine; updatedRoutine: Routine }> => {
      const currentRoutines = queryClient.getQueryData<Routine[]>(['routines']) || routines;
      const routine = currentRoutines.find(r => r.id === id);
      if (!routine) throw new Error('Rotina não encontrada');

      // routine.isActive já foi invertido pelo onMutate — enviar o valor atual do cache
      const response = await apiClient.patch<ApiRoutine>(
        API_ENDPOINTS.ROUTINE_TOGGLE(id),
        { is_active: routine.isActive }
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erro ao alternar rotina');
      }

      // Converter resposta da API para tipo do frontend
      const updatedRoutine = apiRoutineToRoutine(response.data);
      return { routine, updatedRoutine };
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['routines'] });
      const previousRoutines = queryClient.getQueryData<Routine[]>(['routines']);

      // Optimistic update
      queryClient.setQueryData<Routine[]>(['routines'], (old) =>
        old?.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r)
      );
      setLocalRoutines(prev =>
        prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r)
      );

      return { previousRoutines };
    },
    onSuccess: ({ routine, updatedRoutine }) => {
      // Usar a resposta do servidor, não o estado otimista
      queryClient.setQueryData<Routine[]>(['routines'], (old) =>
        old?.map(r => r.id === updatedRoutine.id ? updatedRoutine : r)
      );
      setLocalRoutines(prev =>
        prev.map(r => r.id === updatedRoutine.id ? updatedRoutine : r)
      );

      addLog({
        type: updatedRoutine.isActive ? 'routine_activated' : 'routine_deactivated',
        title: updatedRoutine.isActive ? 'Rotina ativada' : 'Rotina desativada',
        description: `"${routine.name}" foi ${updatedRoutine.isActive ? 'ativada' : 'desativada'}`,
        routineName: routine.name,
      });

      sendNotification({
        title: updatedRoutine.isActive ? '▶️ Rotina ativada' : '⏸️ Rotina desativada',
        body: `"${routine.name}" foi ${updatedRoutine.isActive ? 'ativada' : 'desativada'}.`,
      });

      toast({
        title: updatedRoutine.isActive ? 'Rotina ativada' : 'Rotina desativada',
        description: `"${routine.name}" foi ${updatedRoutine.isActive ? 'ativada' : 'desativada'}.`,
      });
    },
    onError: (error: Error, _id, context) => {
      if (context?.previousRoutines) {
        queryClient.setQueryData(['routines'], context.previousRoutines);
        setLocalRoutines(context.previousRoutines);
      }
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation for adding a routine
  const addMutation = useMutation({
    mutationFn: async (routine: Omit<Routine, 'id'>): Promise<Routine> => {
      const createRequest: RoutineCreateRequest = {
        name: routine.name,
        trigger_type: routine.triggerType,
        trigger_time: routine.triggerTime,
        week_days: routine.weekDays,
        trigger_routine_id: routine.triggerRoutineId,
        trigger_device_id: routine.triggerDeviceId,
        trigger_device_state: routine.triggerDeviceState,
        trigger_cooldown_minutes: routine.triggerCooldownMinutes,
        actions: routine.actions.map(a => ({
          device_id: a.deviceId,
          turn_on: a.turnOn,
          order: a.order,
          delay: a.delay,
        })),
      };
      const response = await apiClient.post<ApiRoutine>(API_ENDPOINTS.ROUTINES, createRequest);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erro ao criar rotina');
      }
      return apiRoutineToRoutine(response.data);
    },
    onSuccess: (newRoutine) => {
      queryClient.setQueryData<Routine[]>(['routines'], (old) => [...(old || []), newRoutine]);
      setLocalRoutines(prev => [...prev, newRoutine]);

      addLog({
        type: 'routine_created',
        title: 'Nova rotina criada',
        description: `"${newRoutine.name}" foi criada com ${newRoutine.actions.length} ação(ões)`,
        routineName: newRoutine.name,
      });

      toast({
        title: 'Rotina criada',
        description: `"${newRoutine.name}" foi criada com sucesso.`,
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

  // Mutation for updating a routine
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Routine> }): Promise<{ updatedRoutine: Routine; oldRoutine?: Routine }> => {
      const oldRoutine = routines.find(r => r.id === id);

      const updateRequest: RoutineUpdateRequest = {};
      if (updates.name !== undefined) updateRequest.name = updates.name;
      if (updates.isActive !== undefined) updateRequest.is_active = updates.isActive;
      if (updates.triggerType !== undefined) updateRequest.trigger_type = updates.triggerType;
      if (updates.triggerTime !== undefined) updateRequest.trigger_time = updates.triggerTime;
      if (updates.weekDays !== undefined) updateRequest.week_days = updates.weekDays;
      if (updates.triggerRoutineId !== undefined) updateRequest.trigger_routine_id = updates.triggerRoutineId;
      if (updates.triggerDeviceId !== undefined) updateRequest.trigger_device_id = updates.triggerDeviceId;
      if (updates.triggerDeviceState !== undefined) updateRequest.trigger_device_state = updates.triggerDeviceState;
      if (updates.triggerCooldownMinutes !== undefined) updateRequest.trigger_cooldown_minutes = updates.triggerCooldownMinutes;
      if (updates.actions !== undefined) {
        updateRequest.actions = updates.actions.map(a => ({
          device_id: a.deviceId,
          turn_on: a.turnOn,
          order: a.order,
          delay: a.delay,
        }));
      }

      const response = await apiClient.put<ApiRoutine>(
        API_ENDPOINTS.ROUTINE_BY_ID(id),
        updateRequest
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erro ao atualizar rotina');
      }

      // Usar resposta do servidor
      const updatedRoutine = apiRoutineToRoutine(response.data);
      return { updatedRoutine, oldRoutine };
    },
    onSuccess: ({ updatedRoutine, oldRoutine }) => {
      // Usar dados do servidor, não dados locais
      queryClient.setQueryData<Routine[]>(['routines'], (old) =>
        old?.map(r => r.id === updatedRoutine.id ? updatedRoutine : r)
      );
      setLocalRoutines(prev =>
        prev.map(r => r.id === updatedRoutine.id ? updatedRoutine : r)
      );

      addLog({
        type: 'routine_updated',
        title: 'Rotina atualizada',
        description: `"${updatedRoutine.name}" foi atualizada`,
        routineName: updatedRoutine.name,
      });

      toast({
        title: 'Rotina atualizada',
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

  // Mutation for deleting a routine
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<{ id: string; routine?: Routine }> => {
      const routine = routines.find(r => r.id === id);

      const response = await apiClient.delete(API_ENDPOINTS.ROUTINE_BY_ID(id));
      if (!response.success) {
        throw new Error(response.error || 'Erro ao remover rotina');
      }

      return { id, routine };
    },
    onSuccess: ({ id, routine }) => {
      queryClient.setQueryData<Routine[]>(['routines'], (old) =>
        old?.filter(r => r.id !== id)
      );
      setLocalRoutines(prev => prev.filter(r => r.id !== id));

      addLog({
        type: 'routine_deleted',
        title: 'Rotina removida',
        description: routine ? `"${routine.name}" foi removida` : 'Rotina removida',
        routineName: routine?.name,
      });

      toast({
        title: 'Rotina removida',
        description: routine ? `"${routine.name}" foi removida.` : 'Rotina removida.',
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

  // Mutation for executing a routine
  const executeMutation = useMutation({
    mutationFn: async (id: string): Promise<{ routine: Routine; result?: RoutineExecuteResponse }> => {
      const routine = routines.find(r => r.id === id);
      if (!routine) throw new Error('Rotina não encontrada');

      const response = await apiClient.post<RoutineExecuteResponse>(
        API_ENDPOINTS.ROUTINE_EXECUTE(id)
      );
      if (!response.success) {
        throw new Error(response.error || 'Erro ao executar rotina');
      }
      return { routine, result: response.data };
    },
    onMutate: (id: string) => {
      const routine = routines.find(r => r.id === id);
      if (routine) {
        const sortedActions = [...routine.actions].sort((a, b) => a.order - b.order);
        const isSimultaneous = sortedActions.every(a => a.delay === 0);

        toast({
          title: 'Executando rotina',
          description: `"${routine.name}" - ${sortedActions.length} ação(ões)${isSimultaneous ? ' simultâneas' : ' em sequência'}.`,
        });
      }
    },
    onSuccess: ({ routine, result }) => {
      // Update last executed timestamp
      const updatedData = { lastExecutedAt: new Date().toISOString() };
      queryClient.setQueryData<Routine[]>(['routines'], (old) =>
        old?.map(r => r.id === routine.id ? { ...r, ...updatedData } : r)
      );
      setLocalRoutines(prev =>
        prev.map(r => r.id === routine.id ? { ...r, ...updatedData } : r)
      );

      addLog({
        type: 'routine_executed',
        title: 'Rotina executada',
        description: `"${routine.name}" foi executada${result ? ` (${result.executed_actions} ações, ${result.execution_time_ms}ms)` : ' manualmente'}`,
        routineName: routine.name,
      });

      sendNotification({
        title: '🚀 Rotina executada',
        body: `"${routine.name}" foi executada com sucesso.`,
      });

      toast({
        title: 'Rotina concluída',
        description: `"${routine.name}" foi executada com sucesso.`,
      });

      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao executar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Wrapper functions
  const toggleRoutine = useCallback((id: string) => {
    toggleMutation.mutate(id);
  }, [toggleMutation]);

  const addRoutine = useCallback((routine: Omit<Routine, 'id'>) => {
    addMutation.mutate(routine);
  }, [addMutation]);

  const updateRoutine = useCallback((id: string, updates: Partial<Routine>) => {
    updateMutation.mutate({ id, updates });
  }, [updateMutation]);

  const deleteRoutine = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const executeRoutine = useCallback(async (id: string) => {
    executeMutation.mutate(id);
  }, [executeMutation]);

  return {
    routines,
    isLoading,
    error,
    refetch,
    toggleRoutine,
    isToggling: toggleMutation.isPending,
    togglingRoutineId: toggleMutation.variables as string | undefined,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    executeRoutine,
    isExecuting: executeMutation.isPending,
    executingRoutineId: executeMutation.variables as string | undefined,
  };
}
