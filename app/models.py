from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from sqlmodel import Column, Field, JSON, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ChannelType(str, Enum):
    vk = "vk"
    vk_wall = "vk_wall"
    telegram = "telegram"
    max = "max"
    test = "test"


class MessageDirection(str, Enum):
    inbound = "inbound"
    outbound = "outbound"


class SenderType(str, Enum):
    client = "client"
    operator = "operator"
    ai = "ai"
    note = "note"


class Project(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(index=True)
    slug: str = Field(index=True, unique=True)
    niche_type: str = "ceilings"
    description: str | None = None
    knowledge_dir: str | None = None
    system_prompt: str | None = None
    is_active: bool = True
    color: str = "#0f766e"
    created_at: datetime = Field(default_factory=utc_now)


class Contact(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(index=True)
    phone: str | None = Field(default=None, index=True)
    external_id: str | None = Field(default=None, index=True)
    email: str | None = None
    primary_channel: ChannelType = ChannelType.test
    city: str | None = None
    notes: str | None = None
    created_at: datetime = Field(default_factory=utc_now)


class Channel(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID | None = Field(default=None, foreign_key="project.id", index=True)
    type: ChannelType = Field(index=True)
    name: str
    is_active: bool = True
    settings: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    last_sync_at: datetime | None = None
    created_at: datetime = Field(default_factory=utc_now)


class Conversation(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID | None = Field(default=None, foreign_key="project.id", index=True)
    channel_id: UUID = Field(foreign_key="channel.id", index=True)
    contact_id: UUID = Field(foreign_key="contact.id", index=True)
    channel: ChannelType = ChannelType.test
    external_chat_id: str = Field(index=True)
    status: str = "open"
    last_text: str | None = None
    last_message_at: datetime | None = None
    unread_count: int = 0
    created_at: datetime = Field(default_factory=utc_now)


class Message(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    conversation_id: UUID = Field(foreign_key="conversation.id", index=True)
    direction: MessageDirection
    sender_type: SenderType
    # text теперь опциональный (сообщение может быть чистым фото, голосовым или документом)
    text: str | None = Field(default=None)
    # Медиа-поля
    media_type: str | None = Field(default=None, index=True)  # "photo", "voice", "video_note", "document", "text"
    media_url: str | None = None                              # локальный путь или прямой URL к файлу
    file_id: str | None = Field(default=None, index=True)     # уникальный ID файла в соцсети (Telegram file_id / VK photo ID)
    caption: str | None = None                                # подпись к медиафайлу
    file_name: str | None = None                              # оригинальное имя файла (для документов)
    file_size: int | None = None                              # размер файла в байтах
    duration_sec: int | None = None                           # длительность голосового или видеосообщения в сек
    attachments: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    external_message_id: str | None = Field(default=None, index=True)
    delivery_status: str = "stored"
    # Статус Прочитано
    is_read: bool = Field(default=False, index=True)
    read_at: datetime | None = None
    created_at: datetime = Field(default_factory=utc_now, index=True)


class Lead(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID | None = Field(default=None, foreign_key="project.id", index=True)
    contact_id: UUID = Field(foreign_key="contact.id", index=True)
    conversation_id: UUID = Field(foreign_key="conversation.id", index=True)
    source: ChannelType = ChannelType.test
    status: str = "new"
    temperature: str = "warm"
    area_m2: float | None = None
    rooms_count: int | None = None
    lights_count: int | None = None
    cornice: bool | None = None
    ceiling_type: str | None = None
    address: str | None = None
    desired_date: str | None = None
    phone_received: bool = False
    measurement_planned: bool = False
    estimated_price: float | None = None
    custom_fields: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class AiSuggestionMode(str, Enum):
    draft = "draft"
    auto = "auto"


class AiSuggestionStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class AiSuggestion(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    conversation_id: UUID = Field(foreign_key="conversation.id", index=True)
    suggested_text: str
    confidence: float = 0.9
    mode: AiSuggestionMode = AiSuggestionMode.draft
    status: AiSuggestionStatus = AiSuggestionStatus.pending
    rag_sources: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utc_now)


class ContentStatus(str, Enum):
    idea = "idea"
    draft = "draft"
    review = "review"
    scheduled = "scheduled"
    published = "published"
    archived = "archived"


class ScheduledPostStatus(str, Enum):
    draft = "draft"
    scheduled = "scheduled"
    publishing = "publishing"
    published = "published"
    failed = "failed"
    cancelled = "cancelled"


class ContentItem(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID | None = Field(default=None, foreign_key="project.id", index=True)
    title: str = Field(index=True)
    topic: str = ""
    rubric: str | None = Field(default=None, index=True)
    goal: str | None = None
    offer: str | None = None
    trigger_keyword: str | None = Field(default=None, index=True)
    status: ContentStatus = Field(default=ContentStatus.idea, index=True)
    notes: str | None = None
    source: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class ContentVariant(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    content_item_id: UUID = Field(foreign_key="contentitem.id", index=True)
    channel: ChannelType = Field(index=True)
    title: str | None = None
    text: str
    format: str = "post"
    status: ContentStatus = Field(default=ContentStatus.draft, index=True)
    ai_notes: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class MediaAsset(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID | None = Field(default=None, foreign_key="project.id", index=True)
    content_item_id: UUID | None = Field(default=None, foreign_key="contentitem.id", index=True)
    title: str
    asset_type: str = "photo"
    file_path: str | None = None
    url: str | None = None
    description: str | None = None
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utc_now)


class ContentItemMediaLink(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    content_item_id: UUID = Field(foreign_key="contentitem.id", index=True)
    media_asset_id: UUID = Field(foreign_key="mediaasset.id", index=True)
    sort_order: int = 0
    created_at: datetime = Field(default_factory=utc_now)


class PublishTarget(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID | None = Field(default=None, foreign_key="project.id", index=True)
    channel: ChannelType = Field(index=True)
    name: str
    external_id: str | None = Field(default=None, index=True)
    is_active: bool = True
    settings: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utc_now)


class ScheduledPost(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    content_variant_id: UUID = Field(foreign_key="contentvariant.id", index=True)
    publish_target_id: UUID | None = Field(default=None, foreign_key="publishtarget.id", index=True)
    scheduled_at: datetime = Field(index=True)
    status: ScheduledPostStatus = Field(default=ScheduledPostStatus.scheduled, index=True)
    notes: str | None = None
    error_message: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class PublishedPost(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    scheduled_post_id: UUID | None = Field(default=None, foreign_key="scheduledpost.id", index=True)
    content_variant_id: UUID | None = Field(default=None, foreign_key="contentvariant.id", index=True)
    external_post_id: str | None = Field(default=None, index=True)
    url: str | None = None
    status: str = "published"
    error_message: str | None = None
    published_at: datetime | None = None
    created_at: datetime = Field(default_factory=utc_now)


class PostPerformance(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    published_post_id: UUID = Field(foreign_key="publishedpost.id", index=True)
    views: int = 0
    reactions: int = 0
    comments: int = 0
    shares: int = 0
    clicks: int = 0
    messages: int = 0
    leads: int = 0
    measurements: int = 0
    captured_at: datetime = Field(default_factory=utc_now, index=True)

