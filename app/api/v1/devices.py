"""
Device Endpoints (async + SQLAlchemy 2.0)
device_service é sync e chamado via asyncio.to_thread()
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from datetime import datetime
from zoneinfo import ZoneInfo

from app.api.deps import get_db, get_current_user, get_current_org
from app.models.user import User
from app.models.organization import Organization
from app.models.enums import ActivityType
from app.crud.device import crud_device
from app.crud.activity_log import crud_activity_log
from app.crud.device_session import crud_device_session
from app.schemas.activity_log import ActivityLogCreate
from app.models.device_session import TriggerSource
from app.services.device_service import device_service
from app.schemas.device import (
    DeviceCreate, DeviceUpdate, DeviceResponse,
    DeviceToggle, DeviceToggleResponse, DeviceToggleAllResponse,
)
from app.schemas.common import ApiResponse
from app.websocket.manager import manager, broadcast_event_sync

SAO_PAULO_TZ = ZoneInfo("America/Sao_Paulo")


def now_sao_paulo():
    return datetime.now(SAO_PAULO_TZ)


router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("", response_model=ApiResponse[List[DeviceResponse]])
async def list_devices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    devices = await crud_device.get_by_user(db, user_id=current_user.id, skip=skip, limit=limit)
    return ApiResponse(success=True, data=[DeviceResponse.model_validate(d) for d in devices])


@router.post("", response_model=ApiResponse[DeviceResponse], status_code=status.HTTP_201_CREATED)
async def create_device(
    device_in: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
):
    device = await crud_device.create_with_user(
        db, obj_in=device_in, user_id=current_user.id, organization_id=org.id
    )

    # Verificar saúde em thread (operação blocking)
    device_id = device.id
    await asyncio.to_thread(device_service.check_device_health, device_id=device_id)

    # Recarregar device com status atualizado
    await db.refresh(device)

    await crud_activity_log.create_with_user(
        db,
        obj_in=ActivityLogCreate(
            type=ActivityType.DEVICE_ADDED,
            title=f"Dispositivo adicionado: {device.name}",
            description=f"Tipo: {device.type.value}",
            device_id=device.id,
            device_name=device.name,
        ),
        user_id=current_user.id,
    )

    broadcast_event_sync("device_created", {"device_id": str(device.id), "name": device.name})

    return ApiResponse(
        success=True,
        data=DeviceResponse.model_validate(device),
        message="Dispositivo criado com sucesso",
    )


@router.get("/{device_id}", response_model=ApiResponse[DeviceResponse])
async def get_device(
    device_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    device = await crud_device.get_user_device(db, device_id=device_id, user_id=current_user.id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispositivo não encontrado")
    return ApiResponse(success=True, data=DeviceResponse.model_validate(device))


@router.put("/{device_id}", response_model=ApiResponse[DeviceResponse])
async def update_device(
    device_id: UUID,
    device_in: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    device = await crud_device.get_user_device(db, device_id=device_id, user_id=current_user.id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispositivo não encontrado")

    device = await crud_device.update(db, db_obj=device, obj_in=device_in)

    await crud_activity_log.create_with_user(
        db,
        obj_in=ActivityLogCreate(
            type=ActivityType.DEVICE_UPDATED,
            title=f"Dispositivo atualizado: {device.name}",
            device_id=device.id,
            device_name=device.name,
        ),
        user_id=current_user.id,
    )

    broadcast_event_sync("device_updated", {"device_id": str(device.id), "name": device.name})
    return ApiResponse(
        success=True,
        data=DeviceResponse.model_validate(device),
        message="Dispositivo atualizado com sucesso",
    )


@router.delete("/{device_id}", response_model=ApiResponse[None])
async def delete_device(
    device_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    device = await crud_device.get_user_device(db, device_id=device_id, user_id=current_user.id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispositivo não encontrado")

    device_name = device.name

    await crud_activity_log.create_with_user(
        db,
        obj_in=ActivityLogCreate(
            type=ActivityType.DEVICE_DELETED,
            title=f"Dispositivo removido: {device_name}",
            device_id=device_id,
            device_name=device_name,
        ),
        user_id=current_user.id,
    )

    await crud_device.delete(db, id=device_id)
    broadcast_event_sync("device_deleted", {"device_id": str(device_id)})
    return ApiResponse(success=True, message="Dispositivo removido com sucesso")


@router.post("/{device_id}/toggle", response_model=ApiResponse[DeviceToggleResponse])
async def toggle_device(
    device_id: UUID,
    toggle_data: DeviceToggle,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    device = await crud_device.get_user_device(db, device_id=device_id, user_id=current_user.id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispositivo não encontrado")

    # Toggle no hardware (sync, em thread)
    success, error_msg = await asyncio.to_thread(
        device_service.toggle_device, device_id=device_id, state=toggle_data.state
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=error_msg or "Erro ao alternar dispositivo",
        )

    current_time = now_sao_paulo()
    if toggle_data.state:
        await crud_device_session.start_session(
            db,
            device_id=device.id,
            user_id=current_user.id,
            device_name=device.name,
            started_at=current_time,
            trigger_source=TriggerSource.MANUAL,
        )
    else:
        await crud_device_session.end_session(db, device_id=device.id, ended_at=current_time)

    activity_type = ActivityType.DEVICE_ON if toggle_data.state else ActivityType.DEVICE_OFF
    action_text = "ligado" if toggle_data.state else "desligado"
    await crud_activity_log.create_with_user(
        db,
        obj_in=ActivityLogCreate(
            type=activity_type,
            title=f"{device.name} {action_text}",
            description="Ação manual",
            device_id=device.id,
            device_name=device.name,
        ),
        user_id=current_user.id,
    )

    broadcast_event_sync("device_toggled", {"device_id": str(device_id), "is_on": toggle_data.state})

    return ApiResponse(
        success=True,
        data=DeviceToggleResponse(
            device_id=device_id, new_state=toggle_data.state, executed_at=now_sao_paulo()
        ),
    )


@router.post("/toggle-all", response_model=ApiResponse[DeviceToggleAllResponse])
async def toggle_all_devices(
    toggle_data: DeviceToggle,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    toggled, failed, failed_ids = await asyncio.to_thread(
        device_service.toggle_all_devices, state=toggle_data.state
    )

    action_text = "ligados" if toggle_data.state else "desligados"
    await crud_activity_log.create_with_user(
        db,
        obj_in=ActivityLogCreate(
            type=ActivityType.MASTER_SWITCH,
            title=f"Master Switch: todos {action_text}",
            description=f"{toggled} dispositivo(s) alternado(s), {failed} falha(s)",
        ),
        user_id=current_user.id,
    )

    return ApiResponse(
        success=True,
        data=DeviceToggleAllResponse(
            toggled_count=toggled,
            failed_count=failed,
            new_state=toggle_data.state,
            failed_devices=failed_ids,
        ),
        message=f"{toggled} dispositivo(s) alternado(s)",
    )


@router.post("/{device_id}/sync", response_model=ApiResponse[DeviceResponse])
async def sync_device_state(
    device_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    device = await crud_device.get_user_device(db, device_id=device_id, user_id=current_user.id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispositivo não encontrado")

    real_state = await asyncio.to_thread(device_service.sync_device_state, device_id=device_id)

    if real_state is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível sincronizar com o dispositivo",
        )

    # Recarregar device com estado atualizado pelo device_service
    await db.refresh(device)

    return ApiResponse(
        success=True,
        data=DeviceResponse.model_validate(device),
        message="Estado sincronizado com sucesso",
    )
