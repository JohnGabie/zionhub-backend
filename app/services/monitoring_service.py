"""
Monitoring Service - Monitoramento de dispositivos em background (SQLAlchemy 2.0 async)
Hardware é a fonte da verdade — DB é apenas cache.
device_service gerencia suas próprias sessions sync via SyncSessionLocal.
"""
import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional, Dict

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.device import Device
from app.models.enums import DeviceStatus
from app.services.device_service import device_service
from app.websocket.manager import manager
from app.core.config import settings
from app.utils.logger import logger

SAO_PAULO_TZ = ZoneInfo("America/Sao_Paulo")


def now_sao_paulo():
    return datetime.now(SAO_PAULO_TZ)


class MonitoringService:

    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._start_time: Optional[datetime] = None
        self._check_count = 0
        self._previous_statuses: Dict[str, str] = {}
        self._previous_is_on: Dict[str, Optional[bool]] = {}

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def uptime_seconds(self) -> int:
        if not self._start_time:
            return 0
        return int((now_sao_paulo() - self._start_time).total_seconds())

    async def start(self):
        if self._running:
            logger.warning("Monitoramento já está rodando")
            return
        self._running = True
        self._start_time = now_sao_paulo()
        self._task = asyncio.create_task(self._monitoring_loop())
        logger.info("🔍 Monitoramento de dispositivos iniciado")

    async def stop(self):
        if not self._running:
            return
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("⏹️  Monitoramento de dispositivos parado")

    async def _monitoring_loop(self):
        interval = settings.DEVICE_CHECK_INTERVAL
        while self._running:
            try:
                await self._check_all_devices()
                self._check_count += 1
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Erro no loop de monitoramento: {e}")
                await asyncio.sleep(interval)

    async def _check_all_devices(self):
        """
        Sincroniza estado de todos os dispositivos com o hardware real.
        Busca IDs via AsyncSession, depois cada sync corre em thread separada.
        """
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(Device).limit(1000))
                devices = result.scalars().all()
                if not devices:
                    return
                device_infos = [(str(d.id), d.id, d.name) for d in devices]
        except Exception as e:
            logger.error(f"Erro ao buscar dispositivos: {e}")
            return

        logger.debug(f"🔍 Sincronizando {len(device_infos)} dispositivos com hardware...")

        def sync_one(dev_id):
            """Lê estado real do hardware via device_service (que gerencia sua própria session)."""
            real_state = device_service.sync_device_state(device_id=dev_id)
            if real_state is None:
                return DeviceStatus.OFFLINE, None
            return DeviceStatus.ONLINE, real_state

        try:
            results = await asyncio.gather(*[
                asyncio.to_thread(sync_one, dev_id)
                for _, dev_id, _ in device_infos
            ])
        except Exception as e:
            logger.error(f"Erro ao sincronizar dispositivos: {e}")
            return

        online_count = 0
        offline_count = 0

        for (device_key, device_id, device_name), (new_status, real_is_on) in zip(device_infos, results):
            previous_status = self._previous_statuses.get(device_key)
            previous_is_on = self._previous_is_on.get(device_key)

            if new_status == DeviceStatus.ONLINE:
                online_count += 1

                if previous_status is None or previous_status == DeviceStatus.OFFLINE.value:
                    logger.info(
                        f"Dispositivo '{device_name}' ficou ONLINE "
                        f"(anterior: {'nunca visto' if previous_status is None else 'OFFLINE'})"
                    )

                if real_is_on != previous_is_on:
                    logger.info(
                        f"'{device_name}': is_on {previous_is_on} → {real_is_on} "
                        f"(detectado pelo monitoramento)"
                    )
                    await manager.broadcast_event("device_toggled", {
                        "device_id": str(device_id),
                        "is_on": real_is_on,
                    })

                self._previous_is_on[device_key] = real_is_on

            else:
                offline_count += 1

                if previous_status == DeviceStatus.ONLINE.value:
                    logger.warning(f"Dispositivo '{device_name}' ficou OFFLINE")

                self._previous_is_on.pop(device_key, None)

            self._previous_statuses[device_key] = new_status.value

        logger.debug(
            f"✅ Sync completo: {online_count} online, "
            f"{offline_count} offline (check #{self._check_count})"
        )

    def get_status(self) -> dict:
        return {
            "is_running": self._running,
            "uptime_seconds": self.uptime_seconds,
            "check_count": self._check_count,
            "last_check": now_sao_paulo().isoformat() if self._running else None,
            "check_interval_seconds": settings.DEVICE_CHECK_INTERVAL,
        }


monitoring_service = MonitoringService()
