import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseModel):
    # Telegram Bot
    telegram_bot_token: str = os.getenv(
        "TELEGRAM_BOT_TOKEN", "8809553443:AAFtT4HoI_dk0bhdGhaISNBnOEDGIYkF3UU"
    )
    telegram_enabled: bool = os.getenv("TELEGRAM_ENABLED", "True").lower() in (
        "true",
        "1",
        "t",
        "yes",
    )
    telegram_channel_id: str | None = os.getenv("TELEGRAM_CHANNEL_ID") or None

    # ВКонтакте
    vk_access_token: str | None = os.getenv("VK_ACCESS_TOKEN") or None
    vk_group_id: int | None = (
        int(os.getenv("VK_GROUP_ID")) if os.getenv("VK_GROUP_ID") else None
    )
    vk_enabled: bool = os.getenv("VK_ENABLED", "False").lower() in (
        "true",
        "1",
        "t",
        "yes",
    )

    # SQLite Database
    sqlite_db_url: str = os.getenv("SQLITE_DB_URL", "sqlite:///phoenix.db")

    # LLM Settings
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY") or None
    local_llm_url: str = os.getenv("LOCAL_LLM_URL", "http://localhost:8080/v1")


settings = Settings()
