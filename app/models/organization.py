"""
Organization model - Multi-tenant SaaS
"""
import enum
from sqlalchemy import Column, String, Boolean, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class PlanType(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    CUSTOM = "custom"


PLAN_MODULES = {
    PlanType.FREE: [],
    PlanType.STARTER: ["rotina_inteligente"],
    PlanType.PRO: ["rotina_inteligente", "mix_page"],
    PlanType.CUSTOM: ["rotina_inteligente", "mix_page", "secretaria"],
}


class Organization(BaseModel):
    __tablename__ = "organizations"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_organizations_slug"),
        UniqueConstraint("custom_domain", name="uq_organizations_custom_domain"),
    )

    name = Column(String(255), nullable=False)

    # slug é imutável após a criação — não expor setter
    slug = Column(String(100), nullable=False, index=True)

    # NULL = sem landpage customizada
    custom_domain = Column(String(255), nullable=True, index=True)

    plan = Column(
        Enum(PlanType, name="plantype"),
        nullable=False,
        default=PlanType.FREE,
    )

    is_active = Column(Boolean, nullable=False, default=True)

    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    def has_module(self, module_name: str) -> bool:
        return module_name in PLAN_MODULES.get(self.plan, [])
