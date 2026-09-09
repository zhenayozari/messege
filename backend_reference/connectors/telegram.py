import asyncio
import json
import logging
import mimetypes
from contextlib import ExitStack
from pathlib import Path
from typing import Any

import httpx
from sqlmodel import Session

from app.core.config import settings
from app.db.session import engine
from app.models import ChannelType
from app.schemas import TestInboundRequest
from app.services.conversation_service import create_inbound_message


logger = logging.getLogger(__name__)

TELEGRAM_API_URL = "https://api.telegram.org"
TELEGRAM_MESSAGE_LIMIT = 4096
TELEGRAM_CAPTION_LIMIT = 1024


class TelegramConfigError(RuntimeError):
    pass


def _require_telegram_settings() -> tuple[str, str | None]:
    if not settings.telegram_bot_token:
        raise TelegramConfigError("TELEGRAM_BOT_TOKEN is not configured")
    return settings.telegram_bot_token, settings.telegram_channel_id


def _split_text(text: str, limit: int = TELEGRAM_MESSAGE_LIMIT) -> list[str]:
    clean_text = text.strip()
    if not clean_text:
        return []

    chunks: list[str] = []
    remaining = clean_text
    while len(remaining) > limit:
        split_at = remaining.rfind("\n", 0, limit)
        if split_at < limit // 2:
            split_at = remaining.rfind(" ", 0, limit)
        if split_at < limit // 2:
            split_at = limit
        chunks.append(remaining[:split_at].strip())
        remaining = remaining[split_at:].strip()
    if remaining:
        chunks.append(remaining)
    return chunks


def _message_url(chat_id: str, message_id: int) -> str | None:
    if chat_id.startswith("@"):
        return f"https://t.me/{chat_id[1:]}/{message_id}"
    if chat_id.startswith("-100") and chat_id[4:].isdigit():
        return f"https://t.me/c/{chat_id[4:]}/{message_id}"
    return None


async def _telegram_method(
    method: str,
    *,
    data: dict[str, Any] | None = None,
    files: dict[str, Any] | None = None,
    timeout: float = 60.0,
) -> Any:
    bot_token, _ = _require_telegram_settings()
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(f"{TELEGRAM_API_URL}/bot{bot_token}/{method}", data=data, files=files)
        response.raise_for_status()
        payload = response.json()

    if not payload.get("ok"):
        description = payload.get("description") or "unknown Telegram API error"
        raise RuntimeError(f"Telegram API error: {description}")
    return payload.get("result")


# =====================================================================
# Отправка сообщений в Telegram диалог
# =====================================================================
def send_telegram_message(external_chat_id: str, text: str) -> str:
    """Отправка сообщения клиенту в Telegram через бота."""
    chat_id = external_chat_id.replace("tg-chat-", "")

    async def _send() -> str:
        results = []
        for chunk in _split_text(text):
            res = await _telegram_method("sendMessage", data={"chat_id": chat_id, "text": chunk})
            if isinstance(res, dict) and res.get("message_id"):
                results.append(str(res["message_id"]))
        return results[0] if results else "telegram:sent"

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(_send())

    raise RuntimeError("send_telegram_message cannot be called from a running event loop")


# =====================================================================
# Статус "Прочитано" в Telegram
# =====================================================================
def mark_telegram_message_read(external_chat_id: str) -> None:
    """
    Отметка диалога прочитанным.
    В Telegram Bot API нет прямого markChatAsRead для обычных ботов,
    но отправляется действие 'typing' для снятия висящего состояния ожидания.
    Для бизнес-аккаунтов Telegram Business здесь вызывается webhook read receipt.
    """
    chat_id = external_chat_id.replace("tg-chat-", "")

    async def _mark() -> None:
        try:
            await _telegram_method("sendChatAction", data={"chat_id": chat_id, "action": "typing"}, timeout=5.0)
        except Exception:
            logger.debug("Failed to sendChatAction typing on mark-as-read")

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        try:
            asyncio.run(_mark())
        except Exception:
            pass


# =====================================================================
# Long Polling для входящих сообщений Telegram (по аналогии с vk.py)
# Позволяет работать локально на Windows без вебхуков и публичных доменов!
# =====================================================================
async def handle_telegram_update(update: dict[str, Any]) -> None:
    """Обработка одного события из getUpdates."""
    message = update.get("message")
    if not message:
        return

    text = (message.get("text") or message.get("caption") or "").strip()
    if not text:
        return

    from_user = message.get("from") or {}
    chat = message.get("chat") or {}
    chat_id = str(chat.get("id"))
    from_id = str(from_user.get("id") or chat_id)
    message_id = str(message.get("message_id"))

    first_name = from_user.get("first_name") or ""
    last_name = from_user.get("last_name") or ""
    username = from_user.get("username")

    contact_name = f"{first_name} {last_name}".strip()
    if username:
        contact_name = f"{contact_name} (@{username})" if contact_name else f"@{username}"
    if not contact_name:
        contact_name = f"Telegram {from_id}"

    payload = TestInboundRequest(
        contact_name=contact_name,
        text=text,
        external_chat_id=f"tg-chat-{chat_id}",
        external_contact_id=f"tg-user-{from_id}",
        external_message_id=f"tg-msg-{message_id}",
        channel=ChannelType.telegram,
    )

    with Session(engine) as session:
        create_inbound_message(session, payload)


async def telegram_long_poll_loop() -> None:
    """
    Фоновый цикл Long Polling для Telegram.
    Запускается в main.py при старте приложения, аналогично vk_long_poll_loop.
    """
    if not settings.telegram_enabled or not settings.telegram_bot_token:
        logger.info("Telegram connector or bot token is disabled")
        return

    logger.info("Telegram Long Polling connector started")
    offset = 0

    while True:
        try:
            updates = await _telegram_method(
                "getUpdates",
                data={"offset": offset, "timeout": 25, "allowed_updates": ["message"]},
                timeout=40.0,
            )

            if isinstance(updates, list):
                for update in updates:
                    update_id = update.get("update_id")
                    if update_id:
                        offset = update_id + 1
                    await handle_telegram_update(update)

        except asyncio.CancelledError:
            logger.info("Telegram Long Polling loop cancelled")
            raise
        except Exception:
            logger.exception("Telegram Long Polling iteration failed, retrying in 5 seconds")
            await asyncio.sleep(5)


# =====================================================================
# Публикация контента в Telegram канал
# =====================================================================
def publish_telegram_post(message: str, photo_paths: list[str] | None = None) -> dict[str, str | list[str] | None]:
    bot_token, channel_id = _require_telegram_settings()
    if not channel_id:
        raise TelegramConfigError("TELEGRAM_CHANNEL_ID is not configured")
    if not settings.telegram_publish_enabled:
        raise TelegramConfigError("Telegram publishing is disabled. Set TELEGRAM_PUBLISH_ENABLED=true to allow real posts.")

    clean_message = message.strip()
    clean_photo_paths = [path.strip() for path in photo_paths or [] if path.strip()]
    if not clean_message and not clean_photo_paths:
        raise ValueError("Telegram post requires text or photos")

    async def _publish() -> dict[str, str | list[str] | None]:
        sent_messages: list[dict[str, Any]] = []
        caption = clean_message if clean_message and len(clean_message) <= TELEGRAM_CAPTION_LIMIT else None

        if len(clean_photo_paths) == 1:
            sent_messages.extend(await _send_single_photo(channel_id, clean_photo_paths[0], caption))
        elif len(clean_photo_paths) > 1:
            sent_messages.extend(await _send_photo_group(channel_id, clean_photo_paths, caption))

        if clean_message and (not clean_photo_paths or caption is None):
            sent_messages.extend(await _send_text_chunks(channel_id, clean_message))

        message_ids = [str(message["message_id"]) for message in sent_messages if isinstance(message, dict) and message.get("message_id")]
        first_message_id = int(message_ids[0]) if message_ids else 0
        return {
            "external_post_id": f"telegram:{','.join(message_ids)}" if message_ids else "telegram:unknown",
            "url": _message_url(channel_id, first_message_id) if first_message_id else None,
            "message_ids": message_ids,
        }

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(_publish())

    raise RuntimeError("publish_telegram_post cannot be called from a running event loop")


async def _send_text_chunks(chat_id: str, message: str) -> list[dict[str, Any]]:
    sent_messages = []
    for chunk in _split_text(message):
        result = await _telegram_method("sendMessage", data={"chat_id": chat_id, "text": chunk})
        if isinstance(result, dict):
            sent_messages.append(result)
    return sent_messages


async def _send_single_photo(chat_id: str, photo_path: str, caption: str | None) -> list[dict[str, Any]]:
    path = Path(photo_path)
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"Media file not found: {photo_path}")

    mime_type = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    with path.open("rb") as photo_file:
        result = await _telegram_method(
            "sendPhoto",
            data={"chat_id": chat_id, "caption": caption or ""},
            files={"photo": (path.name, photo_file, mime_type)},
        )
    return [result] if isinstance(result, dict) else []


async def _send_photo_group(chat_id: str, photo_paths: list[str], caption: str | None) -> list[dict[str, Any]]:
    with ExitStack() as stack:
        media = []
        files: dict[str, Any] = {}
        for index, photo_path in enumerate(photo_paths[:10]):
            path = Path(photo_path)
            if not path.exists() or not path.is_file():
                raise FileNotFoundError(f"Media file not found: {photo_path}")

            field_name = f"photo_{index}"
            mime_type = mimetypes.guess_type(path.name)[0] or "image/jpeg"
            photo_file = stack.enter_context(path.open("rb"))
            files[field_name] = (path.name, photo_file, mime_type)
            item: dict[str, Any] = {"type": "photo", "media": f"attach://{field_name}"}
            if index == 0 and caption:
                item["caption"] = caption
            media.append(item)

        result = await _telegram_method(
            "sendMediaGroup",
            data={"chat_id": chat_id, "media": json.dumps(media, ensure_ascii=False)},
            files=files,
        )
    return result if isinstance(result, list) else []
