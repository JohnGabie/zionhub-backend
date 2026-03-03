"""
CRUD Routine (SQLAlchemy 2.0 async)
"""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from uuid import UUID
from datetime import datetime

from app.crud.base import CRUDBase
from app.models.routine import Routine, RoutineAction
from app.schemas.routine import RoutineCreate, RoutineUpdate
from app.models.enums import TriggerType


class CRUDRoutine(CRUDBase[Routine, RoutineCreate, RoutineUpdate]):

    async def get_by_user(
        self, db: AsyncSession, *, user_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[Routine]:
        result = await db.execute(
            select(Routine).where(Routine.user_id == user_id).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def get_user_routine(
        self, db: AsyncSession, *, routine_id: UUID, user_id: UUID
    ) -> Optional[Routine]:
        result = await db.execute(
            select(Routine).where(Routine.id == routine_id, Routine.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_with_user(
        self,
        db: AsyncSession,
        *,
        obj_in: RoutineCreate,
        user_id: UUID,
        organization_id: Optional[UUID] = None,
    ) -> Routine:
        actions_data = obj_in.actions
        obj_data = obj_in.model_dump(exclude={"actions"})
        routine = Routine(**obj_data, user_id=user_id, organization_id=organization_id)
        db.add(routine)
        await db.flush()
        for action_data in actions_data:
            action = RoutineAction(**action_data.model_dump(), routine_id=routine.id)
            db.add(action)
        await db.commit()
        await db.refresh(routine)
        return routine

    async def update_routine(
        self, db: AsyncSession, *, routine: Routine, obj_in: RoutineUpdate
    ) -> Routine:
        update_data = obj_in.model_dump(exclude_unset=True)
        if "actions" in update_data and update_data["actions"]:
            await db.execute(
                delete(RoutineAction).where(RoutineAction.routine_id == routine.id)
            )
            actions_data = update_data.pop("actions")
            for action_data in actions_data:
                action_dict = action_data.model_dump() if hasattr(action_data, "model_dump") else action_data
                db.add(RoutineAction(**action_dict, routine_id=routine.id))
        else:
            update_data.pop("actions", None)
        for field, value in update_data.items():
            setattr(routine, field, value)
        db.add(routine)
        await db.commit()
        await db.refresh(routine)
        return routine

    async def update_last_executed(
        self, db: AsyncSession, *, routine_id: UUID, executed_at: datetime
    ) -> Optional[Routine]:
        result = await db.execute(select(Routine).where(Routine.id == routine_id))
        routine = result.scalar_one_or_none()
        if routine:
            routine.last_executed_at = executed_at
            db.add(routine)
            await db.commit()
            await db.refresh(routine)
        return routine

    async def get_active_time_routines(
        self, db: AsyncSession, *, user_id: Optional[UUID] = None
    ) -> List[Routine]:
        stmt = select(Routine).where(
            Routine.is_active == True,
            Routine.trigger_type == TriggerType.TIME,
        )
        if user_id:
            stmt = stmt.where(Routine.user_id == user_id)
        result = await db.execute(stmt)
        return list(result.scalars().all())


crud_routine = CRUDRoutine(Routine)
