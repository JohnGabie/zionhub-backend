"""
Scheduler Service - Agendamento automático de rotinas (SQLAlchemy 2.0 async)
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Dict, List
import asyncio

from app.core.database import AsyncSessionLocal
from app.crud.routine import crud_routine
from app.services.routine_service import routine_service
from app.models.enums import TriggerType, WeekDay
from app.utils.logger import logger

SAO_PAULO_TZ = ZoneInfo("America/Sao_Paulo")


class SchedulerService:

    def __init__(self):
        self.scheduler = AsyncIOScheduler(timezone=SAO_PAULO_TZ)
        self.scheduled_jobs: Dict[str, str] = {}  # routine_id: job_id
        self._running = False

    def start(self):
        if not self._running:
            self.scheduler.start()
            self._running = True
            logger.info("✅ Scheduler iniciado")
            asyncio.create_task(self.sync_all_routines())

    def stop(self):
        if self._running:
            self.scheduler.shutdown()
            self._running = False
            logger.info("⏹️  Scheduler parado")

    async def sync_all_routines(self):
        async with AsyncSessionLocal() as db:
            try:
                active_routines = await crud_routine.get_active_time_routines(db)
                active_routine_ids = {str(r.id) for r in active_routines}

                logger.info(f"🔄 Sincronizando {len(active_routines)} rotinas de horário")

                jobs_to_remove = [
                    rid for rid in list(self.scheduled_jobs.keys())
                    if rid not in active_routine_ids
                ]
                for routine_id in jobs_to_remove:
                    self.unschedule_routine(routine_id)
                    logger.info(f"🧹 Rotina {routine_id} removida (não está mais ativa)")

                for routine in active_routines:
                    self.schedule_routine(str(routine.id), routine.trigger_time, routine.week_days)

                logger.info(f"✅ {len(active_routines)} rotinas sincronizadas")

            except Exception as e:
                logger.error(f"Erro ao sincronizar rotinas: {e}")

    def schedule_routine(self, routine_id: str, trigger_time: datetime.time, week_days: List[WeekDay]):
        routine_id_str = str(routine_id)
        day_of_week = self._convert_week_days(week_days)

        trigger = CronTrigger(
            hour=trigger_time.hour,
            minute=trigger_time.minute,
            second=0,
            day_of_week=day_of_week,
            timezone=SAO_PAULO_TZ,
        )

        job_id = f"routine_{routine_id_str}"

        existing_job = self.scheduler.get_job(job_id)
        if existing_job:
            self.scheduled_jobs[routine_id_str] = job_id
            logger.debug(f"Rotina {routine_id_str} já está agendada, atualizando...")

        job = self.scheduler.add_job(
            self._execute_scheduled_routine,
            trigger=trigger,
            args=[routine_id_str],
            id=job_id,
            name=f"Rotina {routine_id_str}",
            replace_existing=True,
        )

        self.scheduled_jobs[routine_id_str] = job.id
        logger.info(
            f"📅 Rotina {routine_id_str} agendada: "
            f"{trigger_time.strftime('%H:%M')} nos dias {day_of_week}"
        )

    def unschedule_routine(self, routine_id: str):
        routine_id_str = str(routine_id)
        job_id = f"routine_{routine_id_str}"

        existing_job = self.scheduler.get_job(job_id)
        if not existing_job:
            self.scheduled_jobs.pop(routine_id_str, None)
            return

        try:
            self.scheduler.remove_job(job_id)
            self.scheduled_jobs.pop(routine_id_str, None)
            logger.info(f"🗑️  Rotina {routine_id_str} desagendada")
        except Exception as e:
            logger.error(f"Erro ao desagendar rotina {routine_id_str}: {e}")

    async def _execute_scheduled_routine(self, routine_id: str):
        logger.info(f"⏰ Executando rotina agendada: {routine_id}")

        async with AsyncSessionLocal() as db:
            try:
                routine = await crud_routine.get(db, id=routine_id)

                if not routine:
                    logger.error(f"Rotina {routine_id} não encontrada")
                    return

                if not routine.is_active:
                    logger.warning(f"Rotina {routine_id} está inativa, pulando execução")
                    return

                success, result = await routine_service.execute_routine(db, routine_id=routine.id)

                if success:
                    logger.info(
                        f"✅ Rotina {routine.name} executada: "
                        f"{result['executed_actions']} ações, {result['execution_time_ms']}ms"
                    )
                else:
                    logger.error(f"❌ Erro ao executar rotina {routine.name}")

            except Exception as e:
                logger.error(f"Exceção ao executar rotina {routine_id}: {e}")

    def _convert_week_days(self, week_days: List[WeekDay]) -> str:
        day_map = {
            WeekDay.SEG: "mon",
            WeekDay.TER: "tue",
            WeekDay.QUA: "wed",
            WeekDay.QUI: "thu",
            WeekDay.SEX: "fri",
            WeekDay.SAB: "sat",
            WeekDay.DOM: "sun",
        }
        if not week_days:
            return "*"
        cron_days = [day_map[day] for day in week_days if day in day_map]
        return ",".join(cron_days)

    def get_scheduled_jobs(self) -> List[dict]:
        return [
            {
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            }
            for job in self.scheduler.get_jobs()
        ]


scheduler_service = SchedulerService()
