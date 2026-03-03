"""
Device Service — orquestra operações de dispositivos com hardware real.
Completamente síncrono: é chamado sempre de dentro de asyncio.to_thread()
ou de callbacks de monitoramento que já rodam em threads.
Gerencia suas próprias sessões usando SyncSessionLocal.
"""
from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy import select
from app.core.database import SyncSessionLocal
from app.models.device import Device
from app.models.enums import DeviceStatus
from app.services.tuya_service import tuya_service
from app.services.snmp_service import snmp_service
from app.utils.logger import logger


class DeviceService:

    def toggle_device(
        self, *, device_id: UUID, state: bool
    ) -> Tuple[bool, Optional[str]]:
        """Liga/desliga dispositivo. Usa sessão própria (sync)."""
        db = SyncSessionLocal()
        try:
            device = db.execute(select(Device).where(Device.id == device_id)).scalar_one_or_none()
            if not device:
                return False, "Dispositivo não encontrado"

            success = False
            try:
                if device.is_tuya:
                    success = tuya_service.ligar(device.device_id) if state else tuya_service.desligar(device.device_id)
                elif device.is_snmp:
                    fn = snmp_service.ligar if state else snmp_service.desligar
                    success = fn(
                        ip=str(device.ip),
                        porta=device.snmp_outlet_number,
                        community=device.community_string,
                        base_oid=device.snmp_base_oid,
                    )

                if success:
                    confirmed_state = self._sync_state(db, device)
                    if confirmed_state is None:
                        return False, "Dispositivo ficou offline após o comando"
                    if confirmed_state != state:
                        logger.warning(
                            f"Toggle '{device.name}': comando={'ON' if state else 'OFF'}, "
                            f"hardware confirma={'ON' if confirmed_state else 'OFF'}"
                        )
                        return False, f"Comando enviado mas hardware reporta {'ON' if confirmed_state else 'OFF'}"
                    return True, None
                return False, "Erro ao executar comando no dispositivo"

            except Exception as e:
                logger.error(f"Erro ao alternar device {device_id}: {e}")
                return False, str(e)
        finally:
            db.close()

    def toggle_all_devices(self, *, state: bool) -> Tuple[int, int, List[UUID]]:
        """Alterna todos os dispositivos online."""
        db = SyncSessionLocal()
        try:
            devices = db.execute(
                select(Device).where(Device.status == DeviceStatus.ONLINE)
            ).scalars().all()
        finally:
            db.close()

        toggled, failed, failed_ids = 0, 0, []
        for device in devices:
            success, _ = self.toggle_device(device_id=device.id, state=state)
            if success:
                toggled += 1
            else:
                failed += 1
                failed_ids.append(device.id)
        return toggled, failed, failed_ids

    def check_device_health(self, *, device_id: UUID) -> DeviceStatus:
        """Verifica se dispositivo está acessível e atualiza status."""
        db = SyncSessionLocal()
        try:
            device = db.execute(select(Device).where(Device.id == device_id)).scalar_one_or_none()
            if not device:
                return DeviceStatus.OFFLINE

            is_online = False
            try:
                if device.is_tuya:
                    is_online = tuya_service.get_status(device.device_id) is not None
                elif device.is_snmp:
                    is_online = snmp_service.check_connection(
                        ip=str(device.ip), community=device.community_string
                    )
            except Exception as e:
                logger.error(f"Erro ao verificar health do device {device_id}: {e}")

            new_status = DeviceStatus.ONLINE if is_online else DeviceStatus.OFFLINE
            device.status = new_status
            db.commit()
            return new_status
        finally:
            db.close()

    def sync_device_state(self, *, device_id: UUID) -> Optional[bool]:
        """Sincroniza estado do banco com o hardware real. Usa sessão própria."""
        db = SyncSessionLocal()
        try:
            device = db.execute(select(Device).where(Device.id == device_id)).scalar_one_or_none()
            if not device:
                return None
            return self._sync_state(db, device)
        finally:
            db.close()

    def _sync_state(self, db, device: Device) -> Optional[bool]:
        """Lê estado real do hardware e atualiza banco (sessão externa)."""
        try:
            real_state = None
            if device.is_tuya:
                real_state = tuya_service.get_status(device.device_id)
            elif device.is_snmp:
                real_state = snmp_service.get_status(
                    ip=str(device.ip),
                    porta=device.snmp_outlet_number,
                    community=device.community_string,
                    base_oid=device.snmp_base_oid,
                )

            if real_state is not None:
                device.status = DeviceStatus.ONLINE
                device.is_on = real_state
                db.commit()
                return real_state
            else:
                device.status = DeviceStatus.OFFLINE
                db.commit()
                return None
        except Exception as e:
            logger.error(f"Erro ao sincronizar device {device.id}: {e}")
            return None


device_service = DeviceService()
