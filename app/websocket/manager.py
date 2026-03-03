"""
WebSocket Connection Manager - Gerencia conexões em tempo real
"""
import asyncio
from fastapi import WebSocket
from typing import Dict, Set, Optional
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Gerenciador de conexões WebSocket para sincronização em tempo real.

    Permite broadcast de eventos para todos os usuários conectados ou
    para usuários específicos.
    """

    def __init__(self):
        # Conexões ativas por usuário: {user_id: Set[WebSocket]}
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """
        Aceita uma nova conexão WebSocket e registra por usuário.

        Args:
            websocket: Conexão WebSocket
            user_id: ID do usuário (ou "anonymous" se não autenticado)
        """
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"WebSocket connected: user={user_id}, total_connections={self.total_connections}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        """
        Remove uma conexão WebSocket.

        Args:
            websocket: Conexão WebSocket a remover
            user_id: ID do usuário
        """
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected: user={user_id}, total_connections={self.total_connections}")

    @property
    def total_connections(self) -> int:
        """Retorna o número total de conexões ativas."""
        return sum(len(conns) for conns in self.active_connections.values())

    async def broadcast_to_all(self, message: dict):
        """
        Envia mensagem para todos os usuários conectados.

        Args:
            message: Dicionário com o evento a ser enviado
        """
        disconnected = []
        for user_id, connections in self.active_connections.items():
            for connection in connections.copy():
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Failed to send to {user_id}: {e}")
                    disconnected.append((connection, user_id))

        # Limpar conexões falhas
        for conn, uid in disconnected:
            self.disconnect(conn, uid)

    async def broadcast_to_user(self, user_id: str, message: dict):
        """
        Envia mensagem para todas as conexões de um usuário específico.

        Args:
            user_id: ID do usuário
            message: Dicionário com o evento a ser enviado
        """
        if user_id not in self.active_connections:
            return

        disconnected = []
        for connection in self.active_connections[user_id].copy():
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to {user_id}: {e}")
                disconnected.append(connection)

        # Limpar conexões falhas
        for conn in disconnected:
            self.disconnect(conn, user_id)

    async def broadcast_event(self, event: str, data: dict):
        """
        Helper para enviar evento formatado para todos.

        Args:
            event: Nome do evento (ex: "device_toggled")
            data: Dados do evento
        """
        await self.broadcast_to_all({
            "event": event,
            "data": data
        })


# Instância global do gerenciador de conexões
manager = ConnectionManager()

# Referência ao event loop principal para broadcasts thread-safe
_main_loop: Optional[asyncio.AbstractEventLoop] = None


def set_main_loop(loop: asyncio.AbstractEventLoop):
    """Armazena referência ao event loop principal (chamar no startup)."""
    global _main_loop
    _main_loop = loop
    logger.info("Event loop principal registrado para broadcasts thread-safe")


def broadcast_event_sync(event: str, data: dict):
    """
    Broadcast thread-safe para uso em endpoints síncronos (def).
    Endpoints async devem usar `await manager.broadcast_event()` diretamente.
    """
    if _main_loop is not None and _main_loop.is_running():
        asyncio.run_coroutine_threadsafe(
            manager.broadcast_event(event, data),
            _main_loop
        )
    else:
        try:
            asyncio.run(manager.broadcast_event(event, data))
        except RuntimeError:
            logger.warning(f"Não foi possível broadcast evento {event}: sem event loop")
