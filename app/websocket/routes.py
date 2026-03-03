"""
WebSocket Routes - Endpoint para conexões em tempo real
"""
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from starlette.websockets import WebSocketState
from app.websocket.manager import manager
from app.core.security import decode_access_token
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Intervalo de heartbeat em segundos
HEARTBEAT_INTERVAL = 30


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(default=None)
):
    """
    Endpoint WebSocket para sincronização em tempo real.
    Requer autenticação via token JWT.
    Inclui heartbeat para detectar conexões mortas.
    """
    # Rejeitar conexões sem token
    if not token:
        await websocket.close(code=4001, reason="Authentication required")
        return

    # Validar token JWT
    try:
        payload = decode_access_token(token)
        if not payload or not payload.get("sub"):
            await websocket.close(code=4001, reason="Invalid token")
            return
        user_id = payload.get("sub")
    except Exception as e:
        logger.warning(f"Invalid WebSocket token: {e}")
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    await manager.connect(websocket, user_id)

    try:
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=HEARTBEAT_INTERVAL
                )
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Sem mensagem do cliente — enviar ping para verificar conexão
                try:
                    await websocket.send_text("ping")
                except Exception:
                    # Conexão morta
                    break

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, user_id)
