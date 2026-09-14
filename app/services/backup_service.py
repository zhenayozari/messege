import logging
import shutil
from datetime import datetime
from pathlib import Path

logger = logging.getLogger("phoenix.services.backup")


def run_daily_backup_check() -> None:
    db_file = Path("phoenix.db")
    if not db_file.exists():
        return
    backup_dir = Path("backups")
    backup_dir.mkdir(exist_ok=True)
    today = datetime.now().strftime("%Y-%m-%d")
    backup_file = backup_dir / f"phoenix_backup_{today}.db"
    if not backup_file.exists():
        shutil.copy2(db_file, backup_file)
        logger.info(f"Created daily database backup: {backup_file}")
