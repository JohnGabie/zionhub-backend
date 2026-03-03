"""
Serviço para controle de dispositivos Tuya
Baseado no seu protótipo funcional
"""
from typing import Optional
from tuya_connector import TuyaOpenAPI
from app.core.config import settings
from app.utils.logger import logger


class TuyaService:
    """Gerencia conexão e comandos para dispositivos Tuya"""

    def __init__(self):
        self._api: Optional[TuyaOpenAPI] = None
        self.endpoint = "https://openapi.tuyaus.com"

    @property
    def api(self) -> TuyaOpenAPI:
        """Lazy loading da API (conecta apenas quando necessário)"""
        if self._api is None:
            if not settings.TUYA_API_KEY or not settings.TUYA_API_SECRET:
                raise ValueError("Credenciais Tuya não configuradas no .env")

            self._api = TuyaOpenAPI(
                self.endpoint,
                settings.TUYA_API_KEY,
                settings.TUYA_API_SECRET
            )
            self._api.connect()
            logger.info("Conexão Tuya estabelecida")

        return self._api

    def ligar(self, device_id: str) -> bool:
        """
        Liga um dispositivo Tuya

        Args:
            device_id: ID do dispositivo Tuya

        Returns:
            bool: True se sucesso, False se erro
        """
        try:
            payload = {
                "commands": [
                    {"code": "switch_1", "value": True}
                ]
            }

            resp = self.api.post(
                f"/v1.0/iot-03/devices/{device_id}/commands",
                payload
            )

            success = resp.get("success", False)

            if success:
                logger.info(f"Dispositivo Tuya {device_id} ligado com sucesso")
            else:
                logger.error(f"Erro ao ligar Tuya {device_id}: {resp}")

            return success

        except Exception as e:
            logger.error(f"Exceção ao ligar Tuya {device_id}: {e}")
            return False

    def desligar(self, device_id: str) -> bool:
        """
        Desliga um dispositivo Tuya

        Args:
            device_id: ID do dispositivo Tuya

        Returns:
            bool: True se sucesso, False se erro
        """
        try:
            payload = {
                "commands": [
                    {"code": "switch_1", "value": False}
                ]
            }

            resp = self.api.post(
                f"/v1.0/iot-03/devices/{device_id}/commands",
                payload
            )

            success = resp.get("success", False)

            if success:
                logger.info(f"Dispositivo Tuya {device_id} desligado com sucesso")
            else:
                logger.error(f"Erro ao desligar Tuya {device_id}: {resp}")

            return success

        except Exception as e:
            logger.error(f"Exceção ao desligar Tuya {device_id}: {e}")
            return False

    def get_status(self, device_id: str) -> Optional[bool]:
        """
        Obtém status de um dispositivo Tuya

        Args:
            device_id: ID do dispositivo Tuya

        Returns:
            bool: True se ligado, False se desligado, None se erro
        """
        try:
            resp = self.api.get(f"/v1.0/iot-03/devices/{device_id}/status")

            if not resp.get("success"):
                logger.error(f"Erro ao obter status Tuya {device_id}: {resp}")
                return None

            # Procurar switch_1 na resposta
            for item in resp.get("result", []):
                if item["code"] == "switch_1":
                    is_on = bool(item["value"])
                    logger.debug(f"Status Tuya {device_id}: {'ON' if is_on else 'OFF'}")
                    return is_on

            logger.warning(f"switch_1 não encontrado para Tuya {device_id}")
            return None

        except Exception as e:
            logger.error(f"Exceção ao obter status Tuya {device_id}: {e}")
            return None

    def check_connection(self) -> bool:
        """Verifica se a conexão Tuya está ativa"""
        try:
            # Tenta acessar a API para verificar conexão
            self.api
            return True
        except Exception as e:
            logger.error(f"Erro na conexão Tuya: {e}")
            return False


# Instância global (singleton)
tuya_service = TuyaService()