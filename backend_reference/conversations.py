from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
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
    find_duplicate_candidates,
    get_conversation_bundle,
    list_conversations,
    merge_contacts,
    reject_ai_suggestion,
    rewrite_ai_suggestion,
    update_calculation,
    update_contact,
    update_lead,
)
from app.services.event_log import log_event
from app.services.pricing import calculate_estimate_detail


router = APIRouter()


def build_calculation_read(calculation: LeadCalculation | None) -> CalculationRead | None:
    if calculation is None:
        return None

    detail = calculate_estimate_detail(
        area_m2=calculation.area_m2,
        perimeter_m=calculation.perimeter_m,
        profile_type=calculation.profile_type,
        profile_subtype=calculation.profile_subtype,
        angles_count=calculation.angles_count,
        cornices=calculation.cornices,
        lights=calculation.lights,
        vent_points=calculation.vent_points,
        smart_setup=calculation.smart_setup,
        discount_category=calculation.discount_category,
    )

    return CalculationRead(
        id=calculation.id,
        area_m2=calculation.area_m2,
        perimeter_m=calculation.perimeter_m,
        profile_type=calculation.profile_type,
        profile_subtype=calculation.profile_subtype,
        angles_count=calculation.angles_count,
        cornices=calculation.cornices,
        lights=calculation.lights,
        vent_points=calculation.vent_points,
        smart_setup=calculation.smart_setup,
        discount_category=calculation.discount_category,
        estimate_min=detail["estimate_min"] if detail else calculation.estimate_min,
        estimate_max=detail["estimate_max"] if detail else calculation.estimate_max,
        breakdown=detail["breakdown"] if detail else [],
    )


# =====================================================================
# Проекты (Ниши)
# =====================================================================
@router.get("/projects", response_model=list[ProjectRead])
def get_projects(session: Session = Depends(get_session)) -> list[ProjectRead]:
    """Получить список всех проектов (ниш)."""
    projects = session.exec(select(Project).order_by(Project.created_at)).all()
    return [ProjectRead.model_validate(p, from_attributes=True) for p in projects]


@router.post("/projects", response_model=ProjectRead)
def create_project(payload: ProjectCreateRequest, session: Session = Depends(get_session)) -> ProjectRead:
    """Создать новый проект / нишу (например, Кухни, Окна, Ремонт)."""
    existing = session.exec(select(Project).where(Project.slug == payload.slug)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project with this slug already exists")

    project = Project(**payload.model_dump())
    session.add(project)
    session.commit()
    session.refresh(project)
    return ProjectRead.model_validate(project, from_attributes=True)


# =====================================================================
# Диалоги (Фильтрация по проекту / нише)
# =====================================================================
@router.get("", response_model=list[ConversationListItem])
def index(
    project_id: UUID | None = Query(default=None, description="Фильтр по проекту / нише"),
    session: Session = Depends(get_session),
) -> list[ConversationListItem]:
    """
    Получить список диалогов. Поддерживает масштабирование: фильтрацию по project_id.
    """
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
        calculation=build_calculation_read(calculation),
        messages=[MessageRead.model_validate(message, from_attributes=True) for message in messages],
        pending_suggestion=AiSuggestionRead.model_validate(suggestion, from_attributes=True)
        if suggestion
        else None,
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
    1. Обнуляет unread_count в Conversation
    2. Помечает все входящие сообщения как is_read=True с фиксацией read_at
    3. Отправляет вызов 'прочитано' во внешнюю соцсеть (VK, Telegram, Max)
    """
    conversation = session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    channel = session.get(Channel, conversation.channel_id)
    now = utc_now()

    # Помечаем сообщения в базе
    inbound_unread_messages = session.exec(
        select(Message)
        .where(
            Message.conversation_id == conversation.id,
            Message.direction == MessageDirection.inbound,
            Message.is_read == False,  # noqa: E712
        )
    ).all()

    last_message_ext_id = None
    for msg in inbound_unread_messages:
        msg.is_read = True
        msg.read_at = now
        session.add(msg)
        if msg.external_message_id:
            last_message_ext_id = msg.external_message_id

    conversation.unread_count = 0
    session.add(conversation)

    # 4. Передача статуса "Прочитано" в конкретную соцсеть
    network_status = "internal_only"
    if channel:
        try:
            if channel.type in {ChannelType.vk, ChannelType.vk_wall}:
                from app.connectors.vk import mark_vk_message_read

                peer_id_str = conversation.external_chat_id.replace("vk-peer-", "")
                if peer_id_str.isdigit():
                    mark_vk_message_read(int(peer_id_str), start_message_id=last_message_ext_id)
                    network_status = "vk_marked_read"

            elif channel.type == ChannelType.telegram:
                from app.connectors.telegram import mark_telegram_message_read

                mark_telegram_message_read(conversation.external_chat_id)
                network_status = "telegram_marked_read"

            elif channel.type == ChannelType.max:
                from app.connectors.max import mark_max_message_read

                mark_max_message_read(conversation.external_chat_id)
                network_status = "max_marked_read"

        except Exception as exc:  # noqa: BLE001
            # Не ломаем интерфейс при сбое внешнего API, но логируем событие
            network_status = f"error: {str(exc)}"

    log_event(
        session,
        actor_type="user",
        action="conversation.marked_read",
        entity_type="conversation",
        entity_id=conversation.id,
        details={"network_status": network_status, "messages_marked": len(inbound_unread_messages)},
    )
    session.commit()

    return {"status": "ok", "network_status": network_status}


@router.post("/{conversation_id}/messages", response_model=MessageRead)
def send_message(
    conversation_id: UUID,
    payload: SendMessageRequest,
    session: Session = Depends(get_session),
) -> MessageRead:
    try:
        message = create_outbound_message(session, conversation_id, payload.text)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return MessageRead.model_validate(message, from_attributes=True)


@router.patch("/{conversation_id}/contact", response_model=ContactRead)
def patch_contact(
    conversation_id: UUID,
    payload: ContactUpdateRequest,
    session: Session = Depends(get_session),
) -> ContactRead:
    try:
        contact = update_contact(session, conversation_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return ContactRead.model_validate(contact, from_attributes=True)


@router.patch("/{conversation_id}/lead", response_model=LeadRead)
def patch_lead(
    conversation_id: UUID,
    payload: LeadUpdateRequest,
    session: Session = Depends(get_session),
) -> LeadRead:
    try:
        lead = update_lead(session, conversation_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return LeadRead.model_validate(lead, from_attributes=True)


@router.patch("/{conversation_id}/calculation", response_model=CalculationRead)
def patch_calculation(
    conversation_id: UUID,
    payload: CalculationUpdateRequest,
    session: Session = Depends(get_session),
) -> CalculationRead:
    try:
        calculation = update_calculation(session, conversation_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return build_calculation_read(calculation)


@router.post("/{conversation_id}/suggestions/{suggestion_id}/reject", response_model=AiSuggestionRead)
def reject_suggestion(
    conversation_id: UUID,
    suggestion_id: UUID,
    session: Session = Depends(get_session),
) -> AiSuggestionRead:
    try:
        suggestion = reject_ai_suggestion(session, conversation_id, suggestion_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return AiSuggestionRead.model_validate(suggestion, from_attributes=True)


@router.post("/{conversation_id}/suggestions/{suggestion_id}/rewrite", response_model=AiSuggestionRead)
def rewrite_suggestion(
    conversation_id: UUID,
    suggestion_id: UUID,
    payload: RewriteSuggestionRequest,
    session: Session = Depends(get_session),
) -> AiSuggestionRead:
    try:
        suggestion = rewrite_ai_suggestion(session, conversation_id, suggestion_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return AiSuggestionRead.model_validate(suggestion, from_attributes=True)


# =====================================================================
# Склейка профилей (CRM Contact Merge)
# =====================================================================
class MergeContactsRequest(BaseModel):
    main_contact_id: UUID
    duplicate_contact_id: UUID


@router.post("/contacts/merge")
def merge_contacts_endpoint(
    payload: MergeContactsRequest,
    session: Session = Depends(get_session),
):
    """
    Объединить два контакта в CRM: переносит все диалоги и лид с дубликата
    на основной контакт, обогащает контакт недостающими полями и удаляет дубликат.
    """
    try:
        main_contact, convs_moved, leads_moved = merge_contacts(
            session=session,
            main_contact_id=payload.main_contact_id,
            duplicate_contact_id=payload.duplicate_contact_id,
        )
        return {
            "status": "success",
            "main_contact_id": str(main_contact.id),
            "main_contact_name": main_contact.name,
            "conversations_moved": convs_moved,
            "leads_moved": leads_moved,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/contacts/{contact_id}/duplicates")
def get_contact_duplicates(
    contact_id: UUID,
    name: str | None = Query(default=None),
    phone: str | None = Query(default=None),
    session: Session = Depends(get_session),
):
    """
    Поиск потенциальных дубликатов для контакта.
    """
    candidates = find_duplicate_candidates(
        session=session,
        contact_id=contact_id,
        name=name,
        phone=phone,
    )
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "phone": c.phone,
            "primary_channel": c.primary_channel.value,
            "city": c.city,
        }
        for c in candidates
    ]

