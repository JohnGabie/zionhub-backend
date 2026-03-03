"""
Users Endpoints - CRUD admin-only (async)
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_admin, get_current_org
from app.crud.user import crud_user
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserPasswordReset
from app.schemas.common import ApiResponse
from app.models.user import User

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=ApiResponse[List[UserResponse]])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin),
    org=Depends(get_current_org),
):
    users = await crud_user.get_by_org(db, organization_id=org.id, skip=skip, limit=limit)
    return ApiResponse(success=True, data=[UserResponse.model_validate(u) for u in users])


@router.get("/{user_id}", response_model=ApiResponse[UserResponse])
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin),
):
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return ApiResponse(success=True, data=UserResponse.model_validate(user))


@router.post("", response_model=ApiResponse[UserResponse], status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin),
):
    existing = await crud_user.get_by_email(db, email=user_in.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já está em uso")
    user = await crud_user.create(db, obj_in=user_in)
    return ApiResponse(success=True, data=UserResponse.model_validate(user), message="Usuário criado com sucesso")


@router.put("/{user_id}", response_model=ApiResponse[UserResponse])
async def update_user(
    user_id: UUID,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin),
):
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    if user_in.email:
        existing = await crud_user.get_by_email(db, email=user_in.email)
        if existing and existing.id != user_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já está em uso")
    updated = await crud_user.update(db, db_obj=user, obj_in=user_in)
    return ApiResponse(success=True, data=UserResponse.model_validate(updated), message="Usuário atualizado com sucesso")


@router.put("/{user_id}/password", response_model=ApiResponse[UserResponse])
async def reset_user_password(
    user_id: UUID,
    body: UserPasswordReset,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin),
):
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    updated = await crud_user.update_password(db, user=user, new_password=body.new_password)
    return ApiResponse(success=True, data=UserResponse.model_validate(updated), message="Senha alterada com sucesso")


@router.delete("/{user_id}", response_model=ApiResponse[UserResponse])
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não é possível deletar a si mesmo")
    user = await crud_user.delete(db, id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return ApiResponse(success=True, data=UserResponse.model_validate(user), message="Usuário deletado com sucesso")
