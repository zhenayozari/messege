"""Conversation & AI Copilot Service for Phoenix CRM.

Features:
1. Deep context gathering for LLM Copilot:
   - System: Project/niche prompt + sales manager guidelines
   - Context/RAG: Relevant markdown articles and price lists from knowledge/
   - Lead State: Structured CRM client data (area, profile type, address, status, temperature)
   - Chat History: Last 8-10 messages formatted with user/assistant roles
2. Calling universal LLM gateway (local_llama / openai)
3. Contact merging & duplicate resolution in CRM
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from sqlmodel import Session, desc, select

from app.models import (
    AiSuggestion,
    AiSuggestionMode,
    AiSuggestionStatus,
    Channel,
    ChannelType,
    Contact,
    Conversation,
    Lead,
    Message,
    MessageDirection,
    Project,
    SenderType,
    utc_now,
)
from app.schemas import TestInboundRequest
from app.services.llm_service import (
    LLMProvider,
    call_chat_completion,
)

logger = logging.getLogger("phoenix.services.conversation")

# Default knowledge base root
KNOWLEDGE_BASE_DIR = Path("knowledge")


def read_knowledge_files(niche_dir: str | None = None) -> list[dict[str, str]]:
    """
    Reads markdown articles and price lists from knowledge/ directory (pricing.md, regulations.md, etc.)
    """
    results: list[dict[str, str]] = []
    candidates = [
        KNOWLEDGE_BASE_DIR / "pricing.md",
        KNOWLEDGE_BASE_DIR / "regulations.md",
    ]
    if niche_dir:
        niche_path = Path(niche_dir)
        if niche_path.exists():
            for f in niche_path.glob("*.md"):
                candidates.append(f)

    # Fallback embedded knowledge if files do not exist on disk
    if not any(c.exists() for c in candidates):
        return [
            {
                "source": "knowledge/pricing.md",
                "content": (
                    "ПРАЙС-ЛИСТ НА РАБОТЫ И МАТЕРИАЛЫ:\n"
                    "- Полотно матовое MSD Premium: 800 - 900 руб/м2 с установкой\n"
                    "- Теневой профиль EuroKRAAB: 800 - 950 руб/пог.м\n"
                    "- Скрытый карниз ПК-5 (ниша под шторы): 1 800 - 2 200 руб/пог.м\n"
                    "- Скрытый карниз с LED подсветкой: 2 400 - 3 200 руб/пог.м\n"
                    "- Монтаж накладного спота/светильника: 550 - 650 руб/шт\n"
                    "- Световая линия (30-50 мм): 2 800 - 3 500 руб/пог.м\n"
                    "- Скидка новоселам и при заказе всей квартиры: -10%\n"
                    "- Бесплатный выезд замерщика с каталогом образцов по городу и пригороду."
                ),
            },
            {
                "source": "knowledge/regulations.md",
                "content": (
                    "РЕГЛАМЕНТ РАБОТЫ МЕНЕДЖЕРА В ДИАЛОГЕ:\n"
                    "1. Называть цену всегда только вилкой (от ... до ...) и предупреждать, что точная сметная стоимость фиксируется мастером на замере.\n"
                    "2. Главная цель переписки — выявить потребность и мягко закрыть на бесплатный замер / консультацию с каталогом.\n"
                    "3. Задавать в конце сообщения 1 открытый или альтернативный вопрос (например: 'В какой день вам удобнее принять мастера — в будни или на выходных?').\n"
                    "4. Тон: вежливый, дружелюбный, экспертный, без канцеляризмов и шаблонного спама."
                ),
            },
        ]

    for p in candidates:
        if p.exists() and p.is_file():
            try:
                results.append({"source": str(p), "content": p.read_text(encoding="utf-8")})
            except Exception as e:
                logger.warning(f"Could not read knowledge file {p}: {e}")

    return results


def build_copilot_context(
    session: Session,
    conversation_id: UUID,
    project_id: UUID | None = None,
    feedback: str | None = None,
) -> tuple[list[dict[str, str]], list[str]]:
    """
    Assembles deep structured messages for LLM:
    1. System: Niche project prompt + Manager instructions
    2. Context/RAG: Knowledge base articles & pricing
    3. Lead State: Structured CRM client parameters
    4. Chat History: Last 8-10 messages with preserved roles
    
    Returns (messages_list, rag_sources_list)
    """
    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        raise ValueError(f"Conversation {conversation_id} not found")

    project = None
    if project_id:
        project = session.get(Project, project_id)
    elif conversation.project_id:
        project = session.get(Project, conversation.project_id)

    lead = session.exec(
        select(Lead).where(Lead.conversation_id == conversation_id)
    ).first()

    contact = conversation.contact

    # 1. System Prompt
    system_parts = []
    if project and project.system_prompt:
        system_parts.append(f"РОЛЬ И ПРОЕКТ:\n{project.system_prompt}")
    else:
        system_parts.append(
            "РОЛЬ И ПРОЕКТ:\n"
            "Ты — опытный AI-ассистент менеджера компании по натяжным потолкам и ремонту. "
            "Твоя задача — помочь менеджеру быстро ответить клиенту, квалифицировать запрос и предложить бесплатный замер."
        )

    system_parts.append(
        "ОСНОВНЫЕ ПРАВИЛА:\n"
        "- Пиши сразу готовый текст сообщения для клиента от лица менеджера.\n"
        "- Не здоровайся повторно, если диалог уже идет.\n"
        "- Ответ должен быть кратким (2-4 предложения), конкретным и доброжелательным.\n"
        "- Завершай сообщение закрывающим вопросом или предложением удобного времени замера."
    )

    if feedback:
        system_parts.append(f"УЧТИ ЗАМЕЧАНИЕ ОПЕРАТОРА: {feedback}")

    # 2. Context / RAG (pricing, regulations)
    knowledge_docs = read_knowledge_files(project.knowledge_dir if project else None)
    rag_sources = [doc["source"] for doc in knowledge_docs]

    rag_text = "\n\n".join(
        [f"--- {doc['source']} ---\n{doc['content']}" for doc in knowledge_docs]
    )
    system_parts.append(f"=== БАЗА ЗНАНИЙ И ПРАЙС-ЛИСТ (RAG) ===\n{rag_text}")

    # 3. Lead State from CRM
    lead_parts = []
    if contact:
        lead_parts.append(f"Имя клиента: {contact.name}")
        if contact.phone:
            lead_parts.append(f"Телефон: {contact.phone}")
        if contact.city:
            lead_parts.append(f"Город/Адрес: {contact.city}")

    if lead:
        lead_parts.append(f"Статус лида в CRM: {lead.status}")
        lead_parts.append(f"Температура лида: {lead.temperature}")
        if lead.area_m2:
            lead_parts.append(f"Площадь помещения: {lead.area_m2} м2")
        if lead.ceiling_type:
            lead_parts.append(f"Тип профиля/потолка: {lead.ceiling_type}")
        if lead.lights_count:
            lead_parts.append(f"Светильники: {lead.lights_count} шт")
        if lead.cornice:
            lead_parts.append("Карниз: да, скрытый")
        if lead.estimated_price:
            lead_parts.append(f"Ориентировочная сумма в CRM: {lead.estimated_price} руб")
        if lead.custom_fields:
            lead_parts.append(f"Дополнительно: {lead.custom_fields}")

    if lead_parts:
        system_parts.append(f"=== ДАННЫЕ ЛИДА ИЗ CRM ===\n" + "\n".join(lead_parts))

    messages: list[dict[str, str]] = [
        {"role": "system", "content": "\n\n".join(system_parts)}
    ]

    # 4. Chat History: Last 8-10 messages
    history_messages = session.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(desc(Message.created_at))
        .limit(10)
    ).all()

    # Sort in chronological order
    history_messages = list(reversed(history_messages))

    for msg in history_messages:
        if msg.direction == MessageDirection.inbound or msg.sender_type == SenderType.client:
            role = "user"
        else:
            role = "assistant"
        messages.append({"role": role, "content": msg.text})

    return messages, rag_sources


async def generate_copilot_suggestion(
    session: Session,
    conversation_id: UUID,
    provider: LLMProvider | str | None = None,
    feedback: str | None = None,
) -> AiSuggestion:
    """
    Generates AI reply draft via local_llama or openai using deep context.
    Stores and returns the AiSuggestion.
    """
    messages, rag_sources = build_copilot_context(
        session, conversation_id, feedback=feedback
    )

    llm_resp = await call_chat_completion(
        messages=messages,
        provider=provider,
        temperature=0.7,
        max_tokens=500,
    )

    suggestion = AiSuggestion(
        id=uuid4(),
        conversation_id=conversation_id,
        suggested_text=llm_resp.reply_text,
        confidence=0.92,
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
    """
    Склейка (объединение) двух профилей клиентов в CRM:
    1. Находит основной контакт и дубликат.
    2. Переносит все диалоги и лиды на основной контакт.
    3. Дополняет пустые поля основного контакта (телефон, город, заметки).
    4. Удаляет дублирующую запись.
    """
    main_contact = session.get(Contact, main_contact_id)
    dup_contact = session.get(Contact, duplicate_contact_id)

    if not main_contact or not dup_contact:
        raise ValueError("Один из контактов не найден")

    if not main_contact.phone and dup_contact.phone:
        main_contact.phone = dup_contact.phone
    if not main_contact.city and dup_contact.city:
        main_contact.city = dup_contact.city

    merged_notes = [main_contact.notes, dup_contact.notes]
    main_contact.notes = " | ".join(filter(None, merged_notes)) or None

    convs = session.exec(
        select(Conversation).where(Conversation.contact_id == duplicate_contact_id)
    ).all()
    for conv in convs:
        conv.contact_id = main_contact_id
        session.add(conv)

    leads = session.exec(
        select(Lead).where(Lead.contact_id == duplicate_contact_id)
    ).all()
    for lead in leads:
        lead.contact_id = main_contact_id
        session.add(lead)

    session.delete(dup_contact)
    session.commit()
    session.refresh(main_contact)

    return main_contact, len(convs), len(leads)


def create_inbound_message(
    session: Session, payload: TestInboundRequest
) -> tuple[Message, Conversation, Lead]:
    """
    Обработка входящего сообщения из мессенджера (Telegram, ВКонтакте, Max):
    1. Найти или создать активный Project (Project.is_active == True). Если нет — создать 'ФЕНИКС PRO Потолки'.
    2. Найти или создать Channel (Channel.type == payload.channel, project_id=project.id, is_active=True).
       Обязательно сделать session.flush(), чтобы у канала появился channel.id!
    3. Найти или создать Contact (по external_id == payload.external_contact_id или имени).
    4. Найти существующий Conversation (where Conversation.channel_id == channel.id, Conversation.external_chat_id == payload.external_chat_id).
       Если диалога нет — создать новый Conversation, передав ОБЯЗАТЕЛЬНО channel_id=channel.id, project_id=project.id, contact_id=contact.id.
    5. Найти или создать Lead для этого диалога.
    6. Сохранить Message со всеми медиа-полями (media_type, media_url, file_id, file_name, file_size, duration_sec, caption, attachments).
    7. Выполнить session.commit() и вернуть (message, conversation, lead).
    """
    # 1. Поиск или создание активного проекта
    project = session.exec(
        select(Project).where(Project.is_active == True)
    ).first()

    if not project:
        project = Project(
            name="ФЕНИКС PRO Потолки",
            slug="feniks-pro-ceilings",
            niche_type="ceilings",
            description="Натяжные потолки премиум качества под ключ",
            system_prompt=(
                "Ты — опытный AI-ассистент менеджера компании 'ФЕНИКС PRO Потолки'. "
                "Твоя задача — вежливо квалифицировать запрос клиента, выявлять параметры объекта (площадь, тип профиля, освещение) "
                "и мягко закрывать на бесплатный замер мастера."
            ),
            is_active=True,
            color="#0f766e",
        )
        session.add(project)
        session.flush()

    # 2. Поиск или создание канала (session.flush() гарантирует наличие channel.id)
    channel = session.exec(
        select(Channel).where(
            Channel.type == payload.channel,
            Channel.project_id == project.id,
            Channel.is_active == True,
        )
    ).first()

    if not channel:
        channel_name = f"Канал {payload.channel.value.upper() if hasattr(payload.channel, 'value') else str(payload.channel).upper()}"
        channel = Channel(
            project_id=project.id,
            type=payload.channel,
            name=channel_name,
            is_active=True,
            settings={},
            last_sync_at=utc_now(),
        )
        session.add(channel)
        session.flush()

    if not channel.id:
        session.flush()

    # 3. Поиск или создание контакта (по external_id == payload.external_contact_id)
    contact: Contact | None = None
    if payload.external_contact_id:
        contact = session.exec(
            select(Contact).where(Contact.external_id == payload.external_contact_id)
        ).first()

    if not contact and payload.contact_name:
        contact = session.exec(
            select(Contact).where(Contact.name == payload.contact_name)
        ).first()

    if not contact:
        contact = Contact(
            name=payload.contact_name or "Клиент",
            external_id=payload.external_contact_id,
            phone=payload.phone,
            city=payload.city,
            primary_channel=payload.channel,
        )
        session.add(contact)
        session.flush()
    else:
        # Актуализируем external_id, телефон или город, если появились новые данные
        updated = False
        if payload.external_contact_id and not contact.external_id:
            contact.external_id = payload.external_contact_id
            updated = True
        if payload.phone and not contact.phone:
            contact.phone = payload.phone
            updated = True
        if payload.city and not contact.city:
            contact.city = payload.city
            updated = True
        if updated:
            session.add(contact)
            session.flush()

    # 4. Поиск существующего диалога или создание нового с обязательным channel_id
    conv = session.exec(
        select(Conversation).where(
            Conversation.channel_id == channel.id,
            Conversation.external_chat_id == payload.external_chat_id,
        )
    ).first()

    # Fallback-поиск для ранее созданных записей
    if not conv:
        conv = session.exec(
            select(Conversation).where(
                Conversation.external_chat_id == payload.external_chat_id,
                Conversation.contact_id == contact.id,
            )
        ).first()
        if conv and not conv.channel_id:
            conv.channel_id = channel.id

    display_text = payload.text or payload.caption
    if not display_text and payload.media_type:
        type_labels = {
            "photo": "📷 Фотография",
            "voice": "🎤 Голосовое сообщение",
            "video_note": "📹 Видеосообщение",
            "video": "🎬 Видеозапись",
            "animation": "🎞 Анимация",
            "document": f"📄 {payload.file_name or 'Документ'}",
        }
        display_text = type_labels.get(payload.media_type, f"[{payload.media_type}]")
    last_text = display_text or "Входящее сообщение"

    if not conv:
        conv = Conversation(
            channel_id=channel.id,
            project_id=project.id,
            contact_id=contact.id,
            channel=payload.channel,
            external_chat_id=payload.external_chat_id,
            status="open",
            unread_count=0,
            last_text=last_text,
            last_message_at=utc_now(),
        )
        session.add(conv)
        session.flush()
    else:
        # Гарантируем, что ни при каких обстоятельствах channel_id не равен None
        if not conv.channel_id:
            conv.channel_id = channel.id
        if not conv.project_id:
            conv.project_id = project.id
        if not conv.contact_id:
            conv.contact_id = contact.id
        conv.channel = payload.channel

    # 5. Поиск или создание лида для этого диалога
    lead = session.exec(
        select(Lead).where(Lead.conversation_id == conv.id)
    ).first()

    if not lead:
        lead = Lead(
            project_id=project.id,
            contact_id=contact.id,
            conversation_id=conv.id,
            source=payload.channel,
            status="новый",
            temperature="теплый",
        )
        session.add(lead)
        session.flush()
    else:
        if not lead.project_id:
            lead.project_id = project.id
            session.add(lead)
        if not lead.contact_id:
            lead.contact_id = contact.id
            session.add(lead)

    # 6. Сохранение сообщения со всеми медиа-полями
    message = Message(
        conversation_id=conv.id,
        direction=MessageDirection.inbound,
        sender_type=SenderType.client,
        text=payload.text,
        media_type=payload.media_type,
        media_url=payload.media_url,
        file_id=payload.file_id,
        caption=payload.caption,
        file_name=payload.file_name,
        file_size=payload.file_size,
        duration_sec=payload.duration_sec,
        attachments=payload.attachments or [],
        external_message_id=payload.external_message_id,
        delivery_status="received",
        is_read=False,
        created_at=utc_now(),
    )
    session.add(message)

    # Обновление счетчиков и последнего текста диалога
    conv.unread_count = (conv.unread_count or 0) + 1
    conv.last_text = last_text
    conv.last_message_at = utc_now()
    session.add(conv)

    # 7. Фиксация изменений в базе и возврат (message, conversation, lead)
    session.commit()
    session.refresh(message)
    session.refresh(conv)
    session.refresh(lead)

    # Фоновый вызов AI Copilot для генерации первичного черновика ответа
    try:
        from app.db.session import engine

        async def _trigger_copilot():
            with Session(engine) as s:
                await generate_copilot_suggestion(s, conv.id)

        loop = None
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            pass
        if loop and loop.is_running():
            asyncio.create_task(_trigger_copilot())
    except Exception as exc:
        logger.warning("Could not schedule copilot suggestion: %s", exc)

    return message, conv, lead

