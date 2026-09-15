import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Cpu,
  Edit3,
  ExternalLink,
  FileText,
  Gift,
  Hash,
  Image as ImageIcon,
  Key,
  Plus,
  RefreshCw,
  Save,
  Send,
  Server,
  Sliders,
  Sparkles,
  Tag,
  Target,
  Trash2,
  UploadCloud,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import {
  ChannelType,
  ContentItem,
  ContentStatus,
  ContentVariant,
  MediaAsset,
  Project,
} from "../types";
import { MediaLibrary } from "./MediaLibrary";
import { api } from "../services/api";
import {
  LLMProviderType,
  generatePostFromPrompt,
  analyzeAndAdaptAuthorPost,
} from "../services/llmService";

interface ContentWorkspaceProps {
  activeProject: Project;
  contentItems: ContentItem[];
  allMediaAssets: MediaAsset[];
  initialItemId?: string | null;
  initialChannelTab?: ChannelType | null;
  onCreateContentItem: (item: Partial<ContentItem>) => void;
  onUpdateVariantText: (
    itemId: string,
    variantId: string,
    text: string,
    channel?: ChannelType
  ) => void;
  onScheduleVariant: (
    itemId: string,
    variantId: string,
    channel: ChannelType,
    text: string,
    scheduledAt?: string
  ) => void;
  onUpdateItemMedia: (itemId: string, media: MediaAsset[]) => void;
  onUploadMedia: (asset: Partial<MediaAsset>) => void;
  onUpdateContentItem?: (item: ContentItem) => void;
}

const channelTabLabels: Record<string, string> = {
  vk_wall: "VK стена",
  vk_channel: "VK канал",
  telegram: "Telegram",
  max: "MAX",
};

const rubricPresets = [
  "Кейсы и до/после",
  "Экспертный разбор",
  "Цены и сметы",
  "Акции и скидки",
  "Технологии монтажа",
  "Отзывы клиентов",
];

const goalOptions = [
  { value: "lead_generation", label: "Генерация лидов (заявки на замер / расчет)" },
  { value: "trust", label: "Доверие и экспертность (демонстрация качества)" },
  { value: "engagement", label: "Вовлечение аудитории (комментарии и обсуждения)" },
  { value: "direct_sales", label: "Прямые продажи (акции со сроком)" },
];

export const ContentWorkspace: React.FC<ContentWorkspaceProps> = ({
  activeProject,
  contentItems,
  allMediaAssets,
  initialItemId,
  initialChannelTab,
  onCreateContentItem,
  onUpdateVariantText,
  onScheduleVariant,
  onUpdateItemMedia,
  onUploadMedia,
  onUpdateContentItem,
}) => {
  const projectItems = contentItems.filter((i) => i.project_id === activeProject.id);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    initialItemId || projectItems[0]?.id || null
  );
  const [activeChannelTab, setActiveChannelTab] = useState<ChannelType>(
    initialChannelTab || "vk_wall"
  );

  // Search filter for sidebar items
  const [searchFilter, setSearchFilter] = useState("");

  // Notifications
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error" | "info";
    title: string;
    details?: string;
    vkUrl?: string;
    tgUrl?: string;
  } | null>(null);

  // Collapsible Parameters Panel state (collapsed by default)
  const [isParamsExpanded, setIsParamsExpanded] = useState(false);

  // Popover Dialogs state
  const [isPublishNowOpen, setIsPublishNowOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // "Publish Now" state
  const [publishChannels, setPublishChannels] = useState<{ vk: boolean; tg: boolean }>({
    vk: true,
    tg: true,
  });
  const [isPublishingNow, setIsPublishingNow] = useState(false);

  // "Schedule" state
  const [scheduleChannels, setScheduleChannels] = useState<{ vk: boolean; tg: boolean }>({
    vk: true,
    tg: true,
  });
  // Default date: tomorrow
  const getTomorrowIso = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const [scheduleDate, setScheduleDate] = useState<string>(getTomorrowIso());
  const [scheduleTime, setScheduleTime] = useState<string>("12:00");

  // AI adaptation running indicator
  const [isAdaptingAi, setIsAdaptingAi] = useState(false);

  // LLM Provider & AI Assistant state
  const [llmProvider, setLlmProvider] = useState<LLMProviderType>(() => {
    return (localStorage.getItem("phoenix_llm_provider") as LLMProviderType) || "local_llama";
  });
  const [openaiApiKey, setOpenaiApiKey] = useState<string>(() => {
    return localStorage.getItem("phoenix_openai_key") || "";
  });
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");

  const promptPresets = [
    {
      id: "estimate",
      icon: "💡",
      label: "Идея на тему сметы",
      text: "Расскажи, из чего складывается честная смета на натяжной потолок в комнату 18 м², почему называть фиксированную цифру по телефону — обман, и как честная смета защищает от переплат.",
    },
    {
      id: "case",
      icon: "📐",
      label: "Кейс с объекта",
      text: "Опиши свежий кейс монтажа в новостройке: гостиная 24 м² с теневым профилем EuroKRAAB, скрытым карнизом ПК-5 с подсветкой и световыми линиями. Было 8 углов, справились за 1 день без пыли.",
    },
    {
      id: "profiles",
      icon: "🛠",
      label: "Сравнение профилей",
      text: "Сравни классический натяжной потолок со вставкой (маскировочной лентой) и теневой профиль EuroKRAAB. Почему теневой зазор 6 мм выглядит стильнее и никогда не желтеет со временем.",
    },
    {
      id: "promo",
      icon: "⚡",
      label: "Акция недели",
      text: "Объяви акцию недели: скидка 10% для новосёлов при комплексном заказе потолков во всей квартире + бесплатный выезд инженера-технолога с каталогом образцов и лазерным дальномером.",
    },
  ];

  // Drag-and-drop upload state
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync external navigation requests (e.g. from Calendar click)
  useEffect(() => {
    if (initialItemId) {
      setSelectedItemId(initialItemId);
    }
  }, [initialItemId]);

  useEffect(() => {
    if (initialChannelTab) {
      setActiveChannelTab(initialChannelTab);
    }
  }, [initialChannelTab]);

  const selectedItem =
    projectItems.find((item) => item.id === selectedItemId) || projectItems[0] || null;

  const activeVariant =
    selectedItem?.variants.find((v) => v.channel === activeChannelTab) || null;

  // Local draft text for immediate typing feedback + autosave / manual save
  const [editorText, setEditorText] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync editor text and title when switching item or channel tab
  useEffect(() => {
    if (selectedItem) {
      setPostTitle(selectedItem.title || "");
    }
    if (activeVariant) {
      setEditorText(activeVariant.text || "");
    } else {
      setEditorText("");
    }
    setSaveStatus("saved");
  }, [selectedItemId, activeChannelTab, activeVariant?.id]);

  // Handle user typing in text editor
  const handleTextChange = (newText: string) => {
    setEditorText(newText);
    setSaveStatus("unsaved");

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      saveContentVariant(newText, true);
    }, 1500);
  };

  // Handle post title change
  const handleTitleChange = (newTitle: string) => {
    setPostTitle(newTitle);
    if (!selectedItem) return;
    const updated = { ...selectedItem, title: newTitle };
    if (onUpdateContentItem) {
      onUpdateContentItem(updated);
    }
  };

  // Perform save (invokes backend database update)
  const saveContentVariant = (textToSave: string, isAutosave = false) => {
    if (!selectedItem) return;
    setSaveStatus("saving");

    const variantId = activeVariant?.id || `var-${Date.now()}-${activeChannelTab}`;
    onUpdateVariantText(selectedItem.id, variantId, textToSave, activeChannelTab);

    setTimeout(() => {
      setSaveStatus("saved");
      const timeStr = new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastSavedTime(timeStr);

      if (!isAutosave) {
        showToast("success", "Изменения сохранены", `Синхронизировано в ${timeStr}`);
      }
    }, 200);
  };

  // Manual save click handler
  const handleManualSave = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    saveContentVariant(editorText, false);
  };

  // Helper to show transient toast notifications
  const showToast = (
    type: "success" | "error" | "info",
    title: string,
    details?: string,
    vkUrl?: string,
    tgUrl?: string
  ) => {
    setToastMessage({ type, title, details, vkUrl, tgUrl });
    if (!vkUrl && !tgUrl) {
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // 1. Direct creation without modal: Click "+ Создать пост" -> immediately creates a new empty draft
  const handleCreateDraftDirectly = () => {
    const newItemId = `cnt-${Date.now()}`;
    const defaultTitle = "Новый пост";
    const defaultRubric = "Экспертный разбор";
    const defaultGoal = "lead_generation";
    const defaultOffer =
      activeProject.niche_type === "kitchens"
        ? "Бесплатный 3D-проект под размеры помещения и расчет стоимости"
        : activeProject.niche_type === "windows"
        ? "Бесплатный аудит продуваний тепловизором и расчет остекления"
        : "Бесплатный расчет точной сметы и выезд замерщика с образцами";
    const defaultTrigger = "ЗАМЕР";

    const newVariants: ContentVariant[] = [
      {
        id: `var-${Date.now()}-vk-wall`,
        content_item_id: newItemId,
        channel: "vk_wall",
        title: defaultTitle,
        text: "",
        format: "post",
        status: "draft",
      },
      {
        id: `var-${Date.now()}-tg`,
        content_item_id: newItemId,
        channel: "telegram",
        title: defaultTitle,
        text: "",
        format: "post",
        status: "draft",
      },
      {
        id: `var-${Date.now()}-vk-chan`,
        content_item_id: newItemId,
        channel: "vk_channel",
        title: defaultTitle,
        text: "",
        format: "article",
        status: "draft",
      },
      {
        id: `var-${Date.now()}-max`,
        content_item_id: newItemId,
        channel: "max",
        title: defaultTitle,
        text: "",
        format: "post",
        status: "draft",
      },
    ];

    const newItem: ContentItem = {
      id: newItemId,
      project_id: activeProject.id,
      title: defaultTitle,
      topic: "",
      rubric: defaultRubric,
      goal: defaultGoal,
      offer: defaultOffer,
      trigger_keyword: defaultTrigger,
      status: "draft",
      variants: newVariants,
      media_assets: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onCreateContentItem(newItem);
    setSelectedItemId(newItemId);
    setActiveChannelTab("vk_wall");
    setEditorText("");
    setPostTitle(defaultTitle);
    setIsParamsExpanded(false);
    showToast("info", "Создан новый черновик", "Напишите текст или тезисы поста");
  };

  const handleSelectProvider = (provider: LLMProviderType) => {
    setLlmProvider(provider);
    localStorage.setItem("phoenix_llm_provider", provider);
    if (provider === "openai" && !openaiApiKey) {
      setTempApiKey("");
      setShowApiKeyModal(true);
    }
  };

  const handleSaveApiKey = () => {
    const trimmed = tempApiKey.trim();
    setOpenaiApiKey(trimmed);
    localStorage.setItem("phoenix_openai_key", trimmed);
    setShowApiKeyModal(false);
    showToast("success", "Ключ OpenAI сохранен", "Модель GPT-4o-mini готова к генерации контента.");
  };

  // 1. Action: «🪄 Сгенерировать пост с нуля» через выбранную LLM
  const handleGeneratePostFromScratch = async () => {
    if (!selectedItem) return;
    const promptText = aiPrompt.trim();
    if (!promptText) {
      showToast(
        "info",
        "Укажите тему поста",
        "Опишите идею, тезисы или нажмите на один из быстрых пресетов выше."
      );
      return;
    }

    setIsGeneratingPost(true);
    try {
      const res = await generatePostFromPrompt({
        provider: llmProvider,
        project: activeProject,
        prompt: promptText,
        openaiApiKey,
      });

      const updatedVariants: ContentVariant[] = [
        {
          id:
            selectedItem.variants.find((v) => v.channel === "vk_wall")?.id ||
            `var-${Date.now()}-vk-wall`,
          content_item_id: selectedItem.id,
          channel: "vk_wall",
          title: res.title,
          text: res.vk_text,
          format: "post",
          status: "draft",
        },
        {
          id:
            selectedItem.variants.find((v) => v.channel === "telegram")?.id ||
            `var-${Date.now()}-tg`,
          content_item_id: selectedItem.id,
          channel: "telegram",
          title: res.title,
          text: res.tg_text,
          format: "post",
          status: "draft",
        },
        {
          id:
            selectedItem.variants.find((v) => v.channel === "vk_channel")?.id ||
            `var-${Date.now()}-vk-chan`,
          content_item_id: selectedItem.id,
          channel: "vk_channel",
          title: res.title,
          text: res.vk_channel_text || res.vk_text,
          format: "article",
          status: "draft",
        },
        {
          id:
            selectedItem.variants.find((v) => v.channel === "max")?.id ||
            `var-${Date.now()}-max`,
          content_item_id: selectedItem.id,
          channel: "max",
          title: res.title,
          text: res.max_text || res.tg_text,
          format: "post",
          status: "draft",
        },
      ];

      const updatedItem: ContentItem = {
        ...selectedItem,
        title: res.title,
        topic: res.topic || promptText,
        rubric: res.rubric,
        goal: res.goal,
        offer: res.offer,
        trigger_keyword: res.trigger_keyword,
        variants: updatedVariants,
        updated_at: new Date().toISOString(),
      };

      if (onUpdateContentItem) {
        onUpdateContentItem(updatedItem);
      }

      setPostTitle(res.title);

      updatedVariants.forEach((v) => {
        onUpdateVariantText(selectedItem.id, v.id, v.text, v.channel);
      });

      if (activeChannelTab === "vk_wall") {
        setEditorText(res.vk_text);
      } else if (activeChannelTab === "telegram") {
        setEditorText(res.tg_text);
      } else if (activeChannelTab === "vk_channel") {
        setEditorText(res.vk_channel_text || res.vk_text);
      } else {
        setEditorText(res.max_text || res.tg_text);
      }

      setSaveStatus("saved");
      setLastSavedTime(
        new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      );

      showToast(
        "success",
        "🪄 Пост успешно сгенерирован ИИ!",
        `Провайдер: ${res.provider === "local_llama" ? "Bonsai 27B (local)" : "OpenAI GPT"}. Рубрика: «${res.rubric}», триггер: «${res.trigger_keyword}». Заполнены варианты для VK и Telegram.`
      );
    } catch (err: any) {
      showToast("error", "Ошибка генерации контента", err.message);
    } finally {
      setIsGeneratingPost(false);
    }
  };

  // 2. Action: «🎯 Разобрать мой текст и заполнить параметры» (БЕЗ стирания авторского текста!)
  const handleAnalyzeAuthorText = async () => {
    if (!selectedItem) return;

    const sourceText = editorText.trim();
    if (!sourceText || sourceText === "Новый пост" || sourceText.length < 8) {
      showToast(
        "info",
        "Текст не найден в редакторе",
        "Напишите хотя бы пару предложений или тезисы поста в окне редактора, чтобы ИИ мог их разобрать."
      );
      return;
    }

    setIsGeneratingPost(true);
    try {
      const res = await analyzeAndAdaptAuthorPost({
        provider: llmProvider,
        project: activeProject,
        authorText: sourceText,
        existingTitle: postTitle,
        openaiApiKey,
      });

      const updatedVariants: ContentVariant[] = [
        {
          id:
            selectedItem.variants.find((v) => v.channel === "vk_wall")?.id ||
            `var-${Date.now()}-vk-wall`,
          content_item_id: selectedItem.id,
          channel: "vk_wall",
          title: res.title,
          text: res.vk_text,
          format: "post",
          status: "draft",
        },
        {
          id:
            selectedItem.variants.find((v) => v.channel === "telegram")?.id ||
            `var-${Date.now()}-tg`,
          content_item_id: selectedItem.id,
          channel: "telegram",
          title: res.title,
          text: res.tg_text,
          format: "post",
          status: "draft",
        },
        {
          id:
            selectedItem.variants.find((v) => v.channel === "vk_channel")?.id ||
            `var-${Date.now()}-vk-chan`,
          content_item_id: selectedItem.id,
          channel: "vk_channel",
          title: res.title,
          text: res.vk_channel_text || res.vk_text,
          format: "article",
          status: "draft",
        },
        {
          id:
            selectedItem.variants.find((v) => v.channel === "max")?.id ||
            `var-${Date.now()}-max`,
          content_item_id: selectedItem.id,
          channel: "max",
          title: res.title,
          text: res.max_text || res.tg_text,
          format: "post",
          status: "draft",
        },
      ];

      const resolvedTitle = postTitle && postTitle !== "Новый пост" ? postTitle : res.title;
      const updatedItem: ContentItem = {
        ...selectedItem,
        title: resolvedTitle,
        rubric: res.rubric,
        goal: res.goal,
        offer: res.offer,
        trigger_keyword: res.trigger_keyword,
        variants: updatedVariants,
        updated_at: new Date().toISOString(),
      };

      if (onUpdateContentItem) {
        onUpdateContentItem(updatedItem);
      }

      if (!postTitle || postTitle === "Новый пост") {
        setPostTitle(resolvedTitle);
      }

      updatedVariants.forEach((v) => {
        onUpdateVariantText(selectedItem.id, v.id, v.text, v.channel);
      });

      if (activeChannelTab === "vk_wall") {
        setEditorText(res.vk_text);
      } else if (activeChannelTab === "telegram") {
        setEditorText(res.tg_text);
      } else if (activeChannelTab === "vk_channel") {
        setEditorText(res.vk_channel_text || res.vk_text);
      } else {
        setEditorText(res.max_text || res.tg_text);
      }

      setSaveStatus("saved");
      setLastSavedTime(
        new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      );

      showToast(
        "success",
        "🎯 Авторский текст разобран!",
        `Рубрика: «${res.rubric}», триггер: «${res.trigger_keyword}». Авторский стиль полностью сохранен, варианты для VK и Telegram адаптированы.`
      );
    } catch (err: any) {
      showToast("error", "Ошибка разбора текста", err.message);
    } finally {
      setIsGeneratingPost(false);
    }
  };

  // Alias for backward compatibility
  const handleAiAdapt = handleAnalyzeAuthorText;

  // 3. Publish Now Action («⚡ Опубликовать сейчас»)
  const handleExecutePublishNow = async () => {
    if (!selectedItem) return;

    if (!publishChannels.vk && !publishChannels.tg) {
      showToast("error", "Выберите канал", "Отметьте хотя бы одну соцсеть для публикации");
      return;
    }

    setIsPublishingNow(true);

    const mediaUrls = selectedItem.media_assets.map((m) => m.url);
    const results: { vkUrl?: string; tgUrl?: string; errors: string[] } = {
      errors: [],
    };

    try {
      // 1. Publish to VK Wall if selected
      if (publishChannels.vk) {
        const vkVariant = selectedItem.variants.find((v) => v.channel === "vk_wall");
        const textToPublish =
          activeChannelTab === "vk_wall" && editorText.trim()
            ? editorText
            : vkVariant?.text || editorText || selectedItem.title;

        try {
          const vkRes = await api.publishPostToVkWall({
            text: textToPublish,
            mediaUrls,
          });

          if (vkRes.ok && vkRes.postUrl) {
            results.vkUrl = vkRes.postUrl;
            // Update status
            const varId = vkVariant?.id || `var-${Date.now()}-vk-wall`;
            onUpdateVariantText(selectedItem.id, varId, textToPublish, "vk_wall");
          } else {
            results.errors.push(`ВКонтакте: ${vkRes.error || "Неизвестная ошибка"}`);
          }
        } catch (err: any) {
          results.errors.push(`ВКонтакте: ${err.message}`);
        }
      }

      // 2. Publish to Telegram Channel if selected
      if (publishChannels.tg) {
        const tgVariant = selectedItem.variants.find((v) => v.channel === "telegram");
        const textToPublish =
          activeChannelTab === "telegram" && editorText.trim()
            ? editorText
            : tgVariant?.text || editorText || selectedItem.title;

        try {
          const tgRes = await api.publishPostToTelegramChannel({
            text: textToPublish,
            mediaUrls,
            title: selectedItem.title,
          });

          if (tgRes.ok && tgRes.postUrl) {
            results.tgUrl = tgRes.postUrl;
            const varId = tgVariant?.id || `var-${Date.now()}-telegram`;
            onUpdateVariantText(selectedItem.id, varId, textToPublish, "telegram");
          } else {
            results.errors.push(`Telegram: ${tgRes.error || "Неизвестная ошибка"}`);
          }
        } catch (err: any) {
          results.errors.push(`Telegram: ${err.message}`);
        }
      }

      setIsPublishNowOpen(false);

      if (results.vkUrl || results.tgUrl) {
        const channelsPublished = [
          results.vkUrl ? "ВКонтакте" : null,
          results.tgUrl ? "Telegram" : null,
        ]
          .filter(Boolean)
          .join(" и ");

        showToast(
          "success",
          `✓ Опубликовано в ${channelsPublished}!`,
          results.errors.length > 0 ? results.errors.join("; ") : undefined,
          results.vkUrl,
          results.tgUrl
        );

        if (onUpdateContentItem) {
          onUpdateContentItem({
            ...selectedItem,
            status: "published",
          });
        }
      } else {
        showToast(
          "error",
          "Публикация не выполнена",
          results.errors.join("; ") || "Проверьте токены в настройках интеграций."
        );
      }
    } finally {
      setIsPublishingNow(false);
    }
  };

  // 4. Schedule Variant Action («📅 Запланировать в календарь»)
  const handleExecuteSchedule = () => {
    if (!selectedItem) return;

    if (!scheduleChannels.vk && !scheduleChannels.tg) {
      showToast("error", "Выберите канал", "Отметьте хотя бы одну соцсеть для планирования");
      return;
    }

    if (!scheduleDate) {
      showToast("error", "Укажите дату", "Выберите дату публикации поста");
      return;
    }

    const scheduledIso = `${scheduleDate}T${scheduleTime || "12:00"}:00`;
    const targetChannels: ChannelType[] = [];
    if (scheduleChannels.vk) targetChannels.push("vk_wall");
    if (scheduleChannels.tg) targetChannels.push("telegram");

    targetChannels.forEach((ch) => {
      const variant = selectedItem.variants.find((v) => v.channel === ch);
      const variantId = variant?.id || `var-${Date.now()}-${ch}`;
      const textToSchedule =
        ch === activeChannelTab && editorText.trim()
          ? editorText
          : variant?.text || editorText || selectedItem.title;

      onScheduleVariant(
        selectedItem.id,
        variantId,
        ch,
        textToSchedule,
        new Date(scheduledIso).toISOString()
      );
    });

    setIsScheduleModalOpen(false);

    const formattedDate = new Date(scheduledIso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const channelNames = targetChannels
      .map((c) => (c === "vk_wall" ? "ВКонтакте" : "Telegram"))
      .join(" и ");

    showToast(
      "success",
      `Запланировано на ${formattedDate} в ${scheduleTime || "12:00"}`,
      `Пост поставлен в календарь для: ${channelNames}`
    );
  };

  // Handle Drag & Drop photo upload directly onto post
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (!selectedItem || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleFilesSelected = (files: FileList) => {
    if (!selectedItem) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) return;

        const newAsset: MediaAsset = {
          id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          project_id: activeProject.id,
          content_item_id: selectedItem.id,
          title: file.name.replace(/\.[^/.]+$/, ""),
          asset_type: "photo",
          url: dataUrl,
          file_name: file.name,
          file_size: file.size,
          tags: ["пост", activeProject.niche_type],
          created_at: new Date().toISOString(),
        };

        onUploadMedia(newAsset);
        const updatedList = [...selectedItem.media_assets, newAsset];
        onUpdateItemMedia(selectedItem.id, updatedList);
      };
      reader.readAsDataURL(file);
    });
  };

  // Copy Variant Text to Clipboard
  const handleCopyText = async () => {
    if (!editorText) return;
    try {
      await navigator.clipboard.writeText(editorText);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    } catch {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    }
  };

  // Filter items in sidebar list
  const filteredProjectItems = projectItems.filter((item) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.topic && item.topic.toLowerCase().includes(q)) ||
      (item.rubric && item.rubric.toLowerCase().includes(q)) ||
      (item.trigger_keyword && item.trigger_keyword.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-white dark:bg-zinc-900">
      {/* 1. Left Content Navigator / Backlog */}
      <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 shrink-0">
        {/* Header & Direct Create Button */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <FileText size={14} className="text-teal-700 dark:text-teal-400" />
              <span>Посты ({projectItems.length})</span>
            </span>

            {/* Direct creation without modal! */}
            <button
              type="button"
              onClick={handleCreateDraftDirectly}
              title="Создать новый пост (сразу открывает редактор)"
              className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-md transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer shadow-2xs active:scale-95"
            >
              <Plus size={14} />
              <span>Создать пост</span>
            </button>
          </div>

          {/* Quick Search */}
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Поиск по постам, рубрикам..."
            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          />
        </div>

        {/* List of Content Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredProjectItems.length === 0 ? (
            <div className="text-center py-12 px-4 text-xs text-zinc-500">
              <FileText size={28} className="mx-auto text-zinc-400 mb-2 opacity-60" />
              <p className="font-medium text-zinc-700 dark:text-zinc-300">Публикаций пока нет</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Нажмите кнопку ниже, чтобы начать писать первый пост
              </p>
              <button
                type="button"
                onClick={handleCreateDraftDirectly}
                className="mt-3 px-3 py-1.5 bg-teal-700 text-white rounded-md text-xs font-medium hover:bg-teal-800 transition-colors"
              >
                + Создать пост
              </button>
            </div>
          ) : (
            filteredProjectItems.map((item) => {
              const isSelected = item.id === selectedItemId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItemId(item.id)}
                  className={`w-full text-left p-2.5 rounded-lg transition-all border cursor-pointer ${
                    isSelected
                      ? "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-750 shadow-2xs ring-1 ring-zinc-900/5 dark:ring-zinc-100/10"
                      : "bg-transparent border-transparent hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-zinc-600 dark:text-zinc-400 mb-1">
                    <span className="font-medium text-teal-700 dark:text-teal-400 uppercase tracking-tight truncate max-w-[140px]">
                      {item.rubric || "Черновик"}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded capitalize text-[10px] font-medium ${
                        item.status === "published"
                          ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
                          : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                      }`}
                    >
                      {item.status === "published" ? "Опубликован" : "Черновик"}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
                    {item.title || "Без заголовка"}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1.5 flex items-center justify-between">
                    <span>Триггер: «{item.trigger_keyword || "ЗАМЕР"}»</span>
                    <span>
                      {item.media_assets.length > 0 ? `📷 ${item.media_assets.length}` : ""}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Center Content Composer & Editor */}
      {selectedItem ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-900">
          {/* Header Bar with Action Buttons */}
          <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 shrink-0">
            {/* Inline Title input */}
            <div className="flex-1 mr-4">
              <input
                type="text"
                value={postTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Заголовок поста..."
                className="w-full text-base font-bold text-zinc-900 dark:text-zinc-100 bg-transparent border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-teal-600 focus:outline-none transition-colors px-1 py-0.5"
              />
            </div>

            {/* AI Provider Switcher */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/90 p-1 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 mr-3">
              <button
                type="button"
                onClick={() => handleSelectProvider("local_llama")}
                title="Локальная модель Bonsai 27B (http://localhost:8080/v1)"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  llmProvider === "local_llama"
                    ? "bg-teal-700 text-white shadow-xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <Server size={12} />
                <span>✨ Bonsai 27B (local)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectProvider("openai")}
                title="Облачный OpenAI API (gpt-4o-mini)"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  llmProvider === "openai"
                    ? "bg-teal-700 text-white shadow-xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <Cpu size={12} />
                <span>🌐 OpenAI GPT</span>
              </button>
              {llmProvider === "openai" && (
                <button
                  type="button"
                  onClick={() => {
                    setTempApiKey(openaiApiKey);
                    setShowApiKeyModal(true);
                  }}
                  title={openaiApiKey ? "Ключ OpenAI настроен (нажмите для изменения)" : "Укажите ключ OpenAI API"}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    openaiApiKey
                      ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/50"
                      : "text-amber-600 dark:text-amber-400 hover:bg-amber-100/50"
                  }`}
                >
                  <Key size={12} />
                </button>
              )}
            </div>

            {/* Clear publishing actions directly in this window! */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Button 1: «⚡ Опубликовать сейчас» */}
              <button
                type="button"
                onClick={() => setIsPublishNowOpen(!isPublishNowOpen)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Мгновенно опубликовать пост в выбранные соцсети (VK / Telegram)"
              >
                <Zap size={14} className="fill-current" />
                <span>⚡ Опубликовать сейчас</span>
              </button>

              {/* Button 2: «📅 Запланировать в календарь» */}
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(!isScheduleModalOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                title="Выбрать точную дату и время для публикации в календарь"
              >
                <Calendar size={13} />
                <span>📅 Запланировать</span>
              </button>
            </div>
          </div>

          {/* Toast / Result Banner with direct links */}
          {toastMessage && (
            <div
              className={`border-b px-6 py-2.5 text-xs flex items-center justify-between gap-3 font-medium transition-all ${
                toastMessage.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
                  : toastMessage.type === "error"
                  ? "bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-900"
                  : "bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {toastMessage.type === "success" ? (
                  <CheckCircle size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : toastMessage.type === "error" ? (
                  <AlertCircle size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />
                ) : (
                  <Sparkles size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
                )}
                <div>
                  <span className="font-semibold">{toastMessage.title}</span>
                  {toastMessage.details && (
                    <span className="ml-1.5 opacity-90">{toastMessage.details}</span>
                  )}
                </div>
              </div>

              {/* Direct links to live posts */}
              <div className="flex items-center gap-2 shrink-0">
                {toastMessage.vkUrl && (
                  <a
                    href={toastMessage.vkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300 hover:underline bg-white/80 dark:bg-zinc-900/80 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                  >
                    <span>Открыть ВКонтакте</span>
                    <ExternalLink size={11} />
                  </a>
                )}
                {toastMessage.tgUrl && (
                  <a
                    href={toastMessage.tgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-teal-700 dark:text-teal-300 hover:underline bg-white/80 dark:bg-zinc-900/80 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                  >
                    <span>Открыть в Telegram</span>
                    <ExternalLink size={11} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Compact Collapsible Parameters Panel under Title */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 px-6 py-2">
            <div className="flex items-center justify-between">
              {/* Summary Chips */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800 text-[11px] font-medium">
                  <Tag size={11} />
                  <span>{selectedItem.rubric || "Рубрика не указана"}</span>
                </span>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px]">
                  <Target size={11} />
                  <span>
                    {goalOptions.find((g) => g.value === selectedItem.goal)?.label.split("(")[0] ||
                      "Генерация лидов"}
                  </span>
                </span>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px]">
                  <Hash size={11} />
                  <span>Триггер: <strong>«{selectedItem.trigger_keyword || "ЗАМЕР"}»</strong></span>
                </span>

                {selectedItem.offer && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[11px] max-w-xs truncate">
                    <Gift size={11} />
                    <span className="truncate">{selectedItem.offer}</span>
                  </span>
                )}
              </div>

              {/* Toggle Collapsible Parameters */}
              <button
                type="button"
                onClick={() => setIsParamsExpanded(!isParamsExpanded)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-400 hover:text-teal-800 px-2 py-1 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
              >
                <Sliders size={12} />
                <span>{isParamsExpanded ? "Свернуть параметры" : "Параметры и оффер"}</span>
                {isParamsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {/* Expanded Parameters Form */}
            {isParamsExpanded && (
              <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-4 gap-3 text-xs">
                {/* Rubric */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Рубрика
                  </label>
                  <input
                    type="text"
                    value={selectedItem.rubric || ""}
                    onChange={(e) => {
                      const updated = { ...selectedItem, rubric: e.target.value };
                      if (onUpdateContentItem) onUpdateContentItem(updated);
                    }}
                    placeholder="Рубрика поста..."
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded focus:outline-none focus:ring-1 focus:ring-teal-600 mb-1 text-zinc-900 dark:text-zinc-100"
                  />
                  <div className="flex flex-wrap gap-1">
                    {rubricPresets.slice(0, 3).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          const updated = { ...selectedItem, rubric: r };
                          if (onUpdateContentItem) onUpdateContentItem(updated);
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Goal */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Цель публикации
                  </label>
                  <select
                    value={selectedItem.goal || "lead_generation"}
                    onChange={(e) => {
                      const updated = { ...selectedItem, goal: e.target.value };
                      if (onUpdateContentItem) onUpdateContentItem(updated);
                    }}
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded focus:outline-none focus:ring-1 focus:ring-teal-600 text-zinc-900 dark:text-zinc-100"
                  >
                    {goalOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label.split("(")[0]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Offer */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Оффер / Спецпредложение
                  </label>
                  <input
                    type="text"
                    value={selectedItem.offer || ""}
                    onChange={(e) => {
                      const updated = { ...selectedItem, offer: e.target.value };
                      if (onUpdateContentItem) onUpdateContentItem(updated);
                    }}
                    placeholder="Например: скидка новоселам 10%..."
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded focus:outline-none focus:ring-1 focus:ring-teal-600 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {/* Trigger Keyword */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Триггер-слово
                  </label>
                  <input
                    type="text"
                    value={selectedItem.trigger_keyword || ""}
                    onChange={(e) => {
                      const updated = {
                        ...selectedItem,
                        trigger_keyword: e.target.value.toUpperCase(),
                      };
                      if (onUpdateContentItem) onUpdateContentItem(updated);
                    }}
                    placeholder="ЗАМЕР, СМЕТА..."
                    className="w-full px-2 py-1 text-xs uppercase font-mono font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded focus:outline-none focus:ring-1 focus:ring-teal-600 text-teal-800 dark:text-teal-300"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Collapsible AI Assistant / Post Generator Panel */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 bg-linear-to-b from-teal-50/40 via-white to-white dark:from-teal-950/20 dark:via-zinc-900 dark:to-zinc-900">
            <div className="px-6 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-teal-600/10 dark:bg-teal-400/10 flex items-center justify-center text-teal-700 dark:text-teal-300">
                  <Bot size={15} />
                </div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  AI Ассистент / Генератор постов
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100/80 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-medium">
                  {llmProvider === "local_llama" ? "✨ Bonsai 27B (local:8080)" : "🌐 OpenAI GPT-4o-mini"}
                </span>
                <span className="text-[10px] text-zinc-600 dark:text-zinc-400 hidden sm:inline">
                  • База знаний RAG ({activeProject.niche_type})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                className="flex items-center gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 transition-colors px-2 py-1 rounded hover:bg-teal-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <span>{isAiPanelOpen ? "Свернуть панель ИИ" : "Открыть генератор ИИ"}</span>
                {isAiPanelOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {isAiPanelOpen && (
              <div className="px-6 pb-3 pt-1 border-t border-teal-100/60 dark:border-teal-900/40 space-y-2.5">
                {/* Prompt Textarea */}
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Опишите идею поста, тезисы или задачу для ИИ:
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Например: Расскажи про теневой профиль в санузле 5м² и выгоду перед плиткой, почему натяжной потолок не боится затопов..."
                    rows={2}
                    disabled={isGeneratingPost}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-750 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1.5 focus:ring-teal-600 transition-all resize-none shadow-2xs"
                  />
                </div>

                {/* Fast Prompt Preset Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-wider mr-1">
                    Быстрые темы:
                  </span>
                  {promptPresets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAiPrompt(p.text)}
                      disabled={isGeneratingPost}
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 hover:text-teal-800 dark:hover:text-teal-200 border border-zinc-200/80 dark:border-zinc-700/80 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>

                {/* Main Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Action Button 1: Сгенерировать пост с нуля */}
                    <button
                      type="button"
                      onClick={handleGeneratePostFromScratch}
                      disabled={isGeneratingPost || !aiPrompt.trim()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                      title="Сгенерировать полноценный пост, варианты для VK и TG, заголовок и параметры с нуля на основе промпта и базы знаний"
                    >
                      {isGeneratingPost ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <Wand2 size={13} />
                      )}
                      <span>
                        {isGeneratingPost ? "ИИ генерирует контент..." : "🪄 Сгенерировать пост с нуля"}
                      </span>
                    </button>

                    {/* Action Button 2: Разобрать мой текст и заполнить параметры */}
                    <button
                      type="button"
                      onClick={handleAnalyzeAuthorText}
                      disabled={isGeneratingPost || !editorText.trim()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="ИИ сохранит ваш авторский стиль и фактуру, выделит рубрику, оффер и подготовит варианты для VK и TG"
                    >
                      {isGeneratingPost ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <Sparkles size={13} />
                      )}
                      <span>
                        {isGeneratingPost ? "ИИ разбирает текст..." : "🎯 Разобрать мой текст и заполнить параметры"}
                      </span>
                    </button>
                  </div>

                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                    <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Авторский текст не стирается • Автоподбор оффера и триггера</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Channel Variant Tabs (VK стена, VK канал, Telegram, MAX) */}
          <div className="px-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between overflow-x-auto shrink-0">
            <div className="flex items-center gap-2">
              {(["vk_wall", "telegram", "vk_channel", "max"] as ChannelType[]).map((ch) => {
                const hasVariant = selectedItem.variants.some((v) => v.channel === ch);
                const isActive = activeChannelTab === ch;

                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setActiveChannelTab(ch)}
                    className={`py-2.5 px-3.5 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? "border-teal-700 text-teal-800 dark:text-teal-300 bg-white/70 dark:bg-zinc-800/70 font-semibold"
                        : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <span>{channelTabLabels[ch]}</span>
                    {hasVariant && (
                      <span
                        className="w-2 h-2 rounded-full bg-emerald-500"
                        title="Вариант сгенерирован"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* AI Assistant Button in Tabs Bar */}
            <button
              type="button"
              onClick={handleAnalyzeAuthorText}
              disabled={isGeneratingPost}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white transition-all shadow-2xs cursor-pointer disabled:opacity-60 active:scale-95 my-1.5"
              title="Нейросеть проанализирует текст, заполнит рубрику, оффер, триггер и адаптирует варианты под VK и Telegram"
            >
              {isGeneratingPost ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} />
              )}
              <span>
                {isGeneratingPost
                  ? "ИИ разбирает текст..."
                  : "🎯 Разобрать мой текст через ИИ"}
              </span>
            </button>
          </div>

          {/* Editor & Live Channel Preview Split */}
          <div className="flex-1 grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
            {/* Left Column: Editor & Photo attachments */}
            <div className="p-5 flex flex-col h-full overflow-y-auto space-y-4">
              {/* Top editor status & save */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Edit3 size={13} className="text-teal-600 dark:text-teal-400" />
                    <span>Текст поста для {channelTabLabels[activeChannelTab]}</span>
                  </span>

                  {/* Save Status Indicator */}
                  {saveStatus === "unsaved" && (
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Не сохранено
                    </span>
                  )}
                  {saveStatus === "saving" && (
                    <span className="text-[10px] text-teal-700 dark:text-teal-400 font-medium flex items-center gap-1 bg-teal-50 dark:bg-teal-950 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                      <RefreshCw size={10} className="animate-spin" />
                      Сохранение...
                    </span>
                  )}
                  {saveStatus === "saved" && lastSavedTime && (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      <Check size={10} />
                      Сохранено в {lastSavedTime}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleManualSave}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-teal-700 hover:bg-teal-800 text-white shadow-2xs transition-colors cursor-pointer"
                  >
                    <Save size={12} />
                    <span>Сохранить</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                  >
                    {copiedNotification ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                          Скопировано
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span className="text-[11px]">Копировать</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Main Textarea */}
              <div className="flex-1 flex flex-col min-h-[240px]">
                <textarea
                  value={editorText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Напишите черновик поста или тезисы...\n\nЗатем нажмите кнопку «🪄 Заполнить параметры и адаптировать через ИИ» выше, чтобы автоматически оформить пост с оффером, триггером и структурой под ${channelTabLabels[activeChannelTab]}.`}
                  className="w-full flex-1 p-3.5 text-xs font-sans text-zinc-900 dark:text-zinc-100 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 leading-relaxed resize-none transition-all shadow-2xs"
                />
              </div>

              {/* Text Counters */}
              <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <span>Символов: {editorText.length}</span>
                  <span>•</span>
                  <span>
                    Слов: {editorText.trim() ? editorText.trim().split(/\s+/).length : 0}
                  </span>
                </div>
                <span>
                  {activeChannelTab === "telegram"
                    ? "Поддерживается HTML разметка (<b>, <i>)"
                    : activeChannelTab === "vk_wall"
                    ? "Форматирование для умной ленты VK"
                    : ""}
                </span>
              </div>

              {/* Media Attachment Section with Drag & Drop */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <ImageIcon size={13} className="text-teal-600 dark:text-teal-400" />
                    <span>Прикрепленные фотографии ({selectedItem.media_assets.length})</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <UploadCloud size={13} />
                      <span>Загрузить с ПК</span>
                    </button>
                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <ImageIcon size={13} />
                      <span>Из медиатеки</span>
                    </button>
                  </div>
                </div>

                {/* Hidden Native File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFilesSelected(e.target.files);
                  }}
                />

                {/* Drag-and-drop Dropzone / Media Grid */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-xl p-3 transition-colors ${
                    isDraggingFile
                      ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30"
                      : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40"
                  }`}
                >
                  {selectedItem.media_assets.length === 0 ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="text-center py-4 cursor-pointer"
                    >
                      <UploadCloud
                        size={24}
                        className="mx-auto text-zinc-400 dark:text-zinc-600 mb-1"
                      />
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                        Перетащите фотографии сюда или нажмите для выбора с диска
                      </p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                        Фото будут прикреплены к публикации в VK и Telegram
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {selectedItem.media_assets.map((media) => (
                        <div
                          key={media.id}
                          className="group relative rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-800 h-20 shadow-2xs"
                        >
                          <img
                            src={media.url}
                            alt={media.title}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = selectedItem.media_assets.filter(
                                (m) => m.id !== media.id
                              );
                              onUpdateItemMedia(selectedItem.id, updated);
                            }}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-red-600 text-white transition-colors"
                            title="Удалить из поста"
                          >
                            <X size={10} />
                          </button>
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate backdrop-blur-2xs">
                            {media.title}
                          </div>
                        </div>
                      ))}

                      {/* Add more button in grid */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-20 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center text-zinc-500 hover:text-teal-600 hover:border-teal-500 transition-colors text-[10px] gap-1"
                      >
                        <Plus size={16} />
                        <span>Добавить</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Live Channel Preview */}
            <div className="p-6 bg-zinc-50/60 dark:bg-zinc-950/60 overflow-y-auto space-y-4">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                Предпросмотр публикации ({channelTabLabels[activeChannelTab]})
              </span>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden max-w-sm mx-auto">
                <div className="p-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-teal-800 flex items-center justify-center text-white text-xs font-bold">
                    {activeProject.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                      {activeProject.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {channelTabLabels[activeChannelTab]} • Предпросмотр
                    </div>
                  </div>
                </div>

                <div className="p-3.5 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {editorText || (
                    <span className="text-zinc-400 italic">
                      Текст поста для этой площадки еще не написан. Введите текст слева или
                      нажмите «🪄 Заполнить параметры и адаптировать через ИИ».
                    </span>
                  )}
                </div>

                {selectedItem.media_assets.length > 0 && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800">
                    {selectedItem.media_assets.length === 1 ? (
                      <img
                        src={selectedItem.media_assets[0].url}
                        alt="Превью"
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 dark:bg-zinc-800">
                        {selectedItem.media_assets.slice(0, 4).map((m) => (
                          <img
                            key={m.id}
                            src={m.url}
                            alt="Превью"
                            className="w-full h-24 object-cover rounded"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Popover / Modal: «⚡ Опубликовать сейчас» */}
          {isPublishNowOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Zap size={16} className="fill-current" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        Мгновенная публикация
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        Куда отправить публикацию прямо сейчас?
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublishNowOpen(false)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={publishChannels.vk}
                        onChange={(e) =>
                          setPublishChannels({ ...publishChannels, vk: e.target.checked })
                        }
                        className="w-4 h-4 text-teal-600 rounded border-zinc-300 focus:ring-teal-600"
                      />
                      <div>
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          ВКонтакте (стена сообщества)
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Метод wall.post с загрузкой фото в альбом стены
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                      VK API
                    </span>
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={publishChannels.tg}
                        onChange={(e) =>
                          setPublishChannels({ ...publishChannels, tg: e.target.checked })
                        }
                        className="w-4 h-4 text-teal-600 rounded border-zinc-300 focus:ring-teal-600"
                      />
                      <div>
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          Telegram (канал)
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {api.getTelegramChannelId() || "Канал из настроек интеграции"}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                      TG Bot API
                    </span>
                  </label>
                </div>

                <div className="text-[11px] text-zinc-500 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  Будут опубликованы адаптированные тексты и прикрепленные фотографии (
                  {selectedItem.media_assets.length} шт).
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPublishNowOpen(false)}
                    className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleExecutePublishNow}
                    disabled={isPublishingNow || (!publishChannels.vk && !publishChannels.tg)}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {isPublishingNow ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                    <span>
                      {isPublishingNow
                        ? "Публикация..."
                        : `Опубликовать в соцсети (${
                            (publishChannels.vk ? 1 : 0) + (publishChannels.tg ? 1 : 0)
                          })`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. Popover / Modal: «📅 Запланировать в календарь» */}
          {isScheduleModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        Запланировать в календарь
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        Укажите дату, время и целевые каналы
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Date & Time Selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                      <Calendar size={12} className="text-teal-600" />
                      <span>Дата публикации</span>
                    </label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                      <Clock size={12} className="text-teal-600" />
                      <span>Время</span>
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-zinc-500">Быстрый выбор:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().slice(0, 10);
                      setScheduleDate(today);
                      setScheduleTime("19:00");
                    }}
                    className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-teal-100 transition-colors"
                  >
                    Сегодня вечер
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleDate(getTomorrowIso());
                      setScheduleTime("12:00");
                    }}
                    className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-teal-100 transition-colors"
                  >
                    Завтра 12:00
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 2);
                      setScheduleDate(d.toISOString().slice(0, 10));
                      setScheduleTime("14:00");
                    }}
                    className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-teal-100 transition-colors"
                  >
                    Через 2 дня
                  </button>
                </div>

                {/* Target Channels Checkboxes */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Целевые каналы публикации
                  </label>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduleChannels.vk}
                        onChange={(e) =>
                          setScheduleChannels({
                            ...scheduleChannels,
                            vk: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-teal-600 rounded border-zinc-300 focus:ring-teal-600"
                      />
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        ВКонтакте (стена сообщества)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduleChannels.tg}
                        onChange={(e) =>
                          setScheduleChannels({
                            ...scheduleChannels,
                            tg: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-teal-600 rounded border-zinc-300 focus:ring-teal-600"
                      />
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        Telegram (канал)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteSchedule}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    <Calendar size={13} />
                    <span>Запланировать публикацию</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. Media Picker Modal */}
          {showMediaPicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-2xs">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-4xl w-full h-[80vh] overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800">
                <MediaLibrary
                  activeProject={activeProject}
                  mediaAssets={allMediaAssets}
                  onUploadMedia={onUploadMedia}
                  isPickerMode={true}
                  selectedAssetIds={selectedItem.media_assets.map((m) => m.id)}
                  onClosePicker={() => setShowMediaPicker(false)}
                  onConfirmSelection={(selectedAssets) => {
                    onUpdateItemMedia(selectedItem.id, selectedAssets);
                    setShowMediaPicker(false);
                  }}
                />
              </div>
            </div>
          )}

          {/* 6. OpenAI API Key Modal */}
          {showApiKeyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
              <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full p-5 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Key size={16} className="text-teal-600 dark:text-teal-400" />
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Настройка ключа OpenAI API
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowApiKeyModal(false)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
                  Укажите ваш API-ключ OpenAI для генерации контента через модель GPT-4o-mini. Ключ безопасно сохраняется в локальном хранилище вашего браузера (localStorage).
                </p>

                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1.5 focus:ring-teal-600 mb-4 font-mono"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowApiKeyModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white shadow-2xs cursor-pointer"
                  >
                    Сохранить ключ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 text-xs p-8">
          <FileText size={40} className="text-zinc-300 dark:text-zinc-700 mb-3" />
          <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
            Публикация не выбрана
          </p>
          <p className="mt-1 text-zinc-500">
            Выберите публикацию из списка слева или создайте новый пост
          </p>
          <button
            type="button"
            onClick={handleCreateDraftDirectly}
            className="mt-4 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus size={15} />
            <span>Создать пост</span>
          </button>
        </div>
      )}
    </div>
  );
};
