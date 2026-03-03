"""
Device Schemas - DTOs para dispositivos IoT
"""
from pydantic import BaseModel, Field, IPvAnyAddress, field_validator
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.schemas.common import DeviceType, DeviceStatus, DeviceIcon


# ============= REQUEST SCHEMAS =============

class DeviceCreate(BaseModel):
    """Schema para criar dispositivo"""
    name: str = Field(..., min_length=1, max_length=255)
    type: DeviceType
    icon: DeviceIcon = DeviceIcon.PLUG

    # Tuya fields
    device_id: Optional[str] = Field(None, max_length=255)
    local_key: Optional[str] = Field(None, max_length=255)

    # SNMP fields
    ip: Optional[str] = None
    community_string: Optional[str] = Field(None, max_length=255)
    port: Optional[int] = Field(161, ge=1, le=65535)
    snmp_base_oid: Optional[str] = Field(None, max_length=255)
    snmp_outlet_number: Optional[int] = Field(None, ge=1, le=10)

    @field_validator('device_id', 'local_key')
    def validate_tuya_fields(cls, v, info):
        """Valida campos Tuya se type=tuya"""
        if info.data.get('type') == DeviceType.TUYA:
            if not v:
                raise ValueError(f"{info.field_name} é obrigatório para dispositivos Tuya")
        return v

    @field_validator('ip', 'community_string', 'snmp_base_oid', 'snmp_outlet_number')
    def validate_snmp_fields(cls, v, info):
        """Valida campos SNMP se type=snmp"""
        if info.data.get('type') == DeviceType.SNMP:
            if not v:
                raise ValueError(f"{info.field_name} é obrigatório para dispositivos SNMP")
        return v


class DeviceUpdate(BaseModel):
    """Schema para atualizar dispositivo"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    icon: Optional[DeviceIcon] = None

    # Campos Tuya (opcional)
    device_id: Optional[str] = None
    local_key: Optional[str] = None

    # Campos SNMP (opcional)
    ip: Optional[str] = None
    community_string: Optional[str] = None
    port: Optional[int] = Field(None, ge=1, le=65535)
    snmp_base_oid: Optional[str] = None
    snmp_outlet_number: Optional[int] = Field(None, ge=1, le=10)


class DeviceToggle(BaseModel):
    """Schema para alternar estado do dispositivo"""
    state: bool


# ============= RESPONSE SCHEMAS =============

class DeviceResponse(BaseModel):
    """Response de dispositivo"""
    id: UUID
    name: str
    type: DeviceType
    icon: DeviceIcon
    is_on: bool
    status: DeviceStatus

    # Tuya
    device_id: Optional[str] = None
    local_key: Optional[str] = None

    # SNMP
    ip: Optional[str] = None
    community_string: Optional[str] = None
    port: Optional[int] = None
    snmp_base_oid: Optional[str] = None
    snmp_outlet_number: Optional[int] = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DeviceToggleResponse(BaseModel):
    """Response de toggle"""
    device_id: UUID
    new_state: bool
    executed_at: datetime


class DeviceToggleAllResponse(BaseModel):
    """Response de toggle all"""
    toggled_count: int
    failed_count: int
    new_state: bool
    failed_devices: list[UUID] = []