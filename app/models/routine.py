"""
Routine & RoutineAction Models - Rotinas automatizadas
"""
from sqlalchemy import Column, String, Boolean, Integer, Time, ForeignKey, Enum as SQLEnum, DateTime
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.enums import TriggerType, WeekDay, TriggerDeviceState


class Routine(BaseModel):
    """
    Modelo de rotina automatizada
    Pode ser disparada por: horário, manual, outra rotina, estado de device
    """
    __tablename__ = "routines"

    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,  # nullable until migration 0004 runs
        index=True,
    )

    # Campos básicos
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=False, nullable=False, index=True)
    trigger_type = Column(SQLEnum(TriggerType), nullable=False, index=True)

    # Gatilho: Horário agendado
    trigger_time = Column(Time, nullable=True)
    week_days = Column(ARRAY(SQLEnum(WeekDay)), default=[], nullable=False)

    # Gatilho: Após outra rotina completar
    trigger_routine_id = Column(
        UUID(as_uuid=True),
        ForeignKey("routines.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Gatilho: Mudança de estado de dispositivo
    trigger_device_id = Column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    trigger_device_state = Column(SQLEnum(TriggerDeviceState), nullable=True)
    trigger_cooldown_minutes = Column(Integer, default=0, nullable=False)  # Cooldown para evitar spam

    # Execução
    last_executed_at = Column(DateTime(timezone=True), nullable=True)

    # Relacionamentos
    user = relationship("User", back_populates="routines")

    actions = relationship(
        "RoutineAction",
        back_populates="routine",
        cascade="all, delete-orphan",
        order_by="RoutineAction.order"
    )

    # Rotina que dispara esta (self-reference)
    # Não usar backref aqui para evitar ambiguidade
    trigger_routine = relationship(
        "Routine",
        remote_side="Routine.id",  # ID da rotina remota
        foreign_keys=[trigger_routine_id],
        uselist=False,  # Apenas UMA rotina trigger
        post_update=True  # Permite circular reference
    )

    # Rotinas que são disparadas por esta rotina (inverso)
    triggered_by_this = relationship(
        "Routine",
        remote_side="Routine.trigger_routine_id",
        foreign_keys="Routine.trigger_routine_id",
        uselist=True,  # Lista de rotinas
        overlaps="trigger_routine"  # Indica sobreposição intencional
    )

    # Dispositivo que dispara esta rotina
    trigger_device = relationship(
        "Device",
        back_populates="triggered_routines",
        foreign_keys=[trigger_device_id]
    )

    activity_logs = relationship(
        "ActivityLog",
        back_populates="routine",
        foreign_keys="[ActivityLog.routine_id]"
    )

    def __repr__(self):
        return f"<Routine(name={self.name}, type={self.trigger_type}, active={self.is_active})>"

    @property
    def is_time_trigger(self) -> bool:
        return self.trigger_type == TriggerType.TIME

    @property
    def is_manual_trigger(self) -> bool:
        return self.trigger_type == TriggerType.MANUAL

    @property
    def is_routine_trigger(self) -> bool:
        return self.trigger_type == TriggerType.ROUTINE_COMPLETE

    @property
    def is_device_trigger(self) -> bool:
        return self.trigger_type == TriggerType.DEVICE_STATE


class RoutineAction(BaseModel):
    """
    Ação individual de uma rotina
    Controla um dispositivo específico
    """
    __tablename__ = "routine_actions"

    routine_id = Column(
        UUID(as_uuid=True),
        ForeignKey("routines.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    device_id = Column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    turn_on = Column(Boolean, nullable=False)  # True = ligar, False = desligar
    order = Column(Integer, nullable=False, default=1)  # Ordem de execução
    delay = Column(Integer, nullable=False, default=0)  # Delay em segundos antes de executar

    # Relacionamentos
    routine = relationship("Routine", back_populates="actions")
    device = relationship("Device", back_populates="routine_actions")

    def __repr__(self):
        return f"<RoutineAction(device={self.device_id}, turn_on={self.turn_on}, order={self.order})>"