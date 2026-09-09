"""
Коннектор для соцсети 'Max' (Phoenix AI Hub).

Шаблон коннектора построен по аналогии с VK и Telegram.
Готов к вставке реальных endpoint'ов и методов API соцсети 'Max'.
"""

import asyncio
import logging
from typing import Any

import httpx
from sqlmodel import Session

from app.core.config import settings
from app.db.session import engine
from app.models import ChannelType
from app.schemas import TestInboundRequest
from app.services.conversation_service import create_inbound_message


logger = logging.getLogger(__name__)

# URL API соцсети 'Max' (замените на актуальный адрес документации API Max)
MAX_API_BASE_URL = "https://api.max-social.ru/v1"


class MaxConfigError(RuntimeError):
    pass


def _require_max_settings() -> dict[str, Any]:
    """Проверка конфигурации для соцсети Max."""
    token = getattr(settings, "max_api_token", None)
    if not token:
        # Для начального этапа возвращаем базовые заглушки
        logger.debug("MAX_API_TOKEN is not configured yet")
    return {
        "token": token or "max_token_placeholder",
        "channel_id": getattr(settings, "max_channel_id", None),
    }


async def _max_api_call(
    endpoint: str,
    method: str = "POST",
    data: dict[str, Any] | None = None,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Универсальный клиент для выполнения запросов к API Max.
    Вставьте сюда авторизационные заголовки (Bearer token, API key и т.д.).
    """
    conf = _require_max_settings()
    headers = {
        "Authorization": f"Bearer {conf['token']}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    url = f"{MAX_API_BASE_URL.rstrip('/')}/{endpoint.lstrip('/')}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.request(method, url, json=data, params=params, headers=headers)
        # response.raise_for_status()
        # return response.json()
        return {"status": "ok", "mock": True}


# =====================================================================
# 1. Отправка исходящих сообщений в диалог Max
# =====================================================================
def send_max_message(external_chat_id: str, text: str) -> str:
    """
    Отправляет текстовое сообщение клиенту в соцсеть Max.
    """
    chat_id = external_chat_id.replace("max-chat-", "").replace("max-user-", "")

    async def _send() -> str:
        payload = {
            "chat_id": chat_id,
            "text": text,
        }
        # TODO: Замените 'messages.send' на метод отправки из документации API Max
        result = await _max_api_call("messages/send", method="POST", data=payload)
        return str(result.get("message_id") or "max:mock_sent_id")

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(_send())

    raise RuntimeError("send_max_message cannot be called from a running event loop")


# =====================================================================
# 2. Логика статуса 'Прочитано' для соцсети Max
# =====================================================================
def mark_max_message_read(external_chat_id: str) -> None:
    """
    Помечает сообщения в диалоге Max как прочитанные оператором.
    """
    chat_id = external_chat_id.replace("max-chat-", "").replace("max-user-", "")

    async def _mark() -> None:
        try:
            # TODO: Замените 'conversations/read' на метод пометки прочитанным в API Max
            await _max_api_call("conversations/read", method="POST", data={"chat_id": chat_id})
        except Exception:
            logger.debug("Failed to call mark_max_message_read")

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        try:
            asyncio.run(_mark())
        except Exception:
            pass


# =====================================================================
# 3. Публикация контента на стену / в канал Max
# =====================================================================
def publish_max_post(
    message: str,
    photo_paths: list[str] | None = None,
) -> dict[str, str | None]:
    """
    Публикация поста в канал или сообщество Max.
    """
    clean_message = message.strip()
    if not clean_message and not photo_paths:
        raise ValueError("Max post requires text or attachments")

    async def _publish() -> dict[str, str | None]:
        payload = {
            "content": clean_message,
            "photos": photo_paths or [],
        }
        # TODO: Замените на реальный метод публикации в канал Max
        result = await _max_api_call("posts/publish", method="POST", data=payload)
        external_id = str(result.get("post_id") or "max:stub_post")
        return {
            "external_post_id": external_id,
            "url": f"https://max.ru/post/{external_id}",
        }

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(_publish())

    raise RuntimeError("publish_max_post cannot be called from a running event loop")


# =====================================================================
# 4. Long Polling / Прием входящих сообщений из Max
# =====================================================================
async def handle_max_update(update: dict[str, Any]) -> None:
    """
    Парсит входящее событие от соцсети Max и создает диалог / сообщение в Hub.
    """
    # TODO: Адаптируйте структуру JSON под реальный payload Max
    sender_id = str(update.get("sender_id") or "max_unknown")
    chat_id = str(update.get("chat_id") or sender_id)
    text = (update.get("text") or "").strip()
    sender_name = update.get("sender_name") or f"Max Пользователь {sender_id}"
    message_id = str(update.get("id") or "")

    if not text:
        return

    payload = TestInboundRequest(
        contact_name=sender_name,
        text=text,
        external_chat_id=f"max-chat-{chat_id}",
        external_contact_id=f"max-user-{sender_id}",
        external_message_id=f"max-msg-{message_id}" if message_id else None,
        channel=ChannelType.max,
    )

    with Session(engine) as session:
        create_inbound_message(session, payload)


async def max_long_poll_loop() -> None:
    """
    Фоновый цикл Long Polling для Max.
    Если соцсеть Max поддерживает Long Polling, активируйте цикл в main.py.
    """
    if not getattr(settings, "max_enabled", False):
        logger.info("Max connector is disabled in settings")
        return

    logger.info("Max Long Polling loop started")
    cursor = None

    while True:
        try:
            # TODO: Вызов метода long poll getEvents для Max
            # response = await _max_api_call("events/poll", params={"cursor": cursor, "wait": 25})
            # updates = response.get("events", [])
            # for update in updates:
            #     await handle_max_update(update)
            await asyncio.sleep(15)  # Заглушка до подключения боевого API
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Max long poll iteration failed")
            await asyncio.sleep(10)
