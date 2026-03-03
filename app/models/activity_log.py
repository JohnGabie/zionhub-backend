"""
ActivityLog Model - Histórico de atividades
"""
from sqlalchemy import Column, String, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.enums import ActivityType


class ActivityLog(BaseModel):
    """
    Modelo de log de atividade
    Registra todas as ações do sistema
    """
    __tablename__ = "activity_logs"

    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,  # nullable until migration 0004 runs
        index=True,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    type = Column(SQLEnum(ActivityType), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Referências opcionais (snapshot dos nomes)
    device_id = Column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    device_name = Column(String(255), nullable=True)  # Snapshot do nome

    routine_id = Column(
        UUID(as_uuid=True),
        ForeignKey("routines.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    routine_name = Column(String(255), nullable=True)  # Snapshot do nome

    # Relacionamentos
    user = relationship("User", back_populates="activity_logs")
    device = relationship("Device", back_populates="activity_logs", foreign_keys=[device_id])
    routine = relationship("Routine", back_populates="activity_logs", foreign_keys=[routine_id])

    def __repr__(self):
        return f"<ActivityLog(type={self.type}, title={self.title})>"