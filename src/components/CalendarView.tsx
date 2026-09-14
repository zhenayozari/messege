import React, { useState } from "react";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  GripVertical,
  Plus,
  RefreshCw,
  Save,
  Send,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { CalendarEvent, ChannelType, ContentItem, Project } from "../types";

interface CalendarViewProps {
  activeProject: Project;
  events: CalendarEvent[];
  contentItems?: ContentItem[];
  onUpdateEventDate?: (eventId: string, newDateIso: string) => void;
  onDeleteEvent?: (eventId: string) => void;
  onAddEvent?: (event: CalendarEvent) => void;
  onNavigateToContent?: (itemId: string, channel?: ChannelType) => void;
  onPublishNow?: (event: CalendarEvent) => void;
}

const channelBadgeColors: Record<
  string,
  { bg: string; text: string; border: string; pill: string; dot: string }
> = {
  vk_wall: {
    bg: "bg-emerald-50/80 dark:bg-emerald-950/40",
    text: "text-emerald-950 dark:text-emerald-100",
    border: "border-emerald-200/90 dark:border-emerald-800/60",
    pill: "bg-emerald-600 text-white",
    dot: "bg-emerald-500",
  },
  vk_channel: {
    bg: "bg-sky-50/80 dark:bg-sky-950/40",
    text: "text-sky-950 dark:text-sky-100",
    border: "border-sky-200/90 dark:border-sky-800/60",
    pill: "bg-sky-600 text-white",
    dot: "bg-sky-500",
  },
  telegram: {
    bg: "bg-blue-50/80 dark:bg-blue-950/40",
    text: "text-blue-950 dark:text-blue-100",
    border: "border-blue-200/90 dark:border-blue-800/60",
    pill: "bg-blue-600 text-white",
    dot: "bg-blue-500",
  },
  max: {
    bg: "bg-amber-50/80 dark:bg-amber-950/40",
    text: "text-amber-950 dark:text-amber-100",
    border: "border-amber-200/90 dark:border-amber-800/60",
    pill: "bg-amber-600 text-white",
    dot: "bg-amber-500",
  },
};

const channelNames: Record<string, string> = {
  vk_wall: "VK стена",
  vk_channel: "VK канал",
  telegram: "Telegram",
  max: "MAX",
};

const channelShortCodes: Record<string, string> = {
  vk_wall: "VK",
  vk_channel: "VK Канал",
  telegram: "TG",
  max: "MAX",
};

const statusLabels: Record<string, { label: string; dot: string; badge: string }> = {
  scheduled: {
    label: "Запланирован",
    dot: "bg-teal-500",
    badge: "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  published: {
    label: "Опубликовано",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  draft: {
    label: "Черновик",
    dot: "bg-amber-500",
    badge: "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  failed: {
    label: "Ошибка",
    dot: "bg-red-500",
    badge: "bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
  },
  publishing: {
    label: "Отправка...",
    dot: "bg-purple-500 animate-pulse",
    badge: "bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  activeProject,
  events,
  contentItems = [],
  onUpdateEventDate,
  onDeleteEvent,
  onAddEvent,
  onNavigateToContent,
  onPublishNow,
}) => {
  // Modal states
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  // Add event modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addDayNum, setAddDayNum] = useState<number>(8);
  const [addDate, setAddDate] = useState("2026-09-08");
  const [addTime, setAddTime] = useState("14:00");
  const [addSelectedItemId, setAddSelectedItemId] = useState<string>("");
  const [addSelectedChannel, setAddSelectedChannel] = useState<ChannelType>("vk_wall");

  // Drag and drop states
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isPublishingEvent, setIsPublishingEvent] = useState(false);

  // Month days for September 2026 (30 days)
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  // Filter content items belonging to active project
  const projectContentItems = contentItems.filter(
    (item) => item.project_id === activeProject.id,
  );

  // Open Event Details Modal
  const handleOpenEventModal = (ev: CalendarEvent) => {
    setSelectedEvent(ev);
    const [datePart, timePart] = ev.scheduled_at.split("T");
    setEditDate(datePart || "2026-09-08");
    setEditTime(timePart ? timePart.slice(0, 5) : "12:00");
  };

  // Save new date and time from modal
  const handleSaveDate = () => {
    if (!selectedEvent || !onUpdateEventDate) return;
    const timeFormatted = editTime ? `${editTime}:00` : "12:00:00";
    const newIso = `${editDate}T${timeFormatted}Z`;

    onUpdateEventDate(selectedEvent.id, newIso);
    setSelectedEvent((prev) => (prev ? { ...prev, scheduled_at: newIso } : null));

    setNotification(`✓ Дата и время публикации изменены на ${editDate} ${editTime}`);
    setTimeout(() => setNotification(null), 3500);
  };

  // Delete event / cancel from schedule
  const handleDeleteScheduled = () => {
    if (!selectedEvent) return;
    const title = selectedEvent.content_title || "Пост";
    if (onDeleteEvent) {
      onDeleteEvent(selectedEvent.id);
    }
    setSelectedEvent(null);
    setNotification(`✓ Публикация «${title}» отменена и удалена из расписания`);
    setTimeout(() => setNotification(null), 3500);
  };

  // Open Add Event Modal for a specific day
  const handleOpenAddModal = (dayNum: number) => {
    const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
    setAddDayNum(dayNum);
    setAddDate(`2026-09-${dayStr}`);
    setAddTime("14:00");
    if (projectContentItems.length > 0) {
      setAddSelectedItemId(projectContentItems[0].id);
    }
    setAddSelectedChannel("vk_wall");
    setIsAddModalOpen(true);
  };

  // Submit Add Event Form
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddEvent) return;

    const chosenItem = projectContentItems.find((i) => i.id === addSelectedItemId);
    if (!chosenItem) {
      alert("Пожалуйста, выберите материал из контент-плана");
      return;
    }

    const chosenVariant = chosenItem.variants.find((v) => v.channel === addSelectedChannel);
    const textToSchedule =
      chosenVariant?.text ||
      chosenItem.topic ||
      `${chosenItem.title}\n\n${chosenItem.offer || "Подробности уточняйте у менеджеров."}`;

    const newEvent: CalendarEvent = {
      id: `ev-${Date.now()}`,
      content_item_id: chosenItem.id,
      content_variant_id: chosenVariant?.id || `var-${Date.now()}-${addSelectedChannel}`,
      content_title: chosenItem.title,
      channel: addSelectedChannel,
      text: textToSchedule,
      scheduled_at: `${addDate}T${addTime}:00Z`,
      status: "scheduled",
    };

    onAddEvent(newEvent);
    setIsAddModalOpen(false);
    setNotification(
      `✓ «${chosenItem.title}» запланирован в ${channelNames[addSelectedChannel]} на ${addDate} в ${addTime}`,
    );
    setTimeout(() => setNotification(null), 4000);
  };

  // Handle Drag & Drop
  const handleDrop = (eventId: string, targetDay: number) => {
    setDragOverDay(null);
    setDraggingEventId(null);
    if (!eventId || !onUpdateEventDate) return;

    const dayStr = targetDay < 10 ? `0${targetDay}` : `${targetDay}`;
    const targetEvent = events.find((e) => e.id === eventId);
    const existingTime = targetEvent?.scheduled_at.split("T")[1]?.slice(0, 5) || "12:00";
    const newDateIso = `2026-09-${dayStr}T${existingTime}:00Z`;

    onUpdateEventDate(eventId, newDateIso);

    const title = targetEvent?.content_title || "Пост";
    setNotification(`✓ «${title}» перенесен на ${targetDay} сентября в ${existingTime}`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Find linked content item for selected event
  const matchingContentItem = selectedEvent
    ? contentItems.find((item) => item.id === selectedEvent.content_item_id)
    : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900 select-none overflow-hidden text-zinc-900 dark:text-zinc-100">
      {/* 1. Header Toolbar */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-base">
            <CalendarIcon size={18} className="text-teal-700 dark:text-teal-400" />
            <span>Сентябрь 2026</span>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Календарь публикаций • Проект: <strong className="text-zinc-700 dark:text-zinc-200">{activeProject.name}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {notification && (
            <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
              {notification}
            </span>
          )}

          <button
            type="button"
            onClick={() => handleOpenAddModal(8)}
            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Запланировать публикацию</span>
          </button>

          <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 bg-zinc-50 dark:bg-zinc-800">
            <button
              type="button"
              className="p-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-700"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">Сегодня (8 сен)</span>
            <button
              type="button"
              className="p-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-700"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Channel Legend Strip */}
      <div className="px-6 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 flex items-center gap-5 text-xs">
        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Каналы:</span>
        {Object.entries(channelNames).map(([key, name]) => {
          const badgeTheme = channelBadgeColors[key] || channelBadgeColors.vk_wall;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${badgeTheme.dot}`} />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">{name}</span>
            </div>
          );
        })}
        <div className="ml-auto flex items-center gap-3 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-500" /> Запланирован
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Опубликован
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Черновик
          </span>
          <span className="italic ml-2">
            💡 Нажмите «+» в ячейке дня для добавления поста
          </span>
        </div>
      </div>

      {/* 3. Days of the Week & Month Grid */}
      <div className="flex-1 overflow-y-auto p-4 bg-zinc-100/60 dark:bg-zinc-950/60">
        <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:border dark:border-zinc-800 dark:bg-zinc-800 rounded-xl overflow-hidden shadow-xs">
          {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((day) => (
            <div
              key={day}
              className="bg-zinc-100 dark:bg-zinc-900 p-2 text-center text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}

          {days.map((dayNum) => {
            const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
            const dayEvents = events.filter((ev) =>
              ev.scheduled_at.startsWith(`2026-09-${dayStr}`),
            );

            const isToday = dayNum === 8;
            const isTargetDrop = dragOverDay === dayNum;

            return (
              <div
                key={dayNum}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverDay(dayNum);
                }}
                onDragLeave={() => {
                  if (dragOverDay === dayNum) setDragOverDay(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const evId = e.dataTransfer.getData("text/plain");
                  handleDrop(evId, dayNum);
                }}
                className={`min-h-[130px] p-2 flex flex-col justify-between transition-all group/day ${
                  isTargetDrop
                    ? "bg-teal-50 dark:bg-teal-950/60 ring-2 ring-teal-600 ring-inset scale-[1.01] z-10"
                    : isToday
                    ? "bg-white dark:bg-zinc-900 ring-2 ring-teal-600 ring-inset"
                    : "bg-white dark:bg-zinc-900 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/60"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? "w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center leading-none text-[11px]"
                          : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold">
                        Сегодня
                      </span>
                    )}
                  </div>

                  {/* Add Event Button for this day */}
                  <div className="flex items-center gap-1">
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                        {dayEvents.length}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddModal(dayNum);
                      }}
                      title={`Запланировать публикацию на ${dayNum} сентября`}
                      className="opacity-0 group-hover/day:opacity-100 p-1 rounded hover:bg-teal-50 dark:hover:bg-teal-950 text-teal-700 dark:text-teal-400 transition-all cursor-pointer"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                {/* Day Events List */}
                <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[160px]">
                  {dayEvents.map((ev) => {
                    const theme =
                      channelBadgeColors[ev.channel] || channelBadgeColors.vk_wall;
                    const chShort = channelShortCodes[ev.channel] || ev.channel;
                    const isBeingDragged = draggingEventId === ev.id;
                    const timeStr = ev.scheduled_at.split("T")[1]?.slice(0, 5) || "12:00";
                    const statusInfo = statusLabels[ev.status] || statusLabels.scheduled;

                    return (
                      <button
                        key={ev.id}
                        type="button"
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", ev.id);
                          setDraggingEventId(ev.id);
                        }}
                        onDragEnd={() => {
                          setDraggingEventId(null);
                          setDragOverDay(null);
                        }}
                        onClick={() => handleOpenEventModal(ev)}
                        className={`w-full text-left p-2 rounded-lg text-xs border transition-all cursor-grab active:cursor-grabbing group hover:shadow-xs ${
                          theme.bg
                        } ${theme.border} ${
                          isBeingDragged ? "opacity-30 border-dashed" : "opacity-100"
                        }`}
                        title="Нажмите для просмотра и редактирования"
                      >
                        {/* Header: Platform Badge, Time, and Status Dot */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${theme.pill}`}
                            >
                              {chShort}
                            </span>
                            <span className="text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-0.5">
                              <Clock size={10} className="text-zinc-400" />
                              <span>{timeStr}</span>
                            </span>
                          </div>

                          {/* Color Status Indicator */}
                          <span
                            className={`w-2 h-2 rounded-full ${statusInfo.dot} shrink-0`}
                            title={`Статус: ${statusInfo.label}`}
                          />
                        </div>

                        {/* Post Title / Topic */}
                        <div
                          className={`font-medium text-xs leading-snug line-clamp-2 ${theme.text}`}
                        >
                          {ev.content_title || "Публикация без названия"}
                        </div>
                      </button>
                    );
                  })}

                  {dayEvents.length === 0 && (
                    <div
                      onClick={() => handleOpenAddModal(dayNum)}
                      className="h-full min-h-[50px] flex items-center justify-center border border-dashed border-transparent group-hover/day:border-zinc-300 dark:group-hover/day:border-zinc-700 rounded-lg cursor-pointer transition-colors"
                    >
                      <span className="text-[10px] text-zinc-400 opacity-0 group-hover/day:opacity-100 flex items-center gap-1">
                        <Plus size={11} /> Запланировать
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Modal: View and Quick Edit Event */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-xl w-full border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between bg-zinc-50/60 dark:bg-zinc-900">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      channelBadgeColors[selectedEvent.channel]?.pill || "bg-teal-700 text-white"
                    }`}
                  >
                    {channelNames[selectedEvent.channel] || selectedEvent.channel}
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${
                      statusLabels[selectedEvent.status]?.badge || statusLabels.scheduled.badge
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        statusLabels[selectedEvent.status]?.dot || statusLabels.scheduled.dot
                      }`}
                    />
                    <span>{statusLabels[selectedEvent.status]?.label || selectedEvent.status}</span>
                  </span>
                </div>

                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 leading-snug">
                  {selectedEvent.content_title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Meta information: Topic & Rubric */}
              {matchingContentItem && (
                <div className="grid grid-cols-2 gap-3 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">
                      Рубрика
                    </span>
                    <span className="font-medium text-teal-700 dark:text-teal-400">
                      {matchingContentItem.rubric || "Общее"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">
                      Триггер-слово
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {matchingContentItem.trigger_keyword || "РАСЧЕТ"}
                    </span>
                  </div>
                  {matchingContentItem.topic && (
                    <div className="col-span-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">
                        Тема / Ключевые тезисы
                      </span>
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {matchingContentItem.topic}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Date and Time Editor Block */}
              <div className="p-4 bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <Clock size={14} className="text-teal-700 dark:text-teal-400" />
                    <span>Быстрое изменение даты и времени публикации</span>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                      Дата публикации
                    </label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>

                  <div className="w-32">
                    <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                      Время
                    </label>
                    <input
                      type="time"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleSaveDate}
                      className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs shrink-0"
                    >
                      <Save size={13} />
                      <span>Сохранить дату</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Full Text Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-semibold">Полный текст поста для {channelNames[selectedEvent.channel]}:</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedEvent.text)}
                    className="flex items-center gap-1 text-teal-700 dark:text-teal-400 hover:underline font-medium"
                  >
                    {copiedNotification ? (
                      <>
                        <Check size={12} />
                        <span>Скопировано</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Копировать</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto font-sans">
                  {selectedEvent.text}
                </div>

                {/* Published Link Banner */}
                {selectedEvent.post_url && (
                  <div className="p-3 bg-teal-50/80 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-xs text-teal-950 dark:text-teal-200">
                      <CheckCircle2 size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
                      <div>
                        <div className="font-semibold">Материал опубликован в сети</div>
                        <div className="text-[11px] text-teal-700 dark:text-teal-400">
                          {selectedEvent.published_at
                            ? new Date(selectedEvent.published_at).toLocaleString("ru-RU")
                            : "Статус: опубликован"}
                        </div>
                      </div>
                    </div>

                    <a
                      href={selectedEvent.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-2xs shrink-0"
                    >
                      <span>Открыть пост в Telegram</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900">
              {/* Delete / Cancel Publication */}
              <button
                type="button"
                onClick={handleDeleteScheduled}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Отменить публикацию / Удалить из расписания</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Navigate to Content Workspace */}
                {onNavigateToContent && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToContent(selectedEvent.content_item_id, selectedEvent.channel);
                      setSelectedEvent(null);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold transition-colors border border-zinc-300 dark:border-zinc-800 cursor-pointer"
                  >
                    <ExternalLink size={13} className="text-teal-600" />
                    <span>Открыть в редакторе</span>
                  </button>
                )}

                {/* Publish Now Button or Published Status */}
                {selectedEvent.status === "published" ? (
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold">
                    <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Опубликовано</span>
                  </div>
                ) : onPublishNow ? (
                  <button
                    type="button"
                    disabled={isPublishingEvent}
                    onClick={async () => {
                      setIsPublishingEvent(true);
                      try {
                        await onPublishNow(selectedEvent);
                        setNotification(
                          `✓ Пост в ${channelNames[selectedEvent.channel]} успешно опубликован!`,
                        );
                        setSelectedEvent(null);
                      } catch (err: any) {
                        setNotification(
                          `⚠️ Ошибка публикации: ${err.message || "Сбой отправки в Telegram API"}`,
                        );
                      } finally {
                        setIsPublishingEvent(false);
                      }
                      setTimeout(() => setNotification(null), 4000);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-75"
                  >
                    {isPublishingEvent ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                    <span>{isPublishingEvent ? "Публикуем..." : "Опубликовать сейчас"}</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Add New Post to Day from Calendar */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900">
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <CalendarIcon size={16} className="text-teal-600" />
                  <span>Запланировать пост на {addDayNum} сентября 2026 г.</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Привязка материала из контент-плана к выбранному дню и времени
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {/* Date and Time Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Дата публикации
                  </label>
                  <input
                    type="date"
                    required
                    value={addDate}
                    onChange={(e) => setAddDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Время публикации
                  </label>
                  <input
                    type="time"
                    required
                    value={addTime}
                    onChange={(e) => setAddTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>
              </div>

              {/* Select Content Item from Project */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                  <FileText size={13} className="text-teal-600" />
                  <span>Материал из контент-плана</span>
                </label>

                {projectContentItems.length === 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200">
                    В текущем проекте еще нет созданных материалов контента. Создайте материал во вкладке «Контент».
                  </div>
                ) : (
                  <select
                    value={addSelectedItemId}
                    onChange={(e) => setAddSelectedItemId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  >
                    {projectContentItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        [{item.rubric || "Материал"}] {item.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Select Target Channel */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Площадка (канал для публикации)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["vk_wall", "vk_channel", "telegram", "max"] as ChannelType[]).map((ch) => {
                    const isSelected = addSelectedChannel === ch;
                    const badgeTheme = channelBadgeColors[ch];
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setAddSelectedChannel(ch)}
                        className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${
                          isSelected
                            ? `${badgeTheme.bg} ${badgeTheme.border} ring-2 ring-teal-600 font-bold ${badgeTheme.text}`
                            : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {channelNames[ch]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text Preview for the chosen combination */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Предпросмотр текста:
                </label>
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-700 dark:text-zinc-300 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {(() => {
                    const it = projectContentItems.find((i) => i.id === addSelectedItemId);
                    if (!it) return "Выберите материал выше";
                    const vr = it.variants.find((v) => v.channel === addSelectedChannel);
                    return vr?.text || it.topic || it.title;
                  })()}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={projectContentItems.length === 0}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <CalendarIcon size={14} />
                  <span>Запланировать в календаре</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
