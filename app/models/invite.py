"""
InviteToken model - Convites para novas organizações
"""
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class InviteToken(BaseModel):
    __tablename__ = "invite_tokens"

    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    email = Column(String(255), nullable=False, index=True)

    # UUID v4 hex — único e indexado para lookup rápido
    token = Column(String(255), nullable=False, unique=True, index=True)

    expires_at = Column(DateTime(timezone=True), nullable=False)

    # NULL = token ainda não utilizado
    used_at = Column(DateTime(timezone=True), nullable=True)

    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
