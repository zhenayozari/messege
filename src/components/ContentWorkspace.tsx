import React, { useEffect, useRef, useState } from "react";
import {
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Copy,
  FileText,
  Filter,
  Image as ImageIcon,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import { ChannelType, ContentItem, ContentStatus, ContentVariant, MediaAsset, Project } from "../types";
import { MediaLibrary } from "./MediaLibrary";

interface ContentWorkspaceProps {
  activeProject: Project;
  contentItems: ContentItem[];
  allMediaAssets: MediaAsset[];
  initialItemId?: string | null;
  initialChannelTab?: ChannelType | null;
  onCreateContentItem: (item: Partial<ContentItem>) => void;
  onUpdateVariantText: (itemId: string, variantId: string, text: string, channel?: ChannelType) => void;
  onScheduleVariant: (itemId: string, variantId: string, channel: ChannelType, text: string) => void;
  onUpdateItemMedia: (itemId: string, media: MediaAsset[]) => void;
  onUploadMedia: (asset: Partial<MediaAsset>) => void;
}

const channelTabLabels: Record<string, string> = {
  vk_wall: "VK стена",
  vk_channel: "VK канал",
  telegram: "Telegram",
  max: "MAX",
  instagram: "Instagram",
};

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
}) => {
  const projectItems = contentItems.filter((i) => i.project_id === activeProject.id);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    initialItemId || projectItems[0]?.id || null,
  );
  const [activeChannelTab, setActiveChannelTab] = useState<ChannelType>(
    initialChannelTab || "vk_wall",
  );
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [scheduledNotification, setScheduledNotification] = useState<string | null>(null);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

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
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync editor text when switching item or channel tab
  useEffect(() => {
    if (activeVariant) {
      setEditorText(activeVariant.text);
    } else {
      setEditorText("");
    }
    setSaveStatus("saved");
  }, [selectedItemId, activeChannelTab, activeVariant?.id]);

  // Handle user typing with debounced autosave
  const handleTextChange = (newText: string) => {
    setEditorText(newText);
    setSaveStatus("unsaved");

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      saveContentVariant(newText, true);
    }, 1200);
  };

  // Perform save (invokes backend PATCH simulation)
  const saveContentVariant = (textToSave: string, isAutosave = false) => {
    if (!selectedItem) return;
    setSaveStatus("saving");

    const variantId = activeVariant?.id || `var-${Date.now()}-${activeChannelTab}`;
    onUpdateVariantText(selectedItem.id, variantId, textToSave, activeChannelTab);

    setTimeout(() => {
      setSaveStatus("saved");
      const timeStr = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSavedTime(timeStr);
      if (!isAutosave) {
        setSaveNotification(`✓ Изменения сохранены (PATCH /api/content/variants/${variantId}) в ${timeStr}`);
        setTimeout(() => setSaveNotification(null), 3000);
      }
    }, 250);
  };

  // Manual save click handler
  const handleManualSave = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    saveContentVariant(editorText, false);
  };

  // Fixed: Create new content item from "+" button or Enter
  const handleCreateIdea = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = newIdeaTitle.trim();
    if (!title) return;

    const newItemId = `cnt-${Date.now()}`;
    const nicheName = activeProject.niche_type === "ceilings" ? "натяжные потолки" : activeProject.name;

    onCreateContentItem({
      id: newItemId,
      project_id: activeProject.id,
      title: title,
      topic: title,
      rubric: "Экспертный контент",
      goal: "lead_generation",
      offer: `бесплатный замер и точный расчет для ${nicheName}`,
      trigger_keyword: "РАСЧЕТ",
      status: "idea",
      variants: [
        {
          id: `var-${Date.now()}-vk`,
          content_item_id: newItemId,
          channel: "vk_wall",
          title: title,
          text: `🔥 ${title}\n\nРазбираем один из самых частых вопросов клиентов. Внимание к деталям и соблюдение технологий гарантируют долговечность без сюрпризов.\n\nХотите узнать точную стоимость под вашу планировку? Напишите слово «РАСЧЕТ» в ЛС группы — вышлем смету за 10 минут!`,
          format: "post",
          status: "draft",
        },
        {
          id: `var-${Date.now()}-vkch`,
          content_item_id: newItemId,
          channel: "vk_channel",
          title: title,
          text: `📊 Экспертный разбор: ${title}\n\n1. Технический аудит и замер по лазерному уровню.\n2. Премиальные материалы без запаха и с гарантией по договору.\n3. Чистый монтаж за 1 рабочий день.\n\nНапишите «РАСЧЕТ» для персональной консультации технолога.`,
          format: "post",
          status: "draft",
        },
        {
          id: `var-${Date.now()}-tg`,
          content_item_id: newItemId,
          channel: "telegram",
          title: title,
          text: `💡 <b>${title}</b>\n\nКоротко и по делу: как сэкономить до 20% бюджета и не потерять в качестве материалов.\n\n👇 Напишите боту кодовое слово <b>РАСЧЕТ</b>, чтобы получить пример сметы и зафиксировать скидку месяца!`,
          format: "post",
          status: "draft",
        },
        {
          id: `var-${Date.now()}-max`,
          content_item_id: newItemId,
          channel: "max",
          title: title,
          text: `✨ ${title}\n\nСвежие тренды и готовые решения от команды ${activeProject.name}. Создаем уют и безупречную геометрию в каждом помещении.\n\nОтправьте «РАСЧЕТ» в чат сообщества для быстрой оценки!`,
          format: "post",
          status: "draft",
        },
        {
          id: `var-${Date.now()}-ig`,
          content_item_id: newItemId,
          channel: "instagram",
          title: title,
          text: `✨ До/После: ${title}\n\nЛистайте карусель, чтобы оценить качество примыканий и освещения.\n\nПишите «РАСЧЕТ» в Direct для брони замера на этой неделе! 📐`,
          format: "post",
          status: "draft",
        },
      ],
      media_assets: [],
    });

    setSelectedItemId(newItemId);
    setNewIdeaTitle("");
    setSaveNotification(`✓ Создан новый пост «${title}» (POST /api/content/items)`);
    setTimeout(() => setSaveNotification(null), 3500);
  };

  const handleScheduleClick = () => {
    if (!selectedItem) return;
    const variantId = activeVariant?.id || `var-${Date.now()}-${activeChannelTab}`;
    const textToSchedule = editorText || activeVariant?.text || selectedItem.title;

    onScheduleVariant(
      selectedItem.id,
      variantId,
      activeChannelTab,
      textToSchedule,
    );
    setScheduledNotification(`Пост для ${channelTabLabels[activeChannelTab]} добавлен в Календарь!`);
    setTimeout(() => setScheduledNotification(null), 3000);
  };

  const handleCopyText = () => {
    if (!editorText) return;
    navigator.clipboard.writeText(editorText);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  return (
    <div className="flex-1 flex h-full bg-white dark:bg-zinc-900 select-none overflow-hidden text-zinc-900 dark:text-zinc-100">
      {/* 1. Left List of Content Items */}
      <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col shrink-0">
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Идеи и темы постов</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-medium border border-teal-200 dark:border-teal-800">
              {projectItems.length} тем
            </span>
          </div>

          <form onSubmit={handleCreateIdea} className="flex gap-1.5">
            <input
              type="text"
              value={newIdeaTitle}
              onChange={(e) => setNewIdeaTitle(e.target.value)}
              placeholder="Новая идея поста..."
              className="flex-1 px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white dark:focus:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-600 dark:placeholder:text-zinc-400"
            />
            <button
              type="button"
              onClick={() => handleCreateIdea()}
              disabled={!newIdeaTitle.trim()}
              title="Создать карточку контента"
              className="px-2.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-md disabled:opacity-40 transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
            >
              <Plus size={15} />
            </button>
          </form>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {projectItems.map((item) => {
            const isSelected = item.id === selectedItemId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemId(item.id)}
                className={`w-full text-left p-2.5 rounded-lg transition-all border ${
                  isSelected
                    ? "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 shadow-2xs ring-1 ring-zinc-900/5 dark:ring-zinc-100/10"
                    : "bg-transparent border-transparent hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-600 dark:text-zinc-400 mb-1">
                  <span className="font-medium text-teal-700 dark:text-teal-400 uppercase">
                    {item.rubric || "Статья"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 capitalize">
                    {item.status}
                  </span>
                </div>
                <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
                  {item.title}
                </div>
                <div className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1 flex items-center justify-between">
                  <span>Триггер: {item.trigger_keyword || "ЗАМЕР"}</span>
                  <span>{item.variants.length} каналов</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Center Content Composer & Variant Editor */}
      {selectedItem ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-900">
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                  {selectedItem.rubric || "Публикация"}
                </span>
                <span>•</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  Триггер-слово для лидов: <strong>{selectedItem.trigger_keyword}</strong>
                </span>
              </div>
              <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {selectedItem.title}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleScheduleClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-2xs"
              >
                <Calendar size={13} />
                <span>Запланировать в Календарь</span>
              </button>
            </div>
          </div>

          {scheduledNotification && (
            <div className="bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-b border-emerald-200 dark:border-emerald-800 px-6 py-2 text-xs flex items-center gap-2 font-medium">
              <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>{scheduledNotification}</span>
            </div>
          )}

          {saveNotification && (
            <div className="bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-b border-teal-200 dark:border-teal-800 px-6 py-2 text-xs flex items-center gap-2 font-medium animate-in fade-in">
              <Check size={14} className="text-teal-600 dark:text-teal-400" />
              <span>{saveNotification}</span>
            </div>
          )}

          {/* Channel Variant Tabs (VK стена, VK канал, Telegram, MAX, Instagram) */}
          <div className="px-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center gap-2 overflow-x-auto shrink-0">
            {(["vk_wall", "vk_channel", "telegram", "max", "instagram"] as ChannelType[]).map((ch) => {
              const hasVariant = selectedItem.variants.some((v) => v.channel === ch);
              const isActive = activeChannelTab === ch;

              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setActiveChannelTab(ch)}
                  className={`py-3 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "border-teal-700 text-teal-800 dark:text-teal-300 bg-white/60 dark:bg-zinc-800/60 font-semibold"
                      : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <span>{channelTabLabels[ch]}</span>
                  {hasVariant ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  ) : (
                    <span className="text-[10px] text-zinc-600 dark:text-zinc-400">(создать)</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Editor & Live Channel Preview Split */}
          <div className="flex-1 grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
            {/* Editor Column */}
            <div className="p-6 flex flex-col h-full overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <FileText size={14} className="text-teal-600 dark:text-teal-400" />
                    <span>Текст для {channelTabLabels[activeChannelTab]}</span>
                  </span>

                  {/* Save Status Badge */}
                  {saveStatus === "unsaved" && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Не сохранено
                    </span>
                  )}
                  {saveStatus === "saving" && (
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1">
                      <RefreshCw size={10} className="animate-spin" />
                      Сохранение...
                    </span>
                  )}
                  {saveStatus === "saved" && lastSavedTime && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <Check size={11} />
                      Сохранено в {lastSavedTime}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Save Button */}
                  <button
                    type="button"
                    onClick={handleManualSave}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors"
                  >
                    <Save size={12} />
                    <span>Сохранить изменения</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    {copiedNotification ? (
                      <>
                        <Check size={13} className="text-emerald-600" />
                        <span className="text-emerald-700 dark:text-emerald-400">Скопировано</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Скопировать</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <textarea
                value={editorText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={`Напишите или отредактируйте текст поста для ${channelTabLabels[activeChannelTab]}... (любые правки автоматически сохраняются)`}
                rows={12}
                className="w-full flex-1 p-3.5 text-xs font-sans text-zinc-800 dark:text-zinc-100 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 leading-relaxed resize-none"
              />

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <span>Символов: {editorText.length}</span>
                  <span>•</span>
                  <span>Автосохранение активно</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 transition-colors"
                  >
                    <ImageIcon size={13} className="text-teal-700 dark:text-teal-300" />
                    <span>Выбрать из библиотеки</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // AI Auto-adapt for this channel
                      const generated = `[${channelTabLabels[activeChannelTab]}] ${selectedItem.title}\n\n${selectedItem.topic}\n\nГлавное преимущество — прозрачный расчет и гарантия качества по договору.\n\nНапишите «${selectedItem.trigger_keyword}» для бесплатной консультации и замера!`;
                      handleTextChange(generated);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <Sparkles size={13} className="text-teal-600 dark:text-teal-400" />
                    <span>Сгенерировать AI</span>
                  </button>
                </div>
              </div>

              {/* Attached Media Strip */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <ImageIcon size={13} className="text-teal-600 dark:text-teal-400" />
                    <span>Прикрепленные медиафайлы ({selectedItem.media_assets.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker(true)}
                    className="text-[11px] text-teal-700 dark:text-teal-400 hover:text-teal-800 font-medium"
                  >
                    + Добавить еще
                  </button>
                </div>

                {selectedItem.media_assets.length === 0 ? (
                  <div className="p-3 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-center text-zinc-600 dark:text-zinc-400 text-xs bg-zinc-50/50 dark:bg-zinc-800/30">
                    Фотографии не прикреплены. Нажмите «Выбрать из библиотеки», чтобы прикрепить фото готовых объектов.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {selectedItem.media_assets.map((media) => (
                      <div
                        key={media.id}
                        className="group relative rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-100 dark:bg-zinc-800 h-20"
                      >
                        <img
                          src={media.url}
                          alt={media.title}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = selectedItem.media_assets.filter((m) => m.id !== media.id);
                            onUpdateItemMedia(selectedItem.id, updated);
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-red-600 text-white transition-colors"
                          title="Удалить из поста"
                        >
                          <X size={11} />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate backdrop-blur-2xs">
                          {media.title}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Live Preview Column (Social Network Card Simulator) */}
            <div className="p-6 bg-zinc-50/60 dark:bg-zinc-950/60 overflow-y-auto space-y-4">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block">
                Предпросмотр публикации ({channelTabLabels[activeChannelTab]})
              </span>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden max-w-sm mx-auto">
                <div className="p-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-teal-800 flex items-center justify-center text-white text-xs font-bold">
                    Ф
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                      {activeProject.name}
                    </div>
                    <div className="text-[10px] text-zinc-600 dark:text-zinc-400">
                      {channelTabLabels[activeChannelTab]} • только что
                    </div>
                  </div>
                </div>

                <div className="p-3.5 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {editorText || "Текст поста для этой площадки еще не написан."}
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
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-600 dark:text-zinc-400 text-xs">
          Выберите или создайте карточку контента.
        </div>
      )}

      {/* Media Picker Modal */}
      {showMediaPicker && selectedItem && (
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
    </div>
  );
};
