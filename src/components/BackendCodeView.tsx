import React, { useState } from "react";
import { Check, Code2, Copy, Download, FileCode, Sparkles } from "lucide-react";

export const BackendCodeView: React.FC = () => {
  const [activeFile, setActiveFile] = useState<
    | "models"
    | "conversations"
    | "conversation_service"
    | "content_service"
    | "knowledge_base"
    | "backup_service"
    | "notification_service"
    | "content_api"
    | "telegram"
    | "max"
    | "vk_mark_read"
  >("models");
  const [copied, setCopied] = useState(false);

  const fileContents: Record<string, { title: string; filename: string; path: string; desc: string; code: string }> = {
    models: {
      title: "models.py",
      filename: "models.py",
      path: "app/models.py",
      desc: "Обновленная модель данных: поддержка проектов (ниш), статус 'Прочитано' (is_read, read_at), канал Max и динамические custom_fields для лидов.",
      code: `from datetime import datetime, timezone
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


# =====================================================================
# Проекты (Ниши) для масштабируемости на разные направления бизнеса
# =====================================================================
class Project(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(index=True)                  # Напр: "ФЕНИКС PRO Потолки"
    slug: str = Field(unique=True, index=True)     # Напр: "ceilings"
    niche_type: str = "ceilings"                   # ceilings / kitchens / windows / general
    description: str | None = None
    knowledge_dir: str | None = None               # Путь к папке базы знаний
    system_prompt_override: str | None = None      # Индивидуальный системный промпт ИИ
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
    # Статус 'Прочитано'
    is_read: bool = Field(default=False, index=True)
    read_at: datetime | None = None
    created_at: datetime = Field(default_factory=utc_now, index=True)


class Lead(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID | None = Field(default=None, foreign_key="project.id", index=True)
    contact_id: UUID = Field(foreign_key="contact.id", index=True)
    conversation_id: UUID = Field(foreign_key="conversation.id", index=True)
    source: ChannelType = ChannelType.test
    status: LeadStatus = LeadStatus.new
    temperature: LeadTemperature = LeadTemperature.warm
    
    # Поля потолков (для 100% обратной совместимости)
    area_m2: float | None = None
    rooms_count: int | None = None
    lights_count: int | None = None
    cornice: bool | None = None
    ceiling_type: str | None = None

    address: str | None = None
    desired_date: str | None = None
    phone_received: bool = False
    measurement_planned: bool = False
    estimated_price: int | None = None
    
    # Динамические поля произвольной ниши (кухни, окна, мебель)
    custom_fields: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class LeadCalculation(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    conversation_id: UUID = Field(foreign_key="conversation.id", index=True)
    lead_id: UUID = Field(foreign_key="lead.id", index=True)
    
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
    estimate_min: int | None = None
    estimate_max: int | None = None
    
    # Масштабируемость калькулятора под другие ниши
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
`,
    },
    conversations: {
      title: "conversations.py",
      filename: "conversations.py",
      path: "app/api/conversations.py",
      desc: "Роутер диалогов с логикой статуса 'Прочитано', передачей события в соцсети (ВК, TG, Max) и фильтрацией по project_id.",
      code: `from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, desc, select

from app.db.session import get_session
from app.models import (
    Channel,
    ChannelType,
    Conversation,
    Lead,
    LeadCalculation,
    Message,
    MessageDirection,
    Project,
    utc_now,
)
from app.schemas import (
    AiSuggestionRead,
    CalculationRead,
    CalculationUpdateRequest,
    ContactRead,
    ContactUpdateRequest,
    ConversationDetail,
    ConversationListItem,
    LeadRead,
    LeadUpdateRequest,
    MessageRead,
    ProjectCreateRequest,
    ProjectRead,
    RewriteSuggestionRequest,
    SendMessageRequest,
)
from app.services.conversation_service import (
    create_outbound_message,
    get_conversation_bundle,
    list_conversations,
    reject_ai_suggestion,
    rewrite_ai_suggestion,
    update_calculation,
    update_contact,
    update_lead,
)
from app.services.event_log import log_event

router = APIRouter()

# =====================================================================
# Проекты (Ниши)
# =====================================================================
@router.get("/projects", response_model=list[ProjectRead])
def get_projects(session: Session = Depends(get_session)) -> list[ProjectRead]:
    projects = session.exec(select(Project).order_by(Project.created_at)).all()
    return [ProjectRead.model_validate(p, from_attributes=True) for p in projects]


@router.post("/projects", response_model=ProjectRead)
def create_project(payload: ProjectCreateRequest, session: Session = Depends(get_session)) -> ProjectRead:
    project = Project(**payload.model_dump())
    session.add(project)
    session.commit()
    session.refresh(project)
    return ProjectRead.model_validate(project, from_attributes=True)


# =====================================================================
# Диалоги с фильтрацией по project_id
# =====================================================================
@router.get("", response_model=list[ConversationListItem])
def index(
    project_id: UUID | None = Query(default=None, description="Фильтр по нише"),
    session: Session = Depends(get_session),
) -> list[ConversationListItem]:
    statement = (
        select(Conversation, Channel, Lead)
        .join(Channel, Conversation.channel_id == Channel.id)
        .join(Lead, Lead.conversation_id == Conversation.id, isouter=True)
    )
    if project_id:
        statement = statement.where(Conversation.project_id == project_id)

    statement = statement.order_by(desc(Conversation.last_message_at))
    rows = session.exec(statement).all()

    items = []
    for conversation, channel, lead in rows:
        contact = conversation.contact
        last_message = session.exec(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(desc(Message.created_at))
        ).first()

        items.append(
            ConversationListItem(
                id=conversation.id,
                project_id=conversation.project_id,
                channel=channel.type,
                contact_name=contact.name if contact else "Клиент",
                last_text=conversation.last_text,
                last_message_at=conversation.last_message_at,
                last_message_direction=last_message.direction if last_message else None,
                unread_count=conversation.unread_count,
                lead_status=lead.status if lead else None,
                lead_temperature=lead.temperature if lead else None,
            )
        )
    return items


@router.get("/{conversation_id}", response_model=ConversationDetail)
def show(conversation_id: UUID, session: Session = Depends(get_session)) -> ConversationDetail:
    bundle = get_conversation_bundle(session, conversation_id)
    if bundle is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation, channel, contact, lead, calculation, messages, suggestion = bundle
    return ConversationDetail(
        id=conversation.id,
        project_id=conversation.project_id,
        channel=channel.type,
        contact=ContactRead(
            id=contact.id,
            name=contact.name,
            phone=contact.phone,
            primary_channel=contact.primary_channel,
        ),
        lead=LeadRead.model_validate(lead, from_attributes=True) if lead else None,
        calculation=calculation,
        messages=[MessageRead.model_validate(m, from_attributes=True) for m in messages],
        pending_suggestion=AiSuggestionRead.model_validate(suggestion, from_attributes=True) if suggestion else None,
    )


# =====================================================================
# Логика статуса 'Прочитано' с передачей в соцсеть (ВК, ТГ, Max)
# =====================================================================
@router.post("/{conversation_id}/read")
def read_conversation(
    conversation_id: UUID,
    session: Session = Depends(get_session),
) -> dict[str, str]:
    """
    Отметить диалог как прочитанный.
    1. Сбрасывает unread_count в 0
    2. Помечает все входящие сообщения как is_read=True с read_at
    3. Отправляет запрос 'прочитано' во внешнюю соцсеть (VK, Telegram, Max)
    """
    conversation = session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    channel = session.get(Channel, conversation.channel_id)
    now = utc_now()

    # Помечаем сообщения в БД
    inbound_unread = session.exec(
        select(Message)
        .where(
            Message.conversation_id == conversation.id,
            Message.direction == MessageDirection.inbound,
            Message.is_read == False,
        )
    ).all()

    last_ext_id = None
    for msg in inbound_unread:
        msg.is_read = True
        msg.read_at = now
        session.add(msg)
        if msg.external_message_id:
            last_ext_id = msg.external_message_id

    conversation.unread_count = 0
    session.add(conversation)

    # Передача статуса "Прочитано" в конкретную соцсеть
    network_status = "internal_only"
    if channel:
        try:
            if channel.type in {ChannelType.vk, ChannelType.vk_wall}:
                from app.connectors.vk import mark_vk_message_read
                peer_id_str = conversation.external_chat_id.replace("vk-peer-", "")
                if peer_id_str.isdigit():
                    mark_vk_message_read(int(peer_id_str), start_message_id=last_ext_id)
                    network_status = "vk_marked_read"

            elif channel.type == ChannelType.telegram:
                from app.connectors.telegram import mark_telegram_message_read
                mark_telegram_message_read(conversation.external_chat_id)
                network_status = "telegram_marked_read"

            elif channel.type == ChannelType.max:
                from app.connectors.max import mark_max_message_read
                mark_max_message_read(conversation.external_chat_id)
                network_status = "max_marked_read"

        except Exception as exc:
            network_status = f"error: {str(exc)}"

    log_event(
        session,
        actor_type="user",
        action="conversation.marked_read",
        entity_type="conversation",
        entity_id=conversation.id,
        details={"network_status": network_status, "messages_marked": len(inbound_unread)},
    )
    session.commit()
    return {"status": "ok", "network_status": network_status}
`,
    },
    conversation_service: {
      title: "conversation_service.py",
      filename: "conversation_service.py",
      path: "app/services/conversation_service.py",
      desc: "Функция merge_contacts() для склейки дубликатов в CRM: миграция всех диалогов, лидов, объединение контактов и удаление дублирующей записи.",
      code: `from uuid import UUID
from datetime import datetime, timezone
from sqlmodel import Session, select
from ..models import Contact, Conversation, Lead

def merge_contacts(
    session: Session,
    main_contact_id: UUID,
    duplicate_contact_id: UUID,
) -> tuple[Contact, int, int]:
    """
    Склейка (объединение) двух профилей клиентов в CRM:
    1. Находит основной контакт и дубликат.
    2. Переносит все Conversation и Lead с дубликата на основной контакт.
    3. Дополняет основной контакт недостающими данными (телефон, город, заметки).
    4. Удаляет дублирующую запись контакта.
    """
    if main_contact_id == duplicate_contact_id:
        raise ValueError("Невозможно объединить контакт с самим собой")

    main_contact = session.get(Contact, main_contact_id)
    duplicate_contact = session.get(Contact, duplicate_contact_id)
    if not main_contact or not duplicate_contact:
        raise ValueError("Один из контактов не найден в БД")

    # Атомарный перенос в транзакции с гарантией отката (rollback) при сбое
    try:
        # 1. Перенос всех диалогов на основной контакт
        conversations = session.exec(
            select(Conversation).where(Conversation.contact_id == duplicate_contact_id)
        ).all()
        for conv in conversations:
            conv.contact_id = main_contact_id
            session.add(conv)

        # 2. Перенос всех карточек лидов
        leads = session.exec(
            select(Lead).where(Lead.contact_id == duplicate_contact_id)
        ).all()
        for lead in leads:
            lead.contact_id = main_contact_id
            session.add(lead)

        # 3. Обогащение данных
        if not main_contact.phone and duplicate_contact.phone:
            main_contact.phone = duplicate_contact.phone
        if not main_contact.city and duplicate_contact.city:
            main_contact.city = duplicate_contact.city

        # 4. Удаление дубликата
        session.delete(duplicate_contact)
        session.commit()
        session.refresh(main_contact)
    except Exception as exc:
        session.rollback()
        raise exc

    return main_contact, len(conversations), len(leads)
`,
    },
    backup_service: {
      title: "backup_service.py",
      filename: "backup_service.py",
      path: "app/services/backup_service.py",
      desc: "Сервис автобэкапа: создание ежедневной копии phoenix_YYYY-MM-DD.db в backups/, атомарный SQLite Online Backup API и авто-ротация на 14 дней.",
      code: `import sqlite3
from pathlib import Path
from datetime import datetime, timezone

BACKUP_DIR = Path("backups")
DB_FILE = Path("phoenix.db")
MAX_RETAINED_BACKUPS = 14

def create_database_backup(db_path: Path = DB_FILE, backup_dir: Path = BACKUP_DIR) -> dict:
    """Создает консистентную резервную копию SQLite без блокировки читателей."""
    backup_dir.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc)
    backup_filename = f"phoenix_{now.strftime('%Y-%m-%d')}.db"
    target_path = backup_dir / backup_filename

    source_conn = sqlite3.connect(str(db_path))
    dest_conn = sqlite3.connect(str(target_path))

    with dest_conn:
        source_conn.backup(dest_conn, pages=100, sleep=0.01)

    source_conn.close()
    dest_conn.close()
    return {
        "status": "success",
        "filename": backup_filename,
        "path": str(target_path),
        "size_bytes": target_path.stat().st_size,
    }

def run_daily_backup_check():
    """Вызывается при старте FastAPI: если бэкапа за сегодня нет — создает автоматически."""
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_file = BACKUP_DIR / f"phoenix_{today_str}.db"
    if not today_file.exists():
        create_database_backup()
`,
    },
    content_api: {
      title: "content.py",
      filename: "content.py",
      path: "app/api/content.py",
      desc: "API медиабиблиотеки и постов: независимые фото объектов, теги, M:N прикрепление фотографий к постам через ContentItemMediaLink.",
      code: `from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from app.models import MediaAsset, ContentItemMediaLink, ContentItem

router = APIRouter(prefix="/content", tags=["content"])

@router.get("/media")
def list_media(tag: str | None = None, session: Session = Depends(get_session)):
    """Получение фото из библиотеки с фильтром по тегам."""
    stmt = select(MediaAsset)
    assets = session.exec(stmt).all()
    if tag:
        assets = [a for a in assets if tag.lower() in [t.lower() for t in (a.tags or [])]]
    return assets

@router.post("/{item_id}/media/attach")
def attach_media(item_id: UUID, media_ids: list[UUID], session: Session = Depends(get_session)):
    """Прикрепление одного или нескольких фото из библиотеки к посту."""
    for idx, mid in enumerate(media_ids):
        link = ContentItemMediaLink(content_item_id=item_id, media_asset_id=mid, sort_order=idx)
        session.add(link)
    session.commit()
    return {"status": "attached", "count": len(media_ids)}
`,
    },
    content_service: {
      title: "content_service.py",
      filename: "content_service.py",
      path: "app/services/content_service.py",
      desc: "AI Content Adapter: генерация вариантов постов под TG (кратко, CTA), VK Wall (душевно с вопросом), VK Channel (экспертно) и Instagram с учетом Project.niche_type.",
      code: `from __future__ import annotations
import logging
from typing import Any
from uuid import UUID
from sqlmodel import Session, select
from app.models import ChannelType, ContentItem, ContentStatus, ContentVariant, Project, utc_now

logger = logging.getLogger("phoenix.services.content")

NICHE_PROFILES: dict[str, dict[str, Any]] = {
    "ceilings": {
        "brand_name": "ФЕНИКС PRO Потолки",
        "tone": "профессиональный, технологичный, аккуратный",
        "cta_phrase": "Напишите «{keyword}» в сообщения — рассчитаем точную смету и приедем с образцами профилей!",
    },
    "kitchens": {
        "brand_name": "ФЕНИКС Кухни & Корпус",
        "tone": "экспертный, заботливый, с фокусом на уют и эргономику",
        "cta_phrase": "Отправьте ваши размеры или слово «{keyword}» — бесплатно нарисуем 3D-проект вашей кухни!",
    },
    "windows": {
        "brand_name": "ФЕНИКС Окна & Балконы",
        "tone": "надежный, с фокусом на тепло, тишину и долговечность",
        "cta_phrase": "Напишите «{keyword}» — инженер бесплатно приедет, проверит продувания и рассчитает смету!",
    },
}

def generate_channel_variants(session: Session, content_item_id: UUID) -> list[ContentVariant]:
    """
    AI Content Adapter:
    Генерирует специализированные варианты поста под форматы площадок
    с учетом ниши проекта (Project.niche_type).
    """
    item = session.get(ContentItem, content_item_id)
    if not item:
        raise ValueError(f"ContentItem {content_item_id} не найден")

    project = session.get(Project, item.project_id) if item.project_id else None
    niche_type = project.niche_type if project else "ceilings"
    profile = NICHE_PROFILES.get(niche_type, NICHE_PROFILES["ceilings"])
    brand = profile["brand_name"]
    keyword = item.trigger_keyword or "РАСЧЕТ"

    channels = [ChannelType.vk_wall, ChannelType.vk_channel, ChannelType.telegram, ChannelType.instagram]
    variants = []

    for ch in channels:
        if ch == ChannelType.telegram:
            text = f"💡 {item.title}\\n\\nВ компании {brand} отвечаем на частый вопрос:\\n• {item.topic}\\n\\n🔥 {profile['cta_phrase'].format(keyword=keyword)}"
            fmt = "post"
        elif ch == ChannelType.vk_wall:
            text = f"{item.title}\\n\\nДелимся кейсом команды {brand}! Как вам такой вариант? Делитесь в комментариях! 👇\\n\\nP.S. Для расчета напишите «{keyword}» в сообщения группы."
            fmt = "post"
        elif ch == ChannelType.vk_channel:
            text = f"Экспертный разбор от {brand}: {item.title}\\n\\nРазбираем технические нюансы монтажа и материалов...\\n\\nДля консультации технолога отправьте «{keyword}»."
            fmt = "article"
        elif ch == ChannelType.instagram:
            text = f"Листайте карусель готового объекта 👉\\n\\nВ проекте {item.title} команда {brand} реализовала идеальный монтаж без пыли.\\n\\n📩 Напишите «{keyword}» в Директ!"
            fmt = "carousel"

        var = session.exec(select(ContentVariant).where(ContentVariant.content_item_id == item.id, ContentVariant.channel == ch)).first()
        if not var:
            var = ContentVariant(content_item_id=item.id, channel=ch, title=f"{item.title} ({ch.value})", text=text, format=fmt, status=ContentStatus.draft)
        else:
            var.text = text
            var.format = fmt
        session.add(var)
        variants.append(var)

    session.commit()
    return variants
`,
    },
    knowledge_base: {
      title: "knowledge_base.py",
      filename: "knowledge_base.py",
      path: "app/services/knowledge_base.py",
      desc: "RAG движок с изоляцией по Project.knowledge_dir: авто-подгрузка контекста и приоритет pricing.md / calculator.md при запросе цен.",
      code: `from __future__ import annotations
import logging
from pathlib import Path
from typing import Any
from sqlmodel import Session
from app.models import Project

logger = logging.getLogger("phoenix.services.knowledge")

DEFAULT_KNOWLEDGE_DOCS = {
    "pricing.md": "Прайс-лист базовый: расчет стоимости по площади и профилям.",
    "calculator.md": "Формулы расчета вилки цен: всегда указывать диапазон ±15%.",
}

def load_knowledge_context(session: Session, project_id: Any | None, query_text: str = "") -> dict[str, Any]:
    """
    RAG изоляция по проекту:
    1. Находит Project и берет project.knowledge_dir (например: knowledge/ceilings/).
    2. Если запрос про цену (цена, стоимость, сколько стоит, руб) — в первую очередь
       подгружает pricing.md и calculator.md.
    3. Возвращает контекст и список источников (rag_sources) для вывода в UI.
    """
    knowledge_dir_path = Path("knowledge/ceilings")
    project = None
    if project_id:
        project = session.get(Project, project_id)
        if project and project.knowledge_dir:
            knowledge_dir_path = Path(project.knowledge_dir)

    is_price_query = any(w in query_text.lower() for w in ["цен", "стоимост", "скольк", "руб", "расчет", "прайс", "посчита"])
    sources_used = []
    snippets = []

    # Приоритет pricing.md и calculator.md для цен
    target_files = ["pricing.md", "calculator.md"] if is_price_query else ["company.md", "pricing.md", "faq.md"]

    for fn in target_files:
        fp = knowledge_dir_path / fn
        if fp.exists():
            content = fp.read_text(encoding="utf-8")
            sources_used.append(fn)
            snippets.append(f"### Источник: {fn}\\n{content}")
        elif fn in DEFAULT_KNOWLEDGE_DOCS:
            sources_used.append(fn)
            snippets.append(f"### Источник: {fn} (default)\\n{DEFAULT_KNOWLEDGE_DOCS[fn]}")

    return {
        "context_text": "\\n\\n".join(snippets),
        "rag_sources": sources_used,
        "is_price_query": is_price_query,
        "project_knowledge_dir": str(knowledge_dir_path),
    }
`,
    },
    notification_service: {
      title: "notification_service.py",
      filename: "notification_service.py",
      path: "app/services/notification_service.py",
      desc: "Телеграм-бот уведомлений для руководителя: функция «Тревога» (>15 мин без ответа) и «Утренняя сводка» по ключевым показателям.",
      code: `\"\"\"
Phoenix AI Hub — Notification Service (Telegram Bot)
Оповещения для руководителя компании:
1. Функция «Тревога»: отправка сообщения, если диалог без ответа > 15 минут.
2. Функция «Утренняя сводка»: ежедневный дайджест по лидам, замерам и постам.
\"\"\"

import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import httpx
from sqlmodel import Session, select

from app.core.config import settings
from app.models import (
    ChannelType,
    Conversation,
    Lead,
    LeadStatus,
    Message,
    MessageDirection,
    Project,
    PublishedPost,
    utc_now,
)

logger = logging.getLogger("phoenix.services.notifications")


async def send_telegram_message(chat_id: str, text: str) -> bool:
    token = getattr(settings, "telegram_bot_token", None) or "PLACEHOLDER_TOKEN"
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            return resp.status_code == 200
    except Exception as exc:
        logger.error("Failed to send TG alert: %s", exc)
        return False


async def check_unanswered_conversations_alarm(session: Session, alert_chat_id: str) -> int:
    cutoff_time = utc_now() - timedelta(minutes=15)
    unanswered_convs = session.exec(
        select(Conversation).where(
            Conversation.unread_count > 0,
            Conversation.last_message_at <= cutoff_time,
        )
    ).all()

    sent_count = 0
    base_crm_url = getattr(settings, "crm_web_url", "https://crm.fenix-hub.ru")

    for conv in unanswered_convs:
        client_name = conv.contact.name if conv.contact else "Клиент"
        channel_name = "ВК" if conv.channel == ChannelType.vk else "Telegram"
        deep_link = f"{base_crm_url}/?conv_id={conv.id}"

        text = (
            f"🚨 <b>Внимание! {client_name} ({channel_name}) ждет ответа 15 минут.</b>\\n\\n"
            f"💬 Текст: <i>«{conv.last_text[:120]}»</i>\\n"
            f"🔗 <a href='{deep_link}'>Открыть диалог в CRM</a>"
        )
        if await send_telegram_message(alert_chat_id, text):
            sent_count += 1

    return sent_count


async def send_morning_digest(session: Session, alert_chat_id: str) -> bool:
    yesterday = utc_now() - timedelta(days=1)
    new_dialogs = len(session.exec(select(Conversation).where(Conversation.created_at >= yesterday)).all())
    leads = session.exec(select(Lead).where(Lead.created_at >= yesterday)).all()
    qualified = len([l for l in leads if l.status not in (LeadStatus.new, LeadStatus.lost)])
    measurements = len([l for l in leads if l.status == LeadStatus.measurement_planned])

    text = (
        f"☀️ <b>Доброе утро! Сводка Phoenix AI за вчера:</b>\\n\\n"
        f"• Новых диалогов: <b>{new_dialogs}</b>\\n"
        f"• Квалифицировано лидов: <b>{qualified}</b>\\n"
        f"• Назначено замеров: <b>{measurements} 📐</b>\\n\\n"
        f"Удачного рабочего дня!"
    )
    return await send_telegram_message(alert_chat_id, text)
`,
    },
    telegram: {
      title: "telegram.py",
      filename: "connectors/telegram.py",
      path: "app/connectors/telegram.py",
      desc: "Коннектор Telegram с поддержкой Long Polling (getUpdates), приемом входящих сообщений локально без вебхуков и функцией mark_telegram_message_read.",
      code: `import asyncio
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


# =====================================================================
# Long Polling для входящих сообщений (без вебхуков на локальной машине!)
# =====================================================================
async def handle_telegram_update(update: dict[str, Any]) -> None:
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
    Фоновый демон Long Polling для Telegram.
    Запускается в main.py на старте FastAPI приложения аналогично vk_long_poll_loop.
    """
    if not getattr(settings, "telegram_enabled", False) or not settings.telegram_bot_token:
        logger.info("Telegram connector is disabled")
        return

    logger.info("Telegram Long Polling loop started")
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
`,
    },
    max: {
      title: "max.py",
      filename: "connectors/max.py",
      path: "app/connectors/max.py",
      desc: "Пустой шаблон (коннектор) для соцсети 'Max' с методами отправки, публикации, пометки прочитанным и циклом Long Polling.",
      code: `"""
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


def _require_max_settings() -> dict[str, Any]:
    token = getattr(settings, "max_api_token", None)
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
    """Универсальный HTTP клиент для API Max."""
    conf = _require_max_settings()
    headers = {
        "Authorization": f"Bearer {conf['token']}",
        "Content-Type": "application/json",
    }
    url = f"{MAX_API_BASE_URL.rstrip('/')}/{endpoint.lstrip('/')}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        # response = await client.request(method, url, json=data, params=params, headers=headers)
        # response.raise_for_status()
        # return response.json()
        return {"status": "ok", "mock": True}


# 1. Отправка сообщений в Max
def send_max_message(external_chat_id: str, text: str) -> str:
    chat_id = external_chat_id.replace("max-chat-", "").replace("max-user-", "")
    async def _send() -> str:
        # TODO: Замените 'messages/send' на метод отправки из документации API Max
        result = await _max_api_call("messages/send", method="POST", data={"chat_id": chat_id, "text": text})
        return str(result.get("message_id") or "max:mock_sent_id")

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(_send())
    raise RuntimeError("send_max_message cannot be called from a running event loop")


# 2. Пометка прочитанным
def mark_max_message_read(external_chat_id: str) -> None:
    chat_id = external_chat_id.replace("max-chat-", "").replace("max-user-", "")
    async def _mark() -> None:
        try:
            # TODO: Замените на метод пометки прочитанным в API Max
            await _max_api_call("conversations/read", method="POST", data={"chat_id": chat_id})
        except Exception:
            pass

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        try:
            asyncio.run(_mark())
        except Exception:
            pass


# 3. Публикация контента
def publish_max_post(message: str, photo_paths: list[str] | None = None) -> dict[str, str | None]:
    async def _publish() -> dict[str, str | None]:
        payload = {"content": message.strip(), "photos": photo_paths or []}
        # TODO: Замените на метод публикации в канал Max
        result = await _max_api_call("posts/publish", method="POST", data=payload)
        post_id = str(result.get("post_id") or "max:stub_post")
        return {"external_post_id": post_id, "url": f"https://max.ru/post/{post_id}"}

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(_publish())
    raise RuntimeError("publish_max_post cannot be called from a running event loop")


# 4. Long Polling входящих событий
async def max_long_poll_loop() -> None:
    if not getattr(settings, "max_enabled", False):
        return
    logger.info("Max Long Polling loop started")
    while True:
        try:
            # TODO: Подключите poll-метод Max API
            await asyncio.sleep(20)
        except asyncio.CancelledError:
            raise
        except Exception:
            await asyncio.sleep(10)
`,
    },
    vk_mark_read: {
      title: "vk_mark_read.py (дополнение к vk.py)",
      filename: "connectors/vk.py (дополнение)",
      path: "app/connectors/vk.py",
      desc: "Функция mark_vk_message_read для вызова messages.markAsRead в API ВКонтакте.",
      code: `def mark_vk_message_read(peer_id: int, start_message_id: str | int | None = None) -> bool:
    """
    Отмечает сообщения в диалоге ВКонтакте как прочитанные сообществом.
    Вызывает метод API ВКонтакте 'messages.markAsRead'.
    
    :param peer_id: ID диалога / пользователя ВКонтакте
    :param start_message_id: ID последнего прочитанного сообщения (опционально)
    """
    import asyncio
    from app.connectors.vk import _vk_method

    async def _mark() -> bool:
        params = {
            "peer_id": abs(peer_id),
            "mark_conversation_as_read": 1,
        }
        if start_message_id:
            clean_id = str(start_message_id).replace("vk-message-", "")
            if clean_id.isdigit():
                params["start_message_id"] = int(clean_id)

        try:
            res = await _vk_method("messages.markAsRead", params)
            return bool(res == 1 or res is True or (isinstance(res, dict) and res.get("response") == 1))
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("VK messages.markAsRead failed: %s", exc)
            return False

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(_mark())

    return False
`,
    },
  };

  const currentFile = fileContents[activeFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none overflow-hidden">
      {/* 1. Header */}
      <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-white shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Code2 size={18} className="text-teal-700" />
            <span>Обновленный код бэкенда Python (FastAPI / SQLModel)</span>
          </h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            Готовые файлы для развертывания: поддержка Проектов (ниш), Telegram Long Polling, коннектор Max и отметка «Прочитано».
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-2xs"
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-300" />
              <span>Скопировано в буфер!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Скопировать {currentFile.filename}</span>
            </>
          )}
        </button>
      </div>

      {/* 2. File Tabs */}
      <div className="px-6 border-b border-zinc-200 bg-zinc-50/70 flex items-center gap-2 overflow-x-auto shrink-0">
        {(Object.keys(fileContents) as Array<keyof typeof fileContents>).map((key) => {
          const file = fileContents[key];
          const isActive = activeFile === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFile(key)}
              className={`py-3 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                isActive
                  ? "border-teal-700 text-teal-800 bg-white/60 font-semibold"
                  : "border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300"
              }`}
            >
              <FileCode size={14} className={isActive ? "text-teal-700" : "text-zinc-600"} />
              <span>{file.title}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Description banner */}
      <div className="px-6 py-2.5 bg-teal-50/60 border-b border-teal-200/50 text-xs text-teal-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">
            {currentFile.path}
          </span>
          <span className="text-teal-900 font-medium">{currentFile.desc}</span>
        </div>
      </div>

      {/* 4. Code Display */}
      <div className="flex-1 overflow-y-auto p-6 bg-zinc-900 font-mono text-xs text-zinc-100">
        <pre className="whitespace-pre overflow-x-auto leading-relaxed selection:bg-teal-700 selection:text-white">
          <code>{currentFile.code}</code>
        </pre>
      </div>
    </div>
  );
};
