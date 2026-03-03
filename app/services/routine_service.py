"""
Routine Service - Execução de rotinas e lógica de negócio (async + SQLAlchemy 2.0)
device_service é sync e chamado via asyncio.to_thread()
"""
import asyncio
from typing import Tuple, List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import datetime
from zoneinfo import ZoneInfo

from app.models.enums import ActivityType
from app.crud.routine import crud_routine
from app.crud.activity_log import crud_activity_log
from app.services.device_service import device_service
from app.schemas.activity_log import ActivityLogCreate
from app.utils.logger import logger
from app.websocket.manager import manager

SAO_PAULO_TZ = ZoneInfo("America/Sao_Paulo")


def now_sao_paulo():
    return datetime.now(SAO_PAULO_TZ)


class RoutineService:

    async def execute_routine(
        self,
        db: AsyncSession,
        *,
        routine_id: UUID,
        user_id: Optional[UUID] = None,
    ) -> Tuple[bool, Dict]:
        routine = await crud_routine.get(db, id=routine_id)
        if not routine:
            return False, {"error": "Rotina não encontrada"}

        sorted_actions = sorted(routine.actions, key=lambda a: a.order)
        is_simultaneous = all(action.delay == 0 for action in sorted_actions)

        start_time = now_sao_paulo()
        results = []
        executed = 0
        failed = 0

        for idx, act in enumerate(sorted_actions):
            logger.info(f"  Ação {idx + 1}: device={act.device_id}, delay={act.delay}s, order={act.order}")

        logger.info(
            f"Executando rotina '{routine.name}' com {len(sorted_actions)} ações "
            f"({'simultâneas' if is_simultaneous else 'sequenciais'})"
        )

        if is_simultaneous:
            for action in sorted_actions:
                success, error_msg = await asyncio.to_thread(
                    device_service.toggle_device, device_id=action.device_id, state=action.turn_on
                )
                results.append({
                    "device_id": str(action.device_id),
                    "success": success,
                    "executed_at": now_sao_paulo().isoformat(),
                    "error": error_msg,
                })
                if success:
                    executed += 1
                    await manager.broadcast_event("device_toggled", {
                        "device_id": str(action.device_id),
                        "is_on": action.turn_on,
                    })
                else:
                    failed += 1
        else:
            for i, action in enumerate(sorted_actions):
                if action.delay > 0:
                    logger.info(f"Aguardando {action.delay}s antes da ação {i + 1}")
                    await asyncio.sleep(action.delay)

                success, error_msg = await asyncio.to_thread(
                    device_service.toggle_device, device_id=action.device_id, state=action.turn_on
                )
                logger.info(f"Ação {i + 1} executada: device={action.device_id}, success={success}")

                results.append({
                    "device_id": str(action.device_id),
                    "success": success,
                    "executed_at": now_sao_paulo().isoformat(),
                    "error": error_msg,
                })
                if success:
                    executed += 1
                    await manager.broadcast_event("device_toggled", {
                        "device_id": str(action.device_id),
                        "is_on": action.turn_on,
                    })
                else:
                    failed += 1

        end_time = now_sao_paulo()
        execution_time_ms = int((end_time - start_time).total_seconds() * 1000)

        await crud_routine.update_last_executed(db, routine_id=routine_id, executed_at=end_time)

        await self._create_execution_log(
            db,
            user_id=user_id or routine.user_id,
            routine=routine,
            executed=executed,
            failed=failed,
            execution_time_ms=execution_time_ms,
        )

        result_data = {
            "routine_id": str(routine_id),
            "executed_actions": executed,
            "failed_actions": failed,
            "execution_time_ms": execution_time_ms,
            "executed_at": end_time.isoformat(),
            "results": results,
        }

        logger.info(
            f"Rotina '{routine.name}' executada: {executed} sucessos, {failed} falhas, {execution_time_ms}ms"
        )

        return True, result_data

    async def _create_execution_log(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        routine,
        executed: int,
        failed: int,
        execution_time_ms: int,
    ):
        description = (
            f"{executed} ação(ões) executada(s)"
            f"{f', {failed} falha(s)' if failed > 0 else ''} "
            f"({execution_time_ms}ms)"
        )
        log = ActivityLogCreate(
            type=ActivityType.ROUTINE_EXECUTED,
            title="Rotina executada",
            description=description,
            routine_id=routine.id,
            routine_name=routine.name,
        )
        await crud_activity_log.create_with_user(db, obj_in=log, user_id=user_id)

    async def create_routine_log(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        routine_id: Optional[UUID],
        routine_name: str,
        activity_type: ActivityType,
        title: str,
        description: str,
    ):
        log = ActivityLogCreate(
            type=activity_type,
            title=title,
            description=description,
            routine_id=routine_id,
            routine_name=routine_name,
        )
        await crud_activity_log.create_with_user(db, obj_in=log, user_id=user_id)


routine_service = RoutineService()
