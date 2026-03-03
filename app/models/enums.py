"""
Enums compartilhados entre Models e Schemas
Centralizado para evitar duplicação
"""
import enum


class DeviceType(str, enum.Enum):
    """Tipos de dispositivo suportados"""
    TUYA = "tuya"
    SNMP = "snmp"


class DeviceStatus(str, enum.Enum):
    """Status de conexão do dispositivo"""
    ONLINE = "online"
    OFFLINE = "offline"


class DeviceIcon(str, enum.Enum):
    """Ícones disponíveis para dispositivos"""
    PLUG = "plug"
    MONITOR = "monitor"
    TV = "tv"
    AIR_VENT = "air-vent"
    PRINTER = "printer"
    SERVER = "server"
    ROUTER = "router"
    LIGHTBULB = "lightbulb"
    CAMERA = "camera"
    COFFEE = "coffee"
    FAN = "fan"
    SPEAKER = "speaker"
    REFRIGERATOR = "refrigerator"


class TriggerType(str, enum.Enum):
    """Tipos de gatilho para rotinas"""
    TIME = "time"              # Horário agendado
    MANUAL = "manual"          # Execução manual
    ROUTINE_COMPLETE = "routine_complete"  # Após outra rotina
    DEVICE_STATE = "device_state"          # Mudança de estado


class WeekDay(str, enum.Enum):
    """Dias da semana"""
    SEG = "seg"
    TER = "ter"
    QUA = "qua"
    QUI = "qui"
    SEX = "sex"
    SAB = "sab"
    DOM = "dom"


class TriggerDeviceState(str, enum.Enum):
    """Estado do dispositivo para gatilho"""
    ON = "on"
    OFF = "off"


class ActivityType(str, enum.Enum):
    """Tipos de atividade para logs"""
    DEVICE_ON = "device_on"
    DEVICE_OFF = "device_off"
    DEVICE_ADDED = "device_added"
    DEVICE_UPDATED = "device_updated"
    DEVICE_DELETED = "device_deleted"
    ROUTINE_ACTIVATED = "routine_activated"
    ROUTINE_DEACTIVATED = "routine_deactivated"
    ROUTINE_CREATED = "routine_created"
    ROUTINE_UPDATED = "routine_updated"
    ROUTINE_DELETED = "routine_deleted"
    ROUTINE_EXECUTED = "routine_executed"
    MASTER_SWITCH = "master_switch"


class UserRole(str, enum.Enum):
    """Roles de usuário"""
    ADMIN = "admin"
    USER = "user"