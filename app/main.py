from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel

from app.api.content import router as content_router
from app.api.conversations import router as conversations_router
from app.connectors.telegram import telegram_long_poll_loop
from app.connectors.vk import vk_long_poll_loop
from app.core.config import settings
from app.db.session import engine
from app.services.backup_service import run_daily_backup_check
from app.services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("phoenix.main")


# =====================================================================
# Lifespan: управление жизненным циклом (старт и корректная остановка)
# =====================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Управление фоновыми сервисами FastAPI:
    1. Инициализация таблиц БД SQLite.
    2. Проверка и создание ежедневного бэкапа базы данных.
    3. Запуск фонового планировщика публикаций по расписанию (APScheduler / worker).
    4. Запуск Long Polling демонов для Telegram и ВКонтакте.
    5. При завершении приложения: аккуратная остановка планировщика и демонов.
    """
    logger.info("Starting Phoenix CRM & SMM backend...")

    # 1. Создание таблиц БД
    SQLModel.metadata.create_all(engine)

    # 2. Автоматический ежедневный бэкап базы данных
    try:
        run_daily_backup_check()
    except Exception as exc:
        logger.warning("Daily backup check failed: %s", exc)

    # 3. Запуск планировщика автопостинга (APScheduler)
    try:
        start_scheduler(interval_seconds=30)
        logger.info("Background Auto-Publish scheduler initialized successfully")
    except Exception as exc:
        logger.exception("Failed to start scheduler: %s", exc)

    # 4. Запуск Long Polling демонов
    background_tasks = []
    if getattr(settings, "telegram_enabled", False):
        try:
            from app.connectors.telegram import get_telegram_bot_info

            bot_info = await get_telegram_bot_info()
            bot_username = bot_info.get("username") or "PhoenixBot"
            logger.info("✅ Telegram Long Polling успешно запущен для бота @%s", bot_username)
            print(f"✅ Telegram Long Polling успешно запущен для бота @{bot_username}")
        except Exception as exc:
            logger.warning("Could not pre-fetch Telegram bot info: %s", exc)
            logger.info("✅ Telegram Long Polling успешно запущен для бота")
            print("✅ Telegram Long Polling успешно запущен для бота")

        t_task = asyncio.create_task(telegram_long_poll_loop(), name="telegram_long_poll")
        background_tasks.append(t_task)

    if getattr(settings, "vk_enabled", False):
        vk_task = asyncio.create_task(vk_long_poll_loop(), name="vk_long_poll")
        background_tasks.append(vk_task)

    yield

    # Teardown / On Shutdown
    logger.info("Shutting down Phoenix backend services...")

    # Остановка планировщика
    try:
        stop_scheduler()
        logger.info("Scheduler stopped")
    except Exception as exc:
        logger.warning("Error stopping scheduler: %s", exc)

    # Остановка фоновых задач Long Polling
    for task in background_tasks:
        if not task.done():
            task.cancel()
    if background_tasks:
        await asyncio.gather(*background_tasks, return_exceptions=True)

    logger.info("Phoenix backend shutdown complete")


# =====================================================================
# Приложение FastAPI
# =====================================================================
app = FastAPI(
    title="Phoenix AI Hub API",
    description="Backend API для работы с диалогами, контентом, медиа и автопостингом в соцсети",
    version="2.0.0",
    lifespan=lifespan,
)

# Настройка CORS для взаимодействия с SPA фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(conversations_router, prefix="/api")
app.include_router(content_router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "phoenix-backend",
        "scheduler": "active",
        "version": "2.0.0",
    }
