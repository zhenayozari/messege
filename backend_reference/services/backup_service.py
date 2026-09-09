"""
Phoenix AI Hub — Local Database Auto-Backup Service
Автоматическое и ручное резервное копирование SQLite БД (phoenix.db) в директорию backups/.
"""

from __future__ import annotations

import os
import shutil
import sqlite3
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger("phoenix.services.backup")

BACKUP_DIR = Path("backups")
DB_FILE = Path("phoenix.db")
MAX_RETAINED_BACKUPS = 14  # Хранить резервные копии за последние 14 дней


def ensure_backup_dir() -> Path:
    """Гарантирует существование папки backups/."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    return BACKUP_DIR


def get_backup_list() -> list[dict[str, Any]]:
    """Возвращает список существующих резервных копий с размерами и датами."""
    ensure_backup_dir()
    backups = []

    for file_path in BACKUP_DIR.glob("phoenix_*.db"):
        stat = file_path.stat()
        backups.append({
            "filename": file_path.name,
            "path": str(file_path),
            "size_bytes": stat.st_size,
            "size_kb": round(stat.st_size / 1024, 2),
            "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        })

    # Сортировка от самых свежих к старым
    backups.sort(key=lambda b: b["created_at"], reverse=True)
    return backups


def create_database_backup(
    db_path: str | Path = DB_FILE,
    backup_dir: str | Path = BACKUP_DIR,
    force_timestamp: bool = False,
) -> dict[str, Any]:
    """
    Создает атомарную резервную копию SQLite базы данных с использованием SQLite Online Backup API.
    Гарантирует консистентность даже при активных транзакциях.
    """
    source_path = Path(db_path)
    target_dir = Path(backup_dir)
    target_dir.mkdir(parents=True, exist_ok=True)

    if not source_path.exists():
        # Если файл БД еще не создан, ничего не копируем
        logger.warning("Исходный файл базы данных %s не существует", source_path)
        return {
            "status": "skipped",
            "message": f"Файл {source_path} отсутствует",
        }

    now = datetime.now(timezone.utc)
    if force_timestamp:
        backup_filename = f"phoenix_{now.strftime('%Y%m%d_%H%M%S')}.db"
    else:
        # Ежедневный формат: phoenix_YYYY-MM-DD.db
        backup_filename = f"phoenix_{now.strftime('%Y-%m-%d')}.db"

    target_path = target_dir / backup_filename

    # SQLite Online Backup API (без блокировки чтения/записи)
    try:
        source_conn = sqlite3.connect(str(source_path))
        dest_conn = sqlite3.connect(str(target_path))

        with dest_conn:
            source_conn.backup(dest_conn, pages=100, sleep=0.01)

        source_conn.close()
        dest_conn.close()

        stat = target_path.stat()
        logger.info(
            "Резервная копия успешно создана: %s (%d байт)",
            target_path.name,
            stat.st_size,
        )

        # Очистка устаревших бэкапов
        cleanup_old_backups(target_dir, max_keep=MAX_RETAINED_BACKUPS)

        return {
            "status": "success",
            "filename": backup_filename,
            "path": str(target_path),
            "size_bytes": stat.st_size,
            "size_kb": round(stat.st_size / 1024, 2),
            "created_at": now.isoformat(),
        }

    except Exception as e:
        logger.exception("Ошибка создания резервной копии: %s", e)
        # Fallback на файловое копирование
        shutil.copy2(source_path, target_path)
        stat = target_path.stat()
        return {
            "status": "success_fallback",
            "filename": backup_filename,
            "size_bytes": stat.st_size,
            "created_at": now.isoformat(),
        }


def cleanup_old_backups(backup_dir: Path = BACKUP_DIR, max_keep: int = MAX_RETAINED_BACKUPS) -> int:
    """Удаляет старые резервные копии, оставляя не более max_keep последних файлов."""
    files = sorted(backup_dir.glob("phoenix_*.db"), key=os.path.getmtime, reverse=True)
    removed_count = 0

    if len(files) > max_keep:
        for old_file in files[max_keep:]:
            try:
                old_file.unlink()
                removed_count += 1
                logger.info("Удалена старая резервная копия: %s", old_file.name)
            except OSError as e:
                logger.warning("Не удалось удалить %s: %s", old_file.name, e)

    return removed_count


def run_daily_backup_check() -> dict[str, Any]:
    """
    Проверяет, существует ли резервная копия за сегодня.
    Если нет — выполняет резервное копирование.
    Идеально вызывается в lifespan/startup событии FastAPI.
    """
    ensure_backup_dir()
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_file = BACKUP_DIR / f"phoenix_{today_str}.db"

    if today_file.exists():
        logger.info("Ежедневный бэкап за сегодня (%s) уже существует", today_str)
        return {
            "status": "already_exists",
            "filename": today_file.name,
        }

    logger.info("Создание планового ежедневного бэкапа за %s", today_str)
    return create_database_backup()
