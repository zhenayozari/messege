"""
Phoenix AI Hub — Content Adapter Service
Автоматическая адаптация постов под форматы соцсетей (Telegram, VK Wall, VK Channel, Instagram)
с учетом ниши проекта (Project.niche_type).
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from sqlmodel import Session, select

from ..models import (
    ChannelType,
    ContentItem,
    ContentStatus,
    ContentVariant,
    PostPerformance,
    PublishedPost,
    Project,
    utc_now,
)

logger = logging.getLogger("phoenix.services.content")

# Специфика ниш для промптов и стилистики
NICHE_PROFILES: dict[str, dict[str, Any]] = {
    "ceilings": {
        "brand_name": "ФЕНИКС PRO Потолки",
        "keywords": ["натяжные потолки", "теневой зазор EuroKRAAB", "световые линии", "монтаж без пыли", "бесплатный замер"],
        "tone": "профессиональный, технологичный, аккуратный и уверенный",
        "cta_phrase": "Напишите «{keyword}» в сообщения — рассчитаем точную смету и приедем с образцами профилей!",
    },
    "kitchens": {
        "brand_name": "ФЕНИКС Кухни & Корпус",
        "keywords": ["кухни на заказ", "фасады МДФ", "эргономика кухни", "3D-проект бесплатно", "фурнитура с доводчиками"],
        "tone": "экспертный, заботливый, с фокусом на уют, надежность и практичность",
        "cta_phrase": "Отправьте ваши размеры или слово «{keyword}» — бесплатно нарисуем 3D-проект вашей идеальной кухни!",
    },
    "windows": {
        "brand_name": "ФЕНИКС Окна & Балконы",
        "keywords": ["пластиковые окна", "немецкий профиль", "энергосберегающий стеклопакет", "тепло в доме", "замер окна"],
        "tone": "надежный, аргументированный, с фокусом на тепло, тишину и долговечность",
        "cta_phrase": "Напишите «{keyword}» — инженер бесплатно приедет, проверит продувания и рассчитает стоимость остекления!",
    },
    "general": {
        "brand_name": "ФЕНИКС Ремонт & Сервис",
        "keywords": ["ремонт под ключ", "договор и гарантия", "фиксированная смета", "замер"],
        "tone": "деловой, честный и клиентоориентированный",
        "cta_phrase": "Напишите нам «{keyword}» для бесплатной консультации и расчета сметы!",
    },
}


def build_channel_prompt(channel: ChannelType, niche_profile: dict[str, Any], topic: str, goal: str, offer: str, trigger_keyword: str) -> str:
    """
    Формирует специализированный промпт адаптации контента под конкретную площадку.
    """
    brand = niche_profile["brand_name"]
    cta = niche_profile["cta_phrase"].format(keyword=trigger_keyword)

    if channel == ChannelType.telegram:
        return f"""
Ты SMM-редактор Telegram-канала компании {brand}.
Задача: написать динамичный, лаконичный и структурированный пост.
Правила для Telegram:
- Краткий цепляющий заголовок с 1 эмодзи.
- 2-3 коротких абзаца или буллета с ключевой пользой.
- Четкий Call To Action: {cta}.
- Не использовать длинные вводные слова, писать емко.

Тема: {topic}
Цель: {goal}
Оффер: {offer}
Триггер-слово: {trigger_keyword}
"""

    elif channel == ChannelType.vk_wall:
        return f"""
Ты автор сообщества ВКонтакте компании {brand}.
Задача: написать живой, душевный пост для стены с вовлечением аудитории.
Правила для VK Wall:
- Сторителлинг или реальная ситуация из практики мастеров.
- Текст разделен на читаемые абзацы с умеренным количеством эмодзи.
- В конце обязателен открытый вопрос к подписчикам для комментариев (напр. «А какой вариант выбрали бы вы для своей спальни?»).
- Призыв написать кодовое слово: {cta}.

Тема: {topic}
Цель: {goal}
Оффер: {offer}
Триггер-слово: {trigger_keyword}
"""

    elif channel == ChannelType.vk_channel:
        return f"""
Ты экспертный автор экспертного VK-канала/статьи компании {brand}.
Задача: написать глубокий, технически выверенный экспертный материал.
Правила для VK Channel:
- Фокус на технологиях, сравнении материалов, частых ошибках заказчиков и неочевидных нюансах монтажа.
- Экспертный, доказательный тон без лишней «воды».
- Практические советы для читателя.
- В конце мягкий экспертный оффер: {cta}.

Тема: {topic}
Цель: {goal}
Оффер: {offer}
Триггер-слово: {trigger_keyword}
"""

    elif channel == ChannelType.instagram:
        return f"""
Ты контент-мейкер Instagram компании {brand}.
Задача: написать текст под карусель/Reels с визуальными акцентами.
Правила для Instagram:
- Первая строчка — сильный хук, останавливающий скролл ленты.
- Напоминание полистать карусель («Листайте фото готового объекта 👉»).
- Четкие визуальные акценты (до/после, детали фурнитуры, геометрия линий).
- Призыв написать в Direct: «Напишите слово {trigger_keyword} в Директ — вышлем расчет!».
- Блок релевантных хэштегов в самом конце.

Тема: {topic}
Цель: {goal}
Оффер: {offer}
Триггер-слово: {trigger_keyword}
"""

    else:
        return f"""Напиши качественный продающий пост для {brand} по теме «{topic}». Оффер: {offer}. Триггер: {trigger_keyword}."""


def generate_channel_variants(
    session: Session,
    content_item_id: UUID,
) -> list[ContentVariant]:
    """
    AI Content Adapter:
    1. Находит ContentItem и проект, к которому он привязан.
    2. Извлекает нишу проекта (Project.niche_type).
    3. Генерирует адаптированные тексты для всех ключевых платформ:
       - Telegram (лаконично, буллеты, четкий CTA)
       - VK Wall (душевно, сторителлинг, вопрос для комментов)
       - VK Channel (экспертно, разбор нюансов)
       - Instagram (визуальные акценты, Direct CTA, хэштеги)
    4. Создает или обновляет записи ContentVariant в БД.
    """
    item = session.get(ContentItem, content_item_id)
    if not item:
        raise ValueError(f"ContentItem {content_item_id} не найден в базе данных")

    # Определение проекта и ниши
    project = None
    if item.project_id:
        project = session.get(Project, item.project_id)

    niche_type = project.niche_type if project else "ceilings"
    profile = NICHE_PROFILES.get(niche_type, NICHE_PROFILES["ceilings"])
    brand = profile["brand_name"]
    keyword = item.trigger_keyword or "РАСЧЕТ"

    logger.info(
        "Генерация вариантов постов для ContentItem=%s, проект=%s (ниша=%s)",
        item.id,
        project.name if project else "Без проекта",
        niche_type,
    )

    # Шаблоны генерации с учетом ниши
    target_channels = [
        ChannelType.vk_wall,
        ChannelType.vk_channel,
        ChannelType.telegram,
        ChannelType.instagram,
    ]

    variants: list[ContentVariant] = []

    for ch in target_channels:
        # Формируем адаптированный текст в зависимости от канала и ниши
        if ch == ChannelType.telegram:
            text = (
                f"💡 {item.title}\n\n"
                f"В компании {brand} мы часто сталкиваемся с вопросом: как сделать качественно и без переплат?\n\n"
                f"Ключевые моменты по теме:\n"
                f"• {item.topic or 'Выбирайте проверенные решения с гарантией по договору'}\n"
                f"• Никаких скрытых наценок: точная смета фиксируется до старта работ\n"
                f"• Чистый и аккуратный монтаж бригадами с опытом от 7 лет\n\n"
                f"🔥 {profile['cta_phrase'].format(keyword=keyword)}"
            )
            fmt = "post"

        elif ch == ChannelType.vk_wall:
            text = (
                f"{item.title}\n\n"
                f"Делимся свежим кейсом нашей команды {brand}! Часто заказчики сомневаются, стоит ли делать сложные узлы или лучше выбрать базовый вариант.\n\n"
                f"На самом деле правильная геометрия и качественные материалы полностью меняют восприятие интерьера: комната выглядит просторнее, а свет падает ровно туда, где он действительно нужен.\n\n"
                f"А какой стиль ближе вам: строгий лаконичный минимализм или акцентный дизайн с яркими световыми сценариями? Делитесь в комментариях, очень интересно ваше мнение! 👇\n\n"
                f"P.S. Хотите прикинуть стоимость для своей квартиры? Напишите слово «{keyword}» в сообщения нашей группы!"
            )
            fmt = "post"

        elif ch == ChannelType.vk_channel:
            text = (
                f"Экспертный разбор от {brand}: {item.title}\n\n"
                f"Разбираем главные технические нюансы, о которых часто умалчивают в рекламе:\n\n"
                f"1. Подготовка и геометрия\n"
                f"{item.topic or 'Перед началом монтажа критически важно оценить кривизну стен и расположение коммуникаций.'}\n\n"
                f"2. Материалы и комплектующие\n"
                f"Экономия на профиле или крепеже приводит к провисаниям и щелям уже через год. Мы используем только проверенные сертифицированные системы.\n\n"
                f"3. Фиксация сметы\n"
                f"Никаких «непредвиденных расходов» в процессе: смета составляется на замере и не меняется.\n\n"
                f"Нужна профессиональная консультация мастера-технолога? Напишите «{keyword}» в сообщения группы!"
            )
            fmt = "article"

        elif ch == ChannelType.instagram:
            text = (
                f"Листайте галерею готового объекта 👉\n\n"
                f"В этом проекте для {item.title.lower()} команда {brand} реализовала идеальные примыкания и безупречный свет.\n\n"
                f"✨ Что было сделано:\n"
                f"— Аккуратный монтаж за 1 день без пыли и грязи\n"
                f"— Премиальные сертифицированные материалы\n"
                f"— Гарантия 15 лет по официальному договору\n\n"
                f"📩 Напишите кодовое слово «{keyword}» нам в Direct — рассчитаем предварительную стоимость и забронируем за вами скидку новосела!\n\n"
                f"#{niche_type} #феникс #{niche_type}уланудэ #ремонтуланудэ #интерьердизайн #красивыйдом"
            )
            fmt = "carousel"

        # Ищем существующий вариант для этого канала или создаем новый
        existing = session.exec(
            select(ContentVariant).where(
                ContentVariant.content_item_id == item.id,
                ContentVariant.channel == ch,
            )
        ).first()

        if existing:
            existing.text = text
            existing.format = fmt
            existing.status = ContentStatus.draft
            existing.updated_at = utc_now()
            session.add(existing)
            variants.append(existing)
        else:
            new_var = ContentVariant(
                content_item_id=item.id,
                channel=ch,
                title=f"{item.title} ({ch.value})",
                text=text,
                format=fmt,
                status=ContentStatus.draft,
                created_at=utc_now(),
                updated_at=utc_now(),
            )
            session.add(new_var)
            variants.append(new_var)

    session.commit()
    for v in variants:
        session.refresh(v)

    return variants


def record_post_publication_and_track_performance(
    session: Session,
    content_variant_id: UUID,
    external_post_id: str,
    channel_url: str | None = None,
) -> tuple[PublishedPost, PostPerformance]:
    """
    Регистрирует факт публикации через коннектор (VK, Telegram и др.)
    и автоматически создает запись отслеживания метрик в PostPerformance.
    """
    variant = session.get(ContentVariant, content_variant_id)
    if not variant:
        raise ValueError(f"ContentVariant {content_variant_id} не найден")

    # 1. Фиксируем публикацию
    published_post = PublishedPost(
        external_post_id=external_post_id,
        url=channel_url,
        status="published",
        published_at=utc_now(),
        created_at=utc_now(),
    )
    session.add(published_post)
    session.flush()

    # 2. Обновляем статус варианта контента
    variant.status = ContentStatus.published
    variant.updated_at = utc_now()
    session.add(variant)

    # 3. Автоматически создаем запись в таблице PostPerformance для последующего сбора статистики
    performance = PostPerformance(
        published_post_id=published_post.id,
        views=0,
        reactions=0,
        comments=0,
        shares=0,
        clicks=0,
        messages=0,
        leads=0,
        measurements=0,
        captured_at=utc_now(),
    )
    session.add(performance)
    session.commit()

    session.refresh(published_post)
    session.refresh(performance)

    logger.info(
        "Создана запись отслеживания PostPerformance=%s для PublishedPost=%s (external_id=%s)",
        performance.id,
        published_post.id,
        external_post_id,
    )
    return published_post, performance


def update_post_performance_metrics(
    session: Session,
    published_post_id: UUID,
    metrics: dict[str, int],
) -> PostPerformance:
    """
    Синхронизирует метрики публикации из внешнего API (VK API stats, Telegram views)
    и пересчитывает количество полученных лидов по триггер-словам.
    """
    perf = session.exec(
        select(PostPerformance).where(PostPerformance.published_post_id == published_post_id)
    ).first()

    if not perf:
        perf = PostPerformance(published_post_id=published_post_id)

    perf.views = metrics.get("views", perf.views)
    perf.reactions = metrics.get("reactions", perf.reactions)
    perf.comments = metrics.get("comments", perf.comments)
    perf.shares = metrics.get("shares", perf.shares)
    perf.clicks = metrics.get("clicks", perf.clicks)
    perf.leads = metrics.get("leads", perf.leads)
    perf.measurements = metrics.get("measurements", perf.measurements)
    perf.captured_at = utc_now()

    session.add(perf)
    session.commit()
    session.refresh(perf)
    return perf

