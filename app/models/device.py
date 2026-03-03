"""
Device Model - Dispositivos IoT (Tuya e SNMP)
"""
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.enums import DeviceType, DeviceStatus, DeviceIcon


class Device(BaseModel):
    """
    Modelo de dispositivo IoT
    Suporta: Tuya (tomadas inteligentes) e SNMP (réguas de tomadas)
    """
    __tablename__ = "devices"

    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,  # nullable until migration 0004 runs
        index=True,
    )

    # Campos básicos
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    type = Column(SQLEnum(DeviceType), nullable=False, index=True)
    icon = Column(SQLEnum(DeviceIcon), default=DeviceIcon.PLUG, nullable=False)
    is_on = Column(Boolean, default=False, nullable=False)
    status = Column(SQLEnum(DeviceStatus), default=DeviceStatus.OFFLINE, nullable=False, index=True)

    # Campos específicos do Tuya
    device_id = Column(String(255), nullable=True)  # Device ID do Tuya
    local_key = Column(String(255), nullable=True)  # Local Key do Tuya

    # Campos específicos do SNMP
    ip = Column(INET, nullable=True)  # IP do dispositivo SNMP
    community_string = Column(String(255), nullable=True)  # Community string
    port = Column(Integer, default=161, nullable=True)  # Porta SNMP (padrão 161)
    snmp_base_oid = Column(String(255), nullable=True)  # OID base para o dispositivo
    snmp_outlet_number = Column(Integer, nullable=True)  # Número da tomada (1-10)

    # Relacionamentos
    user = relationship("User", back_populates="devices")

    routine_actions = relationship(
        "RoutineAction",
        back_populates="device",
        cascade="all, delete-orphan"
    )

    activity_logs = relationship(
        "ActivityLog",
        back_populates="device",
        foreign_keys="[ActivityLog.device_id]"
    )

    # Rotinas que usam este device como gatilho
    triggered_routines = relationship(
        "Routine",
        back_populates="trigger_device",
        foreign_keys="[Routine.trigger_device_id]"
    )

    def __repr__(self):
        return f"<Device(name={self.name}, type={self.type}, status={self.status})>"

    @property
    def is_tuya(self) -> bool:
        """Verifica se é dispositivo Tuya"""
        return self.type == DeviceType.TUYA

    @property
    def is_snmp(self) -> bool:
        """Verifica se é dispositivo SNMP"""
        return self.type == DeviceType.SNMP

    def validate_tuya_fields(self) -> bool:
        """Valida se campos Tuya estão preenchidos"""
        if self.is_tuya:
            return bool(self.device_id and self.local_key)
        return True

    def validate_snmp_fields(self) -> bool:
        """Valida se campos SNMP estão preenchidos"""
        if self.is_snmp:
            return bool(
                self.ip
                and self.community_string
                and self.snmp_base_oid
                and self.snmp_outlet_number
            )
        return True