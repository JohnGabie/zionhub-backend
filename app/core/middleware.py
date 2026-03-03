"""
TenantMiddleware - Extrai org_id do JWT e injeta em request.state
Suporta dois modos:
  1. JWT (apps internos): org_id vem do payload do token Authorization
  2. Host header (landpage): lookup por custom_domain feito no endpoint público
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.core.security import decode_access_token


class TenantMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):
        # Modo JWT: extrair org_id do Authorization header
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
            payload = decode_access_token(token)
            if payload:
                org_id = payload.get("org_id")
                org_slug = payload.get("org_slug")
                if org_id:
                    request.state.org_id = org_id
                    request.state.org_slug = org_slug

        return await call_next(request)
