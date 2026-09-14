import React, { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  BookOpen,
  Bot,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Info,
  Loader2,
  Lock,
  MessageCircle,
  Paperclip,
  Percent,
  RefreshCw,
  Ruler,
  Send,
  Server,
  Sparkles,
  TrendingDown,
  Undo2,
  User,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { Conversation, Message, Project, AiSuggestion } from "../types";
import { MessageBubble } from "./MessageBubble";
import {
  generateCopilotReply,
  buildCopilotContext,
  LLMProviderType,
  LLMMessage,
} from "../services/llmService";

interface ChatPanelProps {
  conversation: Conversation | null;
  activeProject?: Project;
  onSendMessage: (
    text: string,
    isInternalNote?: boolean,
    attachmentFile?: File,
  ) => Promise<Message | void> | void;
  onMarkRead: (convId: string) => void;
  onAcceptSuggestion?: (text: string) => void;
  onRewriteSuggestion?: (convId: string, sugId: string, feedback: string) => void;
  onRejectSuggestion?: (convId: string, sugId: string) => void;
  onUpdateSuggestion?: (convId: string, suggestion: AiSuggestion) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  conversation,
  activeProject,
  onSendMessage,
  onMarkRead,
  onAcceptSuggestion,
  onRewriteSuggestion,
  onRejectSuggestion,
  onUpdateSuggestion,
}) => {
  const [draft, setDraft] = useState("");
  const [originalDraftBeforeMagic, setOriginalDraftBeforeMagic] = useState<string | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);
  const [magicToast, setMagicToast] = useState<string | null>(null);
  const [rewriteFeedback, setRewriteFeedback] = useState("");
  const [showRewriteInput, setShowRewriteInput] = useState(false);
  const [readToast, setReadToast] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string } | null>(null);

  // File Upload State (📎 Прикрепление фото и файлов для отправки в Telegram)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      try {
        const preview = URL.createObjectURL(file);
        setFilePreviewUrl(preview);
      } catch {
        setFilePreviewUrl(null);
      }
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) {
      try {
        URL.revokeObjectURL(filePreviewUrl);
      } catch {}
      setFilePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // AI Copilot State
  const [llmProvider, setLlmProvider] = useState<LLMProviderType>("local_llama");
  const [isGeneratingCopilot, setIsGeneratingCopilot] = useState(false);
  const [editableSuggestionText, setEditableSuggestionText] = useState("");
  const [showContextInspector, setShowContextInspector] = useState(false);
  const [inspectedContext, setInspectedContext] = useState<{
    messages: LLMMessage[];
    rag_sources: string[];
  } | null>(null);

  // UX Requirement: Collapse / Expand Draft Card (по умолчанию СВЕРНУТ)
  const [isDraftCollapsed, setIsDraftCollapsed] = useState(true);

  // UX Requirement: Private Notes Toggle ([✉️ Клиенту] vs [🔒 Заметка])
  const [composerMode, setComposerMode] = useState<"client" | "note">("client");

  // UX Requirement: Нажатие клавиши Tab разворачивает / сворачивает черновик
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const target = e.target as HTMLElement;
        const isEditingTextarea = target.tagName === "TEXTAREA" && (target as HTMLTextAreaElement).value.length > 0;
        if (!isEditingTextarea) {
          e.preventDefault();
          setIsDraftCollapsed((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync editable suggestion text when conversation or pending suggestion changes
  useEffect(() => {
    if (conversation?.pending_suggestion?.suggested_text) {
      setEditableSuggestionText(conversation.pending_suggestion.suggested_text);
    } else {
      setEditableSuggestionText("");
    }
  }, [conversation?.id, conversation?.pending_suggestion?.suggested_text]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 p-8 select-none">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
          <MessageCircle size={22} className="text-zinc-400 dark:text-zinc-500 stroke-[1.75]" />
        </div>
        <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-200">Выберите диалог</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs text-center">
          Выберите обращение из списка слева для просмотра переписки и работы с AI Copilot.
        </p>
      </div>
    );
  }

  // Fallback project if none provided
  const currentProject: Project = activeProject || {
    id: conversation.project_id || "proj-ceilings",
    name: "ФЕНИКС PRO Потолки",
    slug: "ceilings",
    niche_type: "ceilings",
    description: "Натяжные потолки",
    knowledge_dir: "/app/knowledge/ceilings",
    system_prompt:
      "Ты AI-помощник менеджера компании ФЕНИКС PRO по натяжным потолкам. Пиши краткий, вежливый черновик ответа клиенту. Мягко веди к бесплатному замеру.",
    is_active: true,
    color: "#0f766e",
    created_at: "2026-08-01T10:00:00Z",
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() && !selectedFile) return;
    const isNote = composerMode === "note";
    const textToSend = draft.trim();
    const fileToSend = selectedFile || undefined;

    setDraft("");
    setOriginalDraftBeforeMagic(null);
    handleClearFile();

    if (isNote) {
      onSendMessage(textToSend, true);
      setMagicToast("🔒 Заметка сохранена и добавлена в карточку диалога");
      setTimeout(() => setMagicToast(null), 3000);
      return;
    }

    try {
      const res: any = await onSendMessage(textToSend, false, fileToSend);
      if (res && res.delivery_status === "failed") {
        const errDesc = res.payload?.error || "Сбой отправки сообщения в Telegram";
        console.error("Telegram API Error in ChatPanel:", errDesc);
        const toastMsg = errDesc.startsWith("Telegram API Error:") ? errDesc : `Telegram API Error: ${errDesc}`;
        setMagicToast(`⚠️ ${toastMsg}`);
        setTimeout(() => setMagicToast(null), 6000);
      } else if (res && res.delivery_status === "delivered") {
        if (fileToSend) {
          const isPhoto = fileToSend.type.startsWith("image/");
          setMagicToast(isPhoto ? "✓ Фотография отправлена в Telegram" : "✓ Документ отправлен в Telegram");
        } else {
          setMagicToast("✓ Отправлено клиенту в Telegram");
        }
        setTimeout(() => setMagicToast(null), 3500);
      }
    } catch (err: any) {
      const errDesc = err?.message || "Сбой связи";
      console.error("Telegram API Error in ChatPanel:", err);
      setMagicToast(`⚠️ Telegram API Error: ${errDesc}`);
      setTimeout(() => setMagicToast(null), 6000);
    }
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

  // 🤖 Генерация ответа через AI Copilot
  const handleGenerateCopilot = async (customFeedback?: string) => {
    setIsGeneratingCopilot(true);
    setShowRewriteInput(false);
    setIsDraftCollapsed(false); // Auto expand when regenerating

    try {
      const result = await generateCopilotReply({
        provider: llmProvider,
        project: currentProject,
        conversation,
        feedback: customFeedback || rewriteFeedback,
      });

      setEditableSuggestionText(result.text);

      const newSug: AiSuggestion = {
        id: `sug-${Date.now()}`,
        suggested_text: result.text,
        confidence: result.confidence,
        mode: "draft",
        status: "pending",
        provider: result.provider,
        model: result.model,
        rag_sources: result.rag_sources,
        created_at: new Date().toISOString(),
      };

      if (onUpdateSuggestion) {
        onUpdateSuggestion(conversation.id, newSug);
      }

      const providerLabel =
        result.provider === "local_llama" ? "Bonsai 27B (local)" : "OpenAI GPT-4o-mini";
      setMagicToast(`✨ Ответ сгенерирован через ${providerLabel}`);
      setTimeout(() => setMagicToast(null), 4000);
    } catch (err: any) {
      setMagicToast(`Ошибка генерации: ${err.message || "Сбой связи с LLM"}`);
      setTimeout(() => setMagicToast(null), 4000);
    } finally {
      setIsGeneratingCopilot(false);
      setRewriteFeedback("");
    }
  };

  // Принять черновик в поле ответа
  const handleAcceptToDraft = () => {
    const textToUse =
      editableSuggestionText ||
      conversation.pending_suggestion?.suggested_text ||
      "";
    if (!textToUse) return;

    setDraft(textToUse);
    setComposerMode("client"); // Switch to client mode
    setMagicToast("✓ Черновик перенесен в поле ввода. Проверьте и нажмите «Отправить».");
    setTimeout(() => setMagicToast(null), 3500);
  };

  // Посмотреть собранный глубокий контекст
  const handleToggleContext = () => {
    if (!showContextInspector) {
      const ctx = buildCopilotContext(currentProject, conversation, rewriteFeedback);
      setInspectedContext(ctx);
    }
    setShowContextInspector(!showContextInspector);
  };

  // 🪄 Функция быстрой стилистической полировки текущего ввода
  const handleMagicPolish = () => {
    const rawText = draft.trim();
    if (!rawText) {
      handleGenerateCopilot();
      return;
    }

    const contactName = conversation.contact.name.split(" ")[0] || "Здравствуйте";
    setIsPolishing(true);
    setOriginalDraftBeforeMagic(draft);

    setTimeout(() => {
      let polished = "";
      const lower = rawText.toLowerCase();

      if (lower.includes("замер") && (lower.includes("в 10") || lower.includes("в среду") || lower.includes("завтра"))) {
        polished = `${contactName}, договорились! Записал вас на бесплатный замер в среду на 10:00. Подскажите, пожалуйста, точный адрес?`;
      } else if (lower.includes("замер") || lower.includes("выезд") || lower.includes("мастер")) {
        polished = `${contactName}, отлично! Зафиксировал выезд мастера-технолога на бесплатный замер. Подскажите, пожалуйста, точный адрес и удобный контактный номер для связи?`;
      } else if (lower.includes("цен") || lower.includes("руб") || /\d{3,}/.test(lower)) {
        const numMatch = rawText.match(/\d+[\s\d]*/);
        const priceStr = numMatch ? numMatch[0].trim() : "35 000";
        polished = `${contactName}, здравствуйте! Предварительно по указанным параметрам ориентир около ${priceStr} руб. под ключ. Точную смету мастер рассчитает на бесплатном замере с каталогом образцов. В какой день вам удобно встретиться?`;
      } else {
        polished = `${contactName}, здравствуйте! ${rawText.charAt(0).toUpperCase() + rawText.slice(1)}. Будем рады помочь — подскажите, как вам удобнее поступить?`;
      }

      setDraft(polished);
      setIsPolishing(false);
      setMagicToast("✨ Текст преобразован в вежливый продающий стиль менеджера");
      setTimeout(() => setMagicToast(null), 4000);
    }, 300);
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
  const isSuggestionActive =
    suggestion &&
    suggestion.status !== "rejected" &&
    (editableSuggestionText || isGeneratingCopilot);

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900 relative min-w-0">
      {/* ========================================================================= */}
      {/* 1. CHAT HEADER                                                            */}
      {/* ========================================================================= */}
      <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {conversation.contact.avatar_url ? (
            <img
              src={conversation.contact.avatar_url}
              alt={conversation.contact.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-2xs"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-medium text-sm text-zinc-700 dark:text-zinc-300 shrink-0 border border-zinc-200 dark:border-zinc-800">
              {conversation.contact.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                {conversation.contact.name}
              </h2>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase font-mono border ${
                conversation.channel === "vk"
                  ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                  : conversation.channel === "telegram"
                  ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800"
              }`}>
                {conversation.channel}
              </span>
              {conversation.lead?.temperature === "hot" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                  🔥 Горячий
                </span>
              )}
              {conversation.contact.vk_url && (
                <a
                  href={conversation.contact.vk_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5"
                  title="Открыть профиль ВКонтакте"
                >
                  <span>VK профиль</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-2 mt-0.5">
              <span>{conversation.contact.phone || "Телефон не указан"}</span>
              {conversation.contact.city && (
                <>
                  <span>•</span>
                  <span>{conversation.contact.city}</span>
                </>
              )}
              <span>•</span>
              <span className="text-teal-700 dark:text-teal-400 font-medium">
                {currentProject.name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.unread_count > 0 ? (
            <button
              type="button"
              onClick={handleTriggerMarkRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 transition-colors shadow-2xs cursor-pointer"
            >
              <Eye size={14} />
              <span>Прочитано ({conversation.unread_count})</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500 px-2 py-1">
              <CheckCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Прочитано</span>
            </span>
          )}
        </div>
      </div>

      {/* Network sync toast notification */}
      {readToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-zinc-900 text-white text-xs px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCheck size={14} className="text-emerald-400" />
          <span>{readToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SCROLLABLE MESSAGES TIMELINE WITH PRIVATE NOTE & RICH MEDIA SUPPORT    */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-zinc-50/50 dark:bg-zinc-950">
        {conversation.messages.length === 0 ? (
          <div className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-12">
            В этом диалоге пока нет сообщений.
          </div>
        ) : (
          conversation.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              clientName={conversation.contact.name}
              onPreviewImage={(url, title) => setPreviewImage({ url, title })}
            />
          ))
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. AI COPILOT DRAFT CARD (COLLAPSED BY DEFAULT: 36-40px COMPACT BAR)      */}
      {/* ========================================================================= */}
      {isDraftCollapsed ? (
        <div className="h-10 px-4 border-t border-teal-200/80 dark:border-teal-900/60 bg-gradient-to-r from-teal-50/90 via-emerald-50/70 to-zinc-50 dark:from-teal-950/60 dark:to-zinc-900 flex items-center justify-between text-xs shrink-0 select-none transition-all">
          <div
            onClick={() => setIsDraftCollapsed(false)}
            className="flex items-center gap-2 cursor-pointer truncate mr-2 hover:opacity-90 min-w-0"
            title="Кликните или нажмите Tab, чтобы развернуть черновик"
          >
            <Sparkles size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="font-semibold text-teal-950 dark:text-teal-100 truncate flex items-center gap-1.5">
              <span>✨ AI Copilot готов предложить ответ ({Math.round((suggestion?.confidence || 0.95) * 100)}% уверенность)</span>
            </span>
            {editableSuggestionText && (
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-sm italic hidden md:inline">
                «{editableSuggestionText}»
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsDraftCollapsed(false)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-zinc-800 border border-teal-300/80 dark:border-teal-800 text-teal-900 dark:text-teal-200 hover:bg-teal-100/70 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
              title="Развернуть черновик (клавиша Tab)"
            >
              <ChevronUp size={12} />
              <span>Развернуть (Tab)</span>
            </button>

            <button
              type="button"
              onClick={handleAcceptToDraft}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
              title="Принять сразу в поле ответа"
            >
              <Check size={12} />
              <span>Принять сразу</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-teal-200 dark:border-teal-900 bg-gradient-to-b from-teal-50/60 to-white dark:from-teal-950/40 dark:to-zinc-900 p-3 px-5 max-h-72 overflow-y-auto transition-all shadow-md">
          <div>
            {/* Header: Title, Provider Switcher [Локальная Bonsai 27B] / [OpenAI GPT], Collapse Button */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900 dark:text-teal-200">
                  <Sparkles size={15} className="text-teal-600 dark:text-teal-400" />
                  <span>Черновик ответа от AI Copilot</span>
                </div>

                {/* Confidence pill */}
                {suggestion && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100/90 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    Уверенность {Math.round((suggestion.confidence || 0.94) * 100)}%
                  </span>
                )}
              </div>

              {/* Controls: Provider Switcher + Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Provider switcher */}
                <div className="flex items-center p-0.5 bg-white dark:bg-zinc-800 border border-teal-200 dark:border-teal-900/80 rounded-lg shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setLlmProvider("local_llama")}
                    title="Локальный llama-server.exe (http://localhost:8080/v1) с моделью Ternary-Bonsai-27B"
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      llmProvider === "local_llama"
                        ? "bg-teal-700 text-white shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    <Server size={12} />
                    <span>Bonsai 27B (local)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLlmProvider("openai")}
                    title="Облачный OpenAI API (gpt-4o-mini)"
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      llmProvider === "openai"
                        ? "bg-teal-700 text-white shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    <Cpu size={12} />
                    <span>OpenAI GPT</span>
                  </button>
                </div>

                {/* Generate / Regenerate button */}
                <button
                  type="button"
                  disabled={isGeneratingCopilot}
                  onClick={() => handleGenerateCopilot()}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingCopilot ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Генерация...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} className="text-amber-300" />
                      <span>{editableSuggestionText ? "Перегенерировать" : "Сгенерировать"}</span>
                    </>
                  )}
                </button>

                {/* Collapse button */}
                {isSuggestionActive && (
                  <button
                    type="button"
                    onClick={() => setIsDraftCollapsed(true)}
                    className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
                    title="Свернуть плашку черновика"
                  >
                    <ChevronUp size={15} />
                  </button>
                )}

                {/* Dismiss suggestion */}
                {suggestion && onRejectSuggestion && (
                  <button
                    type="button"
                    onClick={() => onRejectSuggestion(conversation.id, suggestion.id)}
                    className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
                    title="Скрыть черновик"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Loading Spinner State */}
            {isGeneratingCopilot && (
              <div className="p-4 bg-white/90 dark:bg-zinc-900/90 border border-teal-200/80 dark:border-teal-900 rounded-xl mb-2 flex items-center gap-3 animate-in fade-in">
                <Loader2 size={18} className="text-teal-700 dark:text-teal-400 animate-spin shrink-0" />
                <div className="text-xs text-zinc-700 dark:text-zinc-300">
                  <span className="font-semibold block text-teal-900 dark:text-teal-200">
                    Генерация ответа через{" "}
                    {llmProvider === "local_llama"
                      ? "Ternary-Bonsai-27B (llama-server)"
                      : "OpenAI gpt-4o-mini"}
                    ...
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Сбор RAG базы знаний, параметров помещения CRM и истории диалога
                  </span>
                </div>
              </div>
            )}

            {/* QUICK ACTION CHIPS (Кнопки быстрой модификации ответа ИИ в 1 клик) */}
            {!isGeneratingCopilot && isSuggestionActive && (
              <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mr-1">
                  Быстрые команды:
                </span>

                {/* Chip 1: Короче */}
                <button
                  type="button"
                  onClick={() => handleGenerateCopilot("Сделай ответ предельно кратким, 1-2 емких предложения")}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white dark:bg-zinc-800 hover:bg-teal-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-teal-800 dark:hover:text-teal-300 border border-zinc-300/80 dark:border-zinc-800 hover:border-teal-400 transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <TrendingDown size={12} className="text-sky-600 dark:text-sky-400" />
                  <span>📉 Короче</span>
                </button>

                {/* Chip 2: На замер */}
                <button
                  type="button"
                  onClick={() => handleGenerateCopilot("Сделай жесткий фокус на закрытие на бесплатный замер с образцами материалов")}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white dark:bg-zinc-800 hover:bg-teal-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-teal-800 dark:hover:text-teal-300 border border-zinc-300/80 dark:border-zinc-800 hover:border-teal-400 transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <Ruler size={12} className="text-teal-600 dark:text-teal-400" />
                  <span>📐 На замер</span>
                </button>

                {/* Chip 3: Вилка цен */}
                <button
                  type="button"
                  onClick={() => handleGenerateCopilot("Добавь безопасную вилку цен из сметы калькулятора с оговоркой про точный замер")}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white dark:bg-zinc-800 hover:bg-teal-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-teal-800 dark:hover:text-teal-300 border border-zinc-300/80 dark:border-zinc-800 hover:border-teal-400 transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <Zap size={12} className="text-amber-500" />
                  <span>💰 Вилка цен</span>
                </button>

                {/* Chip 4: Скидка */}
                <button
                  type="button"
                  onClick={() => handleGenerateCopilot("Добавь аргумент спецпредложения (скидка 10% новоселам / акция недели)")}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white dark:bg-zinc-800 hover:bg-teal-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-teal-800 dark:hover:text-teal-300 border border-zinc-300/80 dark:border-zinc-800 hover:border-teal-400 transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <Percent size={12} className="text-rose-500" />
                  <span>🎁 Скидка 10%</span>
                </button>
              </div>
            )}

            {/* Content Body: Sources + Editable Text + Actions */}
            {!isGeneratingCopilot && isSuggestionActive && (
              <div>
                {/* RAG Context Sources (Источники базы знаний) */}
                {suggestion?.rag_sources && suggestion.rag_sources.length > 0 && (
                  <div className="flex items-center justify-between gap-1.5 mb-2 text-[11px] text-teal-900 dark:text-teal-300 bg-teal-100/60 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-850 px-2.5 py-1 rounded-md">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <BookOpen size={12} className="text-teal-700 dark:text-teal-400 shrink-0" />
                      <span className="font-semibold text-[10px] uppercase tracking-wider">
                        База знаний:
                      </span>
                      {suggestion.rag_sources.map((src) => (
                        <span
                          key={src}
                          className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 text-teal-800 dark:text-teal-300 border border-teal-300/80 dark:border-teal-800 shadow-2xs"
                        >
                          {src}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleContext}
                      className="flex items-center gap-0.5 text-[10px] font-medium text-teal-800 dark:text-teal-400 hover:underline shrink-0"
                    >
                      <Info size={11} />
                      <span>{showContextInspector ? "Скрыть контекст" : "Контекст RAG+CRM"}</span>
                    </button>
                  </div>
                )}

                {/* Deep Context Inspector Dropdown */}
                {showContextInspector && inspectedContext && (
                  <div className="mb-2 p-3 bg-zinc-900 text-zinc-200 rounded-lg text-[11px] font-mono border border-zinc-800 max-h-48 overflow-y-auto space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800 font-bold text-teal-400">
                      <span>СТРУКТУРИРОВАННЫЙ КОНТЕКСТ LLM ({inspectedContext.messages.length} сообщений)</span>
                      <button
                        type="button"
                        onClick={() => setShowContextInspector(false)}
                        className="text-zinc-400 hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {inspectedContext.messages.map((m, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <span className="text-amber-400 font-semibold uppercase text-[10px]">
                          [{m.role}]:
                        </span>
                        <p className="whitespace-pre-wrap pl-2 text-zinc-300 text-[10px] bg-zinc-800/60 p-1.5 rounded">
                          {m.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Editable Draft Textarea */}
                <div className="relative mb-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                    <span className="flex items-center gap-1 font-medium">
                      <Edit3 size={11} className="text-teal-600 dark:text-teal-400" />
                      <span>Текст черновика (можно редактировать прямо здесь):</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                      Модель: {suggestion?.model || (llmProvider === "local_llama" ? "Ternary-Bonsai-27B" : "gpt-4o-mini")}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={editableSuggestionText}
                    onChange={(e) => setEditableSuggestionText(e.target.value)}
                    placeholder="Сгенерированный текст ответа..."
                    className="w-full text-xs text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-teal-200/80 dark:border-zinc-800 p-2.5 rounded-lg leading-relaxed shadow-2xs focus:outline-none focus:ring-1 focus:ring-teal-500 resize-y"
                  />
                </div>

                {/* Action Buttons: «Принять в ответ», «Перегенерировать», «Скрыть» */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAcceptToDraft}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-colors shadow-2xs cursor-pointer"
                    >
                      <Check size={13} />
                      <span>Принять в ответ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenerateCopilot()}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      <span>Перегенерировать</span>
                    </button>
                  </div>

                  {suggestion && onRejectSuggestion && (
                    <button
                      type="button"
                      onClick={() => onRejectSuggestion(conversation.id, suggestion.id)}
                      className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                    >
                      Скрыть
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Empty state prompt */}
            {!isGeneratingCopilot && !isSuggestionActive && (
              <div className="py-2 text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                <span>
                  Нажмите <strong>«Сгенерировать»</strong>, чтобы сформировать черновик с учетом цен и истории диалога.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Magic AI Toast Notification */}
      {magicToast && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-t border-amber-200 dark:border-amber-900 px-5 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between animate-in fade-in slide-in-from-bottom-1">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-600 dark:text-amber-400 animate-pulse" />
            <span className="font-medium">{magicToast}</span>
          </div>
          {originalDraftBeforeMagic !== null && (
            <button
              type="button"
              onClick={handleRevertMagic}
              className="flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-300 hover:text-amber-950 underline underline-offset-2 cursor-pointer"
            >
              <Undo2 size={11} />
              <span>Вернуть черновик</span>
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MESSAGE COMPOSER (WITH MODE SWITCH: [✉️ Клиенту] vs [🔒 Заметка])       */}
      {/* ========================================================================= */}
      <form
        onSubmit={handleSend}
        className="p-3.5 px-5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      >
        {/* Mode Switcher: [✉️ Клиенту] / [🔒 Заметка] */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setComposerMode("client")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold text-xs transition-all ${
                composerMode === "client"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Send size={12} className={composerMode === "client" ? "text-teal-600 dark:text-teal-400" : ""} />
              <span>✉️ Клиенту ({conversation.channel.toUpperCase()})</span>
            </button>

            <button
              type="button"
              onClick={() => setComposerMode("note")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold text-xs transition-all ${
                composerMode === "note"
                  ? "bg-amber-100 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 shadow-2xs border border-amber-300/80 dark:border-amber-700"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Lock size={12} className={composerMode === "note" ? "text-amber-700 dark:text-amber-300" : ""} />
              <span>🔒 Внутренняя заметка</span>
            </button>
          </div>

          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            {composerMode === "note" ? (
              <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                <Lock size={11} /> Видна только операторам
              </span>
            ) : (
              <span>Enter для отправки, Shift+Enter перенос</span>
            )}
          </span>
        </div>

        {/* Selected Attachment Preview Card (📎) */}
        {selectedFile && (
          <div className="mb-2 p-2 bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg flex items-center justify-between text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5 min-w-0">
              {filePreviewUrl ? (
                <img
                  src={filePreviewUrl}
                  alt="Preview"
                  className="w-10 h-10 object-cover rounded border border-teal-300 dark:border-teal-700 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-700 dark:text-teal-300 shrink-0">
                  <FileText size={16} />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[200px] sm:max-w-xs">
                  {selectedFile.name}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {(selectedFile.size / 1024).toFixed(1)} КБ · {selectedFile.type.startsWith("image/") ? "Фотография (sendPhoto)" : "Документ (sendDocument)"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearFile}
              className="p-1 text-zinc-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Удалить прикрепленный файл"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleSelectFile}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
          className="hidden"
        />

        {/* Textarea + Action Button Container */}
        <div
          className={`flex items-end gap-2 border rounded-xl p-2 transition-all ${
            composerMode === "note"
              ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500"
              : "bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 focus-within:bg-white dark:focus-within:bg-zinc-900"
          }`}
        >
          {/* Attachment Button (📎) */}
          {composerMode === "client" && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Прикрепить фото или документ для отправки в Telegram"
              className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
                selectedFile
                  ? "bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <Paperclip size={16} />
            </button>
          )}

          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Tab" && !draft.trim()) {
                e.preventDefault();
                setIsDraftCollapsed((prev) => !prev);
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={
              composerMode === "note"
                ? "Внутренняя заметка для команды (видна только операторам, не отправляется клиенту)..."
                : selectedFile
                ? "Добавьте подпись к файлу (опционально) и нажмите Enter для отправки..."
                : `Ответ клиенту в ${conversation.channel.toUpperCase()} (Enter для отправки)...`
            }
            className={`flex-1 text-xs bg-transparent border-0 resize-none focus:outline-none py-1 ${
              composerMode === "note"
                ? "text-amber-950 dark:text-amber-100 placeholder:text-amber-700/60 dark:placeholder:text-amber-400/60"
                : "text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            }`}
          />

          {/* Magic Polish Button (Only in Client mode) */}
          {composerMode === "client" && (
            <button
              type="button"
              onClick={handleMagicPolish}
              disabled={isPolishing}
              title="Превратить заметку в вежливое и продающее сообщение (Магия ИИ)"
              className={`px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 border cursor-pointer ${
                isPolishing
                  ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 animate-pulse"
                  : "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/60 dark:to-orange-950/60 hover:from-amber-100 hover:to-orange-100 text-amber-900 dark:text-amber-200 border-amber-300/80 dark:border-amber-800 shadow-2xs active:scale-95"
              }`}
            >
              <Sparkles size={13} className="text-amber-600 dark:text-amber-400" />
              <span>{isPolishing ? "Улучшаю..." : "Магия ИИ"}</span>
            </button>
          )}

          {/* Submit button: Changes style and text based on composer mode */}
          {composerMode === "note" ? (
            <button
              type="submit"
              disabled={!draft.trim()}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs cursor-pointer ${
                draft.trim()
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-amber-200 dark:bg-amber-900/40 text-amber-400 dark:text-amber-600 cursor-not-allowed"
              }`}
            >
              <Lock size={12} />
              <span>Сохранить заметку</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim() && !selectedFile}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs cursor-pointer ${
                draft.trim() || selectedFile
                  ? "bg-teal-700 text-white hover:bg-teal-800"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
              }`}
            >
              <span>Отправить</span>
              <Send size={13} />
            </button>
          )}
        </div>
      </form>

      {/* Lightbox Modal for Photo Attachments */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-700 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 text-white">
              <span className="text-xs font-medium truncate max-w-md">
                {previewImage.title || "Просмотр фотографии от клиента"}
              </span>
              <div className="flex items-center gap-1.5">
                <a
                  href={previewImage.url}
                  download="photo.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="Скачать фото на ПК"
                >
                  <Download size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="Закрыть (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2 flex items-center justify-center bg-black/50">
              <img
                src={previewImage.url}
                alt={previewImage.title || "Фотография"}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
