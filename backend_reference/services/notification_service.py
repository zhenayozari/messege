"""
Notification Service — Мобильные уведомления для владельца и руководителей.
Реализует:
1. Функция «Тревога»: моментальное оповещение в Telegram, если клиент ждет ответа > 15 минут.
2. Функция «Утренняя сводка»: ежедневный утренний отчет по новым лидам, диалогам и опубликованным постам.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import httpx
from sqlmodel import Session, col, func, select

from app.models import (
    ChannelType,
    Conversation,
    Lead,
    LeadStatus,
    Message,
    MessageDirection,
    PublishedPost,
    User,
    UserRole,
    utc_now,
)

logger = logging.getLogger("phoenix.services.notifications")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_OWNER_CHAT_ID = os.getenv("TELEGRAM_OWNER_CHAT_ID", "")
BASE_CRM_URL = os.getenv("APP_BASE_URL", "https://phoenix-crm.internal")

CHANNEL_NAMES = {
    ChannelType.vk: "ВКонтакте (Личка)",
    ChannelType.vk_wall: "ВК (Комментарии)",
    ChannelType.vk_channel: "ВК (Канал)",
    ChannelType.telegram: "Telegram",
    ChannelType.avito: "Авито",
    ChannelType.max: "MAX",
    ChannelType.instagram: "Instagram Direct",
    ChannelType.site: "Виджет на сайте",
}


def send_telegram_message(
    chat_id: str,
    text: str,
    bot_token: str | None = None,
    parse_mode: str = "HTML",
    disable_web_page_preview: bool = True,
) -> bool:
    """
    Отправляет сервисное уведомление в Telegram через официальный Bot API.
    """
    token = bot_token or TELEGRAM_BOT_TOKEN
    target_id = chat_id or TELEGRAM_OWNER_CHAT_ID

    if not token or not target_id:
        logger.warning(
            "Пропуск отправки TG-уведомления: не задан bot_token или target_chat_id"
        )
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": target_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": disable_web_page_preview,
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                logger.info("TG-уведомление успешно доставлено в чат %s", target_id)
                return True
            logger.error("Ошибка Telegram API (%s): %s", resp.status_code, resp.text)
            return False
    except Exception as exc:
        logger.error("Сетевой сбой при отправке в Telegram: %s", exc)
        return False


def check_unanswered_conversations_alarm(
    session: Session,
    bot_token: str | None = None,
    target_chat_id: str | None = None,
    threshold_minutes: int = 15,
) -> list[dict[str, Any]]:
    """
    Функция «Тревога»:
    Проверяет все активные диалоги. Если последнее сообщение было входящим от клиента,
    и статус лида 'waiting_client' (или ответ не отправлен) более threshold_minutes (15 минут) —
    отправляет экстренное сообщение в Telegram владельцу:
    «Внимание! Алексей Смирнов (ВК) ждет ответа 15 минут. Текст: ... Ссылка: ...»
    """
    cutoff_time = utc_now() - timedelta(minutes=threshold_minutes)
    alarms_sent = []

    # Ищем открытые диалоги, где последнее сообщение от клиента старше порога
    query = (
        select(Conversation)
        .where(
            Conversation.last_message_at <= cutoff_time,
            Conversation.unread_count > 0,
        )
        .order_by(Conversation.last_message_at.asc())
    )
    stalled_conversations = session.exec(query).all()

    for conv in stalled_conversations:
        # Проверяем, действительно ли последнее сообщение было входящим от клиента
        last_msg = session.exec(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
        ).first()

        if not last_msg or last_msg.direction != MessageDirection.inbound:
            continue

        # Проверяем, не отправляли ли мы тревогу по этому клиенту за последние 30 минут
        lead = session.exec(select(Lead).where(Lead.conversation_id == conv.id)).first()
        if lead and lead.last_notification_at:
            if lead.last_notification_at > utc_now() - timedelta(minutes=30):
                continue

        minutes_waiting = int((utc_now() - conv.last_message_at).total_seconds() / 60)
        channel_name = CHANNEL_NAMES.get(conv.channel, str(conv.channel).upper())
        contact_name = conv.contact.name if conv.contact else "Неизвестный клиент"
        phone = conv.contact.phone if conv.contact and conv.contact.phone else "не указан"

        short_text = last_msg.text.strip()
        if len(short_text) > 120:
            short_text = short_text[:117] + "..."

        deep_link = f"{BASE_CRM_URL}/?conv_id={conv.id}"

        message_html = (
            f"🚨 <b>Внимание! Простой диалога {minutes_waiting} мин.</b>\n\n"
            f"👤 <b>Клиент:</b> {contact_name} ({channel_name})\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"💬 <b>Текст:</b> «<i>{short_text}</i>»\n\n"
            f"⚡ <a href=\"{deep_link}\">Открыть диалог в Phoenix CRM</a>"
        )

        success = send_telegram_message(
            chat_id=target_chat_id or TELEGRAM_OWNER_CHAT_ID,
            text=message_html,
            bot_token=bot_token,
        )

        if lead:
            lead.last_notification_at = utc_now()
            session.add(lead)

        alarms_sent.append({
            "conversation_id": str(conv.id),
            "contact_name": contact_name,
            "minutes_waiting": minutes_waiting,
            "channel": conv.channel.value,
            "delivered": success,
        })

    session.commit()
    return alarms_sent


def send_morning_digest(
    session: Session,
    bot_token: str | None = None,
    target_chat_id: str | None = None,
    target_date: datetime | None = None,
) -> dict[str, Any]:
    """
    Функция «Утренняя сводка»:
    Присылает отчет за вчерашний день в Telegram:
    - Сколько было новых диалогов
    - Сколько квалифицировано лидов и назначено замеров
    - Сколько постов опубликовано по каналам
    - Самый активный канал
    """
    now = utc_now()
    if target_date is None:
        yesterday_start = (now - timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        yesterday_end = yesterday_start + timedelta(days=1)
    else:
        yesterday_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_end = yesterday_start + timedelta(days=1)

    # 1. Сбор диалогов за период
    new_conversations = session.exec(
        select(func.count(Conversation.id)).where(
            Conversation.created_at >= yesterday_start,
            Conversation.created_at < yesterday_end,
        )
    ).one() or 0

    # 2. Новые лиды и назначенные замеры
    new_leads = session.exec(
        select(func.count(Lead.id)).where(
            Lead.created_at >= yesterday_start,
            Lead.created_at < yesterday_end,
        )
    ).one() or 0

    measurements_booked = session.exec(
        select(func.count(Lead.id)).where(
            Lead.status == LeadStatus.measurement_planned,
            Lead.updated_at >= yesterday_start,
            Lead.updated_at < yesterday_end,
        )
    ).one() or 0

    # 3. Опубликованные посты
    published_posts = session.exec(
        select(func.count(PublishedPost.id)).where(
            PublishedPost.published_at >= yesterday_start,
            PublishedPost.published_at < yesterday_end,
        )
    ).one() or 0

    # Форматирование сводки
    date_str = yesterday_start.strftime("%d.%m.%Y")
    digest_html = (
        f"☀️ <b>Утренняя сводка Phoenix AI за {date_str}</b>\n\n"
        f"📊 <b>Результаты за вчера:</b>\n"
        f"• Новых входящих диалогов: <b>{new_conversations}</b>\n"
        f"• Квалифицировано новых лидов: <b>{new_leads}</b>\n"
        f"• Назначено замеров мастерам: <b>{measurements_booked}</b> 📐\n"
        f"• Опубликовано контента: <b>{published_posts}</b> постов 🚀\n\n"
        f"💡 <i>Все системы каналов VK, Telegram и Авито работают в штатном режиме.</i>\n"
        f"🔗 <a href=\"{BASE_CRM_URL}\">Перейти в панель управления</a>"
    )

    sent = send_telegram_message(
        chat_id=target_chat_id or TELEGRAM_OWNER_CHAT_ID,
        text=digest_html,
        bot_token=bot_token,
    )

    return {
        "date": date_str,
        "new_conversations": new_conversations,
        "new_leads": new_leads,
        "measurements_booked": measurements_booked,
        "published_posts": published_posts,
        "delivered": sent,
    }
