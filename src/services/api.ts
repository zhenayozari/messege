import {
  AiSuggestion,
  CalendarEvent,
  ChannelType,
  ContentItem,
  ContentVariant,
  Conversation,
  Lead,
  LeadCalculation,
  MediaAsset,
  MediaType,
  Message,
  MessageDirection,
  Project,
} from "../types";
import {
  INITIAL_CALENDAR_EVENTS,
  INITIAL_CONTENT_ITEMS,
  INITIAL_CONVERSATIONS,
  INITIAL_MEDIA_ASSETS,
  INITIAL_PROJECTS,
} from "../mockData";
import {
  sendTelegramMessageDirect,
  sendTelegramPhotoDirect,
  sendTelegramDocumentDirect,
  getTelegramFileDirectUrl,
  publishPostToTelegramChannel,
  sendTestPostToTelegramChannel,
  fetchTelegramUpdatesDirect,
  checkTelegramBotStatus,
  getTelegramToken,
  setTelegramToken,
  getTelegramChannelId,
  setTelegramChannelId,
  normalizeTelegramChannelId,
  cleanTelegramChatId,
  resetTelegramOffset,
  getTelegramManagerChatId,
  setTelegramManagerChatId,
  sendTelegramAlarmAlert,
  sendTelegramMorningSummary,
} from "./telegramClient";
import {
  sendVkMessageDirect,
  fetchVkUpdatesDirect,
  checkVkConnection,
  getVkToken,
  setVkToken,
  getVkGroupId,
  setVkGroupId,
  resetVkOffset,
  publishPostToVkWall,
  uploadVkWallPhoto,
  VkWallPublishResult,
} from "./vkClient";

const BASE_URL = "/api";

/**
 * Локальное хранилище-буфер для работы в режиме Standalone / Fallback,
 * чтобы при отсутствии запущенного внешнего демона интерфейс сохранял
 * 100% функциональность, интерактивность и данные в сессии браузера.
 */
class LocalDataStore {
  projects: Project[] = [...INITIAL_PROJECTS];
  conversations: Conversation[] = [...INITIAL_CONVERSATIONS];
  contentItems: ContentItem[] = [...INITIAL_CONTENT_ITEMS];
  calendarEvents: CalendarEvent[] = [...INITIAL_CALENDAR_EVENTS];
  mediaAssets: MediaAsset[] = [...INITIAL_MEDIA_ASSETS];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedConvs = localStorage.getItem("phoenix_conversations");
      if (storedConvs) {
        this.conversations = JSON.parse(storedConvs);
      }
      const storedProjs = localStorage.getItem("phoenix_projects");
      if (storedProjs) {
        this.projects = JSON.parse(storedProjs);
      }
      const storedContent = localStorage.getItem("phoenix_content");
      if (storedContent) {
        this.contentItems = JSON.parse(storedContent);
      }
      const storedCalendar = localStorage.getItem("phoenix_calendar");
      if (storedCalendar) {
        this.calendarEvents = JSON.parse(storedCalendar);
      }
    } catch {
      // Игнорируем ошибки парсинга localStorage
    }
  }

  save() {
    try {
      localStorage.setItem("phoenix_conversations", JSON.stringify(this.conversations));
      localStorage.setItem("phoenix_projects", JSON.stringify(this.projects));
      localStorage.setItem("phoenix_content", JSON.stringify(this.contentItems));
      localStorage.setItem("phoenix_calendar", JSON.stringify(this.calendarEvents));
    } catch {
      // Игнорируем квоты localStorage
    }
  }
}

const localStore = new LocalDataStore();

/**
 * Вспомогательная функция безопасного HTTP запроса к FastAPI бэкенду
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`API error (${response.status}): ${errorText || response.statusText}`);
  }

  return response.json();
}

// =====================================================================
// Централизованный сервис взаимодействия с FastAPI бэкендом
// =====================================================================
export const api = {
  // -------------------------------------------------------------------
  // 1. Проекты (Ниши)
  // -------------------------------------------------------------------
  async getProjects(): Promise<Project[]> {
    try {
      return await request<Project[]>("/projects");
    } catch {
      return localStore.projects;
    }
  },

  async createProject(data: Partial<Project>): Promise<Project> {
    const newProject: Project = {
      id: data.id || `proj-${Date.now()}`,
      name: data.name || "Новый проект",
      slug: data.slug || `project-${Date.now()}`,
      niche_type: data.niche_type || "ceilings",
      description: data.description || "",
      knowledge_dir: data.knowledge_dir || `/app/knowledge/${data.slug}`,
      system_prompt:
        data.system_prompt ||
        "Ты AI-помощник компании. Консультируй клиентов вежливо и профессионально.",
      is_active: true,
      color: data.color || "#0f766e",
      created_at: new Date().toISOString(),
    };

    try {
      const created = await request<Project>("/projects", {
        method: "POST",
        body: JSON.stringify(newProject),
      });
      localStore.projects.push(created);
      localStore.save();
      return created;
    } catch {
      localStore.projects.push(newProject);
      localStore.save();
      return newProject;
    }
  },

  // -------------------------------------------------------------------
  // 2. Диалоги (Conversations)
  // -------------------------------------------------------------------
  async getConversations(projectId?: string): Promise<Conversation[]> {
    try {
      const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
      const serverConvs = await request<Conversation[]>(`/conversations${query}`);
      if (Array.isArray(serverConvs) && serverConvs.length > 0) {
        return serverConvs;
      }
    } catch {
      // Игнорируем сетевые ошибки, используем fallback
    }

    // Fallback на начальные seed-данные
    if (projectId) {
      return localStore.conversations.filter((c) => c.project_id === projectId);
    }
    return localStore.conversations;
  },

  async getConversationDetail(id: string): Promise<Conversation> {
    try {
      return await request<Conversation>(`/conversations/${id}`);
    } catch {
      const found = localStore.conversations.find((c) => c.id === id);
      if (!found) {
        throw new Error(`Conversation with id=${id} not found`);
      }
      return found;
    }
  },

  // -------------------------------------------------------------------
  // 3. Отправка сообщений и заметок
  // -------------------------------------------------------------------
  async sendMessage(
    conversationId: string,
    text: string,
    direction: MessageDirection = "outbound",
    isInternalNote: boolean = false,
    mediaPayload?: {
      media_type?: MediaType;
      media_url?: string;
      caption?: string;
      file_name?: string;
      file_size?: number;
    },
    attachmentFile?: File,
  ): Promise<Message> {
    const now = new Date().toISOString();
    // Для исходящих сообщений честный статус доставки: 1 галочка (is_read: false), пока оператор не прочитает или клиент не ответит
    const isInitiallyRead = isInternalNote;
    const initialReadAt = isInternalNote ? now : null;

    let initialMediaUrl = mediaPayload?.media_url || null;
    let initialMediaType = mediaPayload?.media_type || null;
    let initialFileName = mediaPayload?.file_name || null;
    let initialFileSize = mediaPayload?.file_size || null;

    if (attachmentFile) {
      const isImg = attachmentFile.type.startsWith("image/") || initialMediaType === "photo";
      initialMediaType = isImg ? "photo" : "document";
      initialFileName = attachmentFile.name;
      initialFileSize = attachmentFile.size;
      try {
        initialMediaUrl = URL.createObjectURL(attachmentFile);
      } catch {
        initialMediaUrl = null;
      }
    }

    const payload = {
      text,
      direction,
      sender_type: isInternalNote ? "note" : "operator",
      is_internal_note: isInternalNote,
      delivery_status: isInternalNote ? "internal" : "sent",
      is_read: isInitiallyRead,
      read_at: initialReadAt,
      media_type: initialMediaType,
      media_url: initialMediaUrl,
      file_name: initialFileName,
      file_size: initialFileSize,
      ...mediaPayload,
    };

    let serverMsg: Message | null = null;
    try {
      serverMsg = await request<Message>(`/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      // Если сервер недоступен, формируем локальное сообщение
    }

    const newMsg: Message = serverMsg || {
      id: `msg-${Date.now()}`,
      conversation_id: conversationId,
      direction,
      sender_type: isInternalNote ? "note" : "operator",
      text,
      is_internal_note: isInternalNote,
      delivery_status: isInternalNote ? "internal" : "sent",
      is_read: isInitiallyRead,
      read_at: initialReadAt,
      created_at: now,
      media_type: initialMediaType,
      media_url: initialMediaUrl,
      file_name: initialFileName,
      file_size: initialFileSize,
      ...mediaPayload,
    };

    // Обновляем локальное хранилище
    localStore.conversations = localStore.conversations.map((c) => {
      if (c.id !== conversationId) return c;
      return {
        ...c,
        last_text: isInternalNote ? `🔒 Заметка: ${text}` : (text || (initialMediaType === "photo" ? "📷 Фотография" : "📄 Документ")),
        last_message_at: now,
        messages: [...c.messages, newMsg],
        pending_suggestion: isInternalNote ? c.pending_suggestion : null,
      };
    });
    localStore.save();

    // Прямая отправка в реальный чат Telegram при наличии идентификатора пользователя/чата
    const targetConv = localStore.conversations.find((c) => c.id === conversationId);
    if (
      targetConv &&
      targetConv.channel === "telegram" &&
      !isInternalNote &&
      direction === "outbound"
    ) {
      const recipientChatId =
        targetConv.external_chat_id ||
        targetConv.contact?.external_id ||
        targetConv.contact_id ||
        targetConv.id;

      try {
        let tgRes: { ok: boolean; messageId?: number; postUrl?: string; error?: string };

        if (attachmentFile) {
          const isPhoto = attachmentFile.type.startsWith("image/") || initialMediaType === "photo";
          if (isPhoto) {
            tgRes = await sendTelegramPhotoDirect(recipientChatId, attachmentFile, text || undefined);
          } else {
            tgRes = await sendTelegramDocumentDirect(recipientChatId, attachmentFile, attachmentFile.name, text || undefined);
          }
        } else if (initialMediaType === "photo" && initialMediaUrl) {
          tgRes = await sendTelegramPhotoDirect(recipientChatId, initialMediaUrl, text || undefined);
        } else if (initialMediaType === "document" && initialMediaUrl) {
          tgRes = await sendTelegramDocumentDirect(recipientChatId, initialMediaUrl, initialFileName || undefined, text || undefined);
        } else {
          tgRes = await sendTelegramMessageDirect(recipientChatId, text);
        }

        if (tgRes.ok) {
          // Честная индикация: 1 галочка (delivered, is_read: false)
          newMsg.delivery_status = "delivered";
          newMsg.is_read = false;
          newMsg.payload = {
            ...(newMsg.payload || {}),
            tg_message_id: tgRes.messageId,
            tg_sent: true,
            network: "telegram",
          };
        } else {
          newMsg.delivery_status = "failed";
          const errDetail = tgRes.error || "Telegram API Error: Не удалось отправить сообщение";
          newMsg.payload = {
            ...(newMsg.payload || {}),
            tg_sent: false,
            error: errDetail,
            network: "telegram",
          };
          console.error("Telegram API Error in sendMessage:", errDetail);
        }
      } catch (err: any) {
        newMsg.delivery_status = "failed";
        const errDetail = `Telegram API Error: ${err.message || "Ошибка соединения"}`;
        newMsg.payload = {
          ...(newMsg.payload || {}),
          tg_sent: false,
          error: errDetail,
          network: "telegram",
        };
        console.error("Telegram API Exception in sendMessage:", err);
      }

      // Обновляем статус сообщения в хранилище
      localStore.conversations = localStore.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: c.messages.map((m) => (m.id === newMsg.id ? newMsg : m)),
        };
      });
      localStore.save();
    }

    // Прямая отправка в реальный диалог ВКонтакте при наличии external_chat_id
    if (
      targetConv &&
      targetConv.channel === "vk" &&
      targetConv.external_chat_id &&
      !isInternalNote &&
      direction === "outbound"
    ) {
      try {
        const vkRes = await sendVkMessageDirect(targetConv.external_chat_id, text);
        if (vkRes.ok) {
          newMsg.delivery_status = "delivered";
          newMsg.payload = {
            ...(newMsg.payload || {}),
            vk_message_id: vkRes.messageId,
            vk_sent: true,
            network: "vk",
          };
        } else {
          newMsg.delivery_status = "failed";
          newMsg.payload = {
            ...(newMsg.payload || {}),
            vk_sent: false,
            error: vkRes.error || "Ошибка VK API",
            network: "vk",
          };
        }
      } catch (err: any) {
        newMsg.delivery_status = "failed";
        newMsg.payload = {
          ...(newMsg.payload || {}),
          vk_sent: false,
          error: err.message || "Ошибка соединения VK",
          network: "vk",
        };
      }

      localStore.conversations = localStore.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: c.messages.map((m) => (m.id === newMsg.id ? newMsg : m)),
        };
      });
      localStore.save();
    }

    return newMsg;
  },

  // -------------------------------------------------------------------
  // 4. Пометка диалога прочитанным
  // -------------------------------------------------------------------
  async markConversationRead(conversationId: string): Promise<boolean> {
    try {
      await request<{ success: boolean }>(`/conversations/${conversationId}/read`, {
        method: "POST",
      });
    } catch {
      // Игнорируем сетевые ошибки
    }

    localStore.conversations = localStore.conversations.map((c) => {
      if (c.id !== conversationId) return c;
      return {
        ...c,
        unread_count: 0,
        messages: c.messages.map((m) =>
          !m.is_read
            ? { ...m, is_read: true, read_at: m.read_at || new Date().toISOString() }
            : m,
        ),
      };
    });
    localStore.save();
    return true;
  },

  // -------------------------------------------------------------------
  // 5. Обновление статуса Лида и Сметы калькулятора
  // -------------------------------------------------------------------
  async updateLead(leadId: string, leadData: Partial<Lead>, conversationId?: string): Promise<Partial<Lead>> {
    try {
      await request(`/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify(leadData),
      });
    } catch {
      // Игнорируем сетевые ошибки, сохраняем локально
    }

    localStore.conversations = localStore.conversations.map((c) => {
      const match = (c.lead && c.lead.id === leadId) || (conversationId && c.id === conversationId);
      if (!match) return c;
      return {
        ...c,
        lead: {
          ...(c.lead || {
            id: leadId,
            project_id: c.project_id,
            contact_id: c.contact_id,
            conversation_id: c.id,
            status: "new",
            temperature: "warm",
            source: c.channel,
            phone_received: false,
            measurement_planned: false,
            updated_at: new Date().toISOString(),
          }),
          ...leadData,
          updated_at: new Date().toISOString(),
        },
      };
    });
    localStore.save();
    return leadData;
  },

  async updateCalculation(
    calculationId: string,
    calcData: Partial<LeadCalculation>,
    conversationId?: string,
  ): Promise<Partial<LeadCalculation>> {
    try {
      await request(`/calculations/${calculationId}`, {
        method: "PATCH",
        body: JSON.stringify(calcData),
      });
    } catch {
      // Игнорируем сетевые ошибки, сохраняем локально
    }

    localStore.conversations = localStore.conversations.map((c) => {
      const match = (c.calculation && c.calculation.id === calculationId) || (conversationId && c.id === conversationId);
      if (!match) return c;
      return {
        ...c,
        calculation: {
          ...(c.calculation || {
            id: calculationId,
            lead_id: c.lead?.id || "",
            conversation_id: c.id,
          }),
          ...calcData,
        },
      };
    });
    localStore.save();
    return calcData;
  },

  // -------------------------------------------------------------------
  // 6. Контент и варианты постов (ContentWorkspace)
  // -------------------------------------------------------------------
  async getContentItems(projectId?: string): Promise<ContentItem[]> {
    try {
      const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
      const items = await request<ContentItem[]>(`/content/items${query}`);
      if (Array.isArray(items) && items.length > 0) {
        return items;
      }
    } catch {
      // Fallback
    }

    if (projectId) {
      return localStore.contentItems.filter((i) => i.project_id === projectId);
    }
    return localStore.contentItems;
  },

  async createContentItem(data: Partial<ContentItem>): Promise<ContentItem> {
    const newItem: ContentItem = {
      id: data.id || `cnt-${Date.now()}`,
      project_id: data.project_id || "proj-ceilings",
      title: data.title || "Новый материал",
      topic: data.topic || "",
      rubric: data.rubric || "Общее",
      goal: data.goal || "lead_generation",
      offer: data.offer || "",
      trigger_keyword: data.trigger_keyword || "ЗАМЕР",
      status: data.status || "idea",
      variants: data.variants || [],
      media_assets: data.media_assets || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const created = await request<ContentItem>("/content/items", {
        method: "POST",
        body: JSON.stringify(newItem),
      });
      localStore.contentItems.unshift(created);
      localStore.save();
      return created;
    } catch {
      localStore.contentItems.unshift(newItem);
      localStore.save();
      return newItem;
    }
  },

  async updateContentVariant(
    variantId: string,
    text: string,
    itemId?: string,
    channel?: ChannelType,
  ): Promise<void> {
    try {
      await request(`/content/variants/${variantId}`, {
        method: "PATCH",
        body: JSON.stringify({ text }),
      });
    } catch {
      // Fallback
    }

    const nowIso = new Date().toISOString();
    localStore.contentItems = localStore.contentItems.map((item) => {
      if (itemId && item.id !== itemId) return item;
      const exists = item.variants.some((v) => v.id === variantId || (channel && v.channel === channel));
      if (exists) {
        return {
          ...item,
          updated_at: nowIso,
          variants: item.variants.map((v) =>
            v.id === variantId || (channel && v.channel === channel)
              ? { ...v, text, updated_at: nowIso }
              : v,
          ),
        };
      }
      return item;
    });
    localStore.save();
  },

  async updateContentItem(
    itemId: string,
    updates: Partial<ContentItem>,
  ): Promise<ContentItem | null> {
    try {
      await request(`/content/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    } catch {
      // Fallback
    }

    let updated: ContentItem | null = null;
    localStore.contentItems = localStore.contentItems.map((item) => {
      if (item.id === itemId) {
        updated = {
          ...item,
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return updated;
      }
      return item;
    });
    localStore.save();
    return updated;
  },

  // -------------------------------------------------------------------
  // 7. Календарь и автопостинг по расписанию
  // -------------------------------------------------------------------
  async getScheduledPosts(): Promise<CalendarEvent[]> {
    try {
      const serverPosts = await request<CalendarEvent[]>("/content/scheduled");
      if (Array.isArray(serverPosts) && serverPosts.length > 0) {
        return serverPosts;
      }
    } catch {
      // Fallback
    }
    return localStore.calendarEvents;
  },

  async schedulePost(data: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const newEvent: CalendarEvent = {
      id: data.id || `ev-${Date.now()}`,
      content_item_id: data.content_item_id || "",
      content_variant_id: data.content_variant_id,
      content_title: data.content_title || "Публикация",
      channel: data.channel || "vk_wall",
      text: data.text || "",
      scheduled_at: data.scheduled_at || new Date().toISOString(),
      status: "scheduled",
    };

    try {
      await request("/content/schedule", {
        method: "POST",
        body: JSON.stringify(newEvent),
      });
    } catch {
      // Fallback
    }

    localStore.calendarEvents.push(newEvent);
    localStore.save();
    return newEvent;
  },

  async publishPostNow(scheduledPostId: string): Promise<{
    status: string;
    url?: string;
    external_post_id?: string;
    error?: string;
  }> {
    const targetEvent = localStore.calendarEvents.find((ev) => ev.id === scheduledPostId);
    let result: { status: string; url?: string; external_post_id?: string; error?: string } = {
      status: "published",
      url: "https://t.me/feniks_potolki_channel",
    };

    // Если пост предназначен для Telegram
    if (targetEvent && targetEvent.channel === "telegram") {
      const linkedItem = localStore.contentItems.find(
        (it) => it.id === targetEvent.content_item_id
      );
      const mediaUrls = linkedItem?.media_assets?.map((m) => m.url) || [];

      const tgPublishRes = await publishPostToTelegramChannel({
        text: targetEvent.text,
        mediaUrls,
        title: targetEvent.content_title,
      });

      if (!tgPublishRes.ok) {
        throw new Error(tgPublishRes.error || "Не удалось опубликовать пост в Telegram-канал");
      }

      result = {
        status: "published",
        url: tgPublishRes.postUrl,
        external_post_id: tgPublishRes.messageId ? String(tgPublishRes.messageId) : undefined,
      };

      // Обновляем статус связанного элемента контента
      if (linkedItem) {
        localStore.contentItems = localStore.contentItems.map((item) => {
          if (item.id !== linkedItem.id) return item;
          return {
            ...item,
            status: "published",
            variants: item.variants.map((v) =>
              v.channel === "telegram" ? { ...v, status: "published" } : v
            ),
          };
        });
      }
    } else if (targetEvent && (targetEvent.channel === "vk_wall" || targetEvent.channel === "vk_channel")) {
      const linkedItem = localStore.contentItems.find(
        (it) => it.id === targetEvent.content_item_id
      );
      const mediaUrls = linkedItem?.media_assets?.map((m) => m.url) || [];

      const vkPublishRes = await publishPostToVkWall({
        text: targetEvent.text,
        mediaUrls,
      });

      if (!vkPublishRes.ok) {
        throw new Error(vkPublishRes.error || "Не удалось опубликовать запись на стене ВКонтакте");
      }

      result = {
        status: "published",
        url: vkPublishRes.postUrl,
        external_post_id: vkPublishRes.postId ? String(vkPublishRes.postId) : undefined,
      };

      if (linkedItem) {
        localStore.contentItems = localStore.contentItems.map((item) => {
          if (item.id !== linkedItem.id) return item;
          return {
            ...item,
            status: "published",
            variants: item.variants.map((v) =>
              v.channel === targetEvent.channel ? { ...v, status: "published" } : v
            ),
          };
        });
      }
    } else {
      // Для других площадок или серверного роута
      try {
        result = await request<{ status: string; url?: string; external_post_id?: string }>(
          `/content/publish-now/${scheduledPostId}`,
          { method: "POST" },
        );
      } catch {
        // Fallback
      }
    }

    localStore.calendarEvents = localStore.calendarEvents.map((ev) =>
      ev.id === scheduledPostId
        ? {
            ...ev,
            status: "published",
            post_url: result.url,
            published_at: new Date().toISOString(),
          }
        : ev,
    );
    localStore.save();
    return result;
  },

  // -------------------------------------------------------------------
  // 8. Медиабиблиотека (MediaLibrary)
  // -------------------------------------------------------------------
  async getMediaAssets(projectId?: string, tag?: string): Promise<MediaAsset[]> {
    try {
      const params = new URLSearchParams();
      if (projectId) params.append("project_id", projectId);
      if (tag) params.append("tag", tag);
      const query = params.toString() ? `?${params.toString()}` : "";
      const assets = await request<MediaAsset[]>(`/content/media${query}`);
      if (Array.isArray(assets) && assets.length > 0) {
        return assets;
      }
    } catch {
      // Fallback
    }

    if (projectId) {
      return localStore.mediaAssets.filter((a) => !a.project_id || a.project_id === projectId);
    }
    return localStore.mediaAssets;
  },

  async uploadMediaAsset(data: Partial<MediaAsset>): Promise<MediaAsset> {
    const newAsset: MediaAsset = {
      id: data.id || `med-${Date.now()}`,
      project_id: data.project_id || "proj-ceilings",
      title: data.title || "Фото объекта",
      asset_type: data.asset_type || "photo",
      url: data.url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
      description: data.description || "",
      tags: data.tags || ["потолки"],
      file_size: data.file_size || null,
      file_name: data.file_name || null,
      created_at: new Date().toISOString(),
    };

    try {
      const created = await request<MediaAsset>("/content/media", {
        method: "POST",
        body: JSON.stringify(newAsset),
      });
      localStore.mediaAssets.unshift(created);
      localStore.save();
      return created;
    } catch {
      localStore.mediaAssets.unshift(newAsset);
      localStore.save();
      return newAsset;
    }
  },

  // -------------------------------------------------------------------
  // 9. Генерация AI черновика (Bonsai 27B / OpenAI)
  // -------------------------------------------------------------------
  async generateAiSuggestion(
    conversationId: string,
    provider: "local_llama" | "openai" = "local_llama",
  ): Promise<AiSuggestion> {
    try {
      return await request<AiSuggestion>(`/conversations/${conversationId}/suggest-reply`, {
        method: "POST",
        body: JSON.stringify({ provider }),
      });
    } catch {
      // При отсутствии соединения генерируем осмысленный черновик
      const conv = localStore.conversations.find((c) => c.id === conversationId);
      const contactName = conv?.contact?.name?.split(" ")[0] || "Здравствуйте";
      const area = conv?.lead?.area_m2 || 35;
      const minPrice = area * 850;
      const maxPrice = area * 1100;

      const fallbackSuggestion: AiSuggestion = {
        id: `sug-${Date.now()}`,
        suggested_text: `${contactName}, здравствуйте! На площадь ${area} м² ориентировочная стоимость матового полотна с установкой составит от ${minPrice.toLocaleString("ru-RU")} до ${maxPrice.toLocaleString("ru-RU")} руб. Хотите, инженер приедет с образцами полотен и сделает точный расчет бесплатно?`,
        confidence: 0.94,
        mode: "draft",
        status: "pending",
        provider,
        model: provider === "local_llama" ? "Bonsai-27B-Q4_K_M" : "gpt-4o",
        rag_sources: ["knowledge/pricing.md", "knowledge/regulations.md"],
        created_at: new Date().toISOString(),
      };

      if (conv) {
        conv.pending_suggestion = fallbackSuggestion;
        localStore.save();
      }

      return fallbackSuggestion;
    }
  },

  async rewriteAiSuggestion(
    conversationId: string,
    feedback: string,
  ): Promise<AiSuggestion> {
    try {
      return await request<AiSuggestion>(
        `/conversations/${conversationId}/suggestion/rewrite`,
        {
          method: "POST",
          body: JSON.stringify({ feedback }),
        },
      );
    } catch {
      const conv = localStore.conversations.find((c) => c.id === conversationId);
      const current = conv?.pending_suggestion?.suggested_text || "";
      const rewritten: AiSuggestion = {
        id: `sug-${Date.now()}`,
        suggested_text: `${current} (учтено: ${feedback})`,
        confidence: 0.96,
        mode: "draft",
        status: "pending",
        created_at: new Date().toISOString(),
      };
      if (conv) {
        conv.pending_suggestion = rewritten;
        localStore.save();
      }
      return rewritten;
    }
  },

  async rejectAiSuggestion(conversationId: string, suggestionId: string): Promise<void> {
    try {
      await request(`/conversations/${conversationId}/suggestion/reject`, {
        method: "POST",
        body: JSON.stringify({ suggestion_id: suggestionId }),
      });
    } catch {
      // Fallback
    }

    const conv = localStore.conversations.find((c) => c.id === conversationId);
    if (conv && conv.pending_suggestion) {
      conv.pending_suggestion.status = "rejected";
      localStore.save();
    }
  },

  // -------------------------------------------------------------------
  // 10. Объединение дублей контактов
  // -------------------------------------------------------------------
  async mergeContacts(mainContactId: string, duplicateContactId: string): Promise<void> {
    try {
      await request("/contacts/merge", {
        method: "POST",
        body: JSON.stringify({
          main_contact_id: mainContactId,
          duplicate_contact_id: duplicateContactId,
        }),
      });
    } catch {
      // Fallback
    }
  },

  // -------------------------------------------------------------------
  // 11. Прямая синхронизация с Telegram Bot API (Fallback & Live Web Preview)
  // -------------------------------------------------------------------
  async syncTelegram(projectId?: string): Promise<{
    conversations: Conversation[];
    newMessagesCount: number;
    botUsername: string;
    error?: string;
  }> {
    const activePid = projectId || "proj-ceilings";
    const res = await fetchTelegramUpdatesDirect(activePid, localStore.conversations);
    if (res.updatedConversations && res.updatedConversations.length > 0) {
      localStore.conversations = res.updatedConversations;
      localStore.save();
    }
    return {
      conversations: localStore.conversations,
      newMessagesCount: res.newMessagesCount,
      botUsername: res.botUsername,
      error: res.error,
    };
  },

  async getTelegramBotStatus() {
    return checkTelegramBotStatus();
  },

  getTelegramToken() {
    return getTelegramToken();
  },

  setTelegramToken(token: string) {
    setTelegramToken(token);
  },

  getTelegramChannelId() {
    return getTelegramChannelId();
  },

  setTelegramChannelId(channelId: string) {
    setTelegramChannelId(channelId);
  },

  async publishPostToTelegramChannel(params: {
    text: string;
    mediaUrls?: string[];
    channelId?: string;
    title?: string;
  }) {
    return publishPostToTelegramChannel(params);
  },

  async sendTestPostToTelegramChannel(channelId?: string) {
    return sendTestPostToTelegramChannel(channelId);
  },

  resetTelegramOffset() {
    resetTelegramOffset();
  },

  normalizeTelegramChannelId(channelInput: string | number | null | undefined) {
    return normalizeTelegramChannelId(channelInput);
  },

  cleanTelegramChatId(chatId: string | number | null | undefined) {
    return cleanTelegramChatId(chatId);
  },

  getTelegramManagerChatId() {
    return getTelegramManagerChatId();
  },

  setTelegramManagerChatId(chatId: string) {
    setTelegramManagerChatId(chatId);
  },

  async sendTelegramAlarmAlert(params: {
    clientName: string;
    text: string;
    channel?: string;
    convId?: string;
    chatId?: string;
  }) {
    return sendTelegramAlarmAlert(params);
  },

  async sendTelegramMorningSummary(params: {
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
  }) {
    return sendTelegramMorningSummary(params);
  },

  // -------------------------------------------------------------------
  // 12. Прямая синхронизация с ВКонтакте (VK API messages.getConversations)
  // -------------------------------------------------------------------
  async syncVk(projectId?: string): Promise<{
    conversations: Conversation[];
    newMessagesCount: number;
    groupName: string;
    error?: string;
  }> {
    const activePid = projectId || "proj-ceilings";
    const res = await fetchVkUpdatesDirect(activePid, localStore.conversations);
    if (res.updatedConversations && res.updatedConversations.length > 0) {
      localStore.conversations = res.updatedConversations;
      localStore.save();
    }
    return {
      conversations: localStore.conversations,
      newMessagesCount: res.newMessagesCount,
      groupName: res.groupName,
      error: res.error,
    };
  },

  async getVkStatus() {
    return checkVkConnection();
  },

  getVkToken() {
    return getVkToken();
  },

  setVkToken(token: string) {
    setVkToken(token);
  },

  getVkGroupId() {
    return getVkGroupId();
  },

  setVkGroupId(groupId: string | number) {
    setVkGroupId(groupId);
  },

  resetVkOffset() {
    resetVkOffset();
  },

  async sendVkMessage(userId: string | number, text: string) {
    return sendVkMessageDirect(userId, text);
  },

  async publishPostToVkWall(params: {
    text: string;
    mediaUrls?: string[];
    groupId?: string | number;
    token?: string;
  }) {
    return publishPostToVkWall(params);
  },

  async uploadVkWallPhoto(photoUrl: string, groupId: string | number, token: string) {
    return uploadVkWallPhoto(photoUrl, groupId, token);
  },
};
