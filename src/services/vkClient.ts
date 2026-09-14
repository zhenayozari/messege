import { Conversation, Contact, Lead, Message, ChannelType, AiSuggestion } from "../types";

export const VK_TOKEN_STORAGE_KEY = "phoenix_vk_token";
export const VK_GROUP_ID_STORAGE_KEY = "phoenix_vk_group_id";
export const VK_OFFSET_STORAGE_KEY = "phoenix_vk_offset";
export const VK_LAST_SYNC_STORAGE_KEY = "phoenix_vk_last_sync";

export interface VkGroupInfo {
  id: number;
  name: string;
  screen_name?: string;
  photo_50?: string;
  photo_100?: string;
  photo_200?: string;
  activity?: string;
  members_count?: number;
  status?: string;
}

export interface VkStatusResult {
  ok: boolean;
  group?: VkGroupInfo;
  error?: string;
}

/**
 * Получить сохраненный токен сообщества ВКонтакте
 */
export function getVkToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const val = localStorage.getItem(VK_TOKEN_STORAGE_KEY);
    return val ? val.trim() : "";
  } catch {
    return "";
  }
}

/**
 * Сохранить токен сообщества ВКонтакте
 */
export function setVkToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VK_TOKEN_STORAGE_KEY, token.trim());
  } catch {
    // ignore
  }
}

/**
 * Получить сохраненный числовой ID группы ВКонтакте
 */
export function getVkGroupId(): string {
  if (typeof window === "undefined") return "";
  try {
    const val = localStorage.getItem(VK_GROUP_ID_STORAGE_KEY);
    return val ? val.trim() : "";
  } catch {
    return "";
  }
}

/**
 * Сохранить ID группы ВКонтакте
 */
export function setVkGroupId(groupId: string | number): void {
  if (typeof window === "undefined") return;
  try {
    const cleanId = String(groupId).trim().replace(/^club|^public|^group|-/, "");
    localStorage.setItem(VK_GROUP_ID_STORAGE_KEY, cleanId);
  } catch {
    // ignore
  }
}

/**
 * Сброс сохраненного смещения для повторной синхронизации
 */
export function resetVkOffset(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(VK_OFFSET_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Универсальный вызов VK API через JSONP
 * Предотвращает CORS-ошибки при прямых запросах из браузера
 */
export function callVkApi<T = any>(
  method: string,
  params: Record<string, string | number | boolean | undefined>
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("VK API JSONP доступен только в браузере"));
      return;
    }

    const callbackName = `vk_jsonp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const cleanup = () => {
      try {
        delete (window as any)[callbackName];
        const el = document.getElementById(callbackName);
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      } catch {
        // ignore
      }
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Превышено время ожидания ответа от VK API (12 сек). Проверьте интернет или настройки токена."));
    }, 12000);

    (window as any)[callbackName] = (data: any) => {
      clearTimeout(timeoutId);
      cleanup();

      if (!data) {
        reject(new Error("Пустой ответ от VK API"));
        return;
      }

      if (data.error) {
        const errCode = data.error.error_code;
        const errMsg = data.error.error_msg || `Ошибка VK API (${errCode})`;

        let friendlyMsg = errMsg;
        if (errCode === 5) {
          friendlyMsg = "Неверный токен сообщества VK (User/Group authorization failed). Проверьте токен в настройках.";
        } else if (errCode === 15) {
          friendlyMsg = "Нет доступа к вызову метода (проверьте права токена: messages, wall, photos).";
        } else if (errCode === 901) {
          friendlyMsg = "Нельзя отправить сообщение пользователю, так как он не писал сообществу первым.";
        } else if (errCode === 912) {
          friendlyMsg = "Данный метод нельзя вызывать без сообщений сообщества.";
        } else if (errCode === 27) {
          friendlyMsg = "ID сообщества указан неверно.";
        }

        reject(new Error(friendlyMsg));
        return;
      }

      resolve(data.response !== undefined ? data.response : data);
    };

    try {
      const query = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") {
          query.set(k, String(v));
        }
      }
      query.set("callback", callbackName);
      if (!query.has("v")) {
        query.set("v", "5.199");
      }

      const script = document.createElement("script");
      script.id = callbackName;
      script.async = true;
      script.src = `https://api.vk.com/method/${method}?${query.toString()}`;
      script.onerror = () => {
        clearTimeout(timeoutId);
        cleanup();
        reject(new Error("Сетевая ошибка при загрузке скрипта VK API. Проверьте подключение к сети."));
      };

      document.head.appendChild(script);
    } catch (err: any) {
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error(err.message || "Не удалось инициализировать запрос VK API"));
    }
  });
}

/**
 * Проверка подключения к VK через groups.getById
 */
export async function checkVkConnection(): Promise<VkStatusResult> {
  const token = getVkToken();
  const groupId = getVkGroupId();

  if (!token) {
    return {
      ok: false,
      error: "Токен сообщества VK не задан. Введите VK_ACCESS_TOKEN и сохраните его.",
    };
  }

  const cleanGroupId = groupId ? groupId.replace(/^club|^public|^group|-/, "") : undefined;

  try {
    const params: Record<string, string | number | undefined> = {
      access_token: token,
      fields: "description,photo_200,photo_100,activity,members_count,status",
      v: "5.199",
    };

    if (cleanGroupId) {
      params.group_id = cleanGroupId;
    }

    const response = await callVkApi<any>("groups.getById", params);

    // VK API v5.199 может возвращать { groups: [...] } либо массив напрямую
    let group: VkGroupInfo | null = null;
    if (response) {
      if (Array.isArray(response) && response.length > 0) {
        group = response[0];
      } else if (response.groups && Array.isArray(response.groups) && response.groups.length > 0) {
        group = response.groups[0];
      } else if (response.id && response.name) {
        group = response;
      }
    }

    if (group && group.name) {
      // Автоматически сохраняем правильный ID группы, если ранее он не был сохранен
      if (!groupId && group.id) {
        setVkGroupId(group.id);
      }

      return {
        ok: true,
        group: {
          id: group.id,
          name: group.name,
          screen_name: group.screen_name,
          photo_50: group.photo_50,
          photo_100: group.photo_100,
          photo_200: group.photo_200,
          activity: group.activity || "Сообщество ВКонтакте",
          members_count: group.members_count,
        },
      };
    }

    return {
      ok: false,
      error: "Сообщество не найдено или токен не привязан к группе",
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err.message || "Ошибка соединения с VK API",
    };
  }
}

/**
 * Прямая отправка ответа оператора клиенту в личные сообщения ВКонтакте
 */
export async function sendVkMessageDirect(
  peerId: string | number,
  text: string
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const token = getVkToken();
  if (!token) {
    return { ok: false, error: "Токен сообщества VK не настроен" };
  }

  // Очищаем идентификатор получателя
  const cleanPeerId = String(peerId).replace(/^conv-vk-|^vk-peer-|^vk-/, "").trim();
  const numericPeerId = parseInt(cleanPeerId, 10);

  if (!numericPeerId || isNaN(numericPeerId)) {
    return { ok: false, error: `Некорректный ID пользователя VK: ${peerId}` };
  }

  const randomId = Math.floor(Math.random() * 2147483647) + 1;

  try {
    const response = await callVkApi<any>("messages.send", {
      peer_id: numericPeerId,
      random_id: randomId,
      message: text,
      access_token: token,
      v: "5.199",
    });

    // messages.send возвращает ID созданного сообщения (число) либо массив
    const messageId = typeof response === "number" ? response : (Array.isArray(response) ? response[0]?.message_id : undefined);

    return {
      ok: true,
      messageId: messageId || randomId,
    };
  } catch (err: any) {
    console.error("sendVkMessageDirect error:", err);
    return {
      ok: false,
      error: err.message || "Ошибка отправки сообщения в VK API",
    };
  }
}

/**
 * Запрос входящих диалогов из ВКонтакте (messages.getConversations)
 * и добавление их в ленту CRM Phoenix
 */
export async function fetchVkUpdatesDirect(
  activeProjectId: string,
  existingConversations: Conversation[]
): Promise<{
  updatedConversations: Conversation[];
  newMessagesCount: number;
  groupName: string;
  error?: string;
}> {
  const token = getVkToken();
  if (!token) {
    return {
      updatedConversations: existingConversations,
      newMessagesCount: 0,
      groupName: "",
      error: "Токен сообщества VK не задан. Перейдите во вкладку «Интеграции» и введите VK_ACCESS_TOKEN.",
    };
  }

  // 1. Проверяем инфо о группе
  let groupName = "Сообщество ВКонтакте";
  try {
    const status = await checkVkConnection();
    if (status.ok && status.group) {
      groupName = status.group.name;
    }
  } catch {
    // ignore
  }

  // 2. Запрашиваем список диалогов сообщества
  let conversationsResponse: any = null;
  try {
    conversationsResponse = await callVkApi<any>("messages.getConversations", {
      offset: 0,
      count: 20,
      filter: "all",
      extended: 1,
      fields: "first_name,last_name,photo_100,photo_200,domain,city",
      access_token: token,
      v: "5.199",
    });
  } catch (err: any) {
    return {
      updatedConversations: existingConversations,
      newMessagesCount: 0,
      groupName,
      error: err.message || "Сетевая ошибка при обращении к messages.getConversations в VK API",
    };
  }

  if (!conversationsResponse || !Array.isArray(conversationsResponse.items)) {
    return {
      updatedConversations: existingConversations,
      newMessagesCount: 0,
      groupName,
      error: "ВКонтакте не вернул список диалогов сообщества",
    };
  }

  const items = conversationsResponse.items;
  const profiles: any[] = Array.isArray(conversationsResponse.profiles) ? conversationsResponse.profiles : [];

  if (items.length === 0) {
    return {
      updatedConversations: existingConversations,
      newMessagesCount: 0,
      groupName,
    };
  }

  // 3. Интегрируем в существующие диалоги CRM
  const conversationsMap = new Map<string, Conversation>();
  existingConversations.forEach((c) => {
    conversationsMap.set(c.id, { ...c, messages: [...c.messages] });
  });

  let newMessagesCount = 0;

  for (const item of items) {
    const convData = item.conversation;
    const lastMsg = item.last_message;
    if (!convData || !lastMsg) continue;

    const peer = convData.peer;
    if (!peer || !peer.id) continue;

    const peerId = peer.id;
    const rawPeerIdStr = String(peerId);
    const unreadInVk = convData.unread_count || 0;

    // Находим профиль клиента
    const profile = profiles.find((p: any) => p.id === peerId);
    const clientName = profile
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
      : `Клиент VK #${peerId}`;
    const avatarUrl = profile?.photo_200 || profile?.photo_100;
    const domain = profile?.domain || `id${peerId}`;
    const cityName = profile?.city?.title || "Город не указан";

    // Анализ последнего сообщения
    const vkMsgId = `vk-msg-${lastMsg.id || Date.now()}`;
    const msgDateIso = lastMsg.date
      ? new Date(lastMsg.date * 1000).toISOString()
      : new Date().toISOString();

    let text = lastMsg.text || "";
    let mediaType: Message["media_type"] = null;

    if (lastMsg.attachments && lastMsg.attachments.length > 0) {
      const att = lastMsg.attachments[0];
      if (att.type === "photo") {
        mediaType = "photo";
        if (!text) text = "📷 Фотография от клиента";
      } else if (att.type === "audio_message") {
        mediaType = "voice";
        if (!text) text = "🎤 Голосовое сообщение";
      } else if (att.type === "doc") {
        mediaType = "document";
        if (!text) text = `📄 Документ: ${att.doc?.title || "файл"}`;
      } else if (att.type === "video") {
        mediaType = "video_note";
        if (!text) text = "📹 Видеозапись";
      }
    }

    if (!text) {
      text = "Входящее сообщение из ВКонтакте";
    }

    // Определяем направление: если from_id > 0 и совпадает с peerId — это клиент, иначе ответ сообщества
    const isInbound = lastMsg.from_id > 0 && lastMsg.from_id === peerId;
    const direction: Message["direction"] = isInbound ? "inbound" : "outbound";
    const senderType: Message["sender_type"] = isInbound ? "client" : "operator";

    // Ищем существующий диалог
    let targetConv: Conversation | undefined;
    for (const c of conversationsMap.values()) {
      if (
        c.channel === "vk" &&
        (c.external_chat_id === rawPeerIdStr ||
          c.external_chat_id === `vk-${rawPeerIdStr}` ||
          c.id === `conv-vk-${rawPeerIdStr}`)
      ) {
        targetConv = c;
        break;
      }
    }

    const newMsg: Message = {
      id: vkMsgId,
      conversation_id: targetConv ? targetConv.id : `conv-vk-${rawPeerIdStr}`,
      direction: direction,
      sender_type: senderType,
      text: text,
      media_type: mediaType,
      created_at: msgDateIso,
      delivery_status: "delivered",
      is_read: !isInbound,
      payload: {
        raw_vk_message_id: lastMsg.id,
        from_id: lastMsg.from_id,
        peer_id: peerId,
      },
    };

    if (targetConv) {
      // Обновляем существующий диалог
      const msgExists = targetConv.messages.some(
        (m) =>
          m.id === vkMsgId ||
          (m.payload?.raw_vk_message_id && m.payload.raw_vk_message_id === lastMsg.id)
      );

      if (!msgExists) {
        targetConv.messages.push(newMsg);
        targetConv.last_text = text;
        targetConv.last_message_at = msgDateIso;
        if (isInbound) {
          targetConv.unread_count = Math.max(targetConv.unread_count + 1, unreadInVk);
          newMessagesCount++;
        }
      }

      // Обновляем ссылку или имя, если изменились
      if (profile && (!targetConv.contact.name || targetConv.contact.name.includes("#"))) {
        targetConv.contact.name = clientName;
        targetConv.contact.vk_url = `https://vk.com/${domain}`;
        targetConv.contact.avatar_url = avatarUrl;
      }
    } else {
      // Создаем новый диалог в CRM
      const newConvId = `conv-vk-${rawPeerIdStr}`;
      const newContactId = `contact-vk-${rawPeerIdStr}`;

      const newContact: Contact = {
        id: newContactId,
        name: clientName,
        city: cityName,
        phone: null,
        primary_channel: "vk",
        vk_url: `https://vk.com/${domain}`,
        avatar_url: avatarUrl,
        first_seen_at: msgDateIso,
        notes: `Клиент из группы ВКонтакте «${groupName}» (ID: ${peerId})`,
      };

      const newLead: Lead = {
        id: `lead-vk-${rawPeerIdStr}`,
        project_id: activeProjectId,
        contact_id: newContactId,
        conversation_id: newConvId,
        status: "new",
        temperature: "warm",
        phone_received: false,
        measurement_planned: false,
        qualification_complete: false,
        source: "vk",
        created_at: msgDateIso,
        updated_at: msgDateIso,
      };

      const initialSuggestion: AiSuggestion = {
        id: `sug-vk-${rawPeerIdStr}`,
        suggested_text: `Здравствуйте, ${profile?.first_name || "!"} Рады проконсультировать вас по натяжным потолкам ФЕНИКС PRO. Подскажите, в какую комнату планируете потолок и какая ориентировочно площадь?`,
        confidence: 0.94,
        mode: "draft",
        status: "pending",
        provider: "local_llama",
        model: "Bonsai 27B",
        rag_sources: ["knowledge/ceilings/pricing.md", "knowledge/ceilings/faq.md"],
        created_at: new Date().toISOString(),
      };

      const newConversation: Conversation = {
        id: newConvId,
        project_id: activeProjectId,
        channel: "vk",
        external_chat_id: rawPeerIdStr,
        contact_id: newContactId,
        contact: newContact,
        lead: newLead,
        status: "open",
        last_message_at: msgDateIso,
        last_text: text,
        unread_count: unreadInVk > 0 ? unreadInVk : (isInbound ? 1 : 0),
        messages: [newMsg],
        pending_suggestion: isInbound ? initialSuggestion : null,
      };

      conversationsMap.set(newConvId, newConversation);
      if (isInbound) newMessagesCount++;
    }
  }

  const updatedList = Array.from(conversationsMap.values()).sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  );

  // Сохраняем в localStorage
  try {
    localStorage.setItem("phoenix_conversations", JSON.stringify(updatedList));
    localStorage.setItem(VK_LAST_SYNC_STORAGE_KEY, new Date().toISOString());
    window.dispatchEvent(new CustomEvent("phoenix_conversations_updated", { detail: updatedList }));
  } catch {
    // ignore
  }

  return {
    updatedConversations: updatedList,
    newMessagesCount,
    groupName,
  };
}

/**
 * Результат публикации поста на стене ВКонтакте
 */
export interface VkWallPublishResult {
  ok: boolean;
  postId?: number;
  postUrl?: string;
  error?: string;
  attachmentsCount?: number;
}

/**
 * Загрузка фотографии на сервер ВКонтакте для прикрепления к записи на стене:
 * 1. photos.getWallUploadServer -> upload_url
 * 2. POST multipart/form-data на upload_url -> { server, photo, hash }
 * 3. photos.saveWallPhoto -> attachment вида photo{owner_id}_{id}
 */
export async function uploadVkWallPhoto(
  photoUrl: string,
  groupId: string | number,
  token: string
): Promise<{ ok: boolean; attachment?: string; error?: string }> {
  try {
    const cleanGroupId = String(groupId).replace(/^club|^public|^group|-/, "").trim();
    if (!cleanGroupId) {
      return { ok: false, error: "ID сообщества VK не указан" };
    }

    // 1. Получаем upload_url
    const serverRes = await callVkApi<any>("photos.getWallUploadServer", {
      group_id: cleanGroupId,
      access_token: token,
      v: "5.199",
    });

    const uploadUrl = serverRes?.upload_url;
    if (!uploadUrl) {
      return { ok: false, error: "Не удалось получить адрес сервера загрузки фото ВКонтакте" };
    }

    // 2. Получаем Blob из photoUrl (dataUrl, blob, или URL)
    let blob: Blob;
    if (photoUrl.startsWith("data:")) {
      const parts = photoUrl.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      blob = new Blob([u8arr], { type: mime });
    } else {
      const fetchRes = await fetch(photoUrl);
      blob = await fetchRes.blob();
    }

    // 3. Отправляем файл на upload_url
    const formData = new FormData();
    formData.append("photo", blob, "ceiling_photo.jpg");

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      return { ok: false, error: `Сбой сервера загрузки VK: HTTP ${uploadResponse.status}` };
    }

    const uploadData = await uploadResponse.json();
    if (!uploadData || !uploadData.photo || uploadData.photo === "[]") {
      return { ok: false, error: "Сервер загрузки VK вернул пустые данные фотографии" };
    }

    // 4. Сохраняем фото в альбом стены сообщества
    const saveRes = await callVkApi<any>("photos.saveWallPhoto", {
      group_id: cleanGroupId,
      photo: uploadData.photo,
      server: uploadData.server,
      hash: uploadData.hash,
      access_token: token,
      v: "5.199",
    });

    let savedPhoto: any = null;
    if (Array.isArray(saveRes) && saveRes.length > 0) {
      savedPhoto = saveRes[0];
    } else if (saveRes && saveRes.id) {
      savedPhoto = saveRes;
    }

    if (savedPhoto && savedPhoto.id) {
      const ownerId =
        savedPhoto.owner_id !== undefined
          ? savedPhoto.owner_id
          : -Math.abs(parseInt(cleanGroupId, 10));
      const attachment = `photo${ownerId}_${savedPhoto.id}`;
      return { ok: true, attachment };
    }

    return { ok: false, error: "Не удалось сохранить фото на стене VK (photos.saveWallPhoto)" };
  } catch (err: any) {
    console.warn("uploadVkWallPhoto error:", err);
    return { ok: false, error: err.message || "Ошибка загрузки фото на стену VK" };
  }
}

/**
 * Публикация записи на стену сообщества ВКонтакте (wall.post)
 */
export async function publishPostToVkWall({
  text,
  mediaUrls = [],
  groupId,
  token,
}: {
  text: string;
  mediaUrls?: string[];
  groupId?: string | number;
  token?: string;
}): Promise<VkWallPublishResult> {
  const activeToken = token || getVkToken();
  const rawGroupId = groupId || getVkGroupId();

  if (!activeToken) {
    return {
      ok: false,
      error:
        "Токен сообщества VK не настроен. Перейдите в «Настройки» ➡️ «Интеграции» и укажите токен с правами wall и photos.",
    };
  }

  const cleanGroupId = String(rawGroupId).replace(/^club|^public|^group|-/, "").trim();
  if (!cleanGroupId) {
    return {
      ok: false,
      error: "ID сообщества ВКонтакте не указан в настройках.",
    };
  }

  const numericGroupId = parseInt(cleanGroupId, 10);
  if (isNaN(numericGroupId) || numericGroupId <= 0) {
    return {
      ok: false,
      error: `Некорректный ID сообщества ВКонтакте: ${rawGroupId}`,
    };
  }

  // Для сообществ owner_id всегда отрицательный
  const ownerId = -Math.abs(numericGroupId);

  // Загружаем прикрепленные фотографии (до 5 шт)
  const attachments: string[] = [];
  if (mediaUrls && mediaUrls.length > 0) {
    for (const url of mediaUrls.slice(0, 5)) {
      if (!url) continue;
      try {
        const uploadResult = await uploadVkWallPhoto(url, cleanGroupId, activeToken);
        if (uploadResult.ok && uploadResult.attachment) {
          attachments.push(uploadResult.attachment);
        }
      } catch (err) {
        console.warn("Пропуск не загрузившегося фото для VK:", err);
      }
    }
  }

  try {
    const params: Record<string, string | number | undefined> = {
      owner_id: ownerId,
      from_group: 1,
      message: text,
      access_token: activeToken,
      v: "5.199",
    };

    if (attachments.length > 0) {
      params.attachments = attachments.join(",");
    }

    const response = await callVkApi<any>("wall.post", params);

    const postId = typeof response === "number" ? response : response?.post_id;
    if (postId) {
      const postUrl = `https://vk.com/wall${ownerId}_${postId}`;
      return {
        ok: true,
        postId,
        postUrl,
        attachmentsCount: attachments.length,
      };
    }

    return {
      ok: false,
      error: "ВКонтакте вернул пустой результат при вызове wall.post",
    };
  } catch (err: any) {
    console.error("publishPostToVkWall error:", err);
    return {
      ok: false,
      error: err.message || "Ошибка при вызове wall.post в VK API",
    };
  }
}
