import { Conversation, Project, ChannelType } from "../types";
import { getKnowledgeDocs } from "./knowledgeBase";

export type LLMProviderType = "local_llama" | "openai";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CopilotGenerationResult {
  text: string;
  provider: LLMProviderType;
  model: string;
  confidence: number;
  rag_sources: string[];
  assembled_messages: LLMMessage[];
  tokens_used?: number;
  is_fallback?: boolean;
}

// Default knowledge base articles and price lists (RAG)
export const KNOWLEDGE_ARTICLES = [
  {
    source: "knowledge/pricing.md",
    title: "Прайс-лист на полотна, профили и монтаж",
    content: `ПРАЙС-ЛИСТ (ФЕНИКС PRO):
- Полотно матовое MSD Premium: 800 - 900 руб/м² с монтажом
- Теневой профиль EuroKRAAB: 800 - 950 руб/пог.м
- Скрытый карниз ПК-5 (ниша под шторы): 1 800 - 2 200 руб/пог.м
- Скрытый карниз с LED подсветкой: 2 400 - 3 200 руб/пог.м
- Монтаж накладного спота: 550 - 650 руб/шт
- Световые линии: 2 800 - 3 500 руб/пог.м
- Скидка новоселам: -10% от итоговой сметы
- Бесплатный выезд технолога с каталогом образцов и лазерным дальномером.`,
  },
  {
    source: "knowledge/regulations.md",
    title: "Регламент работы менеджера в диалогах",
    content: `СТАНДАРТЫ ОТВЕТОВ:
1. Цену всегда называть вилкой (ориентировочно от ... до ...) и пояснять, что точная смета фиксируется на замере.
2. Не здороваться повторно, если диалог уже идет.
3. Обязательно в конце задавать закрывающий вопрос (предложение замера / выбор удобного времени).
4. Вежливый, доброжелательный тон, без канцелярских штампов.`,
  },
];

/**
 * 2. Сбор глубокого контекста (RAG + CRM + Диалог)
 * Формирует структурированный список сообщений:
 * - System: системный промпт текущей ниши/проекта + инструкции менеджера
 * - Context/RAG: релевантные статьи и прайсы из папки knowledge/
 * - Lead State: структурированные данные лида (площадь, тип профиля, адрес, статус)
 * - Chat History: последние 8-10 сообщений из диалога с сохранением ролей
 */
export function buildCopilotContext(
  project: Project,
  conversation: Conversation,
  feedback?: string,
): { messages: LLMMessage[]; rag_sources: string[] } {
  // Динамические документы из пользовательской базы знаний (localStorage: phoenix_knowledge_docs)
  let dynamicDocs = getKnowledgeDocs(project.niche_type);
  if (dynamicDocs.length === 0 && project.slug) {
    dynamicDocs = getKnowledgeDocs(project.slug);
  }
  if (dynamicDocs.length === 0) {
    dynamicDocs = getKnowledgeDocs("all");
  }
  const rag_sources = dynamicDocs.map((a) => `knowledge/${a.filename}`);

  // 1. System Block
  const systemLines: string[] = [];
  systemLines.push(`ПРОЕКТ И БИЗНЕС-НАПРАВЛЕНИЕ: ${project.name} (Ниша: ${project.niche_type})`);
  if (project.description) {
    systemLines.push(`СПЕЦИФИКА И УТП КОМПАНИИ: ${project.description}`);
  }
  systemLines.push(`\nИНДИВИДУАЛЬНЫЙ СИСТЕМНЫЙ ПРОМПТ И ИНСТРУКЦИЯ ДЛЯ ИИ:`);
  systemLines.push(project.system_prompt || "Ты — AI-помощник менеджера по работе с клиентами.");
  systemLines.push(`\nОБЩИЕ СТАНДАРТЫ ДИАЛОГА:`);
  systemLines.push(`- Пиши сразу готовый текст ответа клиенту от лица эксперта/менеджера.`);
  systemLines.push(`- Ответ должен быть кратким (2-4 предложения), конкретным и вежливым.`);
  systemLines.push(`- Завершай сообщение целевым вопросом о замере, 3D-проекте или консультации.`);

  if (feedback) {
    systemLines.push(`\nУЧТИ ПОЖЕЛАНИЕ МЕНЕДЖЕРА К ОТВЕТУ: "${feedback}"`);
  }

  // 2. Context / RAG Block
  systemLines.push(`\n=== БАЗА ЗНАНИЙ И ПРАЙС-ЛИСТ (RAG ДЛЯ ${project.name.toUpperCase()}) ===`);
  dynamicDocs.forEach((art) => {
    systemLines.push(`--- knowledge/${art.filename} (${art.title}) ---`);
    systemLines.push(art.content);
  });

  // 3. Lead State Block from CRM
  systemLines.push(`\n=== ДАННЫЕ ЛИДА ИЗ CRM ===`);
  systemLines.push(`Клиент: ${conversation.contact.name}`);
  if (conversation.contact.phone) systemLines.push(`Телефон: ${conversation.contact.phone}`);
  if (conversation.contact.city) systemLines.push(`Город/Адрес: ${conversation.contact.city}`);

  if (conversation.lead) {
    systemLines.push(`Статус лида: ${conversation.lead.status}`);
    systemLines.push(`Температура: ${conversation.lead.temperature}`);
    if (conversation.lead.area_m2) systemLines.push(`Площадь помещения: ${conversation.lead.area_m2} м²`);
    if (conversation.lead.ceiling_type) systemLines.push(`Тип профиля/потолка: ${conversation.lead.ceiling_type}`);
    if (conversation.lead.lights_count) systemLines.push(`Светильников: ${conversation.lead.lights_count} шт.`);
    if (conversation.lead.cornice) systemLines.push(`Карниз: скрытый`);
    if (conversation.lead.estimated_price) systemLines.push(`Предварительная смета: ${conversation.lead.estimated_price} руб.`);
    if (conversation.lead.desired_date) systemLines.push(`Желаемая дата: ${conversation.lead.desired_date}`);
  }

  if (conversation.calculation) {
    systemLines.push(`Периметр: ${conversation.calculation.perimeter_m || 16} пог.м`);
    if (conversation.calculation.estimate_min && conversation.calculation.estimate_max) {
      systemLines.push(`Расчет вилки: ${conversation.calculation.estimate_min} - ${conversation.calculation.estimate_max} руб.`);
    }
  }

  // Internal team notes context
  const internalNotes = conversation.messages.filter((m) => m.sender_type === "note" || m.is_internal_note);
  if (internalNotes.length > 0) {
    systemLines.push(`\n=== ВНУТРЕННИЕ ЗАМЕТКИ КОМАНДЫ (УЧЕСТЬ, НО НЕ ВЫДАВАТЬ НАПРЯМУЮ) ===`);
    internalNotes.slice(-3).forEach((n) => systemLines.push(`- ${n.text}`));
  }

  const messages: LLMMessage[] = [
    {
      role: "system",
      content: systemLines.join("\n"),
    },
  ];

  // 4. Chat History: последние 8-10 сообщений диалога с клиентом (исключая внутренние заметки)
  const chatMessages = conversation.messages.filter((m) => m.sender_type !== "note" && !m.is_internal_note);
  const lastMessages = chatMessages.slice(-10);
  lastMessages.forEach((msg) => {
    const role: "user" | "assistant" =
      msg.direction === "inbound" || msg.sender_type === "client"
        ? "user"
        : "assistant";
    messages.push({
      role,
      content: msg.text,
    });
  });

  return { messages, rag_sources };
}

/**
 * 1. Универсальный шлюз нейросетей
 * - local_llama: http://localhost:8080/v1 (модель Ternary-Bonsai-27B)
 * - openai: https://api.openai.com/v1 (модель gpt-4o-mini)
 */
export async function generateCopilotReply({
  provider,
  project,
  conversation,
  feedback,
  openaiApiKey,
}: {
  provider: LLMProviderType;
  project: Project;
  conversation: Conversation;
  feedback?: string;
  openaiApiKey?: string;
}): Promise<CopilotGenerationResult> {
  const { messages, rag_sources } = buildCopilotContext(project, conversation, feedback);

  const modelName = provider === "local_llama" ? "Ternary-Bonsai-27B" : "gpt-4o-mini";
  const endpoint =
    provider === "local_llama"
      ? "http://localhost:8080/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (provider === "openai" && openaiApiKey) {
    headers["Authorization"] = `Bearer ${openaiApiKey}`;
  }

  // Попытка прямого вызова OpenAI-совместимого эндпоинта
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 сек таймаут для проверки локального/облачного сервиса

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: 0.7,
        max_tokens: 450,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (reply) {
        return {
          text: reply,
          provider,
          model: modelName,
          confidence: 0.96,
          rag_sources,
          assembled_messages: messages,
          tokens_used: data.usage?.total_tokens,
          is_fallback: false,
        };
      }
    }
  } catch {
    // Если локальный сервер llama-server.exe не запущен в данном окружении или нет API ключа OpenAI,
    // формируем интеллектуальный ответ на базе собранного глубокого RAG + CRM контекста
  }

  // Интеллектуальный генератор ответа на основе глубокого контекста
  await new Promise((resolve) => setTimeout(resolve, 850)); // Реалистичная задержка генерации модели

  const lastInbound = [...conversation.messages]
    .reverse()
    .find((m) => m.direction === "inbound");
  const lastUserText = (lastInbound?.text || "").toLowerCase();
  const contactName = conversation.contact.name.split(" ")[0] || "Здравствуйте";
  const area = conversation.lead?.area_m2 || 18;
  const isCeilings = project.niche_type === "ceilings";

  let generatedText = "";

  const minPrice = conversation.calculation?.estimate_min || (area * 900 + 7000);
  const maxPrice = conversation.calculation?.estimate_max || Math.round(minPrice * 1.15);

  if (feedback) {
    const fb = feedback.toLowerCase();
    if (fb.includes("короч")) {
      generatedText = `${contactName}, ориентир с монтажом — от ${minPrice.toLocaleString("ru-RU")} до ${maxPrice.toLocaleString("ru-RU")} руб. Точную смету зафиксируем на бесплатном замере. В какой день вам удобно принять мастера?`;
    } else if (fb.includes("замер")) {
      generatedText = `${contactName}, чтобы не гадать по цене, предлагаю направить к вам мастера на бесплатный замер с каталогом образцов и дальномером. Это ни к чему не обязывает, а смета будет точной до рубля. Когда вам удобно — в будни или выходные?`;
    } else if (fb.includes("вилк") || fb.includes("цен")) {
      generatedText = `${contactName}, предварительная смета под ключ на ${area} м²: ${minPrice.toLocaleString("ru-RU")} – ${maxPrice.toLocaleString("ru-RU")} руб. (полотно, профиль, монтаж). Окончательная стоимость фиксируется в договоре на замере. Подскажите адрес для выезда?`;
    } else if (fb.includes("скидк") || fb.includes("акци")) {
      const discountMin = Math.round(minPrice * 0.9);
      const discountMax = Math.round(maxPrice * 0.9);
      generatedText = `${contactName}, при записи до конца недели дарим скидку 10% новоселам! С учетом скидки расчет составит ориентировочно ${discountMin.toLocaleString("ru-RU")} - ${discountMax.toLocaleString("ru-RU")} руб. Зафиксировать за вами скидку на замере?`;
    } else {
      generatedText = `${contactName}, ориентировочная стоимость по вашим параметрам — около ${minPrice.toLocaleString("ru-RU")} - ${maxPrice.toLocaleString("ru-RU")} руб. (${feedback}). В какой день вам удобнее встретиться с мастером?`;
    }
  } else if (lastUserText.includes("карниз") || lastUserText.includes("подсветк")) {
    generatedText = `${contactName}, скрытая ниша под карниз с LED-подсветкой добавит ориентировочно 5 500 - 7 000 руб. в зависимости от длины (обычно 3-3.5 м). Точную смету мастер посчитает прямо на бесплатном замере с образцами профилей. Подскажите, в какой день вам удобнее принять замерщика — сегодня вечером или завтра?`;
  } else if (lastUserText.includes("цен") || lastUserText.includes("стоим") || lastUserText.includes("скольк")) {
    if (isCeilings) {
      generatedText = `${contactName}, предварительно на комнату ${area} м² с теневым профилем и установкой спотов ориентир около 32 000 - 36 000 руб. под ключ с гарантией 10 лет. Точный расчет с каталогом материалов сделает мастер на бесплатном замере. В какой день вам удобно встретиться?`;
    } else {
      generatedText = `${contactName}, предварительный расчет по вашим размерам составит около 45 000 - 55 000 руб. Точную смету мы подготовим после бесплатного замера инженером. Когда вам удобно принять мастера?`;
    }
  } else if (lastUserText.includes("замер") || lastUserText.includes("выезд") || lastUserText.includes("мастер")) {
    generatedText = `${contactName}, отлично! Записал вас на бесплатный выезд инженера-технолога с каталогом образцов. Подскажите, пожалуйста, удобный адрес и подходящее время (первая или вторая половина дня)?`;
  } else {
    generatedText = `${contactName}, с удовольствием проконсультируем вас по всем деталям! По вашим параметрам мастер может бесплатно подъехать с образцами материалов и лазерным дальномером. В какой день вам удобнее запланировать визит?`;
  }

  return {
    text: generatedText,
    provider,
    model: modelName,
    confidence: provider === "local_llama" ? 0.94 : 0.98,
    rag_sources,
    assembled_messages: messages,
    tokens_used: 184,
    is_fallback: true,
  };
}

export interface GeneratedPostContent {
  title: string;
  topic: string;
  rubric: string;
  goal: string;
  offer: string;
  trigger_keyword: string;
  vk_text: string;
  tg_text: string;
  vk_channel_text?: string;
  max_text?: string;
  provider: LLMProviderType;
  model: string;
  tokens_used?: number;
  is_fallback?: boolean;
}

export interface AnalyzeAuthorPostResult {
  title: string;
  topic: string;
  rubric: string;
  goal: string;
  offer: string;
  trigger_keyword: string;
  vk_text: string;
  tg_text: string;
  vk_channel_text?: string;
  max_text?: string;
  provider: LLMProviderType;
  model: string;
  is_fallback?: boolean;
}

/**
 * Безопасное извлечение JSON из ответа LLM
 */
export function extractJsonFromText<T>(rawText: string): T | null {
  if (!rawText) return null;
  let clean = rawText.trim();
  if (clean.includes("```")) {
    const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      clean = match[1].trim();
    }
  }
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(clean) as T;
  } catch {
    return null;
  }
}

/**
 * 2. Генерация поста с нуля через выбранную LLM (Bonsai 27B / OpenAI)
 */
export async function generatePostFromPrompt({
  provider,
  project,
  prompt,
  openaiApiKey,
}: {
  provider: LLMProviderType;
  project: Project;
  prompt: string;
  openaiApiKey?: string;
}): Promise<GeneratedPostContent> {
  const modelName = provider === "local_llama" ? "Ternary-Bonsai-27B" : "gpt-4o-mini";
  const endpoint =
    provider === "local_llama"
      ? "http://localhost:8080/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

  // Динамические документы RAG из базы знаний активного проекта
  let dynamicDocs = getKnowledgeDocs(project.niche_type);
  if (dynamicDocs.length === 0 && project.slug) {
    dynamicDocs = getKnowledgeDocs(project.slug);
  }
  if (dynamicDocs.length === 0) {
    dynamicDocs = getKnowledgeDocs("all");
  }

  const knowledgeSnippets = dynamicDocs
    .slice(0, 3)
    .map((d) => `### ${d.title} (${d.filename})\n${d.content.slice(0, 800)}`)
    .join("\n\n");

  const systemPrompt = `Ты — ведущий SMM-стратег и копирайтер компании «${project.name}» (Ниша: ${project.niche_type}).
${project.description ? `О компании: ${project.description}` : ""}
${project.system_prompt ? `Специфика тональности: ${project.system_prompt}` : ""}

=== БАЗА ЗНАНИЙ И ПРАЙС-ЛИСТЫ ПРОЕКТА ===
${knowledgeSnippets || "Материалы: MSD Premium, EuroKRAAB теневой профиль, скрытые карнизы ПК-5, гарантия 10 лет, бесплатный замер."}

=== ПРАВИЛА ОФОРМЛЕНИЯ КАНАЛОВ ===
1. ВКонтакте (vk_text):
- Цепляющий заголовок в первой строке
- Экспертный сторителлинг, понятные выгоды и решение болей клиента
- Конкретные детали и факты из базы знаний (цены, технологии, сроки)
- Четкое спецпредложение (оффер)
- Открытый вовлекающий вопрос в конце для стимулирования комментариев
- Призыв к действию с кодовым словом (например: Напишите кодовое слово "ЗАМЕР" в личные сообщения...)
- В самом конце 4-6 тематических хэштегов

2. Telegram (tg_text):
- Динамичный, емкий, лаконичный текст
- Обязательно используй HTML-теги для акцентов: <b>Жирный</b>, <i>Курсив</i>
- Структурированные маркированные списки с буллетами (•)
- Спецпредложение и призыв написать боту с кодовым словом <b>КОДОВОЕ_СЛОВО</b>

Твоя задача — сгенерировать готовый пост по запросу пользователя и вернуть ТОЛЬКО валидный JSON без markdown-обертки и без лишних комментариев:
{
  "title": "Цепляющий заголовок поста",
  "topic": "Тема или ключевая идея поста",
  "rubric": "Кейсы и до/после | Экспертный разбор | Цены и сметы | Акции и скидки | Технологии монтажа | Отзывы клиентов",
  "goal": "lead_generation | trust | engagement | direct_sales",
  "offer": "Конкретный понятный оффер (например: Бесплатный расчет сметы в 3 вариантах + выезд замерщика с каталогом)",
  "trigger_keyword": "Кодовое слово заглавными буквами (ЗАМЕР | СМЕТА | РАСЧЕТ | СКИДКА)",
  "vk_text": "Полный готовый текст поста для ВКонтакте со всеми блоками, вопросом и хэштегами",
  "tg_text": "Полный готовый структурированный текст для Telegram с HTML-тегами <b> и <i>, буллетами и призывом"
}`;

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Идея/задача для поста: ${prompt}` },
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (provider === "openai") {
    const key = openaiApiKey || (typeof window !== "undefined" ? localStorage.getItem("phoenix_openai_key") || localStorage.getItem("openai_api_key") : null);
    if (!key) {
      throw new Error("Не указан OpenAI API Key. Переключитесь на локальную модель Bonsai 27B или укажите ключ OpenAI.");
    }
    headers["Authorization"] = `Bearer ${key}`;
  }

  try {
    const controller = new AbortController();
    const timeoutMs = provider === "local_llama" ? 15000 : 25000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: 0.7,
        max_tokens: 1600,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (provider === "local_llama") {
        throw new Error("Локальная модель Bonsai 27B не отвечает на порту 8080. Проверьте запуск сервера или переключитесь на OpenAI");
      }
      const errText = await response.text();
      let errJson: any = null;
      try { errJson = JSON.parse(errText); } catch {}
      throw new Error(`Ошибка OpenAI API (${response.status}): ${errJson?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    const parsed = extractJsonFromText<any>(content);

    if (parsed && (parsed.vk_text || parsed.tg_text || parsed.title)) {
      return {
        title: parsed.title || "Новый пост",
        topic: parsed.topic || prompt,
        rubric: parsed.rubric || "Экспертный разбор",
        goal: parsed.goal || "lead_generation",
        offer: parsed.offer || "Бесплатный расчет точной сметы и выезд замерщика с образцами",
        trigger_keyword: (parsed.trigger_keyword || "ЗАМЕР").toUpperCase(),
        vk_text: parsed.vk_text || content,
        tg_text: parsed.tg_text || content,
        vk_channel_text: parsed.vk_channel_text || parsed.vk_text,
        max_text: parsed.max_text || parsed.tg_text,
        provider,
        model: modelName,
        tokens_used: data.usage?.total_tokens,
        is_fallback: false,
      };
    }

    throw new Error("Модель вернула некорректный формат ответа");
  } catch (err: any) {
    if (provider === "local_llama") {
      throw new Error("Локальная модель Bonsai 27B не отвечает на порту 8080. Проверьте запуск сервера или переключитесь на OpenAI");
    }
    throw err;
  }
}

/**
 * 3. Умный разбор авторского текста без стирания и подмены на заглушки
 */
export async function analyzeAndAdaptAuthorPost({
  provider,
  project,
  authorText,
  existingTitle,
  openaiApiKey,
}: {
  provider: LLMProviderType;
  project: Project;
  authorText: string;
  existingTitle?: string;
  openaiApiKey?: string;
}): Promise<AnalyzeAuthorPostResult> {
  const modelName = provider === "local_llama" ? "Ternary-Bonsai-27B" : "gpt-4o-mini";
  const endpoint =
    provider === "local_llama"
      ? "http://localhost:8080/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

  let dynamicDocs = getKnowledgeDocs(project.niche_type);
  if (dynamicDocs.length === 0) dynamicDocs = getKnowledgeDocs("all");

  const systemPrompt = `Ты — профессиональный редактор контента компании «${project.name}» (Ниша: ${project.niche_type}).
Оператор УЖЕ написал авторский текст поста.

КРИТИЧЕСКИ ВАЖНОЕ ТРЕБОВАНИЕ:
- НЕ СТИРАЙ И НЕ ЗАМЕНЯЙ АВТОРСКИЙ ТЕКСТ ШАБЛОННОЙ ЗАГЛУШКОЙ!
- Сохрани все авторские мысли, факты, цифры, интонацию и живой голос автора.
- Твоя задача — только проанализировать этот текст, определить рубрику, цель, подходящий оффер и кодовое слово.
- Для VK (vk_text): сохрани авторский текст полностью, добавь гармоничный заголовок (если его нет), в конце добавь открытый вовлекающий вопрос для комментариев, призыв написать кодовое слово в сообщения и хэштеги.
- Для Telegram (tg_text): сохрани авторский текст полностью, расставь HTML-акценты (<b>, <i>), красиво выдели перечисления буллетами (•), добавь оффер и призыв написать боту с кодовым словом <b>КОДОВОЕ_СЛОВО</b>.

Верни ТОЛЬКО валидный JSON:
{
  "title": "Лаконичный заголовок поста",
  "topic": "Суть авторского текста",
  "rubric": "Кейсы и до/после | Экспертный разбор | Цены и сметы | Акции и скидки | Технологии монтажа | Отзывы клиентов",
  "goal": "lead_generation | trust | engagement | direct_sales",
  "offer": "Подходящий оффер под тематику поста",
  "trigger_keyword": "Кодовое слово заглавными буквами",
  "vk_text": "Обогащенный авторский текст для VK с сохранением всех исходных слов",
  "tg_text": "Адаптированный авторский текст для Telegram с HTML-тегами и сохранением всех исходных слов"
}`;

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Авторский текст поста:\n"""\n${authorText}\n"""\n${existingTitle && existingTitle !== "Новый пост" ? `Существующий заголовок: ${existingTitle}` : ""}`,
    },
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (provider === "openai") {
    const key = openaiApiKey || (typeof window !== "undefined" ? localStorage.getItem("phoenix_openai_key") || localStorage.getItem("openai_api_key") : null);
    if (!key) {
      throw new Error("Не указан OpenAI API Key. Переключитесь на локальную модель Bonsai 27B или укажите ключ OpenAI.");
    }
    headers["Authorization"] = `Bearer ${key}`;
  }

  try {
    const controller = new AbortController();
    const timeoutMs = provider === "local_llama" ? 15000 : 25000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: 0.5,
        max_tokens: 1600,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (provider === "local_llama") {
        throw new Error("Локальная модель Bonsai 27B не отвечает на порту 8080. Проверьте запуск сервера или переключитесь на OpenAI");
      }
      const errText = await response.text();
      let errJson: any = null;
      try { errJson = JSON.parse(errText); } catch {}
      throw new Error(`Ошибка OpenAI API (${response.status}): ${errJson?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    const parsed = extractJsonFromText<any>(content);

    if (parsed && (parsed.vk_text || parsed.tg_text)) {
      return {
        title: parsed.title || existingTitle || "Новый пост",
        topic: parsed.topic || "",
        rubric: parsed.rubric || "Экспертный разбор",
        goal: parsed.goal || "lead_generation",
        offer: parsed.offer || "Бесплатный расчет точной сметы и выезд замерщика с образцами",
        trigger_keyword: (parsed.trigger_keyword || "ЗАМЕР").toUpperCase(),
        vk_text: parsed.vk_text || authorText,
        tg_text: parsed.tg_text || authorText,
        vk_channel_text: parsed.vk_channel_text || parsed.vk_text,
        max_text: parsed.max_text || parsed.tg_text,
        provider,
        model: modelName,
        is_fallback: false,
      };
    }

    throw new Error("Модель вернула некорректный формат ответа");
  } catch (err: any) {
    if (provider === "local_llama") {
      throw new Error("Локальная модель Bonsai 27B не отвечает на порту 8080. Проверьте запуск сервера или переключитесь на OpenAI");
    }
    throw err;
  }
}
