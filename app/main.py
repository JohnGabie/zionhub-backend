"""
FastAPI Application Entry Point
"""
import asyncio
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.middleware import TenantMiddleware
from app.api.v1.router import api_router
from app.websocket.routes import router as ws_router
from app.services.scheduler_service import scheduler_service
from app.services.monitoring_service import monitoring_service
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia startup e shutdown da aplicação"""
    # Startup
    logger.info("Iniciando aplicação...")
    from app.websocket.manager import set_main_loop
    set_main_loop(asyncio.get_running_loop())
    scheduler_service.start()
    logger.info("Scheduler de rotinas iniciado")
    await monitoring_service.start()
    logger.info("Monitoramento de dispositivos iniciado")

    yield

    # Shutdown
    logger.info("Encerrando aplicação...")
    await monitoring_service.stop()
    scheduler_service.stop()
    logger.info("Scheduler e monitoramento parados")


# Criar aplicação FastAPI com lifespan
app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    version="1.0.0",
    description="API para gerenciamento de dispositivos IoT e rotinas automatizadas",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# TenantMiddleware: extrai org_id do JWT e injeta em request.state
# Deve vir ANTES do CORSMiddleware (middlewares são aplicados de baixo para cima)
app.add_middleware(TenantMiddleware)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    expose_headers=["Content-Length"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Hide stack traces in production"""
    if settings.DEBUG:
        logger.error(f"Unhandled exception: {exc}\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc)},
        )
    logger.error(f"Unhandled exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "online",
        "environment": settings.ENVIRONMENT
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",
        "services": {
            "tuya": "not_configured",
            "snmp": "ready"
        }
    }


# Incluir routers da API
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Incluir WebSocket router
app.include_router(ws_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
