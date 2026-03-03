"""
User Model - Usuários do sistema
"""
from sqlalchemy import Column, String, Boolean, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.enums import UserRole


class User(BaseModel):
    """
    Modelo de usuário
    Relacionamentos:
    - devices: Lista de dispositivos do usuário
    - routines: Lista de rotinas do usuário
    - activity_logs: Histórico de atividades
    """
    __tablename__ = "users"

    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,  # nullable until migration 0004 runs
        index=True,
    )

    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)

    # Relacionamentos (lazy loading)
    devices = relationship(
        "Device",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select"
    )

    routines = relationship(
        "Routine",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select"
    )

    activity_logs = relationship(
        "ActivityLog",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select"
    )

    def __repr__(self):
        return f"<User(email={self.email}, name={self.name})>"