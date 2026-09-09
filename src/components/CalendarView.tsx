import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  GripVertical,
  Plus,
  Send,
  X,
} from "lucide-react";
import { CalendarEvent, ChannelType, Project } from "../types";

interface CalendarViewProps {
  activeProject: Project;
  events: CalendarEvent[];
  onUpdateEventDate?: (eventId: string, newDateIso: string) => void;
  onNavigateToContent?: (itemId: string, channel?: ChannelType) => void;
  onPublishNow?: (event: CalendarEvent) => void;
}

const channelBadgeColors: Record<string, { bg: string; text: string; border: string; pill: string }> = {
  vk_wall: {
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    text: "text-emerald-900 dark:text-emerald-200",
    border: "border-emerald-200 dark:border-emerald-800",
    pill: "bg-emerald-600 text-white",
  },
  vk_channel: {
    bg: "bg-sky-50 dark:bg-sky-950/50",
    text: "text-sky-900 dark:text-sky-200",
    border: "border-sky-200 dark:border-sky-800",
    pill: "bg-sky-600 text-white",
  },
  telegram: {
    bg: "bg-blue-50 dark:bg-blue-950/50",
    text: "text-blue-900 dark:text-blue-200",
    border: "border-blue-200 dark:border-blue-800",
    pill: "bg-blue-600 text-white",
  },
  max: {
    bg: "bg-amber-50 dark:bg-amber-950/50",
    text: "text-amber-900 dark:text-amber-200",
    border: "border-amber-200 dark:border-amber-800",
    pill: "bg-amber-600 text-white",
  },
  instagram: {
    bg: "bg-pink-50 dark:bg-pink-950/50",
    text: "text-pink-900 dark:text-pink-200",
    border: "border-pink-200 dark:border-pink-800",
    pill: "bg-pink-600 text-white",
  },
};

const channelNames: Record<string, string> = {
  vk_wall: "VK стена",
  vk_channel: "VK канал",
  telegram: "Telegram",
  max: "MAX",
  instagram: "Instagram",
};

const channelShortCodes: Record<string, string> = {
  vk_wall: "VK",
  vk_channel: "VK Канал",
  telegram: "TG",
  max: "MAX",
  instagram: "IG",
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  activeProject,
  events,
  onUpdateEventDate,
  onNavigateToContent,
  onPublishNow,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Simple clean month view grid for September 2026 (30 days)
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  const handleDrop = (eventId: string, targetDay: number) => {
    setDragOverDay(null);
    setDraggingEventId(null);
    if (!eventId) return;

    const dayStr = targetDay < 10 ? `0${targetDay}` : `${targetDay}`;
    const newDateIso = `2026-09-${dayStr}T12:00:00Z`;

    if (onUpdateEventDate) {
      onUpdateEventDate(eventId, newDateIso);
    }

    const movedEvent = events.find((e) => e.id === eventId);
    const title = movedEvent?.content_title || "Пост";
    setNotification(`✓ «${title}» перенесен на ${targetDay} сентября 2026 г.`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900 select-none overflow-hidden text-zinc-900 dark:text-zinc-100">
      {/* 1. Calendar Header */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-bold text-base">
            <CalendarIcon size={18} className="text-teal-700 dark:text-teal-400" />
            <span>Сентябрь 2026</span>
          </div>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            Контент-план для {activeProject.name} (перетаскивайте посты для смены даты)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {notification && (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
              {notification}
            </span>
          )}

          <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg p-0.5 bg-zinc-50 dark:bg-zinc-800">
            <button
              type="button"
              className="p-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-700"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">Сегодня</span>
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
      <div className="px-6 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 flex items-center gap-4 text-xs">
        <span className="text-zinc-600 dark:text-zinc-400 font-medium">Каналы:</span>
        {Object.entries(channelNames).map(([key, name]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                key === "vk_wall"
                  ? "bg-emerald-500"
                  : key === "vk_channel"
                  ? "bg-sky-500"
                  : key === "telegram"
                  ? "bg-blue-500"
                  : key === "max"
                  ? "bg-amber-500"
                  : "bg-pink-500"
              }`}
            />
            <span className="text-zinc-700 dark:text-zinc-300">{name}</span>
          </div>
        ))}
        <span className="ml-auto text-[11px] text-zinc-600 dark:text-zinc-400 italic">
          💡 Кликните на карточку для просмотра и перехода к редактированию
        </span>
      </div>

      {/* 3. Days of the Week & Month Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-zinc-100/50 dark:bg-zinc-950/50">
        <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
          {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((day) => (
            <div
              key={day}
              className="bg-zinc-100 dark:bg-zinc-900 p-2.5 text-center text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}

          {days.map((dayNum) => {
            // Match events for this day (2026-09-XX)
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
                className={`min-h-[120px] p-2 flex flex-col justify-between transition-all ${
                  isTargetDrop
                    ? "bg-teal-50 dark:bg-teal-950/60 ring-2 ring-teal-600 ring-inset scale-[1.01] z-10"
                    : isToday
                    ? "bg-white dark:bg-zinc-900 ring-2 ring-teal-600 ring-inset"
                    : "bg-white dark:bg-zinc-900 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/60"
                }`}
              >
                {/* Day Number Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-semibold ${
                      isToday
                        ? "w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center leading-none"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono">
                      {dayEvents.length} {dayEvents.length === 1 ? "пост" : "поста"}
                    </span>
                  )}
                </div>

                {/* Events list inside cell */}
                <div className="space-y-1.5 flex-1">
                  {dayEvents.map((ev) => {
                    const theme =
                      channelBadgeColors[ev.channel] || channelBadgeColors.vk_wall;
                    const chShort = channelShortCodes[ev.channel] || ev.channel;
                    const isBeingDragged = draggingEventId === ev.id;

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
                        onClick={() => setSelectedEvent(ev)}
                        className={`w-full text-left p-1.5 rounded-lg text-[11px] border transition-all cursor-grab active:cursor-grabbing group hover:shadow-xs ${
                          theme.bg
                        } ${theme.border} ${
                          isBeingDragged ? "opacity-30 border-dashed" : "opacity-100"
                        }`}
                        title="Нажмите для просмотра или перетащите для изменения даты"
                      >
                        {/* Requirement: Display Post Title prominently, with channel badge */}
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${theme.pill}`}
                          >
                            {chShort}
                          </span>
                          <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono">
                            {ev.scheduled_at.split("T")[1]?.slice(0, 5) || "12:00"}
                          </span>
                        </div>
                        {/* Prominent Post Title */}
                        <div
                          className={`font-semibold text-xs leading-snug line-clamp-2 ${theme.text}`}
                        >
                          {ev.content_title || "Публикация без названия"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Event Details & Quick Edit Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full border border-zinc-200 dark:border-zinc-800 p-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      channelBadgeColors[selectedEvent.channel]?.pill || "bg-teal-700 text-white"
                    }`}
                  >
                    {channelNames[selectedEvent.channel] || selectedEvent.channel}
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    Статус: <strong className="capitalize text-teal-700 dark:text-teal-400">{selectedEvent.status}</strong>
                  </span>
                </div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 leading-snug">
                  {selectedEvent.content_title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Date & Time Picker Info */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 mb-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <Clock size={15} className="text-teal-600 dark:text-teal-400" />
                <span>
                  Запланировано на:{" "}
                  <strong>{new Date(selectedEvent.scheduled_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</strong>{" "}
                  в {selectedEvent.scheduled_at.split("T")[1]?.slice(0, 5) || "12:00"}
                </span>
              </div>
              <span className="text-[10px] text-zinc-600 dark:text-zinc-400 italic">
                (перетаскивайте по календарю)
              </span>
            </div>

            {/* Text Preview */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1 text-xs text-zinc-600 dark:text-zinc-400">
                <span>Превью текста публикации:</span>
                <button
                  type="button"
                  onClick={() => handleCopyText(selectedEvent.text)}
                  className="flex items-center gap-1 text-teal-700 dark:text-teal-400 hover:underline"
                >
                  {copiedNotification ? (
                    <>
                      <Check size={12} />
                      <span>Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Скопировать</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto font-sans">
                {selectedEvent.text}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Закрыть
              </button>

              <div className="flex items-center gap-2">
                {/* Requirement: "Перейти к редактированию" Button */}
                {onNavigateToContent && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToContent(selectedEvent.content_item_id, selectedEvent.channel);
                      setSelectedEvent(null);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-semibold transition-colors border border-zinc-300 dark:border-zinc-700"
                  >
                    <Edit3 size={14} className="text-teal-600 dark:text-teal-400" />
                    <span>Перейти к редактированию</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (onPublishNow) {
                      onPublishNow(selectedEvent);
                    }
                    setNotification(`✓ Пост в ${channelNames[selectedEvent.channel]} успешно отправлен в публикацию!`);
                    setSelectedEvent(null);
                    setTimeout(() => setNotification(null), 3500);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                >
                  <Send size={13} />
                  <span>Опубликовать сейчас</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
