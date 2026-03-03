"""
CRUD Device (SQLAlchemy 2.0 async)
"""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.crud.base import CRUDBase
from app.models.device import Device
from app.schemas.device import DeviceCreate, DeviceUpdate
from app.models.enums import DeviceStatus


class CRUDDevice(CRUDBase[Device, DeviceCreate, DeviceUpdate]):

    async def get_by_user(
        self, db: AsyncSession, *, user_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[Device]:
        result = await db.execute(
            select(Device)
            .where(Device.user_id == user_id)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_user_device(
        self, db: AsyncSession, *, device_id: UUID, user_id: UUID
    ) -> Optional[Device]:
        result = await db.execute(
            select(Device).where(Device.id == device_id, Device.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_online_devices(
        self, db: AsyncSession, *, user_id: UUID
    ) -> List[Device]:
        result = await db.execute(
            select(Device).where(
                Device.user_id == user_id,
                Device.status == DeviceStatus.ONLINE,
            )
        )
        return list(result.scalars().all())

    async def create_with_user(
        self,
        db: AsyncSession,
        *,
        obj_in: DeviceCreate,
        user_id: UUID,
        organization_id: Optional[UUID] = None,
    ) -> Device:
        db_obj = Device(**obj_in.model_dump(), user_id=user_id, organization_id=organization_id)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update_status(
        self,
        db: AsyncSession,
        *,
        device_id: UUID,
        status: DeviceStatus,
        is_on: Optional[bool] = None,
    ) -> Optional[Device]:
        result = await db.execute(select(Device).where(Device.id == device_id))
        device = result.scalar_one_or_none()
        if device:
            device.status = status
            if is_on is not None:
                device.is_on = is_on
            db.add(device)
            await db.commit()
            await db.refresh(device)
        return device

    async def get_all_online_devices(self, db: AsyncSession) -> List[Device]:
        result = await db.execute(
            select(Device).where(Device.status == DeviceStatus.ONLINE)
        )
        return list(result.scalars().all())


crud_device = CRUDDevice(Device)
