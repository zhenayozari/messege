import { Conversation, Contact, Lead, Message, ChannelType, AiSuggestion } from "../types";

export const TELEGRAM_GATEWAY_URL = "https://feniks-tg-proxy.rabota2x97.workers.dev";
export const DEFAULT_TELEGRAM_BOT_TOKEN = "8809553443:AAFtT4HoI_dk0bhdGhaISNBnOEDGIYkF3UU";
export const DEFAULT_TELEGRAM_CHANNEL_ID = "-1003840149202";
const TG_TOKEN_STORAGE_KEY = "phoenix_tg_token";
const TG_OFFSET_STORAGE_KEY = "phoenix_tg_offset";
const TG_CHANNEL_STORAGE_KEY = "phoenix_tg_channel_id";
const TG_MANAGER_CHAT_STORAGE_KEY = "phoenix_tg_manager_chat_id";
const TG_LAST_USER_CHAT_STORAGE_KEY = "phoenix_tg_last_user_chat_id";

export interface TelegramBotInfo {
  id?: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
}

export interface TelegramBotState {
  isConfigured: boolean;
  isOnline: boolean;
  botUsername: string | null;
  botName: string | null;
  lastCheckAt: string | null;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  syncedMessagesCount: number;
}

/**
 * Получение текущего токена бота (из localStorage или дефолтный)
 */
export function getTelegramToken(): string {
  if (typeof window === "undefined") return DEFAULT_TELEGRAM_BOT_TOKEN;
  const stored = localStorage.getItem(TG_TOKEN_STORAGE_KEY);
  return (stored && stored.trim()) ? stored.trim() : DEFAULT_TELEGRAM_BOT_TOKEN;
}

/**
 * Сохранение нового токена бота
 */
export function setTelegramToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TG_TOKEN_STORAGE_KEY, token.trim());
}

/**
 * Авто-нормализация ID канала Telegram:
 * - Если передан @username (например, @channel), сохраняет как есть.
 * - Если передан числовой ID канала без префикса -100 (например, -3840149202 или 3840149202),
 *   автоматически форматирует его в правильный формат: "-100" + id.replace(/^-100|^-/, '')
 */
export function normalizeTelegramChannelId(channelInput: string | number | null | undefined): string {
  if (channelInput === null || channelInput === undefined) return DEFAULT_TELEGRAM_CHANNEL_ID;
  const str = String(channelInput).trim();
  if (!str) return DEFAULT_TELEGRAM_CHANNEL_ID;

  // Если указан публичный юзернейм канала (@channel_name)
  if (str.startsWith("@")) {
    return str;
  }

  // Убираем текстовые префиксы, если переданы
  const cleaned = str.replace(/^(tg-channel-|channel-|tg-)/i, "").trim();
  if (cleaned.startsWith("@")) {
    return cleaned;
  }

  // Если это числовой ID (с минусом или без, с -100 или без)
  // Форматируем по требованию: "-100" + id.replace(/^-100|^-/, '')
  const pureDigits = cleaned.replace(/^-100|^-/, "");
  if (/^\d+$/.test(pureDigits)) {
    return `-100${pureDigits}`;
  }

  return cleaned;
}

/**
 * Получение ID или @username канала для публикаций
 */
export function getTelegramChannelId(): string {
  if (typeof window === "undefined") return DEFAULT_TELEGRAM_CHANNEL_ID;
  const stored = localStorage.getItem(TG_CHANNEL_STORAGE_KEY);
  if (stored !== null && stored.trim() !== "" && stored.trim() !== "@feniks_potolki_channel") {
    return normalizeTelegramChannelId(stored.trim());
  }
  return DEFAULT_TELEGRAM_CHANNEL_ID;
}

/**
 * Сохранение ID или @username канала для публикаций
 */
export function setTelegramChannelId(channelId: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeTelegramChannelId(channelId);
  localStorage.setItem(TG_CHANNEL_STORAGE_KEY, normalized);
}

/**
 * Получение ID чата руководителя (персональный чат или fallback на Telegram-канал)
 */
export function getTelegramManagerChatId(): string {
  if (typeof window === "undefined") return DEFAULT_TELEGRAM_CHANNEL_ID;
  const stored = localStorage.getItem(TG_MANAGER_CHAT_STORAGE_KEY);
  if (stored && stored.trim()) return cleanTelegramChatId(stored.trim());

  // Если руководитель еще не ввел персональный chat_id вручную, проверяем последний приватный чат
  const lastUserChat = localStorage.getItem(TG_LAST_USER_CHAT_STORAGE_KEY);
  if (lastUserChat && lastUserChat.trim()) return cleanTelegramChatId(lastUserChat.trim());

  // Fallback: Telegram канал оповещений
  return getTelegramChannelId();
}

/**
 * Сохранение ID чата руководителя
 */
export function setTelegramManagerChatId(chatId: string): void {
  if (typeof window === "undefined") return;
  const cleaned = cleanTelegramChatId(chatId);
  localStorage.setItem(TG_MANAGER_CHAT_STORAGE_KEY, cleaned);
}

/**
 * Сброс оффсета для повторной вычитки сообщений (если нужно перепроверить историю)
 */
export function resetTelegramOffset(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TG_OFFSET_STORAGE_KEY);
}

/**
 * Извлечение ЧИСТОГО числового Telegram ID пользователя
 * Убирает любые префиксы вроде "tg-", "vk-", "contact-tg-", "conv-tg-", "tg-chat-" или UUID диалога.
 * Пример: если передано "tg-550839624" -> возвращает "550839624".
 */
export function cleanTelegramChatId(chatId: string | number | null | undefined): string {
  if (chatId === null || chatId === undefined) return "";
  let str = String(chatId).trim();
  if (!str) return "";

  // Если это канал (@channel или отрицательный числовой ID -100...)
  if (str.startsWith("@")) {
    return str;
  }
  if (str.startsWith("-100")) {
    return str;
  }
  if (str.startsWith("-")) {
    return normalizeTelegramChannelId(str);
  }

  // 1. Очистка от известных префиксов системы
  str = str
    .replace(/^contact-tg-/, "")
    .replace(/^conv-tg-/, "")
    .replace(/^lead-tg-/, "")
    .replace(/^tg-chat-/, "")
    .replace(/^tg-/, "")
    .replace(/^vk-chat-/, "")
    .replace(/^vk-/, "")
    .replace(/^chat-/, "")
    .replace(/^user-/, "")
    .trim();

  // 2. Если строка уже состоит только из цифр
  if (/^\d+$/.test(str)) {
    return str;
  }

  // 3. Извлечение цифр Telegram ID из конца составных UUID (например, conv-01-550839624)
  const trailingDigits = str.match(/(\d{6,})$/);
  if (trailingDigits) {
    return trailingDigits[1];
  }

  // 4. Поиск любой последовательности цифр от 5 знаков
  const anyDigits = str.match(/\d{5,}/);
  if (anyDigits) {
    return anyDigits[0];
  }

  return str;
}

/**
 * Формирование публичной ссылки на пост в Telegram
 */
export function buildTelegramPostUrl(channelId: string, messageId?: number): string | undefined {
  if (!messageId) return undefined;
  const clean = normalizeTelegramChannelId(channelId);
  if (clean.startsWith("@")) {
    return `https://t.me/${clean.replace(/^@/, "")}/${messageId}`;
  }
  if (clean.startsWith("-100")) {
    return `https://t.me/c/${clean.replace("-100", "")}/${messageId}`;
  }
  if (/^\d+$/.test(clean)) {
    return `https://t.me/c/${clean}/${messageId}`;
  }
  return `https://t.me/${clean}/${messageId}`;
}

/**
 * Проверка доступности бота через метод getMe
 */
export async function checkTelegramBotStatus(): Promise<{
  ok: boolean;
  info?: TelegramBotInfo;
  error?: string;
}> {
  const token = getTelegramToken();
  if (!token) {
    return { ok: false, error: "Токен бота не задан" };
  }

  try {
    const res = await fetch(`${TELEGRAM_GATEWAY_URL}/bot${token}/getMe`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const data = await res.json();
    if (data && data.ok && data.result) {
      return { ok: true, info: data.result };
    }
    return { ok: false, error: data.description || "Бот не ответил на getMe" };
  } catch (err: any) {
    return { ok: false, error: err.message || "Сетевая ошибка при проверке бота" };
  }
}

/**
 * Отправка сообщения от лица оператора в чат клиента или Telegram-канал
 */
export async function sendTelegramMessageDirect(
  chatId: string | number,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<{ ok: boolean; messageId?: number; postUrl?: string; error?: string }> {
  const token = getTelegramToken();
  if (!token) {
    const err = "Токен бота Telegram не настроен";
    console.error("Telegram API Error: " + err);
    return { ok: false, error: "Telegram API Error: " + err };
  }

  const cleanChatId = cleanTelegramChatId(chatId);
  if (!cleanChatId) {
    const err = "Не указан или некорректен chat_id получателя";
    console.error("Telegram API Error: " + err);
    return { ok: false, error: "Telegram API Error: " + err };
  }

  // Попытка 1: с форматированием (HTML)
  try {
    const res = await fetch(`${TELEGRAM_GATEWAY_URL}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: text,
        parse_mode: parseMode,
      }),
    });

    const data = await res.json();
    if (data && data.ok && data.result) {
      const msgId = data.result.message_id;
      return {
        ok: true,
        messageId: msgId,
        postUrl: buildTelegramPostUrl(cleanChatId, msgId),
      };
    }

    // Если ошибка парсинга HTML/Markdown сущностей, пробуем отправить без parse_mode как чистый текст
    if (data?.description && /can't parse entities|tag|entity/i.test(data.description)) {
      const fallbackRes = await fetch(`${TELEGRAM_GATEWAY_URL}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: text,
        }),
      });
      const fallbackData = await fallbackRes.json();
      if (fallbackData && fallbackData.ok && fallbackData.result) {
        const msgId = fallbackData.result.message_id;
        return {
          ok: true,
          messageId: msgId,
          postUrl: buildTelegramPostUrl(cleanChatId, msgId),
        };
      }
      const desc = fallbackData?.description || "Ошибка отправки текста в Telegram";
      console.error("Telegram API Error: " + desc, fallbackData);
      return {
        ok: false,
        error: "Telegram API Error: " + desc,
      };
    }

    const desc = data?.description || "Не удалось отправить сообщение в Telegram";
    console.error("Telegram API Error: " + desc, data);
    return {
      ok: false,
      error: "Telegram API Error: " + desc,
    };
  } catch (err: any) {
    const desc = err.message || "Ошибка соединения с Telegram API";
    console.error("Telegram API Error: " + desc, err);
    return { ok: false, error: "Telegram API Error: " + desc };
  }
}

// In-memory cache for Telegram media blobs: filePath/URL -> blobUrl
const mediaBlobCache = new Map<string, string>();

/**
 * Получение пути к локальному прокси бэкенда для обхода блокировок и ERR_CONNECTION_TIMED_OUT
 */
export function getProxyMediaUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("/api/media/file") || url.startsWith("blob:")) return url;
  return `/api/media/file?url=${encodeURIComponent(url)}`;
}

/**
 * Очистка кеша медиа-блобов
 */
export function clearTelegramMediaCache(): void {
  mediaBlobCache.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      //
    }
  });
  mediaBlobCache.clear();
}

/**
 * Получение информации о файле (file_path и прямая ссылка) через метод getFile
 */
export async function getTelegramFileInfo(
  fileId: string
): Promise<{ directUrl: string; filePath: string } | null> {
  const token = getTelegramToken();
  if (!token || !fileId) return null;
  try {
    const res = await fetch(
      `${TELEGRAM_GATEWAY_URL}/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
    );
    const data = await res.json();
    if (data?.ok && data.result?.file_path) {
      const filePath = data.result.file_path;
      return {
        filePath,
        directUrl: `${TELEGRAM_GATEWAY_URL}/file/bot${token}/${filePath}`,
      };
    }
  } catch (err) {
    console.warn("Telegram getFile error:", err);
  }
  return null;
}

/**
 * Получение прямой ссылки на скачивание/просмотр файла Telegram через getFile
 */
export async function getTelegramFileDirectUrl(fileId: string): Promise<string | null> {
  const info = await getTelegramFileInfo(fileId);
  return info ? info.directUrl : null;
}

/**
 * Надежная загрузка медиа через Blob:
 * - Делает fetch к TELEGRAM_GATEWAY_URL/file/bot<TOKEN>/<filePath> (или полному URL) с таймаутом
 * - При ошибке сети (ERR_CONNECTION_TIMED_OUT) или блокировке автоматически переключается на локальный прокси бэкенда (/api/media/file?url=...)
 * - Получает бинарный response.blob() с корректным MIME-типом (image/jpeg, video/mp4, audio/ogg, application/pdf и др.)
 * - Создает локальный URL через URL.createObjectURL(blob)
 * - Кеширует этот blob-URL в памяти
 */
export async function downloadTelegramMediaBlob(
  filePath: string,
  mediaType?: Message["media_type"] | string,
  forceRefresh: boolean = false
): Promise<string | null> {
  if (!filePath) return null;
  if (filePath.startsWith("blob:")) return filePath;

  const cacheKey = filePath.trim();
  if (!forceRefresh && mediaBlobCache.has(cacheKey)) {
    return mediaBlobCache.get(cacheKey)!;
  }

  const token = getTelegramToken();
  let fetchUrl = filePath;

  if (!filePath.startsWith("http://") && !filePath.startsWith("https://")) {
    if (!token) {
      console.warn("Telegram Bot Token is not configured for downloading media blob");
      return null;
    }
    const cleanPath = filePath.replace(/^\/+/, "");
    fetchUrl = `${TELEGRAM_GATEWAY_URL}/file/bot${token}/${cleanPath}`;
  } else if (fetchUrl.includes("api.telegram.org")) {
    fetchUrl = fetchUrl.replace("https://api.telegram.org", TELEGRAM_GATEWAY_URL).replace("http://api.telegram.org", TELEGRAM_GATEWAY_URL);
  }

  let rawBlob: Blob | null = null;

  // 1. Попытка прямой загрузки с таймаутом (7 секунд)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(fetchUrl, {
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      rawBlob = await res.blob();
    } else {
      console.warn(`Direct Telegram media fetch returned status ${res.status}: ${fetchUrl}`);
    }
  } catch (directErr: any) {
    console.warn("Direct Telegram media fetch failed (timeout/CORS/network):", directErr?.message || directErr);
  }

  // 2. Fallback: Загрузка через локальный бэкенд-прокси /api/media/file?url=...
  if (!rawBlob && typeof window !== "undefined") {
    try {
      const proxyUrl = getProxyMediaUrl(fetchUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const proxyRes = await fetch(proxyUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (proxyRes.ok) {
        rawBlob = await proxyRes.blob();
      } else {
        console.warn(`Backend proxy media fetch failed with status ${proxyRes.status}`);
      }
    } catch (proxyErr: any) {
      console.warn("Backend proxy media fetch failed:", proxyErr?.message || proxyErr);
    }
  }

  if (!rawBlob) {
    return null;
  }

  try {
    // Определение точного MIME-типа для видео, фото, аудио и документов
    let targetMimeType = rawBlob.type;
    const lowerPath = filePath.toLowerCase();

    // Видео форматы (.mp4, .mov, .webm, video, video_note, animation)
    if (
      mediaType === "video" ||
      mediaType === "video_note" ||
      mediaType === "animation" ||
      lowerPath.endsWith(".mp4") ||
      lowerPath.endsWith(".m4v")
    ) {
      targetMimeType = "video/mp4";
    } else if (lowerPath.endsWith(".webm")) {
      targetMimeType = "video/webm";
    } else if (lowerPath.endsWith(".mov")) {
      targetMimeType = "video/quicktime";
    }
    // Фото форматы (.jpg, .jpeg, .png, .webp, .gif)
    else if (mediaType === "photo" || lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
      targetMimeType = "image/jpeg";
    } else if (lowerPath.endsWith(".png")) {
      targetMimeType = "image/png";
    } else if (lowerPath.endsWith(".webp")) {
      targetMimeType = "image/webp";
    } else if (lowerPath.endsWith(".gif")) {
      targetMimeType = "image/gif";
    }
    // Голосовые и аудио форматы (.oga, .ogg, .mp3, voice)
    else if (mediaType === "voice" || lowerPath.endsWith(".oga") || lowerPath.endsWith(".ogg")) {
      targetMimeType = "audio/ogg";
    } else if (lowerPath.endsWith(".mp3")) {
      targetMimeType = "audio/mp3";
    }
    // Документы
    else if (lowerPath.endsWith(".pdf") || (mediaType === "document" && lowerPath.includes(".pdf"))) {
      targetMimeType = "application/pdf";
    } else if (lowerPath.endsWith(".doc") || lowerPath.endsWith(".docx")) {
      targetMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (lowerPath.endsWith(".xls") || lowerPath.endsWith(".xlsx")) {
      targetMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else if (lowerPath.endsWith(".zip")) {
      targetMimeType = "application/zip";
    }

    if (!targetMimeType || targetMimeType === "application/octet-stream") {
      if (mediaType === "photo") targetMimeType = "image/jpeg";
      else if (mediaType === "voice") targetMimeType = "audio/ogg";
      else if (mediaType === "video_note" || mediaType === "video" || mediaType === "animation") targetMimeType = "video/mp4";
      else if (mediaType === "document") targetMimeType = "application/octet-stream";
    }

    const typedBlob = new Blob([rawBlob], {
      type: targetMimeType || "application/octet-stream",
    });
    const blobUrl = URL.createObjectURL(typedBlob);

    mediaBlobCache.set(cacheKey, blobUrl);
    if (fetchUrl !== cacheKey) {
      mediaBlobCache.set(fetchUrl, blobUrl);
    }

    return blobUrl;
  } catch (err) {
    console.warn("downloadTelegramMediaBlob processing error:", err);
    return null;
  }
}

/**
 * Отправка фотографии в Telegram-канал или чат (sendPhoto с поддержкой File / Blob / URL и подписью caption)
 */
export async function sendTelegramPhotoDirect(
  chatId: string | number,
  photo: File | Blob | string,
  caption?: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<{ ok: boolean; messageId?: number; postUrl?: string; error?: string }> {
  const token = getTelegramToken();
  if (!token) {
    const err = "Токен бота Telegram не настроен";
    console.error("Telegram API Error: " + err);
    return { ok: false, error: "Telegram API Error: " + err };
  }

  const cleanChatId = cleanTelegramChatId(chatId);
  if (!cleanChatId) {
    const err = "Не указан или некорректен chat_id получателя";
    console.error("Telegram API Error: " + err);
    return { ok: false, error: "Telegram API Error: " + err };
  }

  // Telegram caption limit is 1024 characters
  const trimmedCaption = caption ? caption.slice(0, 1020) : undefined;
  const isFile = typeof photo !== "string";

  // 1. Отправляем фото
  try {
    let res: Response;
    if (isFile) {
      const formData = new FormData();
      formData.append("chat_id", cleanChatId);
      formData.append("photo", photo, (photo as File).name || "photo.jpg");
      if (trimmedCaption) {
        formData.append("caption", trimmedCaption);
        formData.append("parse_mode", parseMode);
      }
      res = await fetch(`${TELEGRAM_GATEWAY_URL}/bot${token}/sendPhoto`, {
        method: "POST",
        body: formData,
      });
    } else {
      res = await fetch(`${TELEGRAM_GATEWAY_URL}/bot${token}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: cleanChatId,
          photo: photo,
          caption: trimmedCaption,
          parse_mode: parseMode,
        }),
      });
    }

    const data = await res.json();
    if (data && data.ok && data.result) {
      const msgId = data.result.message_id;
      return {
        ok: true,
        messageId: msgId,
        postUrl: buildTelegramPostUrl(cleanChatId, msgId),
      };
    }

    // Если ошибка сущностей в caption, пробуем без parse_mode
    if (data?.description && /can't parse entities|tag|entity/i.test(data.description)) {
      if (isFile) {
        const fallbackFd = new FormData();
        fallbackFd.append("chat_id", cleanChatId);
        fallbackFd.append("photo", photo, (photo as File).name || "photo.jpg");
        if (trimmedCaption) {
          fallbackFd.append("caption", trimmedCaption);
        }
        const fallbackRes = await fetch(`${TELEGRAM_GATEWAY_URL}/bot${token}/sendPhoto`, {
          method: "POST",
          body: fallbackFd,
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackData?.ok && fallbackData.result) {
          const msgId = fallbackData.result.message_id;
          return {
            ok: true,
            messageId: msgId,
            postUrl: buildTelegramPostUrl(cleanChatId, msgId),
          };
        }
      } else {
        const fallbackRes = await fetch(`${TELEGRAM_GATEWAY_URL}/bot${token}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: cleanChatId,
            photo: photo,
            caption: trimmedCaption,
          }),
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackData && fallbackData.ok && fallbackData.result) {
          const msgId = fallbackData.result.message_id;
          return {
            ok: true,
            messageId: msgId,
            postUrl: buildTelegramPostUrl(cleanChatId, msgId),
          };
        }
      }
    }

    // Если Telegram не может скачать фото по URL (например, локальный blob или 404), отправляем как текстовый пост
    if (!isFile && typeof photo === "string" && data?.description && /wrong file identifier|failed to get HTTP URL content|IMAGE_PROCESS_FAILED/i.test(data.description)) {
      const combinedText = caption ? `${caption}\n\n📷 [Фотография]: ${photo}` : `📷 [Фото]: ${photo}`;
      return await sendTelegramMessageDirect(cleanChatId, combinedText, parseMode);
    }

    const desc = data?.description || "Ошибка отправки фото в Telegram";
    console.error("Telegram API Error: " + desc, data);
    return {
      ok: false,
      error: "Telegram API Error: " + desc,
    };
  } catch (err: any) {
    const desc = err.message || "Ошибка соединения с Telegram API";
    console.error("Telegram API Error: " + desc, err);
    return { ok: false, error: "Telegram API Error: " + desc };
  }
}

/**
 * Отправка документа/PDF в Telegram (sendDocument с поддержкой FormData / File / Blob / URL)
 */
export async function sendTelegramDocumentDirect(
  chatId: string | number,
  document: File | Blob | string,
  fileName?: string,
  caption?: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<{ ok: boolean; messageId?: number; postUrl?: string; error?: string }> {
  const token = getTelegramToken();
  if (!token) {
    const err = "Токен бота Telegram не настроен";
    console.error("Telegram API Error: " + err);
    return { ok: false, error: "Telegram API Error: " + err };
  }

  const cleanChatId = cleanTelegramChatId(chatId);
  if (!cleanChatId) {
    const err = "Не указан или некорректен chat_id получателя";
    console.error("Telegram API Error: " + err);
    return { ok: false, error: "Telegram API Error: " + err };
  }

  const trimmedCaption = caption ? caption.slice(0, 1020) : undefined;
  const isFile = typeof document !== "string";

  try {
    let res: Response;
    if (isFile) {
      const formData = new FormData();
      formData.append("chat_id", cleanChatId);
      formData.append("document", document, fileName || (document as File).name || "document.pdf");
      if (trimmedCaption) {
        formData.append("caption", trimmedCaption);
        formData.append("parse_mode", parseMode);
      }
      res = await fetch(`${TELEGRAM_GATEWAY_URL}/bot${token}/sendDocument`, {
        method: "POST",
        body: formData,
      });
    } else {
      res = await fetch(`${TELEGRAM_GATEWAY_URL}/bot${token}/sendDocument`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: cleanChatId,
          document: document,
          caption: trimmedCaption,
          parse_mode: parseMode,
        }),
      });
    }

    const data = await res.json();
    if (data && data.ok && data.result) {
      const msgId = data.result.message_id;
      return {
        ok: true,
        messageId: msgId,
        postUrl: buildTelegramPostUrl(cleanChatId, msgId),
      };
    }

    // Если ошибка parse_mode, пробуем без parse_mode
    if (data?.description && /can't parse entities|tag|entity/i.test(data.description)) {
      if (isFile) {
        const fallbackFd = new FormData();
        fallbackFd.append("chat_id", cleanChatId);
        fallbackFd.append("document", document, fileName || (document as File).name || "document.pdf");
        if (trimmedCaption) {
          fallbackFd.append("caption", trimmedCaption);
        }
        const fallbackRes = await fetch(`${TELEGRAM_GATEWAY_URL}/bot${token}/sendDocument`, {
          method: "POST",
          body: fallbackFd,
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackData?.ok && fallbackData.result) {
          const msgId = fallbackData.result.message_id;
          return {
            ok: true,
            messageId: msgId,
            postUrl: buildTelegramPostUrl(cleanChatId, msgId),
          };
        }
      }
    }

    const desc = data?.description || "Ошибка отправки документа в Telegram";
    console.error("Telegram API Error: " + desc, data);
    return {
      ok: false,
      error: "Telegram API Error: " + desc,
    };
  } catch (err: any) {
    const desc = err.message || "Ошибка соединения с Telegram API";
    console.error("Telegram API Error: " + desc, err);
    return { ok: false, error: "Telegram API Error: " + desc };
  }
}

/**
 * Публикация готового поста в Telegram-канал (Автопостинг из Контента / Календаря)
 * С авто-нормализацией ID канала
 */
export async function publishPostToTelegramChannel(params: {
  text: string;
  mediaUrls?: string[];
  channelId?: string;
  title?: string;
}): Promise<{ ok: boolean; messageId?: number; postUrl?: string; error?: string }> {
  const rawChannel = params.channelId || getTelegramChannelId();
  const targetChannel = normalizeTelegramChannelId(rawChannel);
  if (!targetChannel || !targetChannel.trim()) {
    return {
      ok: false,
      error: "Не указан ID или @username Telegram-канала в настройках интеграции (например, -1003840149202)",
    };
  }

  const postText = (params.text && params.text.trim()) ? params.text.trim() : (params.title || "Новая публикация");

  // Если есть прикрепленное фото из Медиабиблиотеки
  if (params.mediaUrls && params.mediaUrls.length > 0 && params.mediaUrls[0]) {
    return await sendTelegramPhotoDirect(
      targetChannel,
      params.mediaUrls[0],
      postText,
      "HTML"
    );
  }

  // Если пост чисто текстовый
  return await sendTelegramMessageDirect(targetChannel, postText, "HTML");
}

/**
 * Псевдоним функции публикации в канал
 */
export const sendToChannel = publishPostToTelegramChannel;

/**
 * Отправка тестовой публикации в Telegram-канал для проверки прав администратора бота
 */
export async function sendTestPostToTelegramChannel(
  channelId?: string
): Promise<{ ok: boolean; messageId?: number; postUrl?: string; error?: string }> {
  const rawChannel = channelId || getTelegramChannelId();
  const targetChannel = normalizeTelegramChannelId(rawChannel);
  if (!targetChannel || !targetChannel.trim()) {
    return {
      ok: false,
      error: "Пожалуйста, введите @username или ID канала в поле выше перед отправкой теста",
    };
  }

  const testText = `🔥 <b>Тестовая публикация CRM «ФЕНИКС PRO»</b>

✅ Интеграция с Telegram-каналом успешно настроена и активна!
🤖 Бот обладает правами администратора и готов к публикации материалов из Контент-плана и Календаря.

📋 <b>Проверка параметров:</b>
• ID канала: <code>${targetChannel}</code>
• Дата и время: ${new Date().toLocaleString("ru-RU")}
• Режим публикации: Прямой автопостинг через Bot API
• Поддержка: Текст + Фотографии объектов

<i>Это автоматическое сервисное сообщение можно удалить из канала.</i>`;

  const samplePhoto = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80";

  const photoResult = await sendTelegramPhotoDirect(targetChannel, samplePhoto, testText, "HTML");
  if (photoResult.ok) {
    return photoResult;
  }

  // Fallback на текстовое сообщение, если ссылка на изображение недоступна
  return await sendTelegramMessageDirect(targetChannel, testText, "HTML");
}

/**
 * Отправка тревоги о простое диалога (>15 минут) руководителю в Telegram
 */
export async function sendTelegramAlarmAlert(params: {
  clientName: string;
  text: string;
  channel?: string;
  convId?: string;
  chatId?: string;
}): Promise<{ ok: boolean; messageId?: number; postUrl?: string; recipientChatId?: string; error?: string }> {
  const targetChatId = cleanTelegramChatId(params.chatId || getTelegramManagerChatId()) || getTelegramChannelId();
  if (!targetChatId) {
    return { ok: false, error: "Не указан chat_id получателя алерта (Telegram-канал или ID руководителя)" };
  }

  const channelLabel =
    params.channel === "vk" || params.channel === "vk_wall"
      ? "ВКонтакте"
      : params.channel === "telegram"
      ? "Telegram"
      : params.channel === "avito"
      ? "Авито"
      : params.channel === "max"
      ? "MAX Мессенджер"
      : params.channel || "Чат";

  const safeClient = (params.clientName || "Клиент").replace(/[<>&]/g, "");
  const safeText = (params.text || "Здравствуйте, хочу заказать потолок").replace(/[<>&]/g, "");

  const messageText = `⚠️ <b>ВНИМАНИЕ (Тест тревоги)!</b>\n\nКлиент <b>${safeClient}</b> (${channelLabel}) ожидает ответа 15 минут.\n\n💬 <b>Текст:</b> «${safeText}»\n\n⏱ <i>Статус: Время реакции превышено. Откройте диалог в CRM для оперативного ответа.</i>`;

  const res = await sendTelegramMessageDirect(targetChatId, messageText, "HTML");
  return {
    ...res,
    recipientChatId: targetChatId,
  };
}

/**
 * Отправка утренней сводки руководителю в Telegram
 */
export async function sendTelegramMorningSummary(params: {
  totalLeads: number;
  newLeads: number;
  hotLeads: number;
  measurements: number;
  estimateMin: number;
  estimateMax: number;
  conversionRate: string;
  channelStats: Record<string, number>;
  chatId?: string;
  projectName?: string;
}): Promise<{ ok: boolean; messageId?: number; postUrl?: string; recipientChatId?: string; error?: string }> {
  const targetChatId = cleanTelegramChatId(params.chatId || getTelegramManagerChatId()) || getTelegramChannelId();
  if (!targetChatId) {
    return { ok: false, error: "Не указан chat_id получателя сводки (Telegram-канал или ID руководителя)" };
  }

  const pName = params.projectName || "Феникс PRO";
  const minFormatted = params.estimateMin.toLocaleString("ru-RU");
  const maxFormatted = params.estimateMax.toLocaleString("ru-RU");

  const channelLines = Object.entries(params.channelStats)
    .filter(([_, count]) => count > 0)
    .map(([ch, count]) => {
      const label =
        ch === "telegram"
          ? "Telegram"
          : ch === "vk" || ch === "vk_wall"
          ? "ВКонтакте"
          : ch === "avito"
          ? "Авито"
          : ch === "max"
          ? "MAX"
          : ch;
      return `• ${label}: <b>${count}</b>`;
    })
    .join("\n") || "• Обращения в обработке";

  const now = new Date();
  const dateStr = now.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const summaryText = `☀️ <b>Утренняя сводка CRM «${pName}»</b>
📅 <i>${dateStr}</i>

📊 <b>Показатели воронки:</b>
• Всего обращений в базе: <b>${params.totalLeads}</b>
• Новых: <b>${params.newLeads}</b> | 🔥 Горячих: <b>${params.hotLeads}</b>
• Назначено замеров: <b>${params.measurements} 📐</b>
• Сумма смет в работе: <b>от ${minFormatted} до ${maxFormatted} ₽</b>
• Конверсия в замер: <b>${params.conversionRate}%</b>

📱 <b>Источники обращений:</b>
${channelLines}

⚡️ <i>Система контроля диалогов активна. Удачного рабочего дня!</i>`;

  const res = await sendTelegramMessageDirect(targetChatId, summaryText, "HTML");
  return {
    ...res,
    recipientChatId: targetChatId,
  };
}

/**
 * Запрос новых входящих сообщений (getUpdates) и их интеграция в стейт диалогов CRM
 */
export async function fetchTelegramUpdatesDirect(
  activeProjectId: string,
  existingConversations: Conversation[]
): Promise<{
  updatedConversations: Conversation[];
  newMessagesCount: number;
  botUsername: string;
  error?: string;
}> {
  const token = getTelegramToken();
  if (!token) {
    return {
      updatedConversations: existingConversations,
      newMessagesCount: 0,
      botUsername: "",
      error: "Токен бота не настроен",
    };
  }

  // 1. Получаем инфо о боте
  let botUsername = "feniks_smmBot";
  try {
    const meRes = await fetch(`${TELEGRAM_GATEWAY_URL}/bot${token}/getMe`);
    const meData = await meRes.json();
    if (meData?.ok && meData.result?.username) {
      botUsername = meData.result.username;
    }
  } catch {
    //
  }

  // 2. Читаем сохраненный оффсет
  let offset = 0;
  try {
    const savedOffset = localStorage.getItem(TG_OFFSET_STORAGE_KEY);
    if (savedOffset) {
      offset = parseInt(savedOffset, 10) || 0;
    }
  } catch {
    offset = 0;
  }

  // 3. Запрашиваем апдейты через Telegram Bot API
  let updates: any[] = [];
  try {
    const url = `${TELEGRAM_GATEWAY_URL}/bot${token}/getUpdates?offset=${offset}&limit=50&timeout=0`;
    const res = await fetch(url, { method: "GET" });
    const data = await res.json();
    if (data?.ok && Array.isArray(data.result)) {
      updates = data.result;
    } else if (!data?.ok) {
      return {
        updatedConversations: existingConversations,
        newMessagesCount: 0,
        botUsername,
        error: data?.description || "Ошибка получения обновлений Telegram",
      };
    }
  } catch (err: any) {
    return {
      updatedConversations: existingConversations,
      newMessagesCount: 0,
      botUsername,
      error: err.message || "Сетевая ошибка при опросе Telegram API",
    };
  }

  if (updates.length === 0) {
    return {
      updatedConversations: existingConversations,
      newMessagesCount: 0,
      botUsername,
    };
  }

  // 4. Обрабатываем полученные сообщения
  let conversationsMap = new Map<string, Conversation>();
  existingConversations.forEach((c) => {
    conversationsMap.set(c.id, { ...c, messages: [...c.messages] });
  });

  let newMessagesCount = 0;
  let maxUpdateId = offset;

  for (const update of updates) {
    if (typeof update.update_id === "number" && update.update_id >= maxUpdateId) {
      maxUpdateId = update.update_id + 1;
    }

    try {
      const tgMsg = update.message || update.channel_post || update.edited_message;
      if (!tgMsg) continue;

      const chat = tgMsg.chat;
      const from = tgMsg.from || chat;
      if (!chat || !chat.id) continue;

      // Если входящее сообщение от реального пользователя в ЛС боту, запоминаем его ID для алертов
      if (chat.type === "private" || (from && from.id && !from.is_bot)) {
        const uChatId = String(from?.id || chat.id);
        if (uChatId && !uChatId.startsWith("-")) {
          try {
            localStorage.setItem(TG_LAST_USER_CHAT_STORAGE_KEY, uChatId);
          } catch {
            //
          }
        }
      }

      const rawChatId = String(chat.id);
      const tgMsgId = `tg-${tgMsg.message_id}`;
      const msgDateIso = tgMsg.date
        ? new Date(tgMsg.date * 1000).toISOString()
        : new Date().toISOString();

      // Извлечение текста, подписи и вложений всех типов
      const caption = tgMsg.caption || null;
      let text = tgMsg.text || caption || "";
      let mediaType: Message["media_type"] = null;
      let mediaUrl: string | null = null;
      let blobUrl: string | null = null;
      let fileId: string | null = null;
      let filePath: string | null = null;
      let fileName: string | null = null;
      let fileSize: number | null = null;
      let durationSec: number | null = null;

      // 1. Фото (message.photo): берем последний элемент массива (максимальное качество)
      if (Array.isArray(tgMsg.photo) && tgMsg.photo.length > 0) {
        const bestPhoto = tgMsg.photo[tgMsg.photo.length - 1];
        fileId = bestPhoto.file_id;
        fileSize = bestPhoto.file_size || null;
        mediaType = "photo";
        if (!text) text = caption || "📷 Фотография";
      }
      // 2. Документ/PDF (message.document)
      else if (tgMsg.document) {
        fileId = tgMsg.document.file_id;
        fileName = tgMsg.document.file_name || "Документ.pdf";
        fileSize = tgMsg.document.file_size || null;
        mediaType = "document";
        if (!text) text = caption || `📄 Документ: ${fileName}`;
      }
      // 3. Голосовое сообщение (message.voice)
      else if (tgMsg.voice) {
        fileId = tgMsg.voice.file_id;
        durationSec = tgMsg.voice.duration || 15;
        fileSize = tgMsg.voice.file_size || null;
        mediaType = "voice";
        if (!text) text = caption || "🎤 Голосовое сообщение";
      }
      // 4. Видео-сообщение / кружок (message.video_note)
      else if (tgMsg.video_note) {
        fileId = tgMsg.video_note.file_id;
        durationSec = tgMsg.video_note.duration || 10;
        fileSize = tgMsg.video_note.file_size || null;
        mediaType = "video_note";
        if (!text) text = caption || "📹 Видеосообщение (кружок)";
      }
      // 5. Видео (message.video)
      else if (tgMsg.video) {
        fileId = tgMsg.video.file_id;
        durationSec = tgMsg.video.duration || 10;
        fileSize = tgMsg.video.file_size || null;
        fileName = tgMsg.video.file_name || "video.mp4";
        mediaType = "video";
        if (!text) text = caption || "🎥 Видео";
      }
      // 6. Текст без медиа
      else if (tgMsg.text) {
        text = tgMsg.text;
        mediaType = null;
      }

      // Если есть вложение, получаем file_path, прямую ссылку и локальный Blob-URL
      if (fileId) {
        try {
          const fileInfo = await getTelegramFileInfo(fileId);
          if (fileInfo) {
            filePath = fileInfo.filePath;
            mediaUrl = fileInfo.directUrl;
            // Фоновая надежная загрузка в локальный Blob для обхода CORS/ограничений браузера
            blobUrl = await downloadTelegramMediaBlob(fileInfo.filePath, mediaType || undefined);
          }
        } catch (e) {
          console.warn("Could not load Telegram media file info/blob:", e);
        }
      }

      if (!text) {
        text = "Входящее сообщение из Telegram";
      }

      // Ищем существующий диалог по external_chat_id
      let targetConv: Conversation | undefined;
      for (const c of conversationsMap.values()) {
        if (
          c.channel === "telegram" &&
          (c.external_chat_id === rawChatId ||
            c.external_chat_id === `tg-${rawChatId}` ||
            c.external_chat_id === `tg-chat-${rawChatId}`)
        ) {
          targetConv = c;
          break;
        }
      }

      const newInboundMessage: Message = {
        id: tgMsgId,
        conversation_id: targetConv ? targetConv.id : `conv-tg-${rawChatId}`,
        direction: "inbound",
        sender_type: "client",
        text: text,
        media_type: mediaType,
        media_url: mediaUrl,
        blob_url: blobUrl,
        file_id: fileId,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        duration_sec: durationSec,
        caption: caption,
        delivery_status: "received",
        is_read: false,
        created_at: msgDateIso,
        payload: {
          tg_message_id: tgMsg.message_id,
          network: "telegram",
          chat_id: rawChatId,
        },
      };

      if (targetConv) {
        // Проверяем, есть ли уже это сообщение
        const alreadyHasMessage = targetConv.messages.some(
          (m) =>
            m.id === tgMsgId ||
            (m.text === text &&
              Math.abs(new Date(m.created_at).getTime() - new Date(msgDateIso).getTime()) < 3000)
        );

        if (!alreadyHasMessage) {
          // Клиент ответил: помечаем все предыдущие исходящие сообщения как прочитанные (✓✓)
          const updatedMessages = targetConv.messages.map((m) =>
            m.direction === "outbound" && !m.is_read
              ? { ...m, is_read: true, read_at: msgDateIso }
              : m
          );

          targetConv.messages = [...updatedMessages, newInboundMessage];
          targetConv.unread_count = (targetConv.unread_count || 0) + 1;
          targetConv.last_text = text;
          targetConv.last_message_at = msgDateIso;

          // Формируем свежую рекомендацию AI Copilot
          targetConv.pending_suggestion = {
            id: `sug-${Date.now()}-${tgMsg.message_id}`,
            suggested_text: `Здравствуйте! Спасибо за обращение. Подскажите, пожалуйста, какой объем работ вас интересует и по какому адресу планируется замер?`,
            confidence: 0.93,
            mode: "draft",
            status: "pending",
            model: "gemini-2.5-flash",
            created_at: new Date().toISOString(),
          };

          newMessagesCount++;
        }
      } else {
        // Новый контакт и диалог
        const fullName = [from.first_name, from.last_name].filter(Boolean).join(" ").trim();
        const displayName = fullName || (from.username ? `@${from.username}` : `Клиент TG #${rawChatId}`);
        const contactId = `contact-tg-${rawChatId}`;
        const convId = `conv-tg-${rawChatId}`;
        const leadId = `lead-tg-${rawChatId}`;

        const newContact: Contact = {
          id: contactId,
          name: displayName,
          phone: null,
          primary_channel: "telegram",
          city: "Москва",
          notes: from.username ? `Telegram: @${from.username}` : undefined,
        };

        const newLead: Lead = {
          id: leadId,
          project_id: activeProjectId,
          contact_id: contactId,
          conversation_id: convId,
          status: "new",
          temperature: "warm",
          source: "telegram",
          address: "г. Москва",
          phone_received: false,
          measurement_planned: false,
          updated_at: msgDateIso,
        };

        const newAiSuggestion: AiSuggestion = {
          id: `sug-${Date.now()}`,
          suggested_text: `Здравствуйте! Спасибо за обращение в компанию. Подскажите, пожалуйста, на какую примерную площадь вы рассчитываете и в каком районе объект?`,
          confidence: 0.95,
          mode: "draft",
          status: "pending",
          model: "gemini-2.5-flash",
          created_at: new Date().toISOString(),
        };

        const newConversation: Conversation = {
          id: convId,
          project_id: activeProjectId,
          contact_id: contactId,
          channel: "telegram",
          external_chat_id: rawChatId,
          contact: newContact,
          lead: newLead,
          status: "open",
          unread_count: 1,
          last_text: text,
          last_message_at: msgDateIso,
          messages: [newInboundMessage],
          pending_suggestion: newAiSuggestion,
        };

        conversationsMap.set(convId, newConversation);
        newMessagesCount++;
      }
    } catch (singleUpdateErr) {
      console.error("Error processing Telegram update ID #" + update.update_id, singleUpdateErr);
    }
  }

  // 5. Запоминаем новый оффсет
  try {
    localStorage.setItem(TG_OFFSET_STORAGE_KEY, String(maxUpdateId));
  } catch {
    //
  }

  // 6. Формируем итоговый массив диалогов (сортировка по последнему сообщению)
  const resultConversations = Array.from(conversationsMap.values()).sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  );

  // Сохраняем в localStorage для персистентности между вкладками
  try {
    localStorage.setItem("phoenix_conversations", JSON.stringify(resultConversations));
  } catch {
    //
  }

  return {
    updatedConversations: resultConversations,
    newMessagesCount,
    botUsername,
  };
}
