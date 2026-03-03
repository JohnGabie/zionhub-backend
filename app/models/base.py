"""
Base Model com campos comuns (id, timestamps)
Todos os models herdam desta classe
"""
from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from zoneinfo import ZoneInfo
import uuid
from app.core.database import Base

# Timezone de São Paulo
SAO_PAULO_TZ = ZoneInfo("America/Sao_Paulo")


def now_sao_paulo():
    """Retorna datetime atual no timezone de São Paulo"""
    return datetime.now(SAO_PAULO_TZ)


class BaseModel(Base):
    """
    Classe base abstrata para todos os models
    Fornece: id UUID, created_at, updated_at
    """
    __abstract__ = True

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
        index=True
    )

    created_at = Column(
        DateTime(timezone=True),
        default=now_sao_paulo,
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=now_sao_paulo,
        onupdate=now_sao_paulo,
        nullable=False
    )

    def __repr__(self):
        """Representação string do objeto"""
        return f"<{self.__class__.__name__}(id={self.id})>"