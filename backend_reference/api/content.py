"""
Phoenix AI Hub — Content & Standalone Media Library API
Маршруты для работы с контентом и независимой медиабиблиотекой.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, desc, select

from app.db.session import get_session
from app.models import (
    ContentItem,
    ContentItemMediaLink,
    ContentStatus,
    ContentVariant,
    MediaAsset,
    utc_now,
)

router = APIRouter(prefix="/content", tags=["content"])


# =====================================================================
# Схемы данных MediaLibrary & Content
# =====================================================================
class MediaAssetCreate(BaseModel):
    project_id: UUID | None = None
    title: str
    asset_type: str = "photo"
    url: str | None = None
    file_path: str | None = None
    description: str | None = None
    tags: list[str] = []


class MediaAssetRead(BaseModel):
    id: UUID
    project_id: UUID | None
    title: str
    asset_type: str
    url: str | None
    description: str | None
    tags: list[str]
    created_at: datetime


class AttachMediaRequest(BaseModel):
    media_asset_ids: list[UUID]


# =====================================================================
# Медиабиблиотека (Самостоятельные объекты)
# =====================================================================
@router.get("/media", response_model=list[MediaAssetRead])
def list_media_assets(
    project_id: UUID | None = Query(default=None),
    tag: str | None = Query(default=None),
    search: str | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[MediaAssetRead]:
    """
    Получить список всех медиафайлов из библиотеки с фильтрацией по проекту, тегам и поиску.
    """
    stmt = select(MediaAsset)
    if project_id:
        stmt = stmt.where(MediaAsset.project_id == project_id)

    stmt = stmt.order_by(desc(MediaAsset.created_at))
    assets = session.exec(stmt).all()

    # Фильтрация по тегу и поисковой строке
    filtered: list[MediaAsset] = []
    for a in assets:
        if tag and tag.lower() not in [t.lower() for t in (a.tags or [])]:
            continue
        if search:
            q = search.lower()
            match_title = q in a.title.lower()
            match_desc = q in (a.description or "").lower()
            if not match_title and not match_desc:
                continue
        filtered.append(a)

    return [
        MediaAssetRead(
            id=a.id,
            project_id=a.project_id,
            title=a.title,
            asset_type=a.asset_type,
            url=a.url,
            description=a.description,
            tags=a.tags or [],
            created_at=a.created_at,
        )
        for a in filtered
    ]


@router.post("/media", response_model=MediaAssetRead)
def create_media_asset(
    payload: MediaAssetCreate,
    session: Session = Depends(get_session),
) -> MediaAssetRead:
    """
    Загрузить/сохранить новый медиафайл в независимую библиотеку объектов.
    """
    asset = MediaAsset(
        project_id=payload.project_id,
        title=payload.title,
        asset_type=payload.asset_type,
        url=payload.url,
        file_path=payload.file_path,
        description=payload.description,
        tags=payload.tags,
        created_at=utc_now(),
    )
    session.add(asset)
    session.commit()
    session.refresh(asset)

    return MediaAssetRead(
        id=asset.id,
        project_id=asset.project_id,
        title=asset.title,
        asset_type=asset.asset_type,
        url=asset.url,
        description=asset.description,
        tags=asset.tags or [],
        created_at=asset.created_at,
    )


# =====================================================================
# Привязка медиа к ContentItem (M:N отношение)
# =====================================================================
@router.post("/{item_id}/media/attach")
def attach_media_to_content(
    item_id: UUID,
    payload: AttachMediaRequest,
    session: Session = Depends(get_session),
):
    """
    Прикрепить один или несколько медиафайлов из библиотеки к карточке поста (ContentItem).
    """
    content_item = session.get(ContentItem, item_id)
    if not content_item:
        raise HTTPException(status_code=404, detail="ContentItem not found")

    attached_count = 0
    for idx, media_id in enumerate(payload.media_asset_ids):
        # Проверяем наличие медиа
        media = session.get(MediaAsset, media_id)
        if not media:
            continue

        # Проверяем, не прикреплен ли уже
        existing = session.exec(
            select(ContentItemMediaLink).where(
                ContentItemMediaLink.content_item_id == item_id,
                ContentItemMediaLink.media_asset_id == media_id,
            )
        ).first()

        if not existing:
            link = ContentItemMediaLink(
                content_item_id=item_id,
                media_asset_id=media_id,
                sort_order=idx,
                created_at=utc_now(),
            )
            session.add(link)
            attached_count += 1

    session.commit()
    return {
        "status": "success",
        "content_item_id": str(item_id),
        "attached_count": attached_count,
    }


@router.delete("/{item_id}/media/{media_id}")
def detach_media_from_content(
    item_id: UUID,
    media_id: UUID,
    session: Session = Depends(get_session),
):
    """
    Открепить медиафайл от карточки поста (сам файл в библиотеке сохраняется).
    """
    link = session.exec(
        select(ContentItemMediaLink).where(
            ContentItemMediaLink.content_item_id == item_id,
            ContentItemMediaLink.media_asset_id == media_id,
        )
    ).first()

    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    session.delete(link)
    session.commit()
    return {"status": "detached", "media_id": str(media_id)}


@router.get("/{item_id}/media", response_model=list[MediaAssetRead])
def get_content_media(
    item_id: UUID,
    session: Session = Depends(get_session),
) -> list[MediaAssetRead]:
    """
    Получить все медиафайлы, прикрепленные к выбранному материалу контента.
    """
    links = session.exec(
        select(ContentItemMediaLink)
        .where(ContentItemMediaLink.content_item_id == item_id)
        .order_by(ContentItemMediaLink.sort_order)
    ).all()

    media_ids = [l.media_asset_id for l in links]
    if not media_ids:
        return []

    assets = session.exec(
        select(MediaAsset).where(MediaAsset.id.in_(media_ids))
    ).all()

    return [
        MediaAssetRead(
            id=a.id,
            project_id=a.project_id,
            title=a.title,
            asset_type=a.asset_type,
            url=a.url,
            description=a.description,
            tags=a.tags or [],
            created_at=a.created_at,
        )
        for a in assets
    ]
