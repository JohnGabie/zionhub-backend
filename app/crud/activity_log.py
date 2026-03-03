"""
CRUD Activity Log (SQLAlchemy 2.0 async)
"""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from uuid import UUID

from app.crud.base import CRUDBase
from app.models.activity_log import ActivityLog
from app.schemas.activity_log import ActivityLogCreate


class CRUDActivityLog(CRUDBase[ActivityLog, ActivityLogCreate, ActivityLogCreate]):

    async def get_by_user(
        self, db: AsyncSession, *, user_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[ActivityLog]:
        result = await db.execute(
            select(ActivityLog)
            .where(ActivityLog.user_id == user_id)
            .order_by(ActivityLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create_with_user(
        self,
        db: AsyncSession,
        *,
        obj_in: ActivityLogCreate,
        user_id: UUID,
        organization_id: Optional[UUID] = None,
    ) -> ActivityLog:
        log = ActivityLog(**obj_in.model_dump(), user_id=user_id, organization_id=organization_id)
        db.add(log)
        await db.commit()
        await db.refresh(log)
        return log

    async def get_count_by_user(self, db: AsyncSession, *, user_id: UUID) -> int:
        result = await db.execute(
            select(func.count(ActivityLog.id)).where(ActivityLog.user_id == user_id)
        )
        return result.scalar_one()

    async def delete_old_logs(
        self, db: AsyncSession, *, user_id: UUID, keep_last: int = 100
    ) -> int:
        # Buscar IDs dos logs a manter
        keep_result = await db.execute(
            select(ActivityLog.id)
            .where(ActivityLog.user_id == user_id)
            .order_by(ActivityLog.created_at.desc())
            .limit(keep_last)
        )
        keep_ids = [row[0] for row in keep_result.all()]

        # Contar quantos serão deletados
        count_result = await db.execute(
            select(func.count(ActivityLog.id)).where(
                ActivityLog.user_id == user_id,
                ActivityLog.id.notin_(keep_ids),
            )
        )
        deleted_count = count_result.scalar_one()

        await db.execute(
            delete(ActivityLog).where(
                ActivityLog.user_id == user_id,
                ActivityLog.id.notin_(keep_ids),
            )
        )
        await db.commit()
        return deleted_count


crud_activity_log = CRUDActivityLog(ActivityLog)
