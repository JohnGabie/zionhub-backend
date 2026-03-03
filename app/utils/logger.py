"""
Configuração de logging para a aplicação
"""
import logging
import sys
from app.core.config import settings

# Configurar formato do log
log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
date_format = "%Y-%m-%d %H:%M:%S"

# Criar handler para console
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(logging.Formatter(log_format, date_format))

# Configurar logger principal
logger = logging.getLogger("rotina_inteligente")
logger.setLevel(getattr(logging, settings.LOG_LEVEL))
logger.addHandler(console_handler)

# Prevenir propagação para loggers pais
logger.propagate = False