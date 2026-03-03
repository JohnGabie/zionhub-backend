"""
Activity Log Endpoints (async)
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.crud.activity_log import crud_activity_log
from app.schemas.activity_log import ActivityLogResponse
from app.schemas.common import ApiResponse, PaginatedResponse

router = APIRouter(prefix="/activities", tags=["Activity Logs"])


@router.get("", response_model=ApiResponse[PaginatedResponse[ActivityLogResponse]])
async def list_activities(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
):
    limit = min(limit, 100)

    logs = await crud_activity_log.get_by_user(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    total = await crud_activity_log.get_count_by_user(db, user_id=current_user.id)

    log_responses = [ActivityLogResponse.from_orm_with_timestamp(log) for log in logs]

    return ApiResponse(
        success=True,
        data=PaginatedResponse(items=log_responses, total=total, limit=limit, offset=skip),
    )


@router.delete("", response_model=ApiResponse[None])
async def clear_activities(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = await crud_activity_log.delete_old_logs(
        db, user_id=current_user.id, keep_last=100
    )
    return ApiResponse(success=True, message=f"{deleted} log(s) removido(s)")
