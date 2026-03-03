"""
Routine Schemas - DTOs para rotinas automatizadas
"""
from pydantic import BaseModel, Field, field_validator, model_validator
from uuid import UUID
from datetime import datetime, time
from typing import Optional, List
from app.schemas.common import (
    TriggerType,
    WeekDay,
    TriggerDeviceState
)


# ============= ROUTINE ACTION SCHEMAS =============

class RoutineActionBase(BaseModel):
    """Schema base de ação de rotina"""
    device_id: UUID
    turn_on: bool
    order: int = Field(..., ge=1, description="Ordem de execução (1, 2, 3...)")
    delay: int = Field(0, ge=0, le=999, description="Delay em segundos antes de executar")


class RoutineActionCreate(RoutineActionBase):
    """Schema para criar ação"""
    pass


class RoutineActionResponse(RoutineActionBase):
    """Response de ação"""
    id: UUID

    class Config:
        from_attributes = True


# ============= ROUTINE SCHEMAS =============

class RoutineBase(BaseModel):
    """Schema base de rotina"""
    name: str = Field(..., min_length=1, max_length=255)
    trigger_type: TriggerType


class RoutineCreate(RoutineBase):
    """Schema para criar rotina"""
    # Gatilho: Horário
    trigger_time: Optional[time] = None
    week_days: List[WeekDay] = Field(default_factory=list)

    # Gatilho: Outra rotina
    trigger_routine_id: Optional[UUID] = None

    # Gatilho: Estado de dispositivo
    trigger_device_id: Optional[UUID] = None
    trigger_device_state: Optional[TriggerDeviceState] = None
    trigger_cooldown_minutes: int = Field(0, ge=0, le=1440)

    # Ações
    actions: List[RoutineActionCreate] = Field(..., min_length=1)

    @field_validator('trigger_time', 'week_days')
    def validate_time_trigger(cls, v, info):
        """Valida campos obrigatórios para trigger de horário"""
        if info.data.get('trigger_type') == TriggerType.TIME:
            field_name = info.field_name
            if field_name == 'trigger_time' and not v:
                raise ValueError("trigger_time é obrigatório para rotinas com gatilho de horário")
            if field_name == 'week_days' and not v:
                raise ValueError("week_days é obrigatório para rotinas com gatilho de horário")
        return v

    @field_validator('trigger_routine_id')
    def validate_routine_trigger(cls, v, info):
        """Valida campos obrigatórios para trigger de rotina"""
        if info.data.get('trigger_type') == TriggerType.ROUTINE_COMPLETE:
            if not v:
                raise ValueError("trigger_routine_id é obrigatório para rotinas com gatilho de rotina")
        return v

    @field_validator('trigger_device_id', 'trigger_device_state')
    def validate_device_trigger(cls, v, info):
        """Valida campos obrigatórios para trigger de dispositivo"""
        if info.data.get('trigger_type') == TriggerType.DEVICE_STATE:
            field_name = info.field_name
            if not v:
                raise ValueError(f"{field_name} é obrigatório para rotinas com gatilho de dispositivo")
        return v


class RoutineUpdate(BaseModel):
    """Schema para atualizar rotina"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    is_active: Optional[bool] = None
    trigger_type: Optional[TriggerType] = None
    trigger_time: Optional[time] = None
    week_days: Optional[List[WeekDay]] = None
    trigger_routine_id: Optional[UUID] = None
    trigger_device_id: Optional[UUID] = None
    trigger_device_state: Optional[TriggerDeviceState] = None
    trigger_cooldown_minutes: Optional[int] = Field(None, ge=0, le=1440)
    actions: Optional[List[RoutineActionCreate]] = None

    @model_validator(mode='after')
    def validate_trigger_fields(self) -> 'RoutineUpdate':
        """Valida campos obrigatórios quando trigger_type é alterado"""
        if self.trigger_type is not None:
            if self.trigger_type == TriggerType.TIME:
                if self.trigger_time is None:
                    raise ValueError("trigger_time é obrigatório ao mudar para gatilho de horário")
                if self.week_days is None or len(self.week_days) == 0:
                    raise ValueError("week_days é obrigatório ao mudar para gatilho de horário")
            elif self.trigger_type == TriggerType.ROUTINE_COMPLETE:
                if self.trigger_routine_id is None:
                    raise ValueError("trigger_routine_id é obrigatório ao mudar para gatilho de rotina")
            elif self.trigger_type == TriggerType.DEVICE_STATE:
                if self.trigger_device_id is None:
                    raise ValueError("trigger_device_id é obrigatório ao mudar para gatilho de dispositivo")
        return self


class RoutineToggle(BaseModel):
    """Schema para ativar/desativar rotina"""
    is_active: bool


class RoutineResponse(RoutineBase):
    """Response de rotina"""
    id: UUID
    is_active: bool
    trigger_time: Optional[time] = None
    week_days: List[WeekDay]
    trigger_routine_id: Optional[UUID] = None
    trigger_device_id: Optional[UUID] = None
    trigger_device_state: Optional[TriggerDeviceState] = None
    trigger_cooldown_minutes: int
    actions: List[RoutineActionResponse]
    last_executed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RoutineExecuteResponse(BaseModel):
    """Response de execução de rotina"""
    routine_id: UUID
    executed_actions: int
    failed_actions: int
    execution_time_ms: int
    executed_at: datetime
    results: List[dict]