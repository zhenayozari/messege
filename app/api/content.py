from __future__ import annotations

import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, desc, select

from app.db.session import get_session
from app.models import (
    ChannelType,
    ContentItem,
    ContentItemMediaLink,
    ContentStatus,
    ContentVariant,
    MediaAsset,
    PostPerformance,
    PublishedPost,
    ScheduledPost,
    ScheduledPostStatus,
)
from app.services.content_service import (
    publish_scheduled_post_async,
)

logger = logging.getLogger("phoenix.api.content")

router = APIRouter(prefix="/content", tags=["content"])


# =====================================================================
# Ручная форсированная публикация по кнопке "Опубликовать сейчас"
# =====================================================================
@router.post("/publish-now/{scheduled_post_id}")
async def publish_now(
    scheduled_post_id: UUID,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """
    Немедленная принудительная публикация поста из календаря контента.
    Отправляет пост в Telegram/VK без ожидания наступления таймера.
    """
    post = session.get(ScheduledPost, scheduled_post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Запланированный пост не найден")

    if post.status == ScheduledPostStatus.publishing:
        raise HTTPException(status_code=409, detail="Пост уже находится в процессе публикации")

    try:
        published_record = await publish_scheduled_post_async(session, scheduled_post_id)
        return {
            "status": "published",
            "message": "Пост успешно опубликован в соцсеть",
            "scheduled_post_id": str(post.id),
            "published_post_id": str(published_record.id),
            "external_post_id": published_record.external_post_id,
            "url": published_record.url,
            "published_at": published_record.published_at.isoformat() if published_record.published_at else None,
        }
    except Exception as exc:
        logger.exception("Failed to publish now: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка публикации во внешнюю соцсеть: {str(exc)}",
        )


# =====================================================================
# Список запланированных постов (для Календаря)
# =====================================================================
@router.get("/scheduled")
def list_scheduled_posts(
    project_id: UUID | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    """Получение постов для календарной сетки с информацией о канале и времени."""
    stmt = select(ScheduledPost).order_by(ScheduledPost.scheduled_at)
    posts = session.exec(stmt).all()

    result = []
    for p in posts:
        variant = session.get(ContentVariant, p.content_variant_id)
        channel = variant.channel if variant else ChannelType.test
        title = variant.title if (variant and variant.title) else (variant.text[:40] if variant else "Пост")

        result.append({
            "id": str(p.id),
            "content_variant_id": str(p.content_variant_id),
            "scheduled_at": p.scheduled_at.isoformat(),
            "status": p.status,
            "channel": channel,
            "title": title,
            "text": variant.text if variant else "",
            "error_message": p.error_message,
        })
    return result


# =====================================================================
# Медиабиблиотека: получение ассетов и фильтрация по тегам
# =====================================================================
@router.get("/media")
def list_media(
    tag: str | None = Query(default=None),
    project_id: UUID | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[MediaAsset]:
    """Получение загруженных фото объектов и видео из медиабиблиотеки."""
    stmt = select(MediaAsset)
    if project_id:
        stmt = stmt.where(MediaAsset.project_id == project_id)
    assets = session.exec(stmt).all()
    if tag:
        assets = [a for a in assets if tag.lower() in [t.lower() for t in (a.tags or [])]]
    return assets


# =====================================================================
# Прикрепление медиафайлов к посту
# =====================================================================
@router.post("/{item_id}/media/attach")
def attach_media(
    item_id: UUID,
    media_ids: list[UUID],
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Связывание фотографий из медиабиблиотеки с постом через ContentItemMediaLink."""
    for idx, mid in enumerate(media_ids):
        link = ContentItemMediaLink(
            content_item_id=item_id,
            media_asset_id=mid,
            sort_order=idx,
        )
        session.add(link)
    session.commit()
    return {"status": "attached", "attached_count": len(media_ids)}
