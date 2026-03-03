"""
User Schemas - DTOs para autenticação e usuários
"""
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime
from app.schemas.common import UserRole


# ============= REQUEST SCHEMAS =============

class UserLogin(BaseModel):
    """Schema para login"""
    email: EmailStr
    password: str = Field(..., min_length=3)


class UserCreate(BaseModel):
    """Schema para criar usuário"""
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=6, max_length=100)
    role: UserRole = UserRole.USER


class UserUpdate(BaseModel):
    """Schema para atualizar usuário"""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None


class UserPasswordReset(BaseModel):
    """Schema para forçar troca de senha (admin)"""
    new_password: str = Field(..., min_length=6, max_length=100)


# ============= RESPONSE SCHEMAS =============

class UserBase(BaseModel):
    """Schema base de usuário (sem senha)"""
    id: UUID
    email: str
    name: str
    is_active: bool
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True  # Permite criar de ORM models


class UserResponse(UserBase):
    """Response completo de usuário"""
    pass


class LoginResponse(BaseModel):
    """Response do login com token JWT"""
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: UserResponse
