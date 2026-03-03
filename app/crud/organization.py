"""
CRUD Organization (SQLAlchemy 2.0 async)
"""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.crud.base import CRUDBase
from app.models.organization import Organization
from app.schemas.organization import OrganizationCreate, OrganizationUpdate


class CRUDOrganization(CRUDBase[Organization, OrganizationCreate, OrganizationUpdate]):

    async def get_by_slug(self, db: AsyncSession, *, slug: str) -> Optional[Organization]:
        result = await db.execute(select(Organization).where(Organization.slug == slug))
        return result.scalar_one_or_none()

    async def get_by_domain(self, db: AsyncSession, *, domain: str) -> Optional[Organization]:
        result = await db.execute(
            select(Organization).where(Organization.custom_domain == domain)
        )
        return result.scalar_one_or_none()


crud_organization = CRUDOrganization(Organization)
