"""
Monitoring Endpoints - Controle de monitoramento e scheduler (async)
"""
from fastapi import APIRouter, Depends
from typing import List

from app.api.deps import get_current_user
from app.models.user import User
from app.services.monitoring_service import monitoring_service
from app.services.scheduler_service import scheduler_service
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


@router.get("/status", response_model=ApiResponse[dict])
async def get_monitoring_status(current_user: User = Depends(get_current_user)):
    return ApiResponse(success=True, data=monitoring_service.get_status())


@router.post("/start", response_model=ApiResponse[dict])
async def start_monitoring(current_user: User = Depends(get_current_user)):
    await monitoring_service.start()
    return ApiResponse(
        success=True, data=monitoring_service.get_status(), message="Monitoramento iniciado"
    )


@router.post("/stop", response_model=ApiResponse[dict])
async def stop_monitoring(current_user: User = Depends(get_current_user)):
    await monitoring_service.stop()
    return ApiResponse(
        success=True, data=monitoring_service.get_status(), message="Monitoramento parado"
    )


@router.get("/scheduled-jobs", response_model=ApiResponse[List[dict]])
async def get_scheduled_jobs(current_user: User = Depends(get_current_user)):
    jobs = scheduler_service.get_scheduled_jobs()
    return ApiResponse(success=True, data=jobs, message=f"{len(jobs)} rotina(s) agendada(s)")
