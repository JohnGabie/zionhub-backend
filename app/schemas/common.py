"""
Common schemas - Responses genéricas e enums
"""
from typing import TypeVar, Generic, Optional, Any
from pydantic import BaseModel

# Re-exportar enums para uso nos schemas
from app.models.enums import (
    DeviceType,
    DeviceStatus,
    DeviceIcon,
    TriggerType,
    WeekDay,
    TriggerDeviceState,
    ActivityType,
    UserRole
)

T = TypeVar('T')


class ApiResponse(BaseModel, Generic[T]):
    """Response padrão da API"""
    success: bool
    data: Optional[T] = None
    message: Optional[str] = None
    error: Optional[str] = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Response paginada"""
    items: list[T]
    total: int
    limit: int
    offset: int