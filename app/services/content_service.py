from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlmodel import Session, desc, select

from app.models import (
    ChannelType,
    ContentItem,
    ContentItemMediaLink,
    ContentStatus,
    ContentVariant,
    MediaAsset,
    PostPerformance,
    Project,
    PublishTarget,
    PublishedPost,
    ScheduledPost,
    ScheduledPostStatus,
    utc_now,
)
from app.connectors.telegram import publish_telegram_channel_post_async
from app.connectors.vk import publish_vk_wall_post_async

logger = logging.getLogger("phoenix.services.content")

# =====================================================================
# Профили ниш для AI генерации постов
# =====================================================================
NICHE_PROFILES: dict[str, dict[str, Any]] = {
    "ceilings": {
        "brand_name": "ФЕНИКС PRO Потолки",
        "benefits": ["Монтаж за 1 день без пыли", "Теневые профили EuroKRAAB", "Бесплатный замер"],
        "call_to_action": "Запишитесь на замер в личных сообщениях или по ссылке в шапке профиля!",
    },
    "default": {
        "brand_name": "Phoenix Hub",
        "benefits": ["Высокое качество", "Индивидуальный подход", "Гарантия на все работы"],
        "call_to_action": "Напишите нам для бесплатной консультации!",
    },
}


# =====================================================================
# Сбор медиафайлов, привязанных к посту
# =====================================================================
def get_media_urls_for_content_item(session: Session, content_item_id: UUID) -> list[str]:
    """
    Возвращает список URL/путей медиафайлов для поста:
    1. Через таблицу связей ContentItemMediaLink (с сортировкой sort_order)
    2. Прямо через MediaAsset.content_item_id
    """
    links = session.exec(
        select(ContentItemMediaLink)
        .where(ContentItemMediaLink.content_item_id == content_item_id)
        .order_by(ContentItemMediaLink.sort_order)
    ).all()

    urls: list[str] = []
    if links:
        for link in links:
            asset = session.get(MediaAsset, link.media_asset_id)
            if asset and (asset.url or asset.file_path):
                urls.append(asset.url or asset.file_path)
    else:
        direct_assets = session.exec(
            select(MediaAsset).where(MediaAsset.content_item_id == content_item_id)
        ).all()
        for a in direct_assets:
            if a.url or a.file_path:
                urls.append(a.url or a.file_path)

    return [u for u in urls if u]


# =====================================================================
# Боевая публикация отложенного поста (ScheduledPost)
# =====================================================================
async def publish_scheduled_post_async(session: Session, scheduled_post_id: UUID) -> PublishedPost:
    """
    Публикация запланированного поста в соцсеть (VK, Telegram, Max):
    1. Ищет ScheduledPost в БД.
    2. Извлекает вариант контента (ContentVariant) и прикрепленные медиафайлы.
    3. Определяет канал и вызывает соответствующий коннектор.
    4. При успехе: статус 'published', фиксирует external_post_id, создает PostPerformance.
    5. При ошибке: статус 'failed' с описанием error_message.
    """
    post = session.get(ScheduledPost, scheduled_post_id)
    if not post:
        raise ValueError(f"ScheduledPost with id={scheduled_post_id} not found")

    variant = session.get(ContentVariant, post.content_variant_id)
    if not variant:
        post.status = ScheduledPostStatus.failed
        post.error_message = "ContentVariant not found"
        session.add(post)
        session.commit()
        raise ValueError("ContentVariant not found for this scheduled post")

    content_item = session.get(ContentItem, variant.content_item_id)

    # Получаем прикрепленные медиафайлы (фотографии объектов, сметы)
    media_urls: list[str] = []
    if content_item:
        media_urls = get_media_urls_for_content_item(session, content_item.id)

    # Определяем параметры целевого канала публикации
    target: PublishTarget | None = None
    if post.publish_target_id:
        target = session.get(PublishTarget, post.publish_target_id)

    target_channel = target.channel if target else variant.channel
    target_external_id = target.external_id if target else None

    # Фиксируем статус "publishing"
    post.status = ScheduledPostStatus.publishing
    session.add(post)
    session.commit()

    try:
        external_post_id: str | None = None
        post_url: str | None = None

        # 1. Публикация в Telegram (канал)
        if target_channel == ChannelType.telegram:
            res = await publish_telegram_channel_post_async(
                message=variant.text,
                channel_id=target_external_id,
                photo_paths=media_urls,
            )
            external_post_id = res.get("external_post_id")
            post_url = res.get("url")

        # 2. Публикация на стену ВКонтакте (сообщество)
        elif target_channel in {ChannelType.vk, ChannelType.vk_wall}:
            owner_id_int = int(target_external_id) if (target_external_id and target_external_id.lstrip("-").isdigit()) else None
            res = await publish_vk_wall_post_async(
                message=variant.text,
                owner_id=owner_id_int,
                photo_paths=media_urls,
            )
            external_post_id = res.get("external_post_id")
            post_url = res.get("url")

        # 3. Публикация в Max / Тестовый канал
        else:
            external_post_id = f"test-post-{uuid4().hex[:8]}"
            post_url = f"https://example.com/posts/{external_post_id}"

        # Успешное завершение: создаем PublishedPost
        now = utc_now()
        post.status = ScheduledPostStatus.published
        post.error_message = None
        session.add(post)

        # Обновляем вариант контента и элемент
        variant.status = ContentStatus.published
        session.add(variant)
        if content_item:
            content_item.status = ContentStatus.published
            session.add(content_item)

        # Проверяем, существует ли уже PublishedPost для этой записи
        existing_pub = session.exec(
            select(PublishedPost).where(PublishedPost.scheduled_post_id == post.id)
        ).first()

        if existing_pub:
            pub_record = existing_pub
            pub_record.external_post_id = external_post_id
            pub_record.url = post_url
            pub_record.status = "published"
            pub_record.published_at = now
        else:
            pub_record = PublishedPost(
                id=uuid4(),
                scheduled_post_id=post.id,
                content_variant_id=variant.id,
                external_post_id=external_post_id,
                url=post_url,
                status="published",
                published_at=now,
                created_at=now,
            )
            session.add(pub_record)

        session.commit()
        session.refresh(pub_record)

        # Создаем начальную метрику аналитики PostPerformance
        existing_perf = session.exec(
            select(PostPerformance).where(PostPerformance.published_post_id == pub_record.id)
        ).first()
        if not existing_perf:
            perf = PostPerformance(
                id=uuid4(),
                published_post_id=pub_record.id,
                views=0,
                reactions=0,
                comments=0,
                shares=0,
                clicks=0,
                messages=0,
                leads=0,
                measurements=0,
                captured_at=now,
            )
            session.add(perf)
            session.commit()

        logger.info(
            "Scheduled post %s successfully published to %s: %s",
            post.id,
            target_channel,
            external_post_id,
        )
        return pub_record

    except Exception as exc:
        logger.exception("Failed to publish scheduled post %s: %s", post.id, exc)
        post.status = ScheduledPostStatus.failed
        post.error_message = str(exc)
        session.add(post)
        session.commit()
        raise


def publish_scheduled_post(session: Session, scheduled_post_id: UUID) -> PublishedPost:
    """Синхронный фасад для вызова из фоновых потоков или синхронных контекстов."""
    import asyncio
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(publish_scheduled_post_async(session, scheduled_post_id))
    raise RuntimeError("Use await publish_scheduled_post_async in async loop")
