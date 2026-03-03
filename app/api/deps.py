"""
API Dependencies (SQLAlchemy 2.0 async)
"""
from typing import AsyncGenerator, Callable
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.core.database import AsyncSessionLocal
from app.core.security import decode_access_token
from app.crud.user import crud_user
from app.models.user import User

security = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise credentials_exception

    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    user = await crud_user.get(db, id=user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    if not crud_user.is_active(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")

    return user


async def get_current_active_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    from app.models.enums import UserRole
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Privilégios de administrador necessários",
        )
    return current_user


async def get_current_org(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Resolve a organização do contexto atual (injetada pelo TenantMiddleware via JWT).
    Levanta 403 se não houver org_id no token.
    """
    from app.crud.organization import crud_organization
    from app.models.organization import Organization

    org_id_str = getattr(request.state, "org_id", None)
    if not org_id_str:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Contexto de organização ausente no token",
        )

    try:
        org_id = UUID(org_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="org_id inválido no token")

    org = await crud_organization.get(db, id=org_id)
    if not org or not org.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organização inativa ou não encontrada",
        )
    return org


def require_module(module_name: str) -> Callable:
    """
    Factory de dependency: verifica se o plano da organização inclui o módulo.

    Uso:
        @router.get("/endpoint")
        async def endpoint(org = Depends(require_module("rotina_inteligente"))):
            ...
    """
    async def checker(org=Depends(get_current_org)):
        if not org.has_module(module_name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Módulo '{module_name}' não disponível no plano atual",
            )
        return org
    return checker
