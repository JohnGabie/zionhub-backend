"""
Models package - Importa todos os models para o Alembic detectar
IMPORTANTE: Manter essa ordem para evitar problemas de dependência circular
"""
from app.models.base import BaseModel
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
from app.models.user import User
from app.models.device import Device
from app.models.routine import Routine, RoutineAction
from app.models.activity_log import ActivityLog
from app.models.device_session import DeviceSession, TriggerSource
from app.models.organization import Organization, PlanType
from app.models.invite import InviteToken

__all__ = [
    "BaseModel",
    "DeviceType",
    "DeviceStatus",
    "DeviceIcon",
    "TriggerType",
    "WeekDay",
    "TriggerDeviceState",
    "ActivityType",
    "UserRole",
    "User",
    "Device",
    "Routine",
    "RoutineAction",
    "ActivityLog",
    "DeviceSession",
    "TriggerSource",
    "Organization",
    "PlanType",
    "InviteToken",
]