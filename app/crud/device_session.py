"""
CRUD DeviceSession (SQLAlchemy 2.0 async)
"""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from datetime import datetime

from app.crud.base import CRUDBase
from app.models.device_session import DeviceSession, TriggerSource
from pydantic import BaseModel


class DeviceSessionCreate(BaseModel):
    device_id: UUID
    user_id: UUID
    device_name: str
    started_at: datetime
    trigger_source: TriggerSource = TriggerSource.MANUAL


class DeviceSessionUpdate(BaseModel):
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None


class CRUDDeviceSession(CRUDBase[DeviceSession, DeviceSessionCreate, DeviceSessionUpdate]):

    async def start_session(
        self,
        db: AsyncSession,
        *,
        device_id: UUID,
        user_id: UUID,
        device_name: str,
        started_at: datetime,
        trigger_source: TriggerSource = TriggerSource.MANUAL,
    ) -> DeviceSession:
        session = DeviceSession(
            device_id=device_id,
            user_id=user_id,
            device_name=device_name,
            started_at=started_at,
            trigger_source=trigger_source,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    async def end_session(
        self, db: AsyncSession, *, device_id: UUID, ended_at: datetime
    ) -> Optional[DeviceSession]:
        result = await db.execute(
            select(DeviceSession).where(
                DeviceSession.device_id == device_id,
                DeviceSession.ended_at.is_(None),
            )
        )
        session = result.scalar_one_or_none()
        if session:
            session.end_session(ended_at)
            await db.commit()
            await db.refresh(session)
        return session

    async def get_sessions_in_period(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> List[DeviceSession]:
        result = await db.execute(
            select(DeviceSession)
            .where(
                DeviceSession.user_id == user_id,
                DeviceSession.started_at >= start_date,
                DeviceSession.started_at <= end_date,
            )
            .order_by(DeviceSession.started_at.asc())
        )
        return list(result.scalars().all())

    async def get_total_time_by_device(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> List[dict]:
        result = await db.execute(
            select(
                DeviceSession.device_id,
                DeviceSession.device_name,
                func.sum(DeviceSession.duration_seconds).label("total_seconds"),
            )
            .where(
                DeviceSession.user_id == user_id,
                DeviceSession.started_at >= start_date,
                DeviceSession.started_at <= end_date,
                DeviceSession.ended_at.isnot(None),
            )
            .group_by(DeviceSession.device_id, DeviceSession.device_name)
            .order_by(func.sum(DeviceSession.duration_seconds).desc())
        )
        return [
            {
                "device_id": str(r.device_id),
                "device_name": r.device_name,
                "total_seconds": r.total_seconds or 0,
            }
            for r in result.all()
        ]

    async def get_daily_usage(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> List[dict]:
        result = await db.execute(
            select(
                func.date(DeviceSession.started_at).label("date"),
                func.sum(DeviceSession.duration_seconds).label("total_seconds"),
            )
            .where(
                DeviceSession.user_id == user_id,
                DeviceSession.started_at >= start_date,
                DeviceSession.started_at <= end_date,
                DeviceSession.ended_at.isnot(None),
            )
            .group_by(func.date(DeviceSession.started_at))
            .order_by(func.date(DeviceSession.started_at).asc())
        )
        return [
            {"date": str(r.date), "total_seconds": r.total_seconds or 0}
            for r in result.all()
        ]


crud_device_session = CRUDDeviceSession(DeviceSession)
