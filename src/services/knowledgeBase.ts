/**
 * Phoenix AI Hub — RAG Knowledge Base Service
 * Управление документами базы знаний, векторными чанками и персистентностью в localStorage
 */

export interface KnowledgeDoc {
  id: string;
  filename: string;
  title: string;
  description: string;
  content: string;
  niche: string; // "ceilings" | "kitchens" | "windows" | "all"
  chunksCount: number;
  updatedAt: string;
  isCustom?: boolean;
}

export const KNOWLEDGE_STORAGE_KEY = "phoenix_knowledge_docs";

/**
 * Алгоритм разбиения Markdown-документа на семантические векторные чанки для RAG
 */
export function computeMarkdownChunks(content: string): string[] {
  if (!content || !content.trim()) return [];

  // Разбиение по заголовкам Markdown (#, ##, ###)
  const headingSections = content
    .split(/(?=\n#{1,4} )/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];

  for (const section of headingSections) {
    if (section.length > 500) {
      // Разбиение длинных разделов на абзацы
      const paragraphs = section
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

      for (const p of paragraphs) {
        if (p.length > 450) {
          const lines = p.split(/\n/).map((l) => l.trim()).filter(Boolean);
          let currentSub = "";
          for (const line of lines) {
            if ((currentSub + "\n" + line).length > 380 && currentSub) {
              chunks.push(currentSub.trim());
              currentSub = line;
            } else {
              currentSub = currentSub ? currentSub + "\n" + line : line;
            }
          }
          if (currentSub) chunks.push(currentSub.trim());
        } else {
          chunks.push(p);
        }
      }
    } else {
      chunks.push(section);
    }
  }

  return chunks.length > 0 ? chunks : [content.trim()];
}

/**
 * Эталонные регламенты и документы для ниш (Натяжные потолки, Кухни, Окна)
 */
export const DEFAULT_KNOWLEDGE_DOCS: KnowledgeDoc[] = [
  // ==================== Ниша: Натяжные потолки (ceilings) ====================
  {
    id: "ceilings_pricing",
    filename: "pricing.md",
    title: "Прайс-лист и расценки ФЕНИКС PRO",
    description: "Базовые тарифы на полотна MSD/Bauf, теневые зазоры EuroKRAAB, скрытые ниши и споты",
    niche: "ceilings",
    content: `# Прайс-лист и расценки ФЕНИКС PRO (Улан-Удэ и Бурятия)

## 1. Полотна с установкой (работа + материал)
- **MSD Premium (матовый/сатин/глянец):** 650 – 880 ₽/м² (для стандартных комнат с периметром до 16м).
- **MSD Premium широкие полотна (3.6 – 5.0м):** 880 – 1 200 ₽/м² (бесшовный монтаж больших залов).
- **Bauf Премиум (Германия, повышенная плотность):** 1 100 – 1 600 ₽/м² (без запаха, эко-сертификат).
- **Тканевые полотна Descor / Clipso:** 2 800 – 4 500 ₽/м² (дышащие, премиальная фактура).

## 2. Профильные системы и теневые зазоры
- **Классический профиль с маскировочной лентой:** 300 – 500 ₽/пог.м.
- **Теневой профиль ПВХ (пластик 6-7мм зазор):** 800 – 1 100 ₽/пог.м.
- **Теневой профиль EuroKRAAB (флагманский алюминий):** 1 100 – 1 500 ₽/пог.м.
- **Парящий профиль с LED-подсветкой (одноцветный):** 700 – 1 000 ₽/пог.м.
- **Парящий RGB с контроллером:** 900 – 1 500 ₽/пог.м.
- **Контурный профиль (световой контур по стене):** 900 – 1 400 ₽/пог.м.

## 3. Карнизные ниши и гардины
- **Ниша ПК-5 (алюминиевый 3-рядный карниз с перегибом):** 1 500 – 2 500 ₽/пог.м.
- **Ниша Lumfer / Slott (дизайнерский скрытый трек):** 2 800 – 4 500 ₽/пог.м.
- **Брус под накладной карниз заказчика:** 600 – 900 ₽/пог.м.
- **Скрытая LED-подсветка шторной ниши:** 700 – 1 200 ₽/пог.м.

## 4. Освещение и точки
- **Монтаж встраиваемого светильника GX53 (стойка + проводка):** 400 – 550 ₽/точка.
- **Монтаж накладного спота/стакана:** 550 – 750 ₽/точка.
- **Монтаж люстры на крюке:** 600 – 900 ₽/шт.
- **Монтаж тяжелой потолочной люстры на планке:** 900 – 1 500 ₽/шт.
- **Световые линии (SLOTT / Flexy) под ключ:** 2 800 – 3 800 ₽/пог.м.

## 5. Дополнительные работы и углы
- **Дополнительные углы (свыше 4 стандартных):** 200 – 350 ₽/угол.
- **Обвод труб отопления:** 350 – 550 ₽/шт.
- **Крепление в керамогранит:** 400 – 600 ₽/пог.м.
- **Конструкция под шкаф-купе (закладной брус):** 700 – 1 000 ₽/пог.м.

## 6. Акции и скидки
- **Скидка новосёлам (ЖК / частные дома до 1 года):** -10%.
- **Скидка пенсионерам:** -10%.
- **Скидка многодетным семьям:** -10%.`,
    chunksCount: 6,
    updatedAt: "Сегодня",
  },
  {
    id: "ceilings_calculator",
    filename: "calculator.md",
    title: "Формула расчета и вилка цен без замера",
    description: "Правило расчета ориентировочной сметы и скрипты перевода лида на бесплатный замер",
    niche: "ceilings",
    content: `# Формула расчета сметы и стандарты озвучивания цен

## 1. Базовая математическая формула
\`\`\`
Итоговая сумма = (Площадь × Цена полотна)
               + (Периметр × Цена профиля)
               + (Кол-во углов > 4 × Цена угла)
               + (Светильники/Люстры × Цена монтажа точки)
               + (Длина карниза × Цена ниши)
               - Скидка (до 10%)
\`\`\`

## 2. Железное правило менеджера: ВИЛКА ЦЕН
1. **Никогда не называть одну фиксированную цифру** до выезда технолога.
2. Всегда давать вилку: *«Ориентировочно от X до Y руб.»*
3. Разница между Min и Max должна быть в пределах 20-30%, отражая выбор профиля (стандарт или EuroKraab) и фурнитуры.
4. Сразу после вилки цен задавать закрывающий вопрос на выезд замерщика:
   > *«Хотите, наш технолог приедет с лазерным дальномером и каталогом образцов полотен MSD и профилей EuroKraab, сделает точный раскрой и зафиксирует цену в договоре? Замер по городу абсолютно бесплатный и ни к чему вас не обязывает. В какой день вам удобнее — в будни или на выходных?»*

## 3. Коэффициенты сложности помещений
- Ванная/санузел с керамогранитом: наценка +20% за алмазное безударное сверление.
- Высота стен более 3.1 метра: повышающий коэффициент 1.15.
- Наличие натяжного потолка в новостройке: сразу применять скидку новосёла (-10%).`,
    chunksCount: 3,
    updatedAt: "Вчера",
  },
  {
    id: "ceilings_company",
    filename: "company.md",
    title: "Стандарты монтажа ФЕНИКС PRO",
    description: "Безопасность композитных баллонов, чистый монтаж с пылесосом, гарантия 15 лет",
    niche: "ceilings",
    content: `# Стандарты качества и монтажа компании ФЕНИКС PRO

## 1. Общие сведения о компании
- Более 9 лет безупречной работы в г. Улан-Удэ и Республике Бурятия.
- Более 12 000 смонтированных потолков в новостройках и вторичном жилье.
- Собственный цех раскроя и гарпунной сварки полотен с контролем натяжения.

## 2. Безопасность на объекте
- **Взрывобезопасные полимерно-композитные газовые баллоны (Ragasco, Норвегия).** Мы категорически не используем старые металлические баллоны!
- Регулярная поверка редукторов и тепловых пушек Master.
- Проверка скрытой проводки детектором Bosch перед сверлением стен.

## 3. Технология «Чистый монтаж»
- Монтажные перфораторы Hilti и DeWalt со встроенной системой вакуумного пылеудаления.
- Сверление стен без облака пыли на обоях и чистовом полу.
- Защитные бахилы и укрывная пленка для мебели.

## 4. Гарантии и официальный договор
- **15 лет официальной гарантии** на прочность полотна и сварные швы (не провисает, не желтеет).
- **3 года гарантии** на монтажные работы и профильные крепления.
- Официальный договор с юрлицом, акт выполненных работ, кассовый чек.
- Бесплатный сервис в случае затопления соседями сверху (слив воды через технологическое отверстие люстры без повреждения полотна).`,
    chunksCount: 4,
    updatedAt: "3 дня назад",
  },
  {
    id: "ceilings_faq",
    filename: "faq.md",
    title: "Частые вопросы заказчиков (FAQ)",
    description: "Обои до или после, опуск уровня, запах, время монтажа и уход за полотном",
    niche: "ceilings",
    content: `# Часто задаваемые вопросы (FAQ) заказчиков натяжных потолков

## В: Что делать сначала — клеить обои или натягивать потолок?
**О:**
- **При классическом профиле с маскировочной лентой:** лучше сначала поклеить обои, а потолок монтировать через 3-4 дня после их полного высыхания. Либо сначала смонтировать багет, поклеить обои и затем заправить полотно и вставить ленту.
- **При теневом профиле (EuroKRAAB):** обои всегда клеятся строго ДО монтажа полотна, так как теневой зазор должен образовывать идеальную темную линию над обрезом чистовых обоев.

## В: На сколько опустится уровень потолка?
**О:**
- Без встроенных светильников (только люстра): минимальный опуск **3 – 4 см** от самой низкой точки чернового перекрытия.
- Со встраиваемыми точечными светильниками GX53: опуск **5 – 6 см**.
- При наличии вентиляционных коробов или шумоизоляции: рассчитывается индивидуально по высоте препятствий.

## В: Есть ли неприятный запах после монтажа?
**О:** Мы используем оригинальные полотна **MSD Premium** и **Bauf**, имеющие сертификат экологической безопасности А+. При нагреве тепловой пушкой присутствует легкий технический запах нового материала, который полностью выветривается за 3–6 часов обычного проветривания.

## В: Сколько времени занимает установка?
**О:**
- Одно стандартное помещение (15–20 м²): **2,5 – 4 часа**.
- Двухкомнатная квартира под ключ: **1 рабочий день**.
- Сложные дизайнерские проекты с треками и световыми линиями: 1,5 – 2 рабочих дня.

## В: Что произойдет, если затопят соседи сверху?
**О:** Натяжное полотно ПВХ выдерживает до **100 литров воды на 1 м²**. Полотно просто растянется в форме пузыря, защитив ваш ремонт, мебель и технику. Наша сервисная бригада оперативно приедет, аккуратно сольет воду через отверстие светильника и восстановит форму потолка тепловой пушкой.`,
    chunksCount: 5,
    updatedAt: "5 дней назад",
  },

  // ==================== Ниша: Кухни (kitchens) ====================
  {
    id: "kitchens_pricing",
    filename: "pricing.md",
    title: "Прайс-лист ФЕНИКС Кухни",
    description: "Расценки на кухни МДФ, крашеную эмаль, столешницы и фурнитуру Blum",
    niche: "kitchens",
    content: `# Прайс-лист ФЕНИКС Кухни (на заказ по индивидуальным размерам)

## 1. Фасады и корпуса (за погонный метр)
- **МДФ в премиальной ПВХ-пленке:** от 35 000 ₽/пог.м (матовые, суперматовые Soft-Touch, древесные фактуры).
- **Крашеная эмаль (мат/глянец/металлик):** от 48 000 ₽/пог.м (колеровка по каталогам RAL и NCS).
- **Пластик HPL / Fenix NTM (нано-пластик с термовосстановлением):** от 62 000 ₽/пог.м.
- **Шпон натурального дуба / ясеня:** от 68 000 ₽/пог.м.

## 2. Столешницы и стеновые панели
- **Влагостойкая столешница HPL 38мм (Кедр / Slotex):** от 6 500 ₽/пог.м.
- **Акриловый искусственный камень (Grandex / Staron):** от 19 000 ₽/пог.м (бесшовная стыковка, литые мойки).
- **Кварцевый агломерат (повышенная термостойкость):** от 34 000 ₽/пог.м.

## 3. Фурнитура и механизмы
- Петли с доводчиками Blum / Hettich: стандартная комплектация.
- Выдвижные ящики скрытого монтажа с доводчиком: от 2 800 ₽/ящик.
- Подъемные механизмы Aventos HF / HK-S: от 8 500 ₽/комплект.`,
    chunksCount: 4,
    updatedAt: "Вчера",
  },
  {
    id: "kitchens_calculator",
    filename: "calculator.md",
    title: "Расчет стоимости кухонного гарнитура",
    description: "Формула оценки погонного метра и 3D-проектирование",
    niche: "kitchens",
    content: `# Стандарты расчета стоимости кухонь

## 1. Формула предварительной оценки
\`\`\`
Стоимость = (Длина нижних баз × Тариф) + (Длина верхних баз × Тариф) + Столешница + Доп. механизмы
\`\`\`

## 2. Регламент ответа в чате
- Запросить у клиента приблизительную длину стен (например, 2.5м прямая или 2м × 3м угловая).
- Спросить, планируется ли кухня под потолок (антресоли).
- Назвать вилку цен от базовой комплектации до комплектации с фурнитурой Blum.
- Предложить бесплатный выезд дизайнера-замерщика с образцами фасадов для точного 3D-эскиза на ноутбуке.`,
    chunksCount: 2,
    updatedAt: "3 дня назад",
  },

  // ==================== Ниша: Окна (windows) ====================
  {
    id: "windows_pricing",
    filename: "pricing.md",
    title: "Прайс-лист ФЕНИКС Окна",
    description: "Цены на пластиковые окна Rehau/Veka, балконные блоки и отделку откосов",
    niche: "windows",
    content: `# Прайс-лист ФЕНИКС Окна (Улан-Удэ)

## 1. Оконные блоки под ключ (изготовление, демонтаж, монтаж, подоконник, отлив)
- **Двухстворчатое окно (1300 × 1400 мм):** от 17 500 до 23 000 ₽.
- **Трехстворчатое окно (2050 × 1400 мм):** от 24 000 до 31 000 ₽.
- **Балконный блок (дверь + глухое окно):** от 27 000 до 36 000 ₽.
- **Остекление лоджии 3 метра (алюминий-раздвижка):** от 29 000 ₽.
- **Теплое остекление лоджии ПВХ со стеклопакетами:** от 42 000 ₽.

## 2. Профильные системы
- **Veka Euroline (3-камерный 58мм):** базовый бюджетный вариант.
- **Veka Softline (5-камерный 70мм):** максимальное энергосбережение для зимы Бурятии (до -45°C).
- **Стеклопакеты с серебряным напылением (Solar/Top):** защита от холода зимой и жары летом.`,
    chunksCount: 3,
    updatedAt: "Вчера",
  },
  {
    id: "windows_calculator",
    filename: "calculator.md",
    title: "Расчет остекления и выезд замерщика",
    description: "Формула оценки окон и правила замера проемов",
    niche: "windows",
    content: `# Правила расчета остекления

## 1. Уточнение типа дома
- Панельный дом (типовые размеры, тонкие стены).
- Кирпичный дом (широкие откосы и глубокие подоконники до 45-50 см).
- Частный деревянный дом (необходимость окосячки / обсады).

## 2. Скрипт перевода на замер
Озвучить вилку цен с учетом подоконника и отлива, затем предложить замер:
> *«В домах часто проемы отличаются на несколько сантиметров, поэтому перед запуском в производство технолог замеряет толщину четверти и откосов. Замер бесплатный, мастер привезет образцы профилей Veka и энергосберегающих стеклопакетов. Записать вас на удобное время?»*`,
    chunksCount: 2,
    updatedAt: "4 дня назад",
  },
];

/**
 * Инициализация и получение списка документов базы знаний
 * В первую очередь считывает сохраненные пользователем данные из localStorage!
 */
export function getKnowledgeDocs(niche?: string): KnowledgeDoc[] {
  try {
    const raw = localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Гарантируем пересчет актуального числа чанков
        const list = parsed.map((doc: KnowledgeDoc) => ({
          ...doc,
          chunksCount: doc.chunksCount || computeMarkdownChunks(doc.content).length,
        }));
        if (!niche || niche === "all") return list;
        return list.filter((d) => d.niche === niche || d.niche === "all");
      }
    }
  } catch (e) {
    console.error("Error reading knowledge base from localStorage:", e);
  }

  // Если в localStorage пусто, сохраняем дефолтные документы в хранилище браузера
  try {
    const initialList = DEFAULT_KNOWLEDGE_DOCS.map((doc) => ({
      ...doc,
      chunksCount: computeMarkdownChunks(doc.content).length,
    }));
    localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(initialList));
    if (!niche || niche === "all") return initialList;
    return initialList.filter((d) => d.niche === niche || d.niche === "all");
  } catch (e) {
    console.error("Error initializing knowledge base storage:", e);
  }

  return niche && niche !== "all"
    ? DEFAULT_KNOWLEDGE_DOCS.filter((d) => d.niche === niche || d.niche === "all")
    : [...DEFAULT_KNOWLEDGE_DOCS];
}

/**
 * Получить конкретный документ по ID
 */
export function getKnowledgeDocById(id: string): KnowledgeDoc | undefined {
  const all = getKnowledgeDocs();
  return all.find((d) => d.id === id);
}

/**
 * Сохранить или обновить документ базы знаний
 * Автоматически сохраняет в localStorage("phoenix_knowledge_docs") и рассылает событие
 */
export function saveKnowledgeDoc(docToSave: KnowledgeDoc): KnowledgeDoc[] {
  try {
    const all = getKnowledgeDocs();
    const updatedChunks = computeMarkdownChunks(docToSave.content).length;
    const preparedDoc: KnowledgeDoc = {
      ...docToSave,
      chunksCount: updatedChunks,
      updatedAt: "Только что",
    };

    const existingIndex = all.findIndex((d) => d.id === preparedDoc.id);
    let updatedList: KnowledgeDoc[];

    if (existingIndex >= 0) {
      updatedList = [...all];
      updatedList[existingIndex] = preparedDoc;
    } else {
      updatedList = [preparedDoc, ...all];
    }

    localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(updatedList));

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("phoenix_knowledge_updated", { detail: updatedList })
      );
    }

    return updatedList;
  } catch (e) {
    console.error("Error saving knowledge doc:", e);
    return getKnowledgeDocs();
  }
}

/**
 * Сохранить весь массив документов в localStorage
 */
export function saveKnowledgeDocs(docs: KnowledgeDoc[]): void {
  try {
    localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(docs));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("phoenix_knowledge_updated", { detail: docs })
      );
    }
  } catch (e) {
    console.error("Error saving knowledge docs array:", e);
  }
}

/**
 * Удалить документ
 */
export function deleteKnowledgeDoc(id: string): KnowledgeDoc[] {
  try {
    const all = getKnowledgeDocs();
    const filtered = all.filter((d) => d.id !== id);
    localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(filtered));

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("phoenix_knowledge_updated", { detail: filtered })
      );
    }

    return filtered;
  } catch (e) {
    console.error("Error deleting knowledge doc:", e);
    return getKnowledgeDocs();
  }
}

/**
 * Сбросить базу знаний к заводским эталонам
 */
export function resetKnowledgeDocsToDefaults(): KnowledgeDoc[] {
  try {
    const seeded = DEFAULT_KNOWLEDGE_DOCS.map((doc) => ({
      ...doc,
      chunksCount: computeMarkdownChunks(doc.content).length,
    }));
    localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(seeded));

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("phoenix_knowledge_updated", { detail: seeded })
      );
    }

    return seeded;
  } catch (e) {
    console.error("Error resetting knowledge docs:", e);
  }
  return [...DEFAULT_KNOWLEDGE_DOCS];
}

/**
 * Скачать документ как .md файл
 */
export function exportDocAsMarkdown(filename: string, content: string): void {
  try {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename.endsWith(".md") ? filename : `${filename}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Error downloading markdown file:", e);
  }
}

/**
 * Подписка на изменение документов
 */
export function subscribeKnowledgeUpdated(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("phoenix_knowledge_updated", handler);
  return () => window.removeEventListener("phoenix_knowledge_updated", handler);
}

/**
 * Получить словарь документов для RightPanel (совместимость)
 */
export function getKnowledgeDocsMap(niche: string): Record<string, { title: string; content: string }> {
  const docs = getKnowledgeDocs(niche);
  const result: Record<string, { title: string; content: string }> = {};
  for (const doc of docs) {
    result[doc.filename] = {
      title: doc.title,
      content: doc.content,
    };
  }
  return result;
}

/**
 * Получить количество документов для ниши/проекта
 */
export function getKnowledgeDocsCount(nicheOrSlug?: string): number {
  return getKnowledgeDocs(nicheOrSlug).length;
}

/**
 * Создать стартовые документы базы знаний для нового проекта/ниши
 */
export function createStarterDocsForProject(
  nicheOrSlug: string,
  projectName: string,
  description: string,
  selectedDocTypes: string[] = ["pricing", "calculator", "company", "faq"],
): KnowledgeDoc[] {
  const currentDocs = getKnowledgeDocs("all");
  const newDocs: KnowledgeDoc[] = [];

  const templates: Record<string, { filename: string; title: string; description: string; content: string }> = {
    pricing: {
      filename: "pricing.md",
      title: `Прайс-лист и тарифы (${projectName})`,
      description: `Базовые расценки, тарифные сетки и стоимость типовых заказов для направления «${projectName}»`,
      content: `# Прайс-лист и тарифы: ${projectName}

## 1. Базовые расценки и услуги
- **Стандартный пакет:** от 15 000 до 35 000 ₽.
- **Оптимальный пакет (популярный выбор):** от 35 000 до 75 000 ₽.
- **Премиум исполнение (индивидуальный проект):** от 75 000 до 180 000 ₽.

## 2. Порядок расчета
1. Уточнить у заказчика ключевые пожелания и приблизительные объемы/размеры.
2. Озвучить ориентировочный диапазон стоимости («вилку цен»).
3. Предложить бесплатный выезд специалиста на замер и расчет точной сметы.`,
    },
    calculator: {
      filename: "calculator.md",
      title: `Стандарты расчета и смета (${projectName})`,
      description: `Формула предварительной оценки и правила согласования сметы с заказчиком`,
      content: `# Стандарты расчета и смета: ${projectName}

## 1. Специфика ниши и формула
${description || `Расчет стоимости зависит от габаритов, выбранных материалов и сложности монтажа.`}

## 2. Скрипт закрытия на замер
> «Чтобы мы могли назвать точную сумму до рубля и зафиксировать скидку в договоре, к вам может подъехать наш специалист с каталогами и образцами. Замер абсолютно бесплатный и ни к чему не обязывает. На какой день вам удобнее запланировать встречу?»`,
    },
    company: {
      filename: "company.md",
      title: `О компании и гарантии (${projectName})`,
      description: `УТП, опыт работы, сертификаты, договор и условия гарантийного обслуживания`,
      content: `# О компании и стандарты качества: ${projectName}

## 1. Опыт и гарантии
- Более 7 лет безупречной работы и свыше 1 500 реализованных объектов.
- Официальный договор с фиксированной стоимостью — никаких скрытых доплат.
- Гарантия на работы и материалы — до 5 лет.
- Собственная служба сервиса и монтажные бригады с опытом от 4 лет.

## 2. Условия оплаты
- Предоплата при заключении договора (обычно 30–50%).
- Окончательный расчет после подписания акта приема-передачи работ.
- Доступна беспроцентная рассрочка от банков-партнеров без переплат.`,
    },
    faq: {
      filename: "faq.md",
      title: `Частые вопросы клиентов (FAQ)`,
      description: `Ответы на популярные возражения, сроки производства и этапы работы`,
      content: `# Частые вопросы клиентов (FAQ): ${projectName}

### В: Сколько времени занимает изготовление и монтаж?
О: Стандартный срок изготовления составляет от 3 до 10 рабочих дней в зависимости от сложности и материалов. Монтаж выполняется за 1 рабочий день.

### В: Заключается ли официальный договор?
О: Да, договор с подробной спецификацией и гарантией заключается прямо на адресе во время замера или в нашем офисе.

### В: Можно ли оформить в рассрочку?
О: Да, у нас действует честная внутренняя и банковская рассрочка 0% до 6 месяцев без первоначального взноса.`,
    },
  };

  const now = "Только что";
  for (const type of selectedDocTypes) {
    const tmpl = templates[type];
    if (tmpl) {
      const docId = `${nicheOrSlug}_${tmpl.filename.replace(".md", "")}`;
      const doc: KnowledgeDoc = {
        id: docId,
        filename: tmpl.filename,
        title: tmpl.title,
        description: tmpl.description,
        content: tmpl.content,
        niche: nicheOrSlug,
        chunksCount: computeMarkdownChunks(tmpl.content).length,
        updatedAt: now,
        isCustom: true,
      };
      newDocs.push(doc);
    }
  }

  if (newDocs.length > 0) {
    const merged = [...currentDocs.filter((d) => d.niche !== nicheOrSlug), ...newDocs];
    saveKnowledgeDocs(merged);
  }

  return newDocs;
}
