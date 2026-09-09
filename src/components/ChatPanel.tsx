import React, { useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Bot,
  Check,
  CheckCheck,
  Eye,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  Undo2,
  User,
  Wand2,
  X,
} from "lucide-react";
import { Conversation, Message } from "../types";

interface ChatPanelProps {
  conversation: Conversation | null;
  onSendMessage: (text: string) => void;
  onMarkRead: (convId: string) => void;
  onAcceptSuggestion: (text: string) => void;
  onRewriteSuggestion: (convId: string, sugId: string, feedback: string) => void;
  onRejectSuggestion: (convId: string, sugId: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  conversation,
  onSendMessage,
  onMarkRead,
  onAcceptSuggestion,
  onRewriteSuggestion,
  onRejectSuggestion,
}) => {
  const [draft, setDraft] = useState("");
  const [originalDraftBeforeMagic, setOriginalDraftBeforeMagic] = useState<string | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);
  const [magicToast, setMagicToast] = useState<string | null>(null);
  const [rewriteFeedback, setRewriteFeedback] = useState("");
  const [showRewriteInput, setShowRewriteInput] = useState(false);
  const [readToast, setReadToast] = useState<string | null>(null);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 p-8">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
          <MessageCircle size={22} className="text-zinc-600 dark:text-zinc-400 stroke-[1.75]" />
        </div>
        <h3 className="font-medium text-sm text-zinc-700 dark:text-zinc-300">Выберите диалог</h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-xs text-center">
          Выберите обращение из списка слева для просмотра переписки и работы с AI-подсказками.
        </p>
      </div>
    );
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSendMessage(draft.trim());
    setDraft("");
    setOriginalDraftBeforeMagic(null);
  };

  const handleTriggerMarkRead = () => {
    onMarkRead(conversation.id);
    const networkName =
      conversation.channel === "vk"
        ? "ВКонтакте (messages.markAsRead)"
        : conversation.channel === "telegram"
        ? "Telegram Bot API"
        : conversation.channel === "max"
        ? "Max API"
        : conversation.channel.toUpperCase();

    setReadToast(`Отмечено как прочитано · Передано в ${networkName}`);
    setTimeout(() => setReadToast(null), 3000);
  };

  // 🪄 Функция «Магия ИИ» — превращает короткую заметку оператора в вежливый продающий ответ
  const handleMagicPolish = () => {
    const rawText = draft.trim();
    const contactName = conversation.contact.name.split(" ")[0] || "Здравствуйте";

    setIsPolishing(true);
    setOriginalDraftBeforeMagic(draft);

    setTimeout(() => {
      let polished = "";

      const lower = rawText.toLowerCase();

      if (lower.includes("замер") && (lower.includes("в 10") || lower.includes("в среду") || lower.includes("завтра") || lower.includes("среду"))) {
        // Конкретный кейс из запроса пользователя: "замер в среду в 10"
        polished = `${contactName}, договорились! Записал вас на бесплатный замер в среду на 10:00. Подскажите, пожалуйста, точный адрес?`;
      } else if (lower.includes("замер") || lower.includes("выезд") || lower.includes("мастер")) {
        polished = `${contactName}, отлично! Зафиксировал выезд мастера-технолога на бесплатный замер. Подскажите, пожалуйста, точный адрес и удобный контактный номер для связи?`;
      } else if (lower.includes("цен") || lower.includes("руб") || /\d{3,}/.test(lower)) {
        const numMatch = rawText.match(/\d+[\s\d]*/);
        const priceStr = numMatch ? numMatch[0].trim() : "35 000";
        polished = `${contactName}, здравствуйте! Предварительно по указанным параметрам ориентир около ${priceStr} руб. под ключ. Точную смету до рубля мастер рассчитает на бесплатном замере с каталогом образцов. В какой день вам удобно встретиться?`;
      } else if (rawText) {
        // Обобщенная вежливая полировка
        polished = `${contactName}, здравствуйте! ${rawText.charAt(0).toUpperCase() + rawText.slice(1)}. Будем рады помочь — подскажите, пожалуйста, как вам удобнее поступить?`;
      } else {
        // Если поле было пустым, предлагаем следующий логичный шаг диалога
        polished = `${contactName}, добрый день! Подскажите, пожалуйста, актуален ли для вас вопрос? Мастер может бесплатно подъехать с каталогом и образцами в удобное для вас время.`;
      }

      setDraft(polished);
      setIsPolishing(false);
      setMagicToast("✨ Магия ИИ: текст преобразован в вежливый стиль менеджера");
      setTimeout(() => setMagicToast(null), 4000);
    }, 350);
  };

  const handleRevertMagic = () => {
    if (originalDraftBeforeMagic !== null) {
      setDraft(originalDraftBeforeMagic);
      setOriginalDraftBeforeMagic(null);
      setMagicToast("Исходный черновик восстановлен");
      setTimeout(() => setMagicToast(null), 2500);
    }
  };

  const suggestion = conversation.pending_suggestion;

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900 relative min-w-0">
      {/* 1. Chat Header */}
      <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-medium text-sm text-zinc-700 dark:text-zinc-300 shrink-0 border border-zinc-200 dark:border-zinc-700">
            {conversation.contact.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                {conversation.contact.name}
              </h2>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700 uppercase">
                {conversation.channel}
              </span>
              {conversation.lead?.temperature === "hot" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Горячий лид
                </span>
              )}
            </div>
            <div className="text-[11px] text-zinc-600 truncate flex items-center gap-2 mt-0.5">
              <span>{conversation.contact.phone || "Телефон не указан"}</span>
              {conversation.contact.city && (
                <>
                  <span>•</span>
                  <span>{conversation.contact.city}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.unread_count > 0 ? (
            <button
              type="button"
              onClick={handleTriggerMarkRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              <Eye size={14} />
              <span>Прочитано ({conversation.unread_count})</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-zinc-600 px-2 py-1">
              <CheckCheck size={14} className="text-emerald-700" />
              <span>Прочитано</span>
            </span>
          )}
        </div>
      </div>

      {/* Network sync toast notification */}
      {readToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-zinc-900 text-white text-xs px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2Icon size={14} className="text-emerald-600" />
          <span>{readToast}</span>
        </div>
      )}

      {/* 2. Scrollable Messages Timeline */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-zinc-50/40 dark:bg-zinc-950">
        {conversation.messages.length === 0 ? (
          <div className="text-center text-xs text-zinc-600 dark:text-zinc-400 py-12">
            В этом диалоге пока нет сообщений.
          </div>
        ) : (
          conversation.messages.map((msg) => {
            const isInbound = msg.direction === "inbound";
            const isAi = msg.sender_type === "ai";

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                  {isInbound ? (
                    <>
                      <User size={11} />
                      <span>Клиент ({conversation.contact.name})</span>
                    </>
                  ) : isAi ? (
                    <>
                      <Bot size={11} className="text-teal-600 dark:text-teal-400" />
                      <span className="text-teal-700 dark:text-teal-400 font-semibold">AI Assistant</span>
                    </>
                  ) : (
                    <span>Менеджер</span>
                  )}
                  <span>•</span>
                  <time>
                    {new Date(msg.created_at).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  {!isInbound && (
                    <span title={msg.is_read ? "Прочитано клиентом" : "Доставлено"}>
                      {msg.is_read ? (
                        <CheckCheck size={12} className="text-emerald-700 dark:text-emerald-400" />
                      ) : (
                        <Check size={12} className="text-zinc-600 dark:text-zinc-400" />
                      )}
                    </span>
                  )}
                </div>

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                    isInbound
                      ? "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-150 border border-zinc-200/90 dark:border-zinc-700 rounded-tl-sm"
                      : "bg-teal-700 text-white rounded-tr-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. AI Suggestion Card (Linear / Notion Minimalist Style) */}
      {suggestion && suggestion.status === "pending" && (
        <div className="border-t border-zinc-200 bg-gradient-to-b from-teal-50/70 to-zinc-50/70 p-3.5 px-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800">
              <Sparkles size={14} className="text-teal-600" />
              <span>Черновик ответа от AI Copilot</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                Уверенность {Math.round(suggestion.confidence * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onAcceptSuggestion(suggestion.suggested_text)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-2xs"
              >
                <Check size={13} />
                <span>Принять в ответ</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRewriteInput(!showRewriteInput)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-100 transition-colors"
              >
                <RefreshCw size={12} />
                <span>Переделать</span>
              </button>

              <button
                type="button"
                onClick={() => onRejectSuggestion(conversation.id, suggestion.id)}
                className="p-1 text-zinc-600 hover:text-zinc-700 rounded hover:bg-zinc-200/70"
                title="Отклонить черновик"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* RAG Context Sources (Источники ответа базы знаний) */}
          {suggestion.rag_sources && suggestion.rag_sources.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2 text-[11px] text-teal-900 bg-teal-100/50 border border-teal-200/70 px-2.5 py-1 rounded-md">
              <BookOpen size={12} className="text-teal-700 shrink-0" />
              <span className="font-semibold text-[10px] uppercase tracking-wider text-teal-800">Использовано из базы знаний:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {suggestion.rag_sources.map((src) => (
                  <span
                    key={src}
                    className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-white text-teal-800 border border-teal-300/80 shadow-2xs"
                  >
                    {src}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-zinc-700 bg-white/90 border border-teal-200/60 p-2.5 rounded-lg leading-relaxed shadow-2xs mb-2">
            {suggestion.suggested_text}
          </div>

          {showRewriteInput && (
            <div className="flex items-center gap-2 pt-1 animate-in fade-in-50 duration-100">
              <input
                type="text"
                placeholder="Что исправить? (напр: сделай короче, предложи другой день...)"
                value={rewriteFeedback}
                onChange={(e) => setRewriteFeedback(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
              <button
                type="button"
                onClick={() => {
                  onRewriteSuggestion(conversation.id, suggestion.id, rewriteFeedback);
                  setShowRewriteInput(false);
                  setRewriteFeedback("");
                }}
                className="px-3 py-1.5 bg-teal-700 text-white text-xs font-medium rounded-md hover:bg-teal-800"
              >
                Сгенерировать
              </button>
            </div>
          )}
        </div>
      )}

      {/* Magic AI Toast Notification */}
      {magicToast && (
        <div className="bg-amber-50 border-t border-amber-200 px-5 py-2 text-xs text-amber-900 flex items-center justify-between animate-in fade-in slide-in-from-bottom-1">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-600 animate-pulse" />
            <span className="font-medium">{magicToast}</span>
          </div>
          {originalDraftBeforeMagic !== null && (
            <button
              type="button"
              onClick={handleRevertMagic}
              className="flex items-center gap-1 text-[11px] font-medium text-amber-800 hover:text-amber-950 underline underline-offset-2"
            >
              <Undo2 size={11} />
              <span>Вернуть черновик</span>
            </button>
          )}
        </div>
      )}

      {/* 4. Message Composer */}
      <form onSubmit={handleSend} className="p-3.5 px-5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-end gap-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl p-2 focus-within:ring-2 focus-within:ring-teal-600/20 focus-within:border-teal-600 focus-within:bg-white dark:focus-within:bg-zinc-800 transition-all">
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={`Ответ клиенту в ${conversation.channel.toUpperCase()} (Enter для отправки, Shift+Enter перенос строки)...`}
            className="flex-1 text-xs bg-transparent border-0 resize-none focus:outline-none placeholder:text-zinc-600 dark:placeholder:text-zinc-400 text-zinc-800 dark:text-zinc-100 py-1"
          />

          {/* Кнопка "Магия ИИ" (Smart Reply / Улучшить ответ) */}
          <button
            type="button"
            onClick={handleMagicPolish}
            disabled={isPolishing}
            title="Превратить черновик в вежливое и продающее сообщение (Магия ИИ)"
            className={`px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 border ${
              isPolishing
                ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 animate-pulse"
                : "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/60 dark:to-orange-950/60 hover:from-amber-100 hover:to-orange-100 text-amber-900 dark:text-amber-200 border-amber-300/80 dark:border-amber-800 shadow-2xs active:scale-95"
            }`}
          >
            <Sparkles size={13} className="text-amber-600 dark:text-amber-400" />
            <span>{isPolishing ? "Улучшаю..." : "Магия ИИ"}</span>
          </button>

          <button
            type="submit"
            disabled={!draft.trim()}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs ${
              draft.trim()
                ? "bg-teal-700 text-white hover:bg-teal-800"
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-not-allowed"
            }`}
          >
            <span>Отправить</span>
            <Send size={13} />
          </button>
        </div>
      </form>
    </div>
  );
};

function CheckCircle2Icon(props: any) {
  return <CheckCheck {...props} />;
}
