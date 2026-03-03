"""
Organization Schemas
"""
from typing import Optional
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.models.organization import PlanType


class OrganizationCreate(BaseModel):
    name: str
    slug: str
    custom_domain: Optional[str] = None
    plan: PlanType = PlanType.FREE


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    custom_domain: Optional[str] = None
    plan: Optional[PlanType] = None
    is_active: Optional[bool] = None


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    custom_domain: Optional[str]
    plan: PlanType
    is_active: bool
    owner_id: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True
