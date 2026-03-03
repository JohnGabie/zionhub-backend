"""
Activity Log Schemas - DTOs para logs de atividade
"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.schemas.common import ActivityType


class ActivityLogCreate(BaseModel):
    """Schema para criar log de atividade"""
    type: ActivityType
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    device_id: Optional[UUID] = None
    device_name: Optional[str] = None
    routine_id: Optional[UUID] = None
    routine_name: Optional[str] = None


class ActivityLogResponse(BaseModel):
    """Response de log de atividade"""
    id: UUID
    type: ActivityType
    title: str
    description: Optional[str] = None
    device_name: Optional[str] = None
    routine_name: Optional[str] = None
    timestamp: int  # Unix timestamp em millisegundos
    created_at: datetime

    class Config:
        from_attributes = True

    @staticmethod
    def from_orm_with_timestamp(log):
        """Converte ORM model para response com timestamp"""
        return ActivityLogResponse(
            id=log.id,
            type=log.type,
            title=log.title,
            description=log.description,
            device_name=log.device_name,
            routine_name=log.routine_name,
            timestamp=int(log.created_at.timestamp() * 1000),
            created_at=log.created_at
        )