"""
Phoenix AI Hub — Knowledge Base RAG Service
Поиск и извлечение релевантных статей базы знаний (RAG) из knowledge_dir конкретного проекта.
Если клиент спрашивает про цену, приоритетно подтягиваются pricing.md и calculator.md.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlmodel import Session

from ..models import Project

logger = logging.getLogger("phoenix.services.knowledge")

BASE_KNOWLEDGE_ROOT = Path("/app/knowledge").resolve()


def get_safe_knowledge_dir(raw_dir: str | None, niche: str) -> Path:
    """
    Безопасная нормализация пути к базе знаний проекта с защитой от Path Traversal.
    Гарантирует, что путь не может выйти за пределы разрешенного корня BASE_KNOWLEDGE_ROOT.
    """
    default_dir = (BASE_KNOWLEDGE_ROOT / niche).resolve()
    if not raw_dir:
        return default_dir

    try:
        candidate = Path(raw_dir).resolve()
        # Проверяем, что кандидат находится внутри BASE_KNOWLEDGE_ROOT
        try:
            is_safe = candidate.is_relative_to(BASE_KNOWLEDGE_ROOT)
        except AttributeError:
            # Fallback для старых версий Python
            is_safe = str(candidate).startswith(str(BASE_KNOWLEDGE_ROOT))

        if not is_safe:
            logger.warning(
                "Обнаружена попытка выхода за пределы базы знаний! Путь: %s, fallback на: %s",
                raw_dir,
                default_dir,
            )
            return default_dir

        return candidate
    except Exception as e:
        logger.error("Ошибка проверки пути %s: %s, fallback на default", raw_dir, e)
        return default_dir

DEFAULT_KNOWLEDGE_DOCS: dict[str, dict[str, str]] = {
    "ceilings": {
        "pricing.md": """# Прайс-лист и расценки ФЕНИКС PRO Потолки

## Базовые расценки:
- Матовое / сатиновое / глянцевое полотно MSD Premium: от 850 до 1 100 руб/м² (с работой).
- Теневой профиль EuroKRAAB (черный теневой зазор 6 мм без заглушек): 950 - 1 200 руб/пог.м.
- Парящий профиль с LED-подсветкой по периметру: 850 - 1 050 руб/пог.м + лента и блок питания.
- Скрытая ниша под карниз (ПК-5 / Lumfer) с пазом под светодиодную ленту: 1 800 - 2 400 руб/пог.м.
- Монтаж закладной под точечный светильник (спот): 550 руб/точка.
- Световые линии (ширина 30/50 мм): 2 200 - 2 900 руб/пог.м под ключ.

## Акции и спецпредложения:
- Скидка новоселам: 10% на все полотна при предъявлении выписки ЕГРН или ключей.
- Светильники GX53 в подарок при заказе всей квартиры от 45 м².
- Бесплатный выезд технолога на замер с лазерным дальномером и каталогом фактур.
""",
        "calculator.md": """# Правила расчета стоимости и формирования вилки

1. Никогда не называть одну «жесткую» цифру без замера. Всегда давать вилку ±10-15%.
2. В формулу расчета входит: (Площадь * Полотно) + (Периметр * Профиль) + Светильники + Карниз.
3. Обязательно предупреждать клиента: точный расчет делается на месте, так как важна прочность стен, количество углов (больше 4) и обход труб отопления.
4. Минимальный заказ по городу Улан-Удэ: 8 000 руб.
""",
        "company.md": """# О компании ФЕНИКС PRO Потолки

- Опыт работы на рынке Бурятии: более 9 лет.
- Собственное раскройное производство полотен в Улан-Удэ, гарантия 15 лет по договору.
- Чистый монтаж с профессиональными перфораторами с пылеудалением (без пыли и грязи).
- Безопасные композитные полимерные газовые баллоны (взрывобезопасные).
- Бесплатный выезд замерщика ежедневно с 9:00 до 21:00.
""",
        "faq.md": """# Частые вопросы заказчиков потолков

- **Что делать сначала: обои или натяжной потолок?**
  С теневым профилем EuroKRAAB идеальный порядок: сначала чистовые обои/покраска, затем потолок с пылесосом. При классическом профиле со вставкой можно делать и до обоев.
- **Сколько сантиметров опускается потолок?**
  Минимум 3-4 см при ровной плите. Если встраиваются споты — на высоту цоколя светильника (5-7 см).
- **Сколько длится монтаж?**
  Одна комната (15-20 м²) монтируется за 3-4 часа. Вся квартира 60 м² — за 1 рабочий день.
"""
    },
    "kitchens": {
        "pricing.md": """# Прайс-лист ФЕНИКС Кухни & Корпусная мебель

## Ориентировочные цены:
- Прямая кухня (эконом-комфорт, ЛДСП Egger + фасады МДФ плёнка): от 35 000 руб. за погонный метр.
- Кухня с крашеными фасадами (эмаль матовая / глянец / фрезеровка): от 48 000 руб. за пог.м.
- Фасады Fenix NTM (суперматовые, самовосстанавливающиеся): от 65 000 руб. за пог.м.
- Столешницы: влагостойкий пластик HPL (от 6 000 руб/м), искусственный акриловый камень (от 18 000 руб/пог.м).
- Фурнитура: Boyard (базовая), Blum / Hettich с доводчиками плавного хода (премиум).

## Спецпредложения:
- Бесплатный выезд дизайнера-замерщика с образцами материалов и составление 3D-проекта на ноутбуке.
- Мойка из искусственного камня в подарок при заказе гарнитура от 150 000 руб.
""",
        "calculator.md": """# Правила расчета стоимости кухни

1. Расчет ведется по погонным метрам верхних и нижних модулей с учетом наполнения (выкатные ящики, бутылочницы, подъемники Aventos).
2. Обязательно приглашать на бесплатный 3D-проект: на нем дизайнер подберет материалы под бюджет клиента.
"""
    },
    "windows": {
        "pricing.md": """# Прайс-лист ФЕНИКС Окна & Балконы

## Расценки на типовые окна:
- Двухстворчатое окно (1300х1400 мм) под ключ с подоконником, отливом и монтажом: от 17 500 руб.
- Трехстворчатое окно (2050х1400 мм): от 24 000 руб.
- Балконный блок (дверь + окно): от 27 000 руб.
- Остекление лоджии 3 метра: алюминий раздвижной от 29 000 руб., теплый ПВХ от 42 000 руб.
"""
    }
}


def load_knowledge_context(
    project_id: UUID,
    query: str,
    session: Session,
) -> dict[str, Any]:
    """
    Продвинутый RAG:
    1. Находит проект и его папку knowledge_dir.
    2. Сканирует файлы документации (pricing.md, calculator.md, company.md, faq.md).
    3. Выполняет контекстный поиск по тексту вопроса query.
    4. Если вопрос касается цен/расчетов, жестко подтягивает pricing.md и calculator.md.
    5. Возвращает форматированный контекст и список источников (sources) для прозрачности.
    """
    project = session.get(Project, project_id)
    if not project:
        raise ValueError(f"Проект {project_id} не найден в БД")

    niche = project.niche_type or "ceilings"
    dir_path = get_safe_knowledge_dir(project.knowledge_dir, niche)
    knowledge_dir = str(dir_path)

    query_lower = query.lower()
    is_price_query = any(w in query_lower for w in ["цен", "стоимост", "скольк", "прайс", "расчет", "руб", "смет", "бюджет"])
    is_measurement_query = any(w in query_lower for w in ["замер", "выезд", "мастер", "технолог", "когда", "адрес", "время"])

    matched_files: dict[str, str] = {}
    sources: list[str] = []

    # 1. Попытка чтения файлов с реального диска с изоляцией
    disk_files_found = False
    if dir_path.exists() and dir_path.is_dir():
        for file in dir_path.glob("*.md"):
            try:
                resolved_file = file.resolve()
                # Строгая проверка: файл обязан лежать строго внутри dir_path
                try:
                    is_in_bounds = resolved_file.is_relative_to(dir_path)
                except AttributeError:
                    is_in_bounds = str(resolved_file).startswith(str(dir_path))

                if not is_in_bounds:
                    logger.warning("Попытка символической ссылки или выхода за пределы папки: %s", file)
                    continue

                content = resolved_file.read_text(encoding="utf-8")
                matched_files[file.name] = content
                disk_files_found = True
            except Exception as e:
                logger.warning("Не удалось прочесть файл %s: %s", file, e)

    # 2. Если на диске папки нет или она пуста — используем эталонную базу ниши
    if not disk_files_found:
        niche_docs = DEFAULT_KNOWLEDGE_DOCS.get(niche, DEFAULT_KNOWLEDGE_DOCS["ceilings"])
        matched_files = dict(niche_docs)

    selected_sections: list[dict[str, str]] = []

    # 3. Приоритетная логика выбора файлов
    if is_price_query:
        # Для ценовых запросов обязательно берем pricing.md и calculator.md
        if "pricing.md" in matched_files:
            sources.append("pricing.md")
            selected_sections.append({
                "file": "pricing.md",
                "title": f"Прайс-лист ({project.name})",
                "content": matched_files["pricing.md"]
            })
        if "calculator.md" in matched_files:
            sources.append("calculator.md")
            selected_sections.append({
                "file": "calculator.md",
                "title": "Правила расчета стоимости",
                "content": matched_files["calculator.md"]
            })

    if is_measurement_query:
        if "company.md" in matched_files and "company.md" not in sources:
            sources.append("company.md")
            selected_sections.append({
                "file": "company.md",
                "title": "Условия замера и монтажа",
                "content": matched_files["company.md"]
            })

    # Если ничего специфичного не выбрано или нужны общие знания
    if not selected_sections:
        for fname, fcontent in matched_files.items():
            sources.append(fname)
            selected_sections.append({
                "file": fname,
                "title": fname,
                "content": fcontent
            })
            if len(sources) >= 3:
                break

    # Сборка единого контекста для промпта ИИ
    context_blocks = []
    for sec in selected_sections:
        context_blocks.append(f"--- Источник: {sec['file']} ({sec['title']}) ---\n{sec['content']}\n")

    full_context_text = "\n".join(context_blocks)

    return {
        "project_id": str(project.id),
        "project_name": project.name,
        "niche_type": niche,
        "knowledge_dir": knowledge_dir,
        "sources": sources,
        "matched_sections": selected_sections,
        "context_text": full_context_text,
    }
