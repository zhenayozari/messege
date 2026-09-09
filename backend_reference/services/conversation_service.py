"""
Phoenix AI Hub — Conversation & Contact Service
Логика управления диалогами, контактами и склейки дубликатов CRM.
"""

from __future__ import annotations

import logging
from typing import Tuple
from uuid import UUID
from datetime import datetime, timezone

from sqlmodel import Session, select

from ..models import Contact, Conversation, Lead, Message

logger = logging.getLogger("phoenix.services.conversation")


def merge_contacts(
    session: Session,
    main_contact_id: UUID,
    duplicate_contact_id: UUID,
) -> Tuple[Contact, int, int]:
    """
    Склейка (объединение) двух профилей клиентов в CRM:
    1. Находит основной контакт и дубликат.
    2. Переносит все Conversation и Lead с дубликата на основной контакт.
    3. Дополняет основной контакт недостающими данными (телефон, город, заметки).
    4. Удаляет дублирующую запись контакта.
    5. Возвращает кортеж: (обновленный Contact, кол-во перенесенных диалогов, кол-во перенесенных лидов).
    """
    if main_contact_id == duplicate_contact_id:
        raise ValueError("Невозможно объединить контакт с самим собой")

    main_contact = session.get(Contact, main_contact_id)
    if not main_contact:
        raise ValueError(f"Основной контакт {main_contact_id} не найден в БД")

    duplicate_contact = session.get(Contact, duplicate_contact_id)
    if not duplicate_contact:
        raise ValueError(f"Дублирующий контакт {duplicate_contact_id} не найден в БД")

    logger.info(
        "Начало объединения контактов: main=%s (%s), duplicate=%s (%s)",
        main_contact.id,
        main_contact.name,
        duplicate_contact.id,
        duplicate_contact.name,
    )

    # Атомарный перенос данных в транзакции: при любой ошибке происходит полный откат (rollback)
    try:
        # 1. Перенос всех диалогов
        conversations = session.exec(
            select(Conversation).where(Conversation.contact_id == duplicate_contact_id)
        ).all()

        for conv in conversations:
            conv.contact_id = main_contact_id
            session.add(conv)

        # 2. Перенос всех лидов
        leads = session.exec(
            select(Lead).where(Lead.contact_id == duplicate_contact_id)
        ).all()

        for lead in leads:
            lead.contact_id = main_contact_id
            session.add(lead)

        # 3. Обогащение данных основного контакта из дубликата
        if not main_contact.phone and duplicate_contact.phone:
            main_contact.phone = duplicate_contact.phone

        if not main_contact.city and duplicate_contact.city:
            main_contact.city = duplicate_contact.city

        if not main_contact.external_id and duplicate_contact.external_id:
            main_contact.external_id = duplicate_contact.external_id

        # Объединение заметок менеджера
        merge_note = f"[Склейка {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}] Объединен дубликат {duplicate_contact.name} ({duplicate_contact.primary_channel.value})"
        if duplicate_contact.notes:
            merge_note += f": {duplicate_contact.notes}"

        if main_contact.notes:
            main_contact.notes = f"{main_contact.notes}\n{merge_note}"
        else:
            main_contact.notes = merge_note

        session.add(main_contact)

        # 4. Удаление дубликата контакта
        session.delete(duplicate_contact)
        
        # Фиксация единой транзакции
        session.commit()
        session.refresh(main_contact)

    except Exception as exc:
        session.rollback()
        logger.exception(
            "Сбой при склейке контактов %s и %s: %s. Выполнен полный откат транзакции.",
            main_contact_id,
            duplicate_contact_id,
            exc,
        )
        raise exc

    logger.info(
        "Склейка завершена успешно: перенесено %d диалогов, %d лидов",
        len(conversations),
        len(leads),
    )

    return main_contact, len(conversations), len(leads)


def find_duplicate_candidates(
    session: Session,
    contact_id: UUID,
    name: str | None = None,
    phone: str | None = None,
) -> list[Contact]:
    """
    Поиск потенциальных дубликатов контакта по номеру телефона или части имени.
    """
    stmt = select(Contact).where(Contact.id != contact_id)
    candidates = session.exec(stmt).all()

    results: list[Contact] = []
    clean_phone = "".join(filter(str.isdigit, phone or ""))

    for cand in candidates:
        cand_phone = "".join(filter(str.isdigit, cand.phone or ""))
        if clean_phone and cand_phone and clean_phone[-10:] == cand_phone[-10:]:
            results.append(cand)
            continue

        if name and cand.name and name.lower() in cand.name.lower():
            results.append(cand)

    return results
