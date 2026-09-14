from __future__ import annotations

import asyncio
import logging
from typing import Any
from uuid import UUID

from sqlmodel import Session, select

from app.db.session import engine
from app.models import ScheduledPost, ScheduledPostStatus, utc_now
from app.services.content_service import publish_scheduled_post_async

logger = logging.getLogger("phoenix.services.scheduler")

# Глобальный объект планировщика / фоновой задачи
_scheduler: Any = None
_worker_task: asyncio.Task | None = None
_is_running: bool = False


# =====================================================================
# Задача автопостинга: ищет наступившие посты и публикует их
# =====================================================================
async def auto_publish_job() -> int:
    """
    Фоновая задача автопубликации по расписанию:
    1. Ищет в БД записи ScheduledPost со статусом 'scheduled', у которых scheduled_at <= utc_now().
    2. Для каждого поста запускает publish_scheduled_post_async.
    3. Логирует результаты и предотвращает дублирование.
    """
    now = utc_now()
    published_count = 0
    failed_count = 0

    with Session(engine) as session:
        # Выбираем все посты, готовые к отправке
        due_posts = session.exec(
            select(ScheduledPost).where(
                ScheduledPost.status == ScheduledPostStatus.scheduled,
                ScheduledPost.scheduled_at <= now,
            )
        ).all()

        if not due_posts:
            return 0

        logger.info("Found %d scheduled post(s) ready for publishing", len(due_posts))

        for post in due_posts:
            try:
                await publish_scheduled_post_async(session, post.id)
                published_count += 1
            except Exception as exc:
                failed_count += 1
                logger.error("Auto-publish failed for post %s: %s", post.id, exc)

    logger.info(
        "Auto-publish iteration finished: %d published, %d failed",
        published_count,
        failed_count,
    )
    return published_count


# =====================================================================
# Резервный цикл на asyncio (если APScheduler не установлен)
# =====================================================================
async def _asyncio_publish_loop(interval_seconds: int = 30) -> None:
    """Бесконечный асинхронный цикл проверки расписания каждые 30 секунд."""
    logger.info("AsyncIO worker loop started with interval=%ds", interval_seconds)
    while _is_running:
        try:
            await auto_publish_job()
        except asyncio.CancelledError:
            logger.info("AsyncIO publish worker loop cancelled")
            break
        except Exception:
            logger.exception("Error in scheduler auto_publish_job")

        try:
            await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            break


# =====================================================================
# Инициализация и жизненный цикл планировщика
# =====================================================================
def start_scheduler(interval_seconds: int = 30) -> None:
    """
    Запуск фонового планировщика:
    Пытается использовать AsyncIOScheduler из apscheduler, а в случае отсутствия пакета —
    запускает нативный asyncio.create_task worker loop.
    """
    global _scheduler, _worker_task, _is_running

    if _is_running:
        logger.warning("Scheduler is already running")
        return

    _is_running = True

    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.interval import IntervalTrigger

        _scheduler = AsyncIOScheduler()
        _scheduler.add_job(
            auto_publish_job,
            trigger=IntervalTrigger(seconds=interval_seconds),
            id="phoenix_auto_publish_job",
            name="Phoenix Auto Publish Job",
            replace_existing=True,
            coalesce=True,
            max_instances=1,
        )
        _scheduler.start()
        logger.info("APScheduler AsyncIOScheduler started successfully (interval=%ds)", interval_seconds)

    except ImportError:
        logger.info(
            "apscheduler package not installed; starting native asyncio background worker loop"
        )
        loop = asyncio.get_event_loop()
        _worker_task = loop.create_task(_asyncio_publish_loop(interval_seconds))


def stop_scheduler() -> None:
    """Корректная остановка планировщика при завершении приложения."""
    global _scheduler, _worker_task, _is_running

    _is_running = False

    if _scheduler:
        try:
            _scheduler.shutdown(wait=False)
            logger.info("APScheduler shutdown complete")
        except Exception as exc:
            logger.warning("Error shutting down APScheduler: %s", exc)
        _scheduler = None

    if _worker_task and not _worker_task.done():
        _worker_task.cancel()
        logger.info("Native asyncio scheduler worker task cancelled")
        _worker_task = None
