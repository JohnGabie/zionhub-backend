"""
DeviceSession Model - Rastreamento de sessões de dispositivos
Registra quando um dispositivo foi ligado/desligado e por quanto tempo
"""
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class TriggerSource(str, enum.Enum):
    """Fonte que acionou a mudança de estado"""
    MANUAL = "manual"           # Usuário clicou
    ROUTINE = "routine"         # Execução de rotina
    SCHEDULED = "scheduled"     # Agendamento
    MASTER_SWITCH = "master_switch"  # Liga/desliga todos


class DeviceSession(BaseModel):
    """
    Modelo de sessão de dispositivo
    Registra períodos em que dispositivos ficaram ligados
    """
    __tablename__ = "device_sessions"

    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,  # nullable until migration 0004 runs
        index=True,
    )

    # Referências
    device_id = Column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Snapshot do nome (para histórico mesmo se device for deletado)
    device_name = Column(String(255), nullable=False)

    # Tempos
    started_at = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )

    ended_at = Column(
        DateTime(timezone=True),
        nullable=True,  # NULL se ainda está ligado
        index=True
    )

    # Duração em segundos (calculada ao finalizar)
    duration_seconds = Column(Integer, nullable=True)

    # Fonte que iniciou a sessão
    trigger_source = Column(
        SQLEnum(TriggerSource),
        default=TriggerSource.MANUAL,
        nullable=False
    )

    # Relacionamentos
    device = relationship("Device", backref="sessions")
    user = relationship("User", backref="device_sessions")

    def __repr__(self):
        status = "active" if self.ended_at is None else f"ended ({self.duration_seconds}s)"
        return f"<DeviceSession(device={self.device_name}, {status})>"

    @property
    def is_active(self) -> bool:
        """Verifica se a sessão ainda está ativa (dispositivo ligado)"""
        return self.ended_at is None

    def end_session(self, ended_at) -> int:
        """
        Finaliza a sessão e calcula a duração

        Args:
            ended_at: datetime quando o dispositivo foi desligado

        Returns:
            int: duração em segundos
        """
        self.ended_at = ended_at
        self.duration_seconds = int((ended_at - self.started_at).total_seconds())
        return self.duration_seconds
