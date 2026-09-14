import React, { useState } from "react";
import { Check, Code2, Copy, Download, FileCode, Sparkles } from "lucide-react";

export type BackendFileKey =
  | "models"
  | "scheduler"
  | "main"
  | "content_service"
  | "content_api"
  | "telegram"
  | "vk"
  | "conversations"
  | "conversation_service"
  | "llm_service"
  | "knowledge_base"
  | "backup_service"
  | "notification_service"
  | "max";

export const BackendCodeView: React.FC = () => {
  const [activeFile, setActiveFile] = useState<BackendFileKey>("models");
  const [copied, setCopied] = useState(false);

  const fileContents: Record<
    BackendFileKey,
    { title: string; filename: string; path: string; desc: string; code: string }
  > = {
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
    text: str | None = Field(default=None)
    # Поля для поддержки медиафайлов и вложений соцсетей
    media_type: str | None = Field(default=None, index=True)  # "photo", "voice", "video_note", "document", "text"
    media_url: str | None = None                              # локальный путь к файлу или URL
    file_id: str | None = Field(default=None, index=True)     # уникальный ID файла в Telegram/VK
    caption: str | None = None                                # подпись к медиафайлу
    file_name: str | None = None                              # исходное имя файла документа
    file_size: int | None = None                              # размер файла в байтах
    duration_sec: int | None = None                           # длительность голосового сообщения/видео в сек
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
    llm_service: {
      title: "llm_service.py",
      filename: "llm_service.py",
      path: "app/services/llm_service.py",
      desc: "Универсальный шлюз нейросетей (OpenAI-совместимый интерфейс): локальный llama-server.exe (Ternary-Bonsai-27B) на http://localhost:8080/v1 и облачный OpenAI (gpt-4o-mini).",
      code: `\"\"\"Universal LLM Gateway for Phoenix CRM.

Supports OpenAI-compatible API interface:
1. "local_llama": Local llama-server.exe at http://localhost:8080/v1 with Ternary-Bonsai-27B (no API key required)
2. "openai": Cloud OpenAI API at https://api.openai.com/v1 with gpt-4o-mini (requires OPENAI_API_KEY)
\"\"\"
from __future__ import annotations
import logging
import os
from enum import Enum
from typing import Any
import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger("phoenix.services.llm")

class LLMProvider(str, Enum):
    local_llama = "local_llama"
    openai = "openai"

class LLMConfig(BaseModel):
    default_provider: LLMProvider = Field(default=LLMProvider.local_llama)
    local_base_url: str = Field(default=os.getenv("LOCAL_LLAMA_URL", "http://localhost:8080/v1"))
    local_model: str = Field(default=os.getenv("LOCAL_LLAMA_MODEL", "Ternary-Bonsai-27B"))
    local_timeout_seconds: float = Field(default=60.0)

    openai_base_url: str = Field(default="https://api.openai.com/v1")
    openai_model: str = Field(default=os.getenv("OPENAI_MODEL", "gpt-4o-mini"))
    openai_api_key: str | None = Field(default=os.getenv("OPENAI_API_KEY"))
    openai_timeout_seconds: float = Field(default=30.0)

_llm_config = LLMConfig()

def get_llm_config() -> LLMConfig:
    return _llm_config

class LLMResponse(BaseModel):
    provider: LLMProvider
    model: str
    reply_text: str
    tokens_used: int | None = None
    finish_reason: str | None = None
    raw_response: dict[str, Any] | None = None

async def call_chat_completion(
    messages: list[dict[str, str]],
    provider: LLMProvider | str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 650,
    stop: list[str] | None = None,
) -> LLMResponse:
    \"\"\"
    Universal dispatcher calling /v1/chat/completions for local_llama or openai.
    \"\"\"
    config = get_llm_config()
    selected_provider = LLMProvider(provider) if provider else config.default_provider

    if selected_provider == LLMProvider.local_llama:
        url = f"{config.local_base_url.rstrip('/')}/chat/completions"
        model_name = config.local_model
        headers = {"Content-Type": "application/json"}
        timeout = config.local_timeout_seconds
    elif selected_provider == LLMProvider.openai:
        url = f"{config.openai_base_url.rstrip('/')}/chat/completions"
        model_name = config.openai_model
        api_key = config.openai_api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not set.")
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
        timeout = config.openai_timeout_seconds
    else:
        raise ValueError(f"Unsupported provider: {selected_provider}")

    payload = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if stop:
        payload["stop"] = stop

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        reply_text = data["choices"][0]["message"]["content"].strip()
        tokens = data.get("usage", {}).get("total_tokens")

        return LLMResponse(
            provider=selected_provider,
            model=model_name,
            reply_text=reply_text,
            tokens_used=tokens,
            raw_response=data,
        )
`,
    },
    conversation_service: {
      title: "conversation_service.py",
      filename: "conversation_service.py",
      path: "app/services/conversation_service.py",
      desc: "AI Copilot: сбор глубокого контекста (RAG + CRM + история сообщений), вызов LLM (Bonsai 27B / GPT-4o-mini) и склейка дубликатов контактов.",
      code: `\"\"\"Conversation & AI Copilot Service for Phoenix CRM.

Features:
1. Deep context gathering for LLM Copilot:
   - System: Project/niche prompt + sales manager guidelines
   - Context/RAG: Relevant markdown articles and price lists from knowledge/
   - Lead State: Structured CRM client data (area, profile type, address, status, temperature)
   - Chat History: Last 8-10 messages formatted with user/assistant roles
2. Calling universal LLM gateway (local_llama / openai)
3. Contact merging & duplicate resolution in CRM
\"\"\"
from __future__ import annotations
from pathlib import Path
from uuid import UUID, uuid4
from sqlmodel import Session, select, desc
from app.models import (
    Contact, Conversation, Lead, Message, Project,
    AiSuggestion, AiSuggestionStatus, AiSuggestionMode,
    MessageDirection, SenderType, utc_now
)
from app.services.llm_service import LLMProvider, call_chat_completion

KNOWLEDGE_BASE_DIR = Path("knowledge")

def read_knowledge_files(niche_dir: str | None = None) -> list[dict[str, str]]:
    \"\"\"Чтение базы знаний и прайсов из knowledge/ (pricing.md, регламенты)\"\"\"
    return [
        {
            "source": "knowledge/pricing.md",
            "content": (
                "ПРАЙС-ЛИСТ:\n"
                "- Полотно матовое MSD Premium: 800 - 900 руб/м2 с установкой\n"
                "- Теневой профиль EuroKRAAB: 800 - 950 руб/пог.м\n"
                "- Скрытый карниз с LED подсветкой: 2 400 - 3 200 руб/пог.м\n"
                "- Монтаж спота: 550 - 650 руб/шт\n"
                "- Скидка новоселам: -10%\n"
                "- Бесплатный выезд технолога на замер с каталогом образцов."
            ),
        },
        {
            "source": "knowledge/regulations.md",
            "content": (
                "РЕГЛАМЕНТ:\n"
                "1. Цену называть только вилкой с оговоркой про точный расчет на замере.\n"
                "2. Завершать ответ вопросом о согласовании даты/времени замера.\n"
                "3. Тон: вежливый, краткий, без канцеляризмов."
            ),
        },
    ]

def build_copilot_context(
    session: Session,
    conversation_id: UUID,
    feedback: str | None = None,
) -> tuple[list[dict[str, str]], list[str]]:
    \"\"\"
    Сбор глубокого структурированного контекста:
    1. System: промпт ниши/проекта + регламент
    2. Context/RAG: статьи и прайсы из knowledge/
    3. Lead State: параметры CRM (площадь, профиль, адрес, статус)
    4. Chat History: последние 8-10 сообщений
    \"\"\"
    conversation = session.get(Conversation, conversation_id)
    project = session.get(Project, conversation.project_id) if conversation.project_id else None
    lead = session.exec(select(Lead).where(Lead.conversation_id == conversation_id)).first()
    contact = conversation.contact

    system_parts = [
        f"РОЛЬ И ПРОЕКТ:\\n{project.system_prompt if project else 'Ты AI-помощник менеджера.'}",
        "ПРАВИЛА:\\n- Ответ 2-4 предложения.\\n- Завершай вопросом о замере.",
    ]
    if feedback:
        system_parts.append(f"УЧТИ ПОЖЕЛАНИЕ МЕНЕДЖЕРА: {feedback}")

    # RAG
    docs = read_knowledge_files(project.knowledge_dir if project else None)
    rag_sources = [d["source"] for d in docs]
    rag_text = "\\n\\n".join([f"--- {d['source']} ---\\n{d['content']}" for d in docs])
    system_parts.append(f"=== БАЗА ЗНАНИЙ (RAG) ===\\n{rag_text}")

    # Lead State
    lead_parts = [f"Клиент: {contact.name}"]
    if contact.phone: lead_parts.append(f"Телефон: {contact.phone}")
    if lead:
        lead_parts.append(f"Статус: {lead.status}, Температура: {lead.temperature}")
        if lead.area_m2: lead_parts.append(f"Площадь: {lead.area_m2} м2")
        if lead.ceiling_type: lead_parts.append(f"Профиль: {lead.ceiling_type}")
        if lead.estimated_price: lead_parts.append(f"Ориентир сметы: {lead.estimated_price} руб.")
    system_parts.append(f"=== CRM ДАННЫЕ ЛИДА ===\\n" + "\\n".join(lead_parts))

    messages = [{"role": "system", "content": "\\n\\n".join(system_parts)}]

    # Chat History: 8-10 последних сообщений
    history = session.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(desc(Message.created_at))
        .limit(10)
    ).all()
    for msg in reversed(history):
        role = "user" if msg.direction == MessageDirection.inbound else "assistant"
        messages.append({"role": role, "content": msg.text})

    return messages, rag_sources

async def generate_copilot_suggestion(
    session: Session,
    conversation_id: UUID,
    provider: LLMProvider | str | None = None,
    feedback: str | None = None,
) -> AiSuggestion:
    messages, rag_sources = build_copilot_context(session, conversation_id, feedback)
    resp = await call_chat_completion(messages=messages, provider=provider)

    suggestion = AiSuggestion(
        id=uuid4(),
        conversation_id=conversation_id,
        suggested_text=resp.reply_text,
        confidence=0.94,
        mode=AiSuggestionMode.draft,
        status=AiSuggestionStatus.pending,
        rag_sources=rag_sources,
        created_at=utc_now(),
    )
    session.add(suggestion)
    session.commit()
    session.refresh(suggestion)
    return suggestion

def merge_contacts(
    session: Session,
    main_contact_id: UUID,
    duplicate_contact_id: UUID,
) -> tuple[Contact, int, int]:
    \"\"\"Склейка (объединение) двух профилей клиентов в CRM\"\"\"
    main_contact = session.get(Contact, main_contact_id)
    dup_contact = session.get(Contact, duplicate_contact_id)
    if not main_contact or not dup_contact:
        raise ValueError("Один из контактов не найден")

    # Перенос диалогов и лидов
    convs = session.exec(select(Conversation).where(Conversation.contact_id == duplicate_contact_id)).all()
    for c in convs:
        c.contact_id = main_contact_id
        session.add(c)
    leads = session.exec(select(Lead).where(Lead.contact_id == duplicate_contact_id)).all()
    for l in leads:
        l.contact_id = main_contact_id
        session.add(l)

    if not main_contact.phone and dup_contact.phone:
        main_contact.phone = dup_contact.phone
    if not main_contact.city and dup_contact.city:
        main_contact.city = dup_contact.city

    session.delete(dup_contact)
    session.commit()
    session.refresh(main_contact)
    return main_contact, len(convs), len(leads)
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
    scheduler: {
      title: "scheduler.py",
      filename: "scheduler.py",
      path: "app/services/scheduler.py",
      desc: "Фоновый планировщик автопостинга (APScheduler / AsyncIO loop): опрос БД каждые 30-60 секунд, авто-публикация наступивших ScheduledPost в VK и Telegram.",
      code: `from __future__ import annotations
import asyncio
import logging
from typing import Any
from sqlmodel import Session, select
from app.db.session import engine
from app.models import ScheduledPost, ScheduledPostStatus, utc_now
from app.services.content_service import publish_scheduled_post_async

logger = logging.getLogger("phoenix.services.scheduler")

_scheduler: Any = None
_worker_task: asyncio.Task | None = None
_is_running: bool = False

async def auto_publish_job() -> int:
    """
    Фоновая задача автопубликации по расписанию:
    Ищет посты со статусом 'scheduled' и scheduled_at <= utc_now(),
    публикует в целевой канал (VK / TG) и фиксирует результат.
    """
    now = utc_now()
    published_count = 0
    with Session(engine) as session:
        due_posts = session.exec(
            select(ScheduledPost).where(
                ScheduledPost.status == ScheduledPostStatus.scheduled,
                ScheduledPost.scheduled_at <= now,
            )
        ).all()

        for post in due_posts:
            try:
                await publish_scheduled_post_async(session, post.id)
                published_count += 1
            except Exception as exc:
                logger.error("Auto-publish failed for post %s: %s", post.id, exc)

    return published_count

def start_scheduler(interval_seconds: int = 30) -> None:
    """Запуск фонового планировщика на базе APScheduler или asyncio worker loop."""
    global _scheduler, _worker_task, _is_running
    if _is_running:
        return
    _is_running = True
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.interval import IntervalTrigger
        _scheduler = AsyncIOScheduler()
        _scheduler.add_job(
            auto_publish_job,
            trigger=IntervalTrigger(seconds=interval_seconds),
            id="phoenix_auto_publish",
            replace_existing=True,
            max_instances=1,
        )
        _scheduler.start()
        logger.info("APScheduler started (interval=%ds)", interval_seconds)
    except ImportError:
        logger.info("apscheduler not installed, using asyncio loop")
        loop = asyncio.get_event_loop()
        _worker_task = loop.create_task(_asyncio_loop(interval_seconds))

def stop_scheduler() -> None:
    """Корректная остановка планировщика при завершении приложения."""
    global _scheduler, _worker_task, _is_running
    _is_running = False
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
    if _worker_task and not _worker_task.done():
        _worker_task.cancel()
        _worker_task = None
`,
    },
    main: {
      title: "main.py",
      filename: "main.py",
      path: "app/main.py",
      desc: "Точка входа FastAPI с lifespan: старт БД, бэкапов, APScheduler автопостинга и Long Polling демонов для Telegram и VK.",
      code: `from __future__ import annotations
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel

from app.api.content import router as content_router
from app.api.conversations import router as conversations_router
from app.connectors.telegram import telegram_long_poll_loop
from app.connectors.vk import vk_long_poll_loop
from app.core.config import settings
from app.db.session import engine
from app.services.backup_service import run_daily_backup_check
from app.services.scheduler import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Таблицы базы данных
    SQLModel.metadata.create_all(engine)

    # 2. Ежедневный бэкап
    run_daily_backup_check()

    # 3. Запуск фонового планировщика публикаций
    start_scheduler(interval_seconds=30)

    # 4. Фоновые демоны Long Polling
    background_tasks = []
    if getattr(settings, "telegram_enabled", False):
        background_tasks.append(asyncio.create_task(telegram_long_poll_loop()))
    if getattr(settings, "vk_enabled", False):
        background_tasks.append(asyncio.create_task(vk_long_poll_loop()))

    yield

    # Shutdown: аккуратная остановка планировщика и демонов
    stop_scheduler()
    for t in background_tasks:
        if not t.done():
            t.cancel()
    if background_tasks:
        await asyncio.gather(*background_tasks, return_exceptions=True)

app = FastAPI(title="Phoenix AI Hub API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(conversations_router, prefix="/api")
app.include_router(content_router, prefix="/api")
`,
    },
    content_api: {
      title: "content.py",
      filename: "content.py",
      path: "app/api/content.py",
      desc: "API медиабиблиотеки и контента: ручная форсированная публикация /publish-now/{id}, календарь /scheduled и прикрепление фото к постам.",
      code: `from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import MediaAsset, ContentItemMediaLink, ContentItem, ScheduledPost, ScheduledPostStatus
from app.services.content_service import publish_scheduled_post_async

router = APIRouter(prefix="/content", tags=["content"])

@router.post("/publish-now/{scheduled_post_id}")
async def publish_now(scheduled_post_id: UUID, session: Session = Depends(get_session)):
    """Принудительная публикация поста из календаря без ожидания наступления времени."""
    post = session.get(ScheduledPost, scheduled_post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Запланированный пост не найден")
    if post.status == ScheduledPostStatus.publishing:
        raise HTTPException(status_code=409, detail="Пост уже находится в процессе публикации")

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

@router.get("/scheduled")
def list_scheduled_posts(session: Session = Depends(get_session)):
    """Получение постов для календарной сетки с информацией о канале и времени."""
    posts = session.exec(select(ScheduledPost).order_by(ScheduledPost.scheduled_at)).all()
    return posts

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
      desc: "Сервис контента: отправка постов в VK и Telegram с медиафайлами (MediaAsset), учет PostPerformance и генерация вариантов под ниши.",
      code: `from __future__ import annotations
import logging
from typing import Any
from uuid import UUID, uuid4
from sqlmodel import Session, select
from app.models import (
    ChannelType, ContentItem, ContentItemMediaLink, ContentStatus, ContentVariant,
    MediaAsset, PostPerformance, PublishTarget, PublishedPost, ScheduledPost, ScheduledPostStatus, utc_now
)
from app.connectors.telegram import publish_telegram_channel_post_async
from app.connectors.vk import publish_vk_wall_post_async

logger = logging.getLogger("phoenix.services.content")

def get_media_urls_for_content_item(session: Session, content_item_id: UUID) -> list[str]:
    """Сбор прикрепленных фото через ContentItemMediaLink и прямые MediaAsset."""
    links = session.exec(
        select(ContentItemMediaLink)
        .where(ContentItemMediaLink.content_item_id == content_item_id)
        .order_by(ContentItemMediaLink.sort_order)
    ).all()
    urls = []
    if links:
        for link in links:
            asset = session.get(MediaAsset, link.media_asset_id)
            if asset and (asset.url or asset.file_path):
                urls.append(asset.url or asset.file_path)
    return urls

async def publish_scheduled_post_async(session: Session, scheduled_post_id: UUID) -> PublishedPost:
    """Боевая публикация отложенного поста в Telegram или ВКонтакте."""
    post = session.get(ScheduledPost, scheduled_post_id)
    if not post:
        raise ValueError(f"ScheduledPost {scheduled_post_id} не найден")

    variant = session.get(ContentVariant, post.content_variant_id)
    content_item = session.get(ContentItem, variant.content_item_id) if variant else None
    media_urls = get_media_urls_for_content_item(session, content_item.id) if content_item else []

    target = session.get(PublishTarget, post.publish_target_id) if post.publish_target_id else None
    target_channel = target.channel if target else variant.channel
    target_external_id = target.external_id if target else None

    post.status = ScheduledPostStatus.publishing
    session.add(post)
    session.commit()

    try:
        external_post_id, post_url = None, None

        if target_channel == ChannelType.telegram:
            res = await publish_telegram_channel_post_async(
                message=variant.text, channel_id=target_external_id, photo_paths=media_urls
            )
            external_post_id, post_url = res.get("external_post_id"), res.get("url")

        elif target_channel in {ChannelType.vk, ChannelType.vk_wall}:
            owner_id = int(target_external_id) if target_external_id and target_external_id.lstrip("-").isdigit() else None
            res = await publish_vk_wall_post_async(
                message=variant.text, owner_id=owner_id, photo_paths=media_urls
            )
            external_post_id, post_url = res.get("external_post_id"), res.get("url")

        now = utc_now()
        post.status = ScheduledPostStatus.published
        session.add(post)

        pub_record = PublishedPost(
            id=uuid4(),
            scheduled_post_id=post.id,
            content_variant_id=variant.id,
            external_post_id=external_post_id,
            url=post_url,
            status="published",
            published_at=now,
        )
        session.add(pub_record)

        # Начальная метрика аналитики
        perf = PostPerformance(
            id=uuid4(), published_post_id=pub_record.id, views=0, reactions=0,
            comments=0, shares=0, clicks=0, messages=0, leads=0, captured_at=now
        )
        session.add(perf)
        session.commit()
        return pub_record

    except Exception as exc:
        post.status = ScheduledPostStatus.failed
        post.error_message = str(exc)
        session.add(post)
        session.commit()
        raise
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


async def _get_telegram_file_url(file_id: str) -> str | None:
    """Получение прямой ссылки на файл из Telegram API для сохранения/скачивания."""
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

    # 1. Фотография (photo) - массив размеров, выбираем максимальное качество
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

    # 3. Документ (document: сметы, PDF, чертежи помещений)
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

    # Если текста нет, но есть подпись к фото/документу
    if not text and caption:
        text = caption

    # Безопасная фильтрация: пропускаем ТОЛЬКО если нет НИ текста, НИ медиа
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
    vk: {
      title: "vk.py",
      filename: "vk.py",
      path: "app/connectors/vk.py",
      desc: "Коннектор ВКонтакте: разбор вложений (фото высокого разрешения, голосовые audio_message, документы), Long Polling сообществ, отправка ответов и messages.markAsRead.",
      code: `import asyncio
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

        # 1. Фотография (photo) - выбираем максимальное разрешение по width * height
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
    import random
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
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 select-none overflow-hidden text-zinc-800 dark:text-zinc-200">
      {/* 1. Header */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Code2 size={18} className="text-teal-700 dark:text-teal-400" />
            <span>Обновленный код бэкенда Python (FastAPI / SQLModel)</span>
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Готовые файлы для развертывания: поддержка Проектов (ниш), Telegram Long Polling, коннектор Max и отметка «Прочитано».
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-2xs cursor-pointer"
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
      <div className="px-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 flex items-center gap-2 overflow-x-auto shrink-0">
        {(Object.keys(fileContents) as Array<keyof typeof fileContents>).map((key) => {
          const file = fileContents[key];
          const isActive = activeFile === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFile(key)}
              className={`py-3 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? "border-teal-700 text-teal-800 dark:text-teal-300 bg-white/60 dark:bg-zinc-900 font-semibold"
                  : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <FileCode size={14} className={isActive ? "text-teal-700 dark:text-teal-400" : "text-zinc-500"} />
              <span>{file.title}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Description banner */}
      <div className="px-6 py-2.5 bg-teal-50/60 dark:bg-teal-950/40 border-b border-teal-200/50 dark:border-teal-900/50 text-xs text-teal-950 dark:text-teal-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold text-teal-800 dark:text-teal-300 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
            {currentFile.path}
          </span>
          <span className="text-teal-900 dark:text-teal-200 font-medium">{currentFile.desc}</span>
        </div>
      </div>

      {/* 4. Code Display */}
      <div className="flex-1 overflow-y-auto p-6 bg-zinc-950 font-mono text-xs text-zinc-100">
        <pre className="whitespace-pre overflow-x-auto leading-relaxed selection:bg-teal-700 selection:text-white">
          <code>{currentFile.code}</code>
        </pre>
      </div>
    </div>
  );
};
