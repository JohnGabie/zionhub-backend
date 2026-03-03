"""
Analytics Schemas - DTOs para endpoints de analytics
"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List
from enum import Enum


class PeriodType(str, Enum):
    """Tipos de período para analytics"""
    DAY_7 = "7d"
    DAY_30 = "30d"
    DAY_90 = "90d"
    CUSTOM = "custom"


# ============ Device Usage ============

class DeviceUsageItem(BaseModel):
    """Uso de um dispositivo individual"""
    device_id: str
    device_name: str
    total_seconds: int
    total_hours: float
    session_count: int = 0

    @classmethod
    def from_data(cls, device_id: str, device_name: str, total_seconds: int, session_count: int = 0):
        return cls(
            device_id=device_id,
            device_name=device_name,
            total_seconds=total_seconds,
            total_hours=round(total_seconds / 3600, 2),
            session_count=session_count
        )


class DailyUsage(BaseModel):
    """Uso diário agregado"""
    date: str  # YYYY-MM-DD
    total_seconds: int
    total_hours: float

    @classmethod
    def from_data(cls, date_str: str, total_seconds: int):
        return cls(
            date=date_str,
            total_seconds=total_seconds,
            total_hours=round(total_seconds / 3600, 2)
        )


class DeviceUsageResponse(BaseModel):
    """Response completa de uso de dispositivos"""
    period_start: datetime
    period_end: datetime
    by_device: List[DeviceUsageItem]
    daily_usage: List[DailyUsage]
    total_hours: float


# ============ Routine Executions ============

class RoutineExecutionItem(BaseModel):
    """Uma execução de rotina"""
    id: str
    routine_id: Optional[str] = None
    routine_name: str
    executed_at: datetime
    timestamp: int  # Unix timestamp em ms
    success: bool = True
    duration_ms: Optional[int] = None
    trigger_type: Optional[str] = None


class RoutineExecutionStats(BaseModel):
    """Estatísticas de execução de rotinas"""
    routine_id: str
    routine_name: str
    total_executions: int
    successful: int
    failed: int
    success_rate: float  # 0.0 a 100.0 (percentual)


class RoutineExecutionsResponse(BaseModel):
    """Response completa de execuções de rotinas"""
    period_start: datetime
    period_end: datetime
    executions: List[RoutineExecutionItem]
    stats_by_routine: List[RoutineExecutionStats]
    total_executions: int


# ============ Timeline ============

class TimelineEvent(BaseModel):
    """Evento individual na timeline"""
    id: str
    type: str  # device_on, device_off, routine_executed, etc
    title: str
    description: Optional[str] = None
    timestamp: int  # Unix timestamp em ms
    datetime: datetime

    # Referências opcionais
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    routine_id: Optional[str] = None
    routine_name: Optional[str] = None

    # Para visualização de sessões
    duration_seconds: Optional[int] = None
    end_timestamp: Optional[int] = None


class TimelineSession(BaseModel):
    """Sessão de dispositivo para visualização na timeline"""
    device_id: str
    device_name: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    is_active: bool = False
    trigger_source: str


class TimelineResponse(BaseModel):
    """Response da timeline"""
    date: str  # YYYY-MM-DD
    events: List[TimelineEvent]
    sessions: List[TimelineSession]


# ============ Summary ============

class AnalyticsSummary(BaseModel):
    """Resumo geral de analytics"""
    period_start: str  # ISO 8601
    period_end: str  # ISO 8601
    total_sessions: int = 0
    total_routine_executions: int = 0
    total_hours_on: float = 0.0
    active_devices: int = 0


# ============ Request Models ============

class AnalyticsPeriodRequest(BaseModel):
    """Request para período de analytics"""
    period: PeriodType = PeriodType.DAY_7
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class TimelineRequest(BaseModel):
    """Request para timeline"""
    date: Optional[str] = None  # YYYY-MM-DD, default: hoje
