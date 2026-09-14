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

TELEGRAM_API_URL = "https://api.telegram.org"


def _require_telegram_settings() -> tuple[str, str | None]:
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
    return settings.telegram_bot_token, settings.telegram_channel_id


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


async def _get_telegram_file_url(file_id: str) -> str | None:
    """Получение прямой ссылки на файл из Telegram API для скачивания/сохранения."""
    try:
        res = await _telegram_method("getFile", data={"file_id": file_id})
        file_path = res.get("file_path")
        bot_token, _ = _require_telegram_settings()
        if file_path:
            return f"{TELEGRAM_API_URL}/file/bot{bot_token}/{file_path}"
    except Exception as exc:
        logger.warning(f"Failed to get Telegram file URL for {file_id}: {exc}")
    return None


# =====================================================================
# Long Polling для входящих сообщений (текст, фото, голос, документы)
# =====================================================================
async def handle_telegram_update(update: dict[str, Any]) -> None:
    message = update.get("message") or update.get("edited_message")
    if not message:
        return

    text = (message.get("text") or "").strip()
    caption = (message.get("caption") or "").strip() or None
    media_type: str | None = None
    media_url: str | None = None
    file_id: str | None = None
    file_name: str | None = None
    file_size: int | None = None
    duration_sec: int | None = None
    attachments: list[dict[str, Any]] = []

    # 1. Фотография (photo) - берем самое большое разрешение
    photos = message.get("photo")
    if photos and isinstance(photos, list):
        largest_photo = photos[-1]
        file_id = largest_photo.get("file_id")
        file_size = largest_photo.get("file_size")
        media_type = "photo"
        media_url = await _get_telegram_file_url(file_id) if file_id else None
        attachments.append({
            "type": "photo",
            "file_id": file_id,
            "url": media_url,
            "size": file_size,
            "width": largest_photo.get("width"),
            "height": largest_photo.get("height"),
        })

    # 2. Голосовое сообщение (voice) или видеосообщение-кружок (video_note)
    elif message.get("voice"):
        voice = message.get("voice")
        file_id = voice.get("file_id")
        file_size = voice.get("file_size")
        duration_sec = voice.get("duration")
        media_type = "voice"
        media_url = await _get_telegram_file_url(file_id) if file_id else None
        attachments.append({
            "type": "voice",
            "file_id": file_id,
            "url": media_url,
            "duration": duration_sec,
            "mime_type": voice.get("mime_type", "audio/ogg"),
        })

    elif message.get("video_note"):
        video_note = message.get("video_note")
        file_id = video_note.get("file_id")
        file_size = video_note.get("file_size")
        duration_sec = video_note.get("duration")
        media_type = "video_note"
        media_url = await _get_telegram_file_url(file_id) if file_id else None
        attachments.append({
            "type": "video_note",
            "file_id": file_id,
            "url": media_url,
            "duration": duration_sec,
        })

    # 3. Документ (document: сметы, чертежи, файлы)
    elif message.get("document"):
        doc = message.get("document")
        file_id = doc.get("file_id")
        file_name = doc.get("file_name") or "Документ.pdf"
        file_size = doc.get("file_size")
        media_type = "document"
        media_url = await _get_telegram_file_url(file_id) if file_id else None
        attachments.append({
            "type": "document",
            "file_id": file_id,
            "file_name": file_name,
            "url": media_url,
            "size": file_size,
        })

    # Если текста нет, но есть подпись к фото или документу
    if not text and caption:
        text = caption

    # Безопасная фильтрация: пропускаем ТОЛЬКО если нет ни текста, ни медиа
    if not text and not media_type:
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
        media_type=media_type,
        media_url=media_url,
        file_id=file_id,
        caption=caption,
        file_name=file_name,
        file_size=file_size,
        duration_sec=duration_sec,
        attachments=attachments,
        external_chat_id=f"tg-chat-{chat_id}",
        external_contact_id=f"tg-user-{from_id}",
        external_message_id=f"tg-msg-{message_id}",
        channel=ChannelType.telegram,
    )

    with Session(engine) as session:
        create_inbound_message(session, payload)


async def get_telegram_bot_info() -> dict[str, Any]:
    """Получение информации о боте через getMe."""
    return await _telegram_method("getMe", timeout=10.0)


async def send_telegram_message_async(chat_id: str, text: str) -> dict[str, Any]:
    """Отправка ответа оператора пользователю в Telegram."""
    raw_chat_id = chat_id.replace("tg-chat-", "")
    return await _telegram_method("sendMessage", data={"chat_id": raw_chat_id, "text": text}, timeout=15.0)


async def telegram_long_poll_loop() -> None:
    """
    Фоновый демон Long Polling для Telegram.
    Запускается в main.py на старте FastAPI приложения аналогично vk_long_poll_loop.
    """
    if not getattr(settings, "telegram_enabled", False) or not settings.telegram_bot_token:
        logger.info("Telegram connector is disabled")
        return

    try:
        bot_info = await get_telegram_bot_info()
        bot_username = bot_info.get("username", "PhoenixBot")
        logger.info("✅ Telegram Long Polling успешно запущен для бота @%s", bot_username)
        print(f"✅ Telegram Long Polling успешно запущен для бота @{bot_username}")
    except Exception as exc:
        logger.warning(f"Could not fetch Telegram bot info: {exc}")
        logger.info("✅ Telegram Long Polling запущен (token: %s...)", settings.telegram_bot_token[:12])

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
            raise
        except Exception:
            logger.exception("Telegram Long Polling iteration error, retry in 5s")
            await asyncio.sleep(5)


def mark_telegram_message_read(external_chat_id: str) -> None:
    """Снятие ожидания и отправка статуса активности."""
    chat_id = external_chat_id.replace("tg-chat-", "")
    async def _mark() -> None:
        try:
            await _telegram_method("sendChatAction", data={"chat_id": chat_id, "action": "typing"}, timeout=5.0)
        except Exception:
            pass

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        try:
            asyncio.run(_mark())
        except Exception:
            pass


# =====================================================================
# Публикация постов в Telegram-канал (текст + вложения фото)
# =====================================================================
async def publish_telegram_channel_post_async(
    message: str,
    channel_id: str | None = None,
    photo_paths: list[str] | None = None,
) -> dict[str, str | None]:
    """
    Асинхронная публикация поста в канал Telegram.
    Поддерживает текстовые посты, одиночные фото и альбомы (sendMediaGroup).
    """
    import json
    from uuid import uuid4

    bot_token, default_channel = _require_telegram_settings()
    target_channel = channel_id or default_channel
    if not target_channel:
        raise RuntimeError("Telegram channel ID is not configured (TELEGRAM_CHANNEL_ID)")

    photo_paths = [p for p in (photo_paths or []) if p]

    # 1. Если переданы фотографии
    if photo_paths:
        if len(photo_paths) == 1:
            photo = photo_paths[0]
            if photo.startswith("http://") or photo.startswith("https://"):
                data = {"chat_id": target_channel, "caption": message, "photo": photo, "parse_mode": "HTML"}
                result = await _telegram_method("sendPhoto", data=data)
            else:
                with open(photo, "rb") as f:
                    result = await _telegram_method(
                        "sendPhoto",
                        data={"chat_id": target_channel, "caption": message, "parse_mode": "HTML"},
                        files={"photo": f},
                    )
        else:
            # Альбом фотографий (до 10 штук)
            media_items = []
            for idx, p in enumerate(photo_paths[:10]):
                item = {"type": "photo", "media": p}
                if idx == 0 and message:
                    item["caption"] = message
                    item["parse_mode"] = "HTML"
                media_items.append(item)
            result = await _telegram_method(
                "sendMediaGroup",
                data={"chat_id": target_channel, "media": json.dumps(media_items)},
            )
    else:
        # 2. Текстовый пост
        result = await _telegram_method(
            "sendMessage",
            data={"chat_id": target_channel, "text": message, "parse_mode": "HTML"},
        )

    msg_id = None
    if isinstance(result, list) and len(result) > 0:
        msg_id = str(result[0].get("message_id"))
    elif isinstance(result, dict):
        msg_id = str(result.get("message_id"))

    channel_clean = str(target_channel).replace("@", "")
    post_url = f"https://t.me/{channel_clean}/{msg_id}" if msg_id and not str(target_channel).startswith("-100") else None

    return {
        "external_post_id": f"tg-post-{msg_id}" if msg_id else f"tg-post-{uuid4().hex[:8]}",
        "url": post_url,
    }


def publish_telegram_channel_post(
    message: str,
    channel_id: str | None = None,
    photo_paths: list[str] | None = None,
) -> dict[str, str | None]:
    """Синхронная обертка над publish_telegram_channel_post_async."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(publish_telegram_channel_post_async(message, channel_id, photo_paths))
    raise RuntimeError("publish_telegram_channel_post cannot be called directly from inside a running event loop; await publish_telegram_channel_post_async instead")

