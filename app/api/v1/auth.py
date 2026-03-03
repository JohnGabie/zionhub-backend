"""
Auth Endpoints - Login, Logout, Me
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.crud.user import crud_user
from app.crud.organization import crud_organization
from app.schemas.user import UserLogin, LoginResponse, UserResponse
from app.schemas.common import ApiResponse
from app.core.security import create_access_token
from app.core.config import settings
from app.core.rate_limit import limiter
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=ApiResponse[LoginResponse])
@limiter.limit("5/minute")
async def login(
    request: Request,
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    user = await crud_user.authenticate(db, email=credentials.email, password=credentials.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
        )

    if not crud_user.is_active(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo",
        )

    # Build JWT payload with org context
    token_data: dict = {"sub": str(user.id)}

    if user.organization_id:
        org = await crud_organization.get(db, id=user.organization_id)
        if org and org.is_active:
            token_data["org_id"] = str(org.id)
            token_data["org_slug"] = org.slug

    access_token = create_access_token(data=token_data)

    login_response = LoginResponse(
        access_token=access_token,
        token_type="Bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )

    return ApiResponse(success=True, data=login_response, message="Login realizado com sucesso")


@router.post("/logout", response_model=ApiResponse[None])
async def logout(current_user: User = Depends(get_current_user)):
    return ApiResponse(success=True, message="Logout realizado com sucesso")


@router.get("/me", response_model=ApiResponse[UserResponse])
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return ApiResponse(success=True, data=UserResponse.model_validate(current_user))
