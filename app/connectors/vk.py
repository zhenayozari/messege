import asyncio
import logging
import random
from typing import Any
import httpx
from sqlmodel import Session

from app.core.config import settings
from app.db.session import engine
from app.models import ChannelType
from app.schemas import TestInboundRequest
from app.services.conversation_service import create_inbound_message

logger = logging.getLogger(__name__)

VK_API_VERSION = "5.199"
VK_API_URL = "https://api.vk.com/method"


def _require_vk_settings() -> tuple[str, int | None]:
    if not settings.vk_access_token:
        raise RuntimeError("VK_ACCESS_TOKEN is not configured")
    return settings.vk_access_token, settings.vk_group_id


async def _vk_method(
    method: str,
    params: dict[str, Any] | None = None,
    timeout: float = 60.0,
) -> Any:
    token, _ = _require_vk_settings()
    data = dict(params or {})
    data["access_token"] = token
    data["v"] = VK_API_VERSION

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(f"{VK_API_URL}/{method}", data=data)
        response.raise_for_status()
        payload = response.json()

    if "error" in payload:
        err = payload["error"]
        raise RuntimeError(f"VK API error {err.get('error_code')}: {err.get('error_msg')}")
    return payload.get("response")


# =====================================================================
# Обработка входящих сообщений VK (текст, фото, голосовые, документы)
# =====================================================================
async def handle_vk_message(message_data: dict[str, Any]) -> None:
    text = (message_data.get("text") or "").strip()
    raw_attachments = message_data.get("attachments") or []

    media_type: str | None = None
    media_url: str | None = None
    file_id: str | None = None
    caption: str | None = None
    file_name: str | None = None
    file_size: int | None = None
    duration_sec: int | None = None
    parsed_attachments: list[dict[str, Any]] = []

    for att in raw_attachments:
        att_type = att.get("type")

        # 1. Фотография (photo) - выбираем максимальное разрешение по площади width * height
        if att_type == "photo" and "photo" in att:
            photo_obj = att["photo"]
            sizes = photo_obj.get("sizes", [])
            best_size = max(sizes, key=lambda s: s.get("width", 0) * s.get("height", 0), default={})
            media_type = "photo"
            media_url = best_size.get("url")
            file_id = f"photo{photo_obj.get('owner_id')}_{photo_obj.get('id')}"
            caption = photo_obj.get("text") or None
            parsed_attachments.append({
                "type": "photo",
                "file_id": file_id,
                "url": media_url,
                "width": best_size.get("width"),
                "height": best_size.get("height"),
            })

        # 2. Голосовое сообщение (audio_message)
        elif att_type == "audio_message" and "audio_message" in att:
            audio = att["audio_message"]
            media_type = "voice"
            media_url = audio.get("link_mp3") or audio.get("link_ogg")
            duration_sec = audio.get("duration")
            file_id = f"audio_message{audio.get('owner_id')}_{audio.get('id')}"
            parsed_attachments.append({
                "type": "voice",
                "file_id": file_id,
                "url": media_url,
                "duration": duration_sec,
            })

        # 3. Документ (doc: PDF, сметы, чертежи)
        elif att_type == "doc" and "doc" in att:
            doc = att["doc"]
            media_type = "document"
            file_name = doc.get("title") or "Документ.pdf"
            file_size = doc.get("size")
            media_url = doc.get("url")
            file_id = f"doc{doc.get('owner_id')}_{doc.get('id')}"
            parsed_attachments.append({
                "type": "document",
                "file_id": file_id,
                "file_name": file_name,
                "size": file_size,
                "url": media_url,
            })

    # Если текста нет, но есть подпись к фотографии
    if not text and caption:
        text = caption

    # Безопасная проверка: пропускаем ТОЛЬКО если нет ни текста, ни медиафайла
    if not text and not media_type:
        return

    from_id = message_data.get("from_id")
    peer_id = message_data.get("peer_id") or from_id
    message_id = message_data.get("id") or message_data.get("conversation_message_id")

    contact_name = f"VK Клиент {from_id}"
    try:
        user_info = await _vk_method("users.get", {"user_ids": from_id})
        if user_info and isinstance(user_info, list) and len(user_info) > 0:
            first = user_info[0].get("first_name", "")
            last = user_info[0].get("last_name", "")
            contact_name = f"{first} {last}".strip() or contact_name
    except Exception:
        pass

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
        attachments=parsed_attachments,
        external_chat_id=f"vk-peer-{peer_id}",
        external_contact_id=f"vk-user-{from_id}",
        external_message_id=f"vk-msg-{message_id}",
        channel=ChannelType.vk,
    )

    with Session(engine) as session:
        create_inbound_message(session, payload)


# =====================================================================
# Отправка сообщений в диалог ВКонтакте
# =====================================================================
def send_vk_message(peer_id: int, message: str) -> dict[str, Any]:
    async def _send():
        return await _vk_method(
            "messages.send",
            {"peer_id": peer_id, "message": message, "random_id": random.randint(1, 2**31 - 1)},
        )
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(_send())
    raise RuntimeError("send_vk_message cannot be called from a running loop")


# =====================================================================
# Отметка сообщений как прочитанных (messages.markAsRead)
# =====================================================================
def mark_vk_message_read(peer_id: int, start_message_id: str | int | None = None) -> bool:
    async def _mark() -> bool:
        params = {"peer_id": abs(peer_id), "mark_conversation_as_read": 1}
        if start_message_id:
            clean_id = str(start_message_id).replace("vk-msg-", "").replace("vk-message-", "")
            if clean_id.isdigit():
                params["start_message_id"] = int(clean_id)
        try:
            res = await _vk_method("messages.markAsRead", params)
            return bool(res == 1 or res is True or (isinstance(res, dict) and res.get("response") == 1))
        except Exception as exc:
            logger.warning("VK messages.markAsRead failed: %s", exc)
            return False

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(_mark())
    return False


# =====================================================================
# Long Polling сообщества ВКонтакте (Bots Long Poll API)
# =====================================================================
async def vk_long_poll_loop() -> None:
    if not getattr(settings, "vk_enabled", False) or not settings.vk_access_token or not settings.vk_group_id:
        logger.info("VK connector is disabled")
        return

    logger.info("VK Long Polling loop started")
    while True:
        try:
            server_info = await _vk_method("groups.getLongPollServer", {"group_id": settings.vk_group_id})
            server = server_info["server"]
            key = server_info["key"]
            ts = server_info["ts"]

            async with httpx.AsyncClient(timeout=35.0) as client:
                while True:
                    resp = await client.get(f"{server}?act=a_check&key={key}&ts={ts}&wait=25")
                    data = resp.json()
                    if "failed" in data:
                        break
                    ts = data.get("ts", ts)
                    for update in data.get("updates", []):
                        if update.get("type") == "message_new":
                            msg_obj = update.get("object", {}).get("message")
                            if msg_obj:
                                await handle_vk_message(msg_obj)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("VK Long Poll error, retry in 5s")
            await asyncio.sleep(5)


async def send_vk_message_async(user_id: str, text: str) -> dict[str, Any]:
    """Отправка ответа оператора пользователю ВКонтакте."""
    raw_user_id = user_id.replace("vk-chat-", "").replace("vk-user-", "")
    return await _vk_method(
        "messages.send",
        {
            "user_id": int(raw_user_id),
            "random_id": random.randint(1, 2147483647),
            "message": text,
        },
    )


# =====================================================================
# Публикация постов на стену сообщества ВКонтакте (wall.post)
# =====================================================================
async def publish_vk_wall_post_async(
    message: str,
    owner_id: int | None = None,
    photo_paths: list[str] | None = None,
) -> dict[str, str | None]:
    """
    Асинхронная публикация поста на стену сообщества ВК.
    Поддерживает текстовые записи и прикрепление вложений/фотографий.
    """
    from uuid import uuid4

    token, default_group_id = _require_vk_settings()
    target_group = owner_id or default_group_id
    if not target_group:
        raise RuntimeError("VK group ID is not configured (VK_GROUP_ID)")

    # Для сообществ owner_id на стене должен быть отрицательным
    wall_owner_id = -abs(int(target_group))

    params: dict[str, Any] = {
        "owner_id": wall_owner_id,
        "from_group": 1,
        "message": message,
    }

    # Если переданы готовые вложения (например, "photo-123456_78910" или ссылки)
    valid_attachments = [p for p in (photo_paths or []) if p]
    if valid_attachments:
        params["attachments"] = ",".join(valid_attachments)

    res = await _vk_method("wall.post", params)
    post_id = None
    if isinstance(res, dict):
        post_id = res.get("post_id")
    elif isinstance(res, (int, str)):
        post_id = str(res)

    wall_url = f"https://vk.com/wall{wall_owner_id}_{post_id}" if post_id else None

    return {
        "external_post_id": f"vk-wall-{abs(wall_owner_id)}_{post_id}" if post_id else f"vk-wall-{uuid4().hex[:8]}",
        "url": wall_url,
    }


def publish_vk_wall_post(
    message: str,
    owner_id: int | None = None,
    photo_paths: list[str] | None = None,
) -> dict[str, str | None]:
    """Синхронная обертка над publish_vk_wall_post_async."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(publish_vk_wall_post_async(message, owner_id, photo_paths))
    raise RuntimeError("publish_vk_wall_post cannot be called directly from inside a running event loop; await publish_vk_wall_post_async instead")

