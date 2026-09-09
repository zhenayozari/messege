from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ChannelType(str, Enum):
    test = "test"
    avito = "avito"
    vk = "vk"
    vk_wall = "vk_wall"
    vk_channel = "vk_channel"
    max = "max"
    telegram = "telegram"
    site = "site"
    instagram = "instagram"


class MessageDirection(str, Enum):
    inbound = "inbound"
    outbound = "outbound"


class SenderType(str, Enum):
    client = "client"
    operator = "operator"
    ai = "ai"
    system = "system"


class LeadStatus(str, Enum):
    new = "new"
    qualifying = "qualifying"
    waiting_client = "waiting_client"
    measurement_planned = "measurement_planned"
    won = "won"
    lost = "lost"


class LeadTemperature(str, Enum):
    cold = "cold"
    warm = "warm"
    hot = "hot"


class AiSuggestionStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    edited = "edited"
    rejected = "rejected"


class AiSuggestionMode(str, Enum):
    draft = "draft"
    auto_allowed = "auto_allowed"
    human_required = "human_required"


class ContentStatus(str, Enum):
    idea = "idea"
    draft = "draft"
    review = "review"
    approved = "approved"
    scheduled = "scheduled"
    published = "published"
    archived = "archived"


class ScheduledPostStatus(str, Enum):
    scheduled = "scheduled"
    publishing = "publishing"
    published = "published"
    failed = "failed"
    cancelled = "cancelled"


class UserRole(str, Enum):
    owner = "owner"
    manager = "manager"


class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    email: str = Field(unique=True, index=True)
    role: UserRole = Field(default=UserRole.owner, index=True)
    telegram_chat_id: str | None = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=utc_now)


# =====================================================================
# Проекты (Ниши) для масштабируемости системы на разные направления
# =====================================================================
class Project(SQLModel, table=True):
    """
    Проект (Ниша).
    Позволяет изолировать базы знаний, промпты ИИ, калькуляторы и воронки
    для разных направлений бизнеса (например: Потолки, Кухни, Окна, Ремонт).
    """
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(index=True)                  # Напр: "ФЕНИКС PRO Потолки"
    slug: str = Field(unique=True, index=True)     # Напр: "ceilings"
    niche_type: str = "ceilings"                   # ceilings / kitchens / windows / general
    description: str | None = None
    knowledge_dir: str | None = None               # Папка со статьями базы знаний: "/app/knowledge/ceilings"
    system_prompt_override: str | None = None      # Персональный системный промпт для модели
    settings: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    is_active: bool = True
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class Channel(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID | None = Field(default=None, foreign_key="project.id", index=True)
    type: ChannelType = Field(index=True)
    name: str
    is_active: bool = True
    settings: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    last_sync_at: datetime | None = None
    created_at: datetime = Field(default_factory=utc_now)


class Contact(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    phone: str | None = Field(default=None, index=True)
    external_id: str | None = Field(default=None, index=True)
    primary_channel: ChannelType = ChannelType.test
    city: str | None = None
    notes: str | None = None
    created_at: datetime = Field(default_factory=utc_now)


class Conversation(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID | None = Field(default=None, foreign_key="project.id", index=True)
    channel_id: UUID = Field(foreign_key="channel.id", index=True)
    contact_id: UUID = Field(foreign_key="contact.id", index=True)
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
    text: str
    attachments: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    external_message_id: str | None = Field(default=None, index=True)
    delivery_status: str = "stored"
    # Логика статуса 'Прочитано'
    is_read: bool = Field(default=False, index=True)
    read_at: datetime | None = None
    created_at: datetime = Field(default_factory=utc_now, index=True)


class Lead(SQLModel, table=True):
    """
    Карточка лида.
    Содержит как классические поля (для потолков), так и универсальное
    поле custom_fields для любой произвольной ниши (кухни, окна, ремонт).
    """
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID | None = Field(default=None, foreign_key="project.id", index=True)
    contact_id: UUID = Field(foreign_key="contact.id", index=True)
    conversation_id: UUID = Field(foreign_key="conversation.id", index=True)
    source: ChannelType = ChannelType.test
    status: LeadStatus = LeadStatus.new
    temperature: LeadTemperature = LeadTemperature.warm
    
    # Поля потолков (сохранены для 100% обратной совместимости)
    area_m2: float | None = None
    rooms_count: int | None = None
    lights_count: int | None = None
    cornice: bool | None = None
    ceiling_type: str | None = None

    # Универсальные поля для всех ниш
    address: str | None = None
    desired_date: str | None = None
    phone_received: bool = False
    measurement_planned: bool = False
    estimated_price: int | None = None
    
    # Динамические поля ниши (например: { "kitchen_length_m": 3.2, "facade": "MDF" } или { "windows_count": 5 })
    custom_fields: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    
    # Напоминания и Follow-up планирование
    last_notification_at: datetime | None = None
    next_follow_up_at: datetime | None = None
    
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class LeadCalculation(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    conversation_id: UUID = Field(foreign_key="conversation.id", index=True)
    lead_id: UUID = Field(foreign_key="lead.id", index=True)
    
    # Специфика потолков
    area_m2: float | None = None
    perimeter_m: float | None = None
    profile_type: str = "classic"
    profile_subtype: str | None = None
    angles_count: int = 4
    cornices: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    lights: dict[str, float] = Field(default_factory=dict, sa_column=Column(JSON))
    vent_points: int = 0
    smart_setup: bool = False
    discount_category: str | None = None
    
    # Универсальные финансовые расчеты
    estimate_min: int | None = None
    estimate_max: int | None = None
    
    # Дополнительные расчетные параметры для произвольных ниш
    niche_type: str = "ceilings"
    calculation_data: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class AiSuggestion(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    conversation_id: UUID = Field(foreign_key="conversation.id", index=True)
    message_id: UUID = Field(foreign_key="message.id", index=True)
    suggested_text: str
    confidence: float = 0.5
    mode: AiSuggestionMode = AiSuggestionMode.draft
    status: AiSuggestionStatus = AiSuggestionStatus.pending
    created_at: datetime = Field(default_factory=utc_now)


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
    """
    Самостоятельный медиафайл библиотеки (фото готовых объектов, схемы, сертификаты).
    Существует независимо от постов и может быть прикреплен к нескольким ContentItem.
    """
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID | None = Field(default=None, foreign_key="project.id", index=True)
    content_item_id: UUID | None = Field(default=None, index=True)  # Опционально для обратной совместимости
    title: str = Field(index=True)
    asset_type: str = "photo"
    file_path: str | None = None
    url: str | None = None
    description: str | None = None
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utc_now)


class ContentItemMediaLink(SQLModel, table=True):
    """
    Связь многие-ко-многим между ContentItem и MediaAsset.
    Позволяет прикреплять одно фото к нескольким материалам и задавать порядок (sort_order).
    """
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


class PublishingQueueSlot(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID | None = Field(default=None, foreign_key="project.id", index=True)
    channel: ChannelType = Field(index=True)
    weekday: int = Field(index=True)
    publish_time: str
    label: str | None = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class ScheduledPost(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    content_variant_id: UUID = Field(foreign_key="contentvariant.id", index=True)
    publish_target_id: UUID | None = Field(default=None, foreign_key="publishtarget.id", index=True)
    scheduled_at: datetime
    status: ScheduledPostStatus = Field(default=ScheduledPostStatus.scheduled, index=True)
    notes: str | None = None
    error_message: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class PublishedPost(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    scheduled_post_id: UUID | None = Field(default=None, foreign_key="scheduledpost.id", index=True)
    external_post_id: str | None = Field(default=None, index=True)
    url: str | None = None
    status: str = "stored"
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


class LeadSourceContext(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    lead_id: UUID = Field(foreign_key="lead.id", index=True)
    content_item_id: UUID | None = Field(default=None, foreign_key="contentitem.id", index=True)
    content_variant_id: UUID | None = Field(default=None, foreign_key="contentvariant.id", index=True)
    published_post_id: UUID | None = Field(default=None, foreign_key="publishedpost.id", index=True)
    trigger_keyword: str | None = Field(default=None, index=True)
    channel: ChannelType = ChannelType.test
    raw_text: str | None = None
    created_at: datetime = Field(default_factory=utc_now)


class EventLog(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    actor_type: str
    action: str
    entity_type: str
    entity_id: UUID | None = None
    details: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utc_now, index=True)
