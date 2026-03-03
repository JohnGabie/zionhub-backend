"""
Routine Endpoints - CRUD + Execute (async + SQLAlchemy 2.0)
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.api.deps import get_db, get_current_user, get_current_org
from app.models.user import User
from app.models.organization import Organization
from app.models.enums import ActivityType
from app.crud.routine import crud_routine
from app.services.routine_service import routine_service
from app.services.scheduler_service import scheduler_service
from app.models.enums import TriggerType
from app.schemas.routine import (
    RoutineCreate,
    RoutineUpdate,
    RoutineResponse,
    RoutineToggle,
    RoutineExecuteResponse,
)
from app.schemas.common import ApiResponse
from app.websocket.manager import manager, broadcast_event_sync

router = APIRouter(prefix="/routines", tags=["Routines"])


@router.get("", response_model=ApiResponse[List[RoutineResponse]])
async def list_routines(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    routines = await crud_routine.get_by_user(db, user_id=current_user.id, skip=skip, limit=limit)
    return ApiResponse(success=True, data=[RoutineResponse.model_validate(r) for r in routines])


@router.post("", response_model=ApiResponse[RoutineResponse], status_code=status.HTTP_201_CREATED)
async def create_routine(
    routine_in: RoutineCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
):
    routine = await crud_routine.create_with_user(
        db, obj_in=routine_in, user_id=current_user.id, organization_id=org.id
    )

    await routine_service.create_routine_log(
        db,
        user_id=current_user.id,
        routine_id=routine.id,
        routine_name=routine.name,
        activity_type=ActivityType.ROUTINE_CREATED,
        title="Nova rotina criada",
        description=f'"{routine.name}" foi criada com {len(routine.actions)} ação(ões)',
    )

    if routine.trigger_type == TriggerType.TIME and routine.is_active:
        scheduler_service.schedule_routine(str(routine.id), routine.trigger_time, routine.week_days)

    broadcast_event_sync("routine_created", {"routine_id": str(routine.id), "name": routine.name})

    return ApiResponse(
        success=True,
        data=RoutineResponse.model_validate(routine),
        message="Rotina criada com sucesso",
    )


@router.get("/{routine_id}", response_model=ApiResponse[RoutineResponse])
async def get_routine(
    routine_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routine = await crud_routine.get_user_routine(db, routine_id=routine_id, user_id=current_user.id)
    if not routine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rotina não encontrada")
    return ApiResponse(success=True, data=RoutineResponse.model_validate(routine))


@router.put("/{routine_id}", response_model=ApiResponse[RoutineResponse])
async def update_routine(
    routine_id: UUID,
    routine_in: RoutineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routine = await crud_routine.get_user_routine(db, routine_id=routine_id, user_id=current_user.id)
    if not routine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rotina não encontrada")

    old_trigger_type = routine.trigger_type
    routine = await crud_routine.update_routine(db, routine=routine, obj_in=routine_in)

    await routine_service.create_routine_log(
        db,
        user_id=current_user.id,
        routine_id=routine.id,
        routine_name=routine.name,
        activity_type=ActivityType.ROUTINE_UPDATED,
        title="Rotina atualizada",
        description=f'"{routine.name}" foi atualizada',
    )

    if routine.is_active:
        if routine.trigger_type == TriggerType.TIME:
            scheduler_service.schedule_routine(str(routine.id), routine.trigger_time, routine.week_days)
        elif old_trigger_type == TriggerType.TIME:
            scheduler_service.unschedule_routine(str(routine.id))
    else:
        scheduler_service.unschedule_routine(str(routine.id))

    broadcast_event_sync("routine_updated", {"routine_id": str(routine.id), "name": routine.name})

    return ApiResponse(
        success=True,
        data=RoutineResponse.model_validate(routine),
        message="Rotina atualizada com sucesso",
    )


@router.delete("/{routine_id}", response_model=ApiResponse[None])
async def delete_routine(
    routine_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routine = await crud_routine.get_user_routine(db, routine_id=routine_id, user_id=current_user.id)
    if not routine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rotina não encontrada")

    routine_name = routine.name

    if routine.trigger_type == TriggerType.TIME:
        scheduler_service.unschedule_routine(str(routine.id))

    await crud_routine.delete(db, id=routine_id)

    await routine_service.create_routine_log(
        db,
        user_id=current_user.id,
        routine_id=None,
        routine_name=routine_name,
        activity_type=ActivityType.ROUTINE_DELETED,
        title="Rotina removida",
        description=f'"{routine_name}" foi removida',
    )

    broadcast_event_sync("routine_deleted", {"routine_id": str(routine_id), "name": routine_name})

    return ApiResponse(success=True, message="Rotina removida com sucesso")


@router.patch("/{routine_id}/toggle", response_model=ApiResponse[RoutineResponse])
async def toggle_routine(
    routine_id: UUID,
    toggle_data: RoutineToggle,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routine = await crud_routine.get_user_routine(db, routine_id=routine_id, user_id=current_user.id)
    if not routine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rotina não encontrada")

    routine_trigger_type = routine.trigger_type
    routine_trigger_time = routine.trigger_time
    routine_week_days = routine.week_days
    routine_name = routine.name

    try:
        routine.is_active = toggle_data.is_active
        db.add(routine)
        await db.commit()
        await db.refresh(routine)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar no banco de dados: {str(e)}",
        )

    persisted_state = routine.is_active

    try:
        activity_type = ActivityType.ROUTINE_ACTIVATED if persisted_state else ActivityType.ROUTINE_DEACTIVATED
        await routine_service.create_routine_log(
            db,
            user_id=current_user.id,
            routine_id=routine.id,
            routine_name=routine_name,
            activity_type=activity_type,
            title="Rotina ativada" if persisted_state else "Rotina desativada",
            description=f'"{routine_name}" foi {"ativada" if persisted_state else "desativada"}',
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Erro ao criar log de atividade: {e}")

    if routine_trigger_type == TriggerType.TIME:
        if persisted_state:
            scheduler_service.schedule_routine(str(routine.id), routine_trigger_time, routine_week_days)
        else:
            scheduler_service.unschedule_routine(str(routine.id))

    broadcast_event_sync(
        "routine_toggled",
        {"routine_id": str(routine.id), "is_active": persisted_state, "name": routine_name},
    )

    return ApiResponse(
        success=True,
        data=RoutineResponse.model_validate(routine),
        message=f"Rotina {'ativada' if persisted_state else 'desativada'} com sucesso",
    )


@router.post("/{routine_id}/execute", response_model=ApiResponse[RoutineExecuteResponse])
async def execute_routine(
    routine_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success, result_data = await routine_service.execute_routine(
        db, routine_id=routine_id, user_id=current_user.id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result_data.get("error", "Erro ao executar rotina"),
        )

    await manager.broadcast_event(
        "routine_executed",
        {
            "routine_id": str(routine_id),
            "executed_actions": result_data.get("executed_actions", 0),
            "execution_time_ms": result_data.get("execution_time_ms", 0),
        },
    )

    return ApiResponse(
        success=True,
        data=RoutineExecuteResponse(**result_data),
        message="Rotina executada com sucesso",
    )
