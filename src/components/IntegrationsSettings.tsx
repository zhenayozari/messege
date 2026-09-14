import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Code,
  ExternalLink,
  Globe,
  Key,
  MessageCircle,
  Radio,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Settings2,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { ChannelConnectorStatus } from "../types";
import { api } from "../services/api";
import { VkGroupInfo } from "../services/vkClient";

export interface IntegrationsSettingsProps {
  connectors?: ChannelConnectorStatus[];
  onSyncTelegram?: () => void;
  onSyncVk?: () => void;
  activeProjectId?: string;
}

export const IntegrationsSettings: React.FC<IntegrationsSettingsProps> = ({
  connectors = [],
  onSyncTelegram,
  onSyncVk,
  activeProjectId,
}) => {
  // ---------------------------------------------------------
  // 1. Telegram Bot API State
  // ---------------------------------------------------------
  const [isTgOnline, setIsTgOnline] = useState<boolean>(true);
  const [botUsername, setBotUsername] = useState<string>("feniks_smmBot");
  const [isTgSyncing, setIsTgSyncing] = useState<boolean>(false);
  const [tgLastSyncedTime, setTgLastSyncedTime] = useState<string | null>(null);
  const [tgFeedback, setTgFeedback] = useState<string | null>(null);
  const [tgErrorMessage, setTgErrorMessage] = useState<string | null>(null);
  const [tgTokenInput, setTgTokenInput] = useState<string>("");
  const [tgTokenSaved, setTgTokenSaved] = useState<boolean>(false);
  const [showTgTokenSettings, setShowTgTokenSettings] = useState<boolean>(true);

  // Telegram Channel Publishing State
  const [tgChannelInput, setTgChannelInput] = useState<string>("");
  const [tgChannelSaved, setTgChannelSaved] = useState<boolean>(false);
  const [isTgChannelTesting, setIsTgChannelTesting] = useState<boolean>(false);
  const [tgChannelTestResult, setTgChannelTestResult] = useState<{
    ok: boolean;
    message: string;
    postUrl?: string;
  } | null>(null);

  // ---------------------------------------------------------
  // 2. VK API State
  // ---------------------------------------------------------
  const [vkTokenInput, setVkTokenInput] = useState<string>("");
  const [vkGroupIdInput, setVkGroupIdInput] = useState<string>("");
  const [isVkChecking, setIsVkChecking] = useState<boolean>(false);
  const [isVkSyncing, setIsVkSyncing] = useState<boolean>(false);
  const [isVkOnline, setIsVkOnline] = useState<boolean | null>(null);
  const [vkGroupInfo, setVkGroupInfo] = useState<VkGroupInfo | null>(null);
  const [vkFeedback, setVkFeedback] = useState<string | null>(null);
  const [vkErrorMessage, setVkErrorMessage] = useState<string | null>(null);
  const [vkTokenSaved, setVkTokenSaved] = useState<boolean>(false);
  const [vkLastSyncedTime, setVkLastSyncedTime] = useState<string | null>(null);
  const [showVkTokenSettings, setShowVkTokenSettings] = useState<boolean>(true);

  // Initial load
  useEffect(() => {
    let isMounted = true;

    async function loadAllStatuses() {
      // 1. Telegram
      const currentTgToken = api.getTelegramToken();
      let currentTgChannel = api.getTelegramChannelId();
      if (!currentTgChannel || currentTgChannel === "@feniks_potolki_channel") {
        currentTgChannel = "-1003840149202";
        api.setTelegramChannelId("-1003840149202");
      }
      setTgTokenInput(currentTgToken);
      setTgChannelInput(currentTgChannel);

      try {
        const tgRes = await api.getTelegramBotStatus();
        if (!isMounted) return;
        if (tgRes.ok && tgRes.info) {
          setIsTgOnline(true);
          setBotUsername(tgRes.info.username || "feniks_smmBot");
          setTgErrorMessage(null);
        } else {
          setIsTgOnline(false);
          setTgErrorMessage(tgRes.error || "Бот недоступен по текущему токену");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setIsTgOnline(false);
        setTgErrorMessage(err.message || "Ошибка соединения с Telegram API");
      }

      // 2. VKontakte
      const currentVkToken = api.getVkToken();
      const currentVkGroupId = api.getVkGroupId();
      setVkTokenInput(currentVkToken);
      setVkGroupIdInput(currentVkGroupId);

      if (currentVkToken) {
        try {
          const vkRes = await api.getVkStatus();
          if (!isMounted) return;
          if (vkRes.ok && vkRes.group) {
            setIsVkOnline(true);
            setVkGroupInfo(vkRes.group);
            setVkErrorMessage(null);
          } else {
            setIsVkOnline(false);
            setVkErrorMessage(vkRes.error || "Сообщество не найдено или токен не валиден");
          }
        } catch (err: any) {
          if (!isMounted) return;
          setIsVkOnline(false);
          setVkErrorMessage(err.message || "Ошибка соединения с VK API");
        }
      } else {
        setIsVkOnline(null);
      }
    }

    loadAllStatuses();
    return () => {
      isMounted = false;
    };
  }, []);

  // ---------------------------------------------------------
  // Telegram Handlers
  // ---------------------------------------------------------
  const handleManualTgSync = async () => {
    if (isTgSyncing) return;
    setIsTgSyncing(true);
    setTgFeedback(null);
    setTgErrorMessage(null);
    try {
      const res = await api.syncTelegram(activeProjectId);
      setIsTgOnline(true);
      if (res.botUsername) {
        setBotUsername(res.botUsername);
      }
      const nowStr = new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setTgLastSyncedTime(nowStr);

      if (res.newMessagesCount > 0) {
        setTgFeedback(`+${res.newMessagesCount} новых сообщений загружено в диалоги CRM!`);
        if (onSyncTelegram) onSyncTelegram();
      } else {
        setTgFeedback("Новых сообщений нет (бот онлайн и принимает входящие)");
      }

      if (res.error) {
        setTgErrorMessage(res.error);
      }
    } catch (err: any) {
      setTgErrorMessage(err.message || "Ошибка опроса Telegram");
    } finally {
      setTimeout(() => setIsTgSyncing(false), 400);
    }
  };

  const handleSaveTgToken = () => {
    if (!tgTokenInput.trim()) return;
    api.setTelegramToken(tgTokenInput.trim());
    setTgTokenSaved(true);
    setTimeout(() => setTgTokenSaved(false), 2500);
    handleManualTgSync();
  };

  const handleSaveTgChannel = () => {
    const raw = tgChannelInput.trim() || "-1003840149202";
    const normalized = api.normalizeTelegramChannelId(raw);
    api.setTelegramChannelId(normalized);
    setTgChannelInput(normalized);
    setTgChannelSaved(true);
    setTgChannelTestResult(null);
    setTgFeedback(`✓ ID Telegram-канала сохранен: ${normalized}`);
    setTimeout(() => {
      setTgChannelSaved(false);
      setTgFeedback(null);
    }, 3000);
  };

  const handleTestTgChannelPublish = async () => {
    const raw = tgChannelInput.trim() || api.getTelegramChannelId() || "-1003840149202";
    const normalizedChannel = api.normalizeTelegramChannelId(raw);
    setTgChannelInput(normalizedChannel);
    api.setTelegramChannelId(normalizedChannel);

    setIsTgChannelTesting(true);
    setTgChannelTestResult(null);

    try {
      const res = await api.sendTestPostToTelegramChannel(normalizedChannel);
      if (res.ok) {
        setTgChannelTestResult({
          ok: true,
          message: `Тестовый пост успешно опубликован в канале «${normalizedChannel}» (Message ID: #${res.messageId})!`,
          postUrl: res.postUrl,
        });
      } else {
        setTgChannelTestResult({
          ok: false,
          message: res.error || "Telegram API Error: Не удалось опубликовать тестовый пост в канал",
        });
      }
    } catch (err: any) {
      setTgChannelTestResult({
        ok: false,
        message: "Telegram API Error: " + (err.message || "Сетевая ошибка при публикации в Telegram"),
      });
    } finally {
      setIsTgChannelTesting(false);
    }
  };

  const handleResetTgOffset = () => {
    api.resetTelegramOffset();
    setTgFeedback("Оффсет сброшен. Повторный опрос заберет сообщения заново.");
    handleManualTgSync();
  };

  // ---------------------------------------------------------
  // VKontakte Handlers
  // ---------------------------------------------------------
  const handleSaveVkToken = () => {
    const trimmedToken = vkTokenInput.trim();
    const trimmedGroupId = vkGroupIdInput.trim();

    if (!trimmedToken) {
      setVkErrorMessage("Введите токен сообщества VK_ACCESS_TOKEN перед сохранением");
      return;
    }

    api.setVkToken(trimmedToken);
    api.setVkGroupId(trimmedGroupId);

    setVkTokenSaved(true);
    setVkFeedback("✓ Ключ доступа и ID группы успешно сохранены в хранилище!");
    setTimeout(() => {
      setVkTokenSaved(false);
      setVkFeedback(null);
    }, 3500);

    // Сразу проверяем подключение
    handleCheckVkConnection();
  };

  const handleCheckVkConnection = async () => {
    setIsVkChecking(true);
    setVkFeedback(null);
    setVkErrorMessage(null);

    try {
      const res = await api.getVkStatus();
      if (res.ok && res.group) {
        setIsVkOnline(true);
        setVkGroupInfo(res.group);
        if (res.group.id && !vkGroupIdInput) {
          setVkGroupIdInput(String(res.group.id));
        }
        setVkFeedback(`✓ Успешное подключение к группе: «${res.group.name}» (ID: ${res.group.id})`);
        setTimeout(() => setVkFeedback(null), 5000);
      } else {
        setIsVkOnline(false);
        setVkErrorMessage(res.error || "Не удалось проверить сообщество ВКонтакте");
      }
    } catch (err: any) {
      setIsVkOnline(false);
      setVkErrorMessage(err.message || "Ошибка обращения к VK API");
    } finally {
      setIsVkChecking(false);
    }
  };

  const handleManualVkSync = async () => {
    if (isVkSyncing) return;
    setIsVkSyncing(true);
    setVkFeedback(null);
    setVkErrorMessage(null);

    try {
      const res = await api.syncVk(activeProjectId);
      const nowStr = new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setVkLastSyncedTime(nowStr);

      if (res.error) {
        setVkErrorMessage(res.error);
      } else if (res.newMessagesCount > 0) {
        setVkFeedback(`+${res.newMessagesCount} новых сообщений из ВКонтакте добавлено в ленту диалогов!`);
        if (onSyncVk) onSyncVk();
        if (onSyncTelegram) onSyncTelegram();
      } else {
        setVkFeedback(`Синхронизация завершена. Новых входящих сообщений в группе «${res.groupName || "ВК"}» пока нет.`);
      }
    } catch (err: any) {
      setVkErrorMessage(err.message || "Ошибка опроса сообщений ВКонтакте");
    } finally {
      setTimeout(() => setIsVkSyncing(false), 500);
    }
  };

  const handleResetVkOffset = () => {
    api.resetVkOffset();
    setVkFeedback("Оффсет сообщений ВК сброшен.");
    handleManualVkSync();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 1. Header & Live Indicator */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Radio size={18} className="text-teal-600 dark:text-teal-400" />
            <span>Интеграции и подключенные каналы коммуникации</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Прямое подключение ботов Telegram, сообществ ВКонтакте и каналов автопостинга контента.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Polling активен (каждые 5 сек)</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Telegram Bot API Integration Card                                      */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-xl border border-teal-200/90 dark:border-teal-800/80 bg-gradient-to-br from-teal-50/50 via-white to-white dark:from-teal-950/20 dark:via-zinc-900 dark:to-zinc-900 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Bot size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Telegram Bot API (Основной бот)</h2>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                    isTgOnline
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isTgOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
                  />
                  <span>{isTgOnline ? "Бот на связи" : "Ошибка токена"}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-teal-700 dark:text-teal-300 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>@{botUsername}</span>
                  <ExternalLink size={11} className="opacity-70" />
                </a>
                <span className="text-zinc-400 text-xs">•</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {tgLastSyncedTime ? `Синхронизировано: ${tgLastSyncedTime}` : "Фоновый поллинг активен"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualTgSync}
              disabled={isTgSyncing}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-75"
            >
              <RefreshCw size={13} className={isTgSyncing ? "animate-spin" : ""} />
              <span>{isTgSyncing ? "Синхронизация..." : "Проверить входящие Telegram сейчас"}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTgTokenSettings(!showTgTokenSettings)}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="Параметры токена Telegram"
            >
              <Settings2 size={14} />
              <span>{showTgTokenSettings ? "Скрыть" : "Настройки Telegram"}</span>
            </button>
          </div>
        </div>

        {/* Telegram Feedback alert */}
        {tgFeedback && (
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{tgFeedback}</span>
          </div>
        )}

        {tgErrorMessage && (
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{tgErrorMessage}</span>
          </div>
        )}

        {/* Telegram Settings Panel */}
        {showTgTokenSettings && (
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200/90 dark:border-zinc-800 space-y-4">
            {/* Section 1: Telegram Bot Token */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Key size={14} className="text-teal-600 dark:text-teal-400" />
                  <span>Ключ доступа бота (Telegram Bot Token)</span>
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Сохраняется в localStorage: <code>phoenix_tg_token</code>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={tgTokenInput}
                    onChange={(e) => setTgTokenInput(e.target.value)}
                    placeholder="8809553443:AAFt..."
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveTgToken}
                  className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Save size={13} />
                  <span>{tgTokenSaved ? "✓ Сохранено" : "Сохранить токен"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetTgOffset}
                  title="Сбросить оффсет Telegram (перечитать все последние сообщения)"
                  className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Сброс оффсета</span>
                </button>
              </div>
            </div>

            {/* Section 2: Telegram Channel for Auto-posting & Calendar */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Share2 size={14} className="text-teal-600 dark:text-teal-400" />
                  <span>ID или @username Telegram-канала для публикаций</span>
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  По умолчанию: <code>-1003840149202</code> (закрытый канал)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={tgChannelInput}
                    onChange={(e) => setTgChannelInput(e.target.value)}
                    placeholder="-1003840149202 или @username"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveTgChannel}
                  className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
                >
                  <Save size={13} />
                  <span>{tgChannelSaved ? "✓ Сохранено" : "Сохранить канал"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestTgChannelPublish}
                  disabled={isTgChannelTesting || !tgChannelInput.trim()}
                  className="px-3.5 py-1.5 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-zinc-800 hover:bg-teal-50 dark:hover:bg-zinc-750 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 shadow-xs shrink-0"
                >
                  {isTgChannelTesting ? (
                    <RefreshCw size={13} className="animate-spin text-teal-600" />
                  ) : (
                    <Send size={13} className="text-teal-600 dark:text-teal-400" />
                  )}
                  <span>{isTgChannelTesting ? "Отправка теста..." : "Тестовая публикация в канал"}</span>
                </button>
              </div>

              {/* Test Result Alert */}
              {tgChannelTestResult && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2.5 ${
                    tgChannelTestResult.ok
                      ? "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                      : "bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {tgChannelTestResult.ok ? (
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold">{tgChannelTestResult.message}</p>
                    {tgChannelTestResult.ok && tgChannelTestResult.postUrl && (
                      <a
                        href={tgChannelTestResult.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-teal-700 dark:text-teal-300 hover:underline"
                      >
                        <span>Посмотреть пост в Telegram</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                    {!tgChannelTestResult.ok && (
                      <p className="text-[11px] opacity-90">
                        Убедитесь, что бот <strong>@{botUsername}</strong> добавлен в канал как <strong>Администратор</strong> с разрешением <em>«Публикация сообщений»</em>.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Instruction Callout */}
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-white/70 dark:bg-zinc-950/70 p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 leading-relaxed flex items-start gap-2.5">
              <Sparkles size={15} className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div>
                <strong>Инструкция по настройке автопостинга в Telegram-канал:</strong>
                <ol className="list-decimal pl-4 mt-1.5 space-y-1">
                  <li>Создайте публичный или закрытый канал в Telegram.</li>
                  <li>
                    Откройте <em>«Управление каналом» → «Администраторы»</em>, найдите бота{" "}
                    <a
                      href={`https://t.me/${botUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 dark:text-teal-400 font-semibold underline"
                    >
                      @{botUsername}
                    </a>{" "}
                    и добавьте его с правом <strong>«Публикация сообщений»</strong>.
                  </li>
                  <li>
                    Укажите <code>@username</code> вашего канала (для публичных) или отрицательный ID вроде <code>-1001234567890</code> (для закрытых) в поле выше.
                  </li>
                  <li>
                    Нажмите <strong>«Тестовая публикация в канал»</strong> для мгновенной проверки. После этого посты из вкладки <strong>«Контент»</strong> и календаря будут выходить в канал в один клик!
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. VKontakte (VK API) Community Integration Card                          */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-xl border border-sky-200/90 dark:border-sky-800/80 bg-gradient-to-br from-sky-50/50 via-white to-white dark:from-sky-950/20 dark:via-zinc-900 dark:to-zinc-900 shadow-xs">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#0077FF] flex items-center justify-center text-white shadow-xs shrink-0 font-black text-sm tracking-tighter">
              VK
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  ВКонтакте (VK API — Сообщения сообщества)
                </h2>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                    isVkOnline
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : isVkOnline === false
                      ? "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isVkOnline
                        ? "bg-emerald-500 animate-pulse"
                        : isVkOnline === false
                        ? "bg-rose-500"
                        : "bg-zinc-400"
                    }`}
                  />
                  <span>
                    {isVkOnline
                      ? "Сообщество подключено"
                      : isVkOnline === false
                      ? "Не подключено"
                      : "Ожидает настройки"}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2 mt-0.5 text-xs">
                {vkGroupInfo ? (
                  <>
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      «{vkGroupInfo.name}»
                    </span>
                    <span className="text-zinc-400">•</span>
                    <a
                      href={`https://vk.com/${vkGroupInfo.screen_name || `club${vkGroupInfo.id}`}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-700 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>vk.com/{vkGroupInfo.screen_name || `club${vkGroupInfo.id}`}</span>
                      <ExternalLink size={11} className="opacity-70" />
                    </a>
                    {vkGroupInfo.members_count !== undefined && (
                      <>
                        <span className="text-zinc-400">•</span>
                        <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <Users size={11} /> {vkGroupInfo.members_count.toLocaleString("ru-RU")} подписчиков
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Прием сообщений группы и живые ответы клиентам в ЛС
                  </span>
                )}

                {vkLastSyncedTime && (
                  <>
                    <span className="text-zinc-400">•</span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Синхронизировано: {vkLastSyncedTime}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualVkSync}
              disabled={isVkSyncing}
              className="px-3 py-1.5 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-75"
            >
              <RefreshCw size={13} className={isVkSyncing ? "animate-spin" : ""} />
              <span>{isVkSyncing ? "Синхронизация..." : "Синхронизировать диалоги VK сейчас"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowVkTokenSettings(!showVkTokenSettings)}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="Параметры токена ВКонтакте"
            >
              <Settings2 size={14} />
              <span>{showVkTokenSettings ? "Скрыть" : "Настройки VK"}</span>
            </button>
          </div>
        </div>

        {/* VK Feedback Alert */}
        {vkFeedback && (
          <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{vkFeedback}</span>
          </div>
        )}

        {/* VK Error Alert */}
        {vkErrorMessage && (
          <div className="mb-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{vkErrorMessage}</span>
          </div>
        )}

        {/* VK Token & Connection Settings Box */}
        {showVkTokenSettings && (
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200/90 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Key size={14} className="text-sky-600 dark:text-sky-400" />
                <span>Параметры доступа к сообществу ВКонтакте (VK API)</span>
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Сохраняется в localStorage: <code>phoenix_vk_token</code> и <code>phoenix_vk_group_id</code>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* VK_ACCESS_TOKEN */}
              <div className="md:col-span-2 space-y-1">
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  VK_ACCESS_TOKEN (Ключ доступа сообщества с правами: messages, photos, wall):
                </label>
                <input
                  type="password"
                  value={vkTokenInput}
                  onChange={(e) => setVkTokenInput(e.target.value)}
                  placeholder="vk1.a.V9K29sdFq_EXAMPLE_TOKEN_STRING..."
                  className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>

              {/* VK_GROUP_ID */}
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  VK_GROUP_ID (Числовой ID группы или screen_name):
                </label>
                <input
                  type="text"
                  value={vkGroupIdInput}
                  onChange={(e) => setVkGroupIdInput(e.target.value)}
                  placeholder="219876543 или potolki_fenix"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveVkToken}
                className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Save size={13} />
                <span>{vkTokenSaved ? "✓ Сохранено" : "Сохранить токен ВК"}</span>
              </button>

              <button
                type="button"
                onClick={handleCheckVkConnection}
                disabled={isVkChecking}
                className="px-3.5 py-1.5 rounded-lg border border-sky-300 dark:border-sky-800 bg-white dark:bg-zinc-800 hover:bg-sky-50 dark:hover:bg-zinc-700 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                <ShieldCheck size={13} className={isVkChecking ? "animate-spin" : "text-sky-600"} />
                <span>{isVkChecking ? "Проверка..." : "Проверить подключение VK"}</span>
              </button>

              <button
                type="button"
                onClick={handleResetVkOffset}
                title="Сбросить оффсет диалогов ВКонтакте"
                className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Сброс оффсета</span>
              </button>
            </div>

            {/* Detailed Instructions for VK */}
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-white/70 dark:bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 leading-relaxed flex items-start gap-2">
              <Sparkles size={14} className="text-sky-500 shrink-0 mt-0.5" />
              <div>
                <strong>Как получить ключ доступа сообщества ВКонтакте:</strong>
                <ol className="list-decimal pl-4 mt-1 space-y-0.5">
                  <li>Откройте ваше сообщество ВКонтакте и перейдите в <strong>«Управление» → «Работа с API»</strong>.</li>
                  <li>Нажмите <strong>«Создать ключ»</strong> и отметьте разрешения: <em>«Управление сообществом»</em>, <em>«Сообщения сообщества»</em>, <em>«Фотографии»</em>.</li>
                  <li>Скопируйте сгенерированный ключ (начинается с <code>vk1.a...</code>) и вставьте в поле выше.</li>
                  <li>В разделе <strong>«Управление» → «Сообщения»</strong> убедитесь, что сообщения сообщества <strong>Включены</strong>.</li>
                  <li>Теперь все сообщения от клиентов из лички группы будут мгновенно попадать в единое окно диалогов CRM, а ответы операторов будут отправляться прямо в чат VK!</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. MAX & Other Channels Card                                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-xs">
              MAX
            </div>
            <div>
              <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Канал MAX (Контент-витрина)</h3>
              <p className="text-[11px] text-zinc-500">Автопостинг и генерация карточек товаров</p>
            </div>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Канал подключен в режиме симуляции контент-плана. Готовые посты передаются в очередь автопостинга.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white">
              <Globe size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Веб-сайт и онлайн-виджет</h3>
              <p className="text-[11px] text-zinc-500">Виджет чата для встраивания на сайт</p>
            </div>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Скрипт виджета готов к интеграции на любой сайт. Обращения мгновенно направляются в окно диалогов.
          </p>
        </div>
      </div>
    </div>
  );
};
