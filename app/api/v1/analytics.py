"""
Analytics Endpoints - Dashboard de histórico e estatísticas (async + SQLAlchemy 2.0)
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.models.device_session import DeviceSession
from app.models.enums import ActivityType
from app.crud.device_session import crud_device_session
from app.schemas.common import ApiResponse
from app.schemas.analytics import (
    PeriodType,
    DeviceUsageResponse,
    DeviceUsageItem,
    DailyUsage,
    RoutineExecutionsResponse,
    RoutineExecutionItem,
    RoutineExecutionStats,
    TimelineResponse,
    TimelineEvent,
    TimelineSession,
    AnalyticsSummary,
)

SAO_PAULO_TZ = ZoneInfo("America/Sao_Paulo")


def now_sao_paulo():
    return datetime.now(SAO_PAULO_TZ)


def get_period_dates(period: str) -> tuple[datetime, datetime]:
    end_date = now_sao_paulo()
    if period == "7d":
        start_date = end_date - timedelta(days=7)
    elif period == "30d":
        start_date = end_date - timedelta(days=30)
    elif period == "90d":
        start_date = end_date - timedelta(days=90)
    else:
        start_date = end_date - timedelta(days=7)
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    return start_date, end_date


router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/device-usage", response_model=ApiResponse[DeviceUsageResponse])
async def get_device_usage(
    period: str = Query(default="7d", regex="^(7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start_date, end_date = get_period_dates(period)

    device_usage = await crud_device_session.get_total_time_by_device(
        db, user_id=current_user.id, start_date=start_date, end_date=end_date
    )

    result = await db.execute(
        select(DeviceSession.device_id, func.count(DeviceSession.id).label("count"))
        .where(
            DeviceSession.user_id == current_user.id,
            DeviceSession.started_at >= start_date,
            DeviceSession.started_at <= end_date,
        )
        .group_by(DeviceSession.device_id)
    )
    session_counts = result.all()
    counts_map = {str(r.device_id): r.count for r in session_counts}

    by_device = [
        DeviceUsageItem.from_data(
            device_id=d["device_id"],
            device_name=d["device_name"],
            total_seconds=d["total_seconds"],
            session_count=counts_map.get(d["device_id"], 0),
        )
        for d in device_usage
    ]

    daily_data = await crud_device_session.get_daily_usage(
        db, user_id=current_user.id, start_date=start_date, end_date=end_date
    )

    daily_usage = [
        DailyUsage.from_data(date_str=d["date"], total_seconds=d["total_seconds"]) for d in daily_data
    ]

    total_seconds = sum(d["total_seconds"] for d in device_usage)
    total_hours = round(total_seconds / 3600, 2)

    return ApiResponse(
        success=True,
        data=DeviceUsageResponse(
            period_start=start_date,
            period_end=end_date,
            by_device=by_device,
            daily_usage=daily_usage,
            total_hours=total_hours,
        ),
    )


@router.get("/routine-executions", response_model=ApiResponse[RoutineExecutionsResponse])
async def get_routine_executions(
    period: str = Query(default="7d", regex="^(7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start_date, end_date = get_period_dates(period)

    result = await db.execute(
        select(ActivityLog)
        .where(
            ActivityLog.user_id == current_user.id,
            ActivityLog.type == ActivityType.ROUTINE_EXECUTED,
            ActivityLog.created_at >= start_date,
            ActivityLog.created_at <= end_date,
        )
        .order_by(ActivityLog.created_at.desc())
    )
    executions_raw = result.scalars().all()

    executions = [
        RoutineExecutionItem(
            id=str(log.id),
            routine_id=str(log.routine_id) if log.routine_id else None,
            routine_name=log.routine_name or "Rotina desconhecida",
            executed_at=log.created_at,
            timestamp=int(log.created_at.timestamp() * 1000),
            success=True,
            trigger_type=None,
        )
        for log in executions_raw
    ]

    result = await db.execute(
        select(
            ActivityLog.routine_id,
            ActivityLog.routine_name,
            func.count(ActivityLog.id).label("total"),
        )
        .where(
            ActivityLog.user_id == current_user.id,
            ActivityLog.type == ActivityType.ROUTINE_EXECUTED,
            ActivityLog.created_at >= start_date,
            ActivityLog.created_at <= end_date,
            ActivityLog.routine_id.isnot(None),
        )
        .group_by(ActivityLog.routine_id, ActivityLog.routine_name)
        .order_by(func.count(ActivityLog.id).desc())
    )
    stats_query = result.all()

    stats_by_routine = [
        RoutineExecutionStats(
            routine_id=str(s.routine_id),
            routine_name=s.routine_name or "Rotina desconhecida",
            total_executions=s.total,
            successful=s.total,
            failed=0,
            success_rate=100.0 if s.total > 0 else 0.0,
        )
        for s in stats_query
    ]

    return ApiResponse(
        success=True,
        data=RoutineExecutionsResponse(
            period_start=start_date,
            period_end=end_date,
            executions=executions,
            stats_by_routine=stats_by_routine,
            total_executions=len(executions),
        ),
    )


@router.get("/timeline", response_model=ApiResponse[TimelineResponse])
async def get_timeline(
    date: Optional[str] = Query(default=None, regex="^\\d{4}-\\d{2}-\\d{2}$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if date:
        target_date = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=SAO_PAULO_TZ)
    else:
        target_date = now_sao_paulo().replace(hour=0, minute=0, second=0, microsecond=0)

    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)

    result = await db.execute(
        select(ActivityLog)
        .where(
            ActivityLog.user_id == current_user.id,
            ActivityLog.created_at >= start_of_day,
            ActivityLog.created_at <= end_of_day,
        )
        .order_by(ActivityLog.created_at.asc())
    )
    logs = result.scalars().all()

    events = [
        TimelineEvent(
            id=str(log.id),
            type=log.type.value,
            title=log.title,
            description=log.description,
            timestamp=int(log.created_at.timestamp() * 1000),
            datetime=log.created_at,
            device_id=str(log.device_id) if log.device_id else None,
            device_name=log.device_name,
            routine_id=str(log.routine_id) if log.routine_id else None,
            routine_name=log.routine_name,
        )
        for log in logs
    ]

    sessions_raw = await crud_device_session.get_sessions_in_period(
        db, user_id=current_user.id, start_date=start_of_day, end_date=end_of_day
    )

    sessions = [
        TimelineSession(
            device_id=str(s.device_id),
            device_name=s.device_name,
            started_at=s.started_at,
            ended_at=s.ended_at,
            duration_seconds=s.duration_seconds,
            is_active=s.is_active,
            trigger_source=s.trigger_source.value,
        )
        for s in sessions_raw
    ]

    return ApiResponse(
        success=True,
        data=TimelineResponse(
            date=target_date.strftime("%Y-%m-%d"),
            events=events,
            sessions=sessions,
        ),
    )


@router.get("/summary", response_model=ApiResponse[AnalyticsSummary])
async def get_analytics_summary(
    period: str = Query(default="7d", regex="^(7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start_date, end_date = get_period_dates(period)

    result = await db.execute(
        select(func.count(DeviceSession.id)).where(
            DeviceSession.user_id == current_user.id,
            DeviceSession.started_at >= start_date,
            DeviceSession.started_at <= end_date,
        )
    )
    total_sessions = result.scalar() or 0

    result = await db.execute(
        select(func.count(ActivityLog.id)).where(
            ActivityLog.user_id == current_user.id,
            ActivityLog.type == ActivityType.ROUTINE_EXECUTED,
            ActivityLog.created_at >= start_date,
            ActivityLog.created_at <= end_date,
        )
    )
    total_routine_executions = result.scalar() or 0

    result = await db.execute(
        select(func.sum(DeviceSession.duration_seconds)).where(
            DeviceSession.user_id == current_user.id,
            DeviceSession.started_at >= start_date,
            DeviceSession.started_at <= end_date,
            DeviceSession.ended_at.isnot(None),
        )
    )
    total_seconds = result.scalar() or 0

    result = await db.execute(
        select(func.count(func.distinct(DeviceSession.device_id))).where(
            DeviceSession.user_id == current_user.id,
            DeviceSession.started_at >= start_date,
            DeviceSession.started_at <= end_date,
        )
    )
    active_devices = result.scalar() or 0

    return ApiResponse(
        success=True,
        data=AnalyticsSummary(
            period_start=start_date.isoformat(),
            period_end=end_date.isoformat(),
            total_sessions=total_sessions,
            total_routine_executions=total_routine_executions,
            total_hours_on=round(total_seconds / 3600, 2),
            active_devices=active_devices,
        ),
    )
