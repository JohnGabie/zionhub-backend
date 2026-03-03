import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getWsUrl } from '@/lib/api/config';

type WebSocketEvent = {
  event: string;
  data: Record<string, unknown>;
};

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

const RECONNECT_DELAY = 3000; // 3 segundos

/**
 * Hook para conexão WebSocket em tempo real.
 *
 * Automaticamente invalida queries do React Query quando recebe eventos
 * do servidor, mantendo a UI sincronizada entre múltiplos clientes.
 *
 * Eventos suportados:
 * - device_toggled, device_created, device_updated, device_deleted
 * - routine_toggled, routine_created, routine_updated, routine_deleted, routine_executed
 */
export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');

  const connect = useCallback(() => {
    // Limpar timeout de reconexão anterior
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    // Não reconectar se já conectado
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');

    // Obter token de autenticação
    const session = localStorage.getItem('rotina-inteligente-session');
    const token = session ? JSON.parse(session).token : null;

    // Não conectar sem token - servidor requer autenticação
    if (!token) {
      setStatus('disconnected');
      return;
    }

    // Construir URL com token
    const baseUrl = getWsUrl();
    const url = `${baseUrl}?token=${token}`;

    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setStatus('connected');
        console.log('[WebSocket] Conectado');
      };

      ws.current.onmessage = (event) => {
        try {
          // Responder a heartbeat do servidor
          if (event.data === 'ping') {
            ws.current?.send('pong');
            return;
          }

          const message: WebSocketEvent = JSON.parse(event.data);
          console.log('[WebSocket] Evento recebido:', message.event, message.data);

          // Processar eventos
          switch (message.event) {
            case 'device_toggled':
              // Atualizar cache diretamente para resposta instantânea
              if (message.data.device_id && typeof message.data.is_on === 'boolean') {
                queryClient.setQueryData(['devices'], (oldDevices: unknown) => {
                  if (!Array.isArray(oldDevices)) return oldDevices;
                  return oldDevices.map((device: { id: string; isOn: boolean }) =>
                    device.id === message.data.device_id
                      ? { ...device, isOn: message.data.is_on }
                      : device
                  );
                });
              }
              break;

            case 'device_created':
            case 'device_updated':
            case 'device_deleted':
              // Para outros eventos de device, invalidar para refetch
              queryClient.invalidateQueries({ queryKey: ['devices'] });
              break;

            case 'routine_toggled':
              // Update direto no cache — não invalidar para evitar race condition com mutation
              if (message.data.routine_id && typeof message.data.is_active === 'boolean') {
                queryClient.setQueryData(['routines'], (oldRoutines: unknown) => {
                  if (!Array.isArray(oldRoutines)) return oldRoutines;
                  return oldRoutines.map((routine: { id: string; isActive: boolean }) =>
                    routine.id === message.data.routine_id
                      ? { ...routine, isActive: message.data.is_active }
                      : routine
                  );
                });
              }
              break;

            case 'routine_created':
            case 'routine_updated':
            case 'routine_deleted':
              queryClient.invalidateQueries({ queryKey: ['routines'] });
              break;

            case 'routine_executed':
              queryClient.invalidateQueries({ queryKey: ['routines'] });
              queryClient.invalidateQueries({ queryKey: ['devices'] });
              break;
          }

          // Invalidar activities para todos os eventos (logs atualizados)
          queryClient.invalidateQueries({ queryKey: ['activities'] });

        } catch (error) {
          console.warn('[WebSocket] Erro ao processar mensagem:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('[WebSocket] Erro:', error);
        setStatus('error');
      };

      ws.current.onclose = (event) => {
        setStatus('disconnected');
        console.log('[WebSocket] Desconectado, código:', event.code);

        // Reconectar automaticamente após delay (exceto se fechou intencionalmente)
        if (event.code !== 1000) {
          reconnectTimeout.current = setTimeout(() => {
            console.log('[WebSocket] Tentando reconectar...');
            connect();
          }, RECONNECT_DELAY);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Erro ao criar conexão:', error);
      setStatus('error');

      // Tentar reconectar
      reconnectTimeout.current = setTimeout(connect, RECONNECT_DELAY);
    }
  }, [queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (ws.current) {
      ws.current.close(1000, 'Fechamento intencional');
      ws.current = null;
    }

    setStatus('disconnected');
  }, []);

  // Conectar ao montar, desconectar ao desmontar
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Reconectar quando o usuário ficar online novamente
  useEffect(() => {
    const handleOnline = () => {
      console.log('[WebSocket] Rede disponível, reconectando...');
      connect();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'disconnected') {
        console.log('[WebSocket] Aba visível, verificando conexão...');
        connect();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connect, status]);

  return {
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
  };
}
