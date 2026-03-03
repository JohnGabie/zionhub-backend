"""
Configurações da aplicação usando Pydantic Settings
Carrega variáveis do arquivo .env automaticamente
Prioridade: variáveis de ambiente > arquivo .env
"""
import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


def find_env_file() -> Optional[str]:
    """
    Procura o arquivo .env em locais comuns.
    Retorna None se não encontrar (usa apenas variáveis de ambiente)
    """
    possible_paths = [
        Path(__file__).parent.parent.parent.parent / ".env",  # /app/../.env -> raiz do projeto
        Path("/app/.env"),
        Path(".env"),
        Path("../.env"),
    ]
    for path in possible_paths:
        if path.exists():
            return str(path)
    return None


class Settings(BaseSettings):
    """Settings da aplicação"""

    # Application
    APP_NAME: str = "Rotina Inteligente API"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    API_V1_PREFIX: str = "/api/v1"

    # Database - valor padrão explícito como fallback
    DATABASE_URL: str = "postgresql://rotina_user:rotina_password@localhost:5432/rotina_inteligente_db"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    @property
    def allowed_origins_list(self) -> List[str]:
        """Converte string de origins em lista"""
        if not self.ALLOWED_ORIGINS:
            return []
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    # Tuya
    TUYA_REGION: str = "us"
    TUYA_API_KEY: str = ""
    TUYA_API_SECRET: str = ""

    # SNMP
    SNMP_TIMEOUT: int = 5
    SNMP_RETRIES: int = 3

    # Monitoring
    DEVICE_CHECK_INTERVAL: int = 30
    MAX_ROUTINE_RETRIES: int = 3

    # Logging
    LOG_LEVEL: str = "INFO"

    # Timezone
    TIMEZONE: str = "America/Sao_Paulo"

    # --- CONFIGURAÇÃO ---
    # Variáveis de ambiente do Docker têm prioridade sobre arquivo .env
    model_config = SettingsConfigDict(
        env_file=find_env_file(),
        env_file_encoding="utf-8",
        extra="ignore"
    )


# Instância global de settings
settings = Settings()

