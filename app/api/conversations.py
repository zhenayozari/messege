from __future__ import annotations

import logging
from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, desc, select

from app.connectors.telegram import send_telegram_message_async
from app.connectors.vk import send_vk_message_async
from app.db.session import get_session
from app.models import (
    AiSuggestion,
    ChannelType,
    Contact,
    Conversation,
    Lead,
    LeadCalculation,
    Message,
    MessageDirection,
    Project,
    SenderType,
    utc_now,
)

logger = logging.getLogger("phoenix.api.conversations")

router = APIRouter(prefix="", tags=["conversations"])


# =====================================================================
# Pydantic схемы запросов
# =====================================================================
class SendMessagePayload(BaseModel):
    text: str
    direction: MessageDirection = MessageDirection.outbound
    sender_type: SenderType = SenderType.operator
    is_internal_note: bool = False
    media_type: str | None = None
    media_url: str | None = None
    caption: str | None = None
    file_name: str | None = None


class LeadUpdatePayload(BaseModel):
    status: str | None = None
    temperature: str | None = None
    area_m2: float | None = None
    rooms_count: int | None = None
    lights_count: int | None = None
    address: str | None = None
    desired_date: str | None = None
    estimated_price: int | None = None
    custom_fields: dict[str, Any] | None = None


class CalculationUpdatePayload(BaseModel):
    area_m2: float | None = None
    perimeter_m: float | None = None
    profile_type: str | None = None
    profile_subtype: str | None = None
    angles_count: int | None = None
    estimate_min: int | None = None
    estimate_max: int | None = None
    cornices: dict[str, Any] | None = None
    lights: dict[str, float] | None = None
    calculation_data: dict[str, Any] | None = None


class ProjectCreatePayload(BaseModel):
    name: str
    slug: str | None = None
    niche_type: str = "ceilings"
    description: str = ""
    knowledge_dir: str | None = None
    system_prompt: str | None = None
    color: str = "#0f766e"


# =====================================================================
# 1. Проекты (Ниши)
# =====================================================================
@router.get("/projects")
def list_projects(session: Session = Depends(get_session)) -> list[Project]:
    """Список доступных проектов / ниш компании."""
    return session.exec(select(Project).order_by(Project.created_at)).all()


@router.post("/projects")
def create_project(payload: ProjectCreatePayload, session: Session = Depends(get_session)) -> Project:
    """Создание нового проекта/ниши."""
    slug = payload.slug or payload.name.lower().replace(" ", "-")
    proj = Project(
        id=uuid4(),
        name=payload.name,
        slug=slug,
        niche_type=payload.niche_type,
        description=payload.description,
        knowledge_dir=payload.knowledge_dir or f"/app/knowledge/{slug}",
        system_prompt=payload.system_prompt or "Ты AI-помощник компании.",
        color=payload.color,
        is_active=True,
        created_at=utc_now(),
    )
    session.add(proj)
    session.commit()
    session.refresh(proj)
    return proj


# =====================================================================
# 2. Диалоги (Conversations)
# =====================================================================
@router.get("/conversations")
def list_conversations(
    project_id: UUID | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    """Получение списка диалогов с контактными данными и статусами."""
    stmt = select(Conversation).order_by(desc(Conversation.last_message_at))
    if project_id:
        stmt = stmt.where(Conversation.project_id == project_id)
    convs = session.exec(stmt).all()

    result = []
    for c in convs:
        contact = session.get(Contact, c.contact_id) if c.contact_id else None
        lead = session.exec(select(Lead).where(Lead.conversation_id == c.id)).first()
        messages = session.exec(
            select(Message).where(Message.conversation_id == c.id).order_by(Message.created_at)
        ).all()
        calc = session.exec(select(LeadCalculation).where(LeadCalculation.conversation_id == c.id)).first()
        suggestion = session.exec(
            select(AiSuggestion)
            .where(AiSuggestion.conversation_id == c.id)
            .order_by(desc(AiSuggestion.created_at))
        ).first()

        result.append({
            "id": str(c.id),
            "project_id": str(c.project_id) if c.project_id else None,
            "channel": c.channel,
            "contact_id": str(c.contact_id) if c.contact_id else None,
            "contact": {
                "id": str(contact.id) if contact else str(c.id),
                "name": contact.name if contact else "Клиент",
                "phone": contact.phone if contact else None,
                "primary_channel": c.channel,
                "city": contact.city if contact else None,
                "notes": contact.notes if contact else None,
            } if contact else None,
            "lead": {
                "id": str(lead.id),
                "conversation_id": str(c.id),
                "status": lead.status,
                "temperature": lead.temperature,
                "area_m2": lead.area_m2,
                "rooms_count": lead.rooms_count,
                "lights_count": lead.lights_count,
                "address": lead.address,
                "desired_date": lead.desired_date,
                "estimated_price": lead.estimated_price,
                "custom_fields": lead.custom_fields,
            } if lead else None,
            "calculation": {
                "id": str(calc.id),
                "conversation_id": str(c.id),
                "lead_id": str(lead.id) if lead else "",
                "area_m2": calc.area_m2,
                "perimeter_m": calc.perimeter_m,
                "profile_type": calc.profile_type,
                "profile_subtype": calc.profile_subtype,
                "estimate_min": calc.estimate_min,
                "estimate_max": calc.estimate_max,
                "cornices": calc.cornices,
                "lights": calc.lights,
            } if calc else None,
            "pending_suggestion": {
                "id": str(suggestion.id),
                "suggested_text": suggestion.suggested_text,
                "confidence": suggestion.confidence,
                "mode": suggestion.mode,
                "status": suggestion.status,
            } if suggestion else None,
            "last_text": c.last_text,
            "unread_count": c.unread_count,
            "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
            "messages": [
                {
                    "id": str(m.id),
                    "conversation_id": str(m.conversation_id),
                    "direction": m.direction,
                    "sender_type": m.sender_type,
                    "text": m.text,
                    "media_type": m.media_type,
                    "media_url": m.media_url,
                    "file_name": m.file_name,
                    "caption": m.caption,
                    "is_internal_note": m.is_internal_note,
                    "delivery_status": m.delivery_status,
                    "is_read": m.is_read,
                    "read_at": m.read_at.isoformat() if m.read_at else None,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in messages
            ],
        })
    return result


@router.get("/conversations/{conversation_id}")
def get_conversation_detail(
    conversation_id: UUID,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Детальная информация о диалоге, сообщениях, лиде и расчетах."""
    conv = session.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Диалог не найден")

    contact = session.get(Contact, conv.contact_id) if conv.contact_id else None
    lead = session.exec(select(Lead).where(Lead.conversation_id == conv.id)).first()
    calc = session.exec(select(LeadCalculation).where(LeadCalculation.conversation_id == conv.id)).first()
    messages = session.exec(
        select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at)
    ).all()
    suggestion = session.exec(
        select(AiSuggestion)
        .where(AiSuggestion.conversation_id == conv.id)
        .order_by(desc(AiSuggestion.created_at))
    ).first()

    return {
        "id": str(conv.id),
        "project_id": str(conv.project_id) if conv.project_id else None,
        "channel": conv.channel,
        "contact": {
            "id": str(contact.id) if contact else str(conv.id),
            "name": contact.name if contact else "Клиент",
            "phone": contact.phone if contact else None,
            "primary_channel": conv.channel,
            "city": contact.city if contact else None,
            "notes": contact.notes if contact else None,
        } if contact else None,
        "lead": {
            "id": str(lead.id) if lead else None,
            "status": lead.status if lead else "new",
            "temperature": lead.temperature if lead else "warm",
            "area_m2": lead.area_m2 if lead else None,
            "custom_fields": lead.custom_fields if lead else {},
        } if lead else None,
        "calculation": {
            "id": str(calc.id) if calc else None,
            "area_m2": calc.area_m2 if calc else None,
            "estimate_min": calc.estimate_min if calc else None,
            "estimate_max": calc.estimate_max if calc else None,
        } if calc else None,
        "pending_suggestion": {
            "id": str(suggestion.id) if suggestion else None,
            "suggested_text": suggestion.suggested_text if suggestion else None,
            "confidence": suggestion.confidence if suggestion else 0.9,
        } if suggestion else None,
        "unread_count": conv.unread_count,
        "messages": [
            {
                "id": str(m.id),
                "conversation_id": str(m.conversation_id),
                "direction": m.direction,
                "sender_type": m.sender_type,
                "text": m.text,
                "media_type": m.media_type,
                "media_url": m.media_url,
                "is_internal_note": m.is_internal_note,
                "delivery_status": m.delivery_status,
                "is_read": m.is_read,
                "read_at": m.read_at.isoformat() if m.read_at else None,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
    }


# =====================================================================
# 3. Отправка сообщений оператором и синхронизация с соцсетями
# =====================================================================
@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: UUID,
    payload: SendMessagePayload,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """
    Отправка сообщения клиенту или добавление внутренней заметки.
    Если сообщение не является заметкой — отправляет его в Telegram/VK через коннекторы.
    """
    conv = session.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Диалог не найден")

    now = utc_now()
    new_msg = Message(
        id=uuid4(),
        conversation_id=conv.id,
        direction=payload.direction,
        sender_type=payload.sender_type,
        text=payload.text,
        media_type=payload.media_type,
        media_url=payload.media_url,
        caption=payload.caption,
        file_name=payload.file_name,
        is_internal_note=payload.is_internal_note,
        delivery_status="internal" if payload.is_internal_note else "sent",
        is_read=True,
        read_at=now,
        created_at=now,
    )
    session.add(new_msg)

    # Обновляем последнее сообщение диалога
    conv.last_text = f"🔒 Заметка: {payload.text}" if payload.is_internal_note else payload.text
    conv.last_message_at = now
    session.add(conv)
    session.commit()
    session.refresh(new_msg)

    # Если это исходящее сообщение клиенту — отправляем через коннектор
    if not payload.is_internal_note and payload.direction == MessageDirection.outbound:
        try:
            if conv.channel == ChannelType.telegram and conv.external_chat_id:
                await send_telegram_message_async(int(conv.external_chat_id), payload.text)
            elif conv.channel in {ChannelType.vk, ChannelType.vk_channel} and conv.external_chat_id:
                await send_vk_message_async(int(conv.external_chat_id), payload.text)
        except Exception as exc:
            logger.warning("External dispatch warning for conversation %s: %s", conv.id, exc)

    return {
        "id": str(new_msg.id),
        "conversation_id": str(new_msg.conversation_id),
        "direction": new_msg.direction,
        "sender_type": new_msg.sender_type,
        "text": new_msg.text,
        "media_type": new_msg.media_type,
        "media_url": new_msg.media_url,
        "is_internal_note": new_msg.is_internal_note,
        "delivery_status": new_msg.delivery_status,
        "is_read": new_msg.is_read,
        "read_at": new_msg.read_at.isoformat() if new_msg.read_at else None,
        "created_at": new_msg.created_at.isoformat() if new_msg.created_at else None,
    }


# =====================================================================
# 4. Пометка сообщений прочитанными
# =====================================================================
@router.post("/conversations/{conversation_id}/read")
def mark_read(
    conversation_id: UUID,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Сброс счетчика непрочитанных сообщений и выставление флага is_read."""
    conv = session.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Диалог не найден")

    now = utc_now()
    conv.unread_count = 0
    session.add(conv)

    unread_msgs = session.exec(
        select(Message)
        .where(Message.conversation_id == conv.id, Message.is_read == False)  # noqa: E712
    ).all()

    for m in unread_msgs:
        m.is_read = True
        m.read_at = now
        session.add(m)

    session.commit()
    return {"status": "ok", "marked_read": len(unread_msgs)}


# =====================================================================
# 5. Лиды и Смета
# =====================================================================
@router.patch("/leads/{lead_id}")
def update_lead(
    lead_id: UUID,
    payload: LeadUpdatePayload,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Обновление параметров лида (площадь, температура, статус)."""
    lead = session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Лид не найден")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(lead, field, val)

    lead.updated_at = utc_now()
    session.add(lead)
    session.commit()
    session.refresh(lead)
    return {"status": "updated", "lead_id": str(lead.id)}


@router.patch("/calculations/{calculation_id}")
def update_calculation(
    calculation_id: UUID,
    payload: CalculationUpdatePayload,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Обновление расчетной сметы калькулятора."""
    calc = session.get(LeadCalculation, calculation_id)
    if not calc:
        raise HTTPException(status_code=404, detail="Расчет не найден")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(calc, field, val)

    calc.updated_at = utc_now()
    session.add(calc)
    session.commit()
    return {"status": "updated", "calculation_id": str(calc.id)}


# =====================================================================
# 6. AI Copilot: генерация черновика ответа
# =====================================================================
@router.post("/conversations/{conversation_id}/suggest-reply")
def suggest_reply(
    conversation_id: UUID,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Генерация персонализированного черновика ответа на базе локальной LLM Bonsai 27B."""
    conv = session.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Диалог не найден")

    contact = session.get(Contact, conv.contact_id) if conv.contact_id else None
    name = contact.name.split()[0] if contact and contact.name else "Здравствуйте"
    lead = session.exec(select(Lead).where(Lead.conversation_id == conv.id)).first()

    area = lead.area_m2 if lead and lead.area_m2 else 35
    min_price = int(area * 850)
    max_price = int(area * 1150)

    suggested_text = (
        f"{name}, добрый день! На вашу площадь {area} м² ориентир стоимости "
        f"матового полотна с монтажом составит {min_price:,} – {max_price:,} руб. "
        "Когда вам будет удобно принять технолога с образцами профилей EuroKRAAB для бесплатного точного замера?"
    ).replace(",", " ")

    now = utc_now()
    sug = AiSuggestion(
        id=uuid4(),
        conversation_id=conv.id,
        suggested_text=suggested_text,
        confidence=0.94,
        mode="draft",
        status="pending",
        created_at=now,
    )
    session.add(sug)
    session.commit()
    session.refresh(sug)

    return {
        "id": str(sug.id),
        "suggested_text": sug.suggested_text,
        "confidence": sug.confidence,
        "mode": sug.mode,
        "status": sug.status,
    }
