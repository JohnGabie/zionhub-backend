"""
Organization Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.deps import get_db, get_current_user, get_current_org, get_current_active_admin
from app.models.user import User
from app.models.organization import Organization
from app.crud.organization import crud_organization
from app.schemas.organization import OrganizationResponse, OrganizationCreate, OrganizationUpdate
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("/me", response_model=ApiResponse[OrganizationResponse])
async def get_my_organization(
    org: Organization = Depends(get_current_org),
):
    """Retorna a organização do usuário autenticado."""
    return ApiResponse(success=True, data=OrganizationResponse.model_validate(org))


@router.get("/me/modules", response_model=ApiResponse[List[str]])
async def get_my_modules(
    org: Organization = Depends(get_current_org),
):
    """Retorna a lista de módulos contratados pela organização."""
    from app.models.organization import PLAN_MODULES
    modules = PLAN_MODULES.get(org.plan, [])
    return ApiResponse(success=True, data=modules)


@router.get("/domain/{domain}", response_model=ApiResponse[OrganizationResponse])
async def get_organization_by_domain(
    domain: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Lookup público por domínio customizado.
    Usado pelo app landpage para descobrir qual organização corresponde ao hostname.
    """
    org = await crud_organization.get_by_domain(db, domain=domain)
    if not org or not org.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organização não encontrada para este domínio",
        )
    return ApiResponse(success=True, data=OrganizationResponse.model_validate(org))


@router.post("", response_model=ApiResponse[OrganizationResponse], status_code=status.HTTP_201_CREATED)
async def create_organization(
    org_in: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin),
):
    """Cria uma nova organização (admin-only)."""
    existing = await crud_organization.get_by_slug(db, slug=org_in.slug)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug já está em uso")
    org = await crud_organization.create(db, obj_in=org_in)
    return ApiResponse(
        success=True,
        data=OrganizationResponse.model_validate(org),
        message="Organização criada com sucesso",
    )


@router.put("/me", response_model=ApiResponse[OrganizationResponse])
async def update_my_organization(
    org_in: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    org: Organization = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
):
    """Atualiza a organização atual (apenas owner ou admin)."""
    from app.models.enums import UserRole
    if current_user.role != UserRole.ADMIN and org.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão para editar a organização")
    updated = await crud_organization.update(db, db_obj=org, obj_in=org_in)
    return ApiResponse(
        success=True,
        data=OrganizationResponse.model_validate(updated),
        message="Organização atualizada com sucesso",
    )
