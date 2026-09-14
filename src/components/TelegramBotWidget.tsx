import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Send,
  CheckCircle2,
  AlertCircle,
  Settings2,
  ExternalLink,
  Bot,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "../services/api";

interface TelegramBotWidgetProps {
  activeProjectId: string;
  onNewMessagesReceived?: () => void;
}

export const TelegramBotWidget: React.FC<TelegramBotWidgetProps> = ({
  activeProjectId,
  onNewMessagesReceived,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [botUsername, setBotUsername] = useState<string>("feniks_smmBot");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [tokenInput, setTokenInput] = useState<string>("");
  const [tokenSaved, setTokenSaved] = useState<boolean>(false);

  // Инициализация статуса бота при монтировании
  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      const currentToken = api.getTelegramToken();
      setTokenInput(currentToken);
      try {
        const res = await api.getTelegramBotStatus();
        if (!isMounted) return;
        if (res.ok && res.info) {
          setIsOnline(true);
          setBotUsername(res.info.username || "feniks_smmBot");
          setErrorMessage(null);
        } else {
          setIsOnline(false);
          setErrorMessage(res.error || "Бот недоступен");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setIsOnline(false);
        setErrorMessage(err.message || "Ошибка подключения");
      }
    }
    checkStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  // Ручной или автоматический запуск синхронизации входящих
  const handleSync = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncMessage(null);
    setErrorMessage(null);

    try {
      const res = await api.syncTelegram(activeProjectId);
      setIsOnline(true);
      if (res.botUsername) {
        setBotUsername(res.botUsername);
      }

      const nowStr = new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastSyncedTime(nowStr);

      if (res.newMessagesCount > 0) {
        setSyncMessage(`+${res.newMessagesCount} нов. сообщ.!`);
        if (onNewMessagesReceived) {
          onNewMessagesReceived();
        }
      } else {
        setSyncMessage("Новых сообщений нет");
      }

      if (res.error) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setIsOnline(false);
      setErrorMessage(err.message || "Ошибка опроса");
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
      }, 400);
    }
  };

  const handleSaveToken = () => {
    if (!tokenInput.trim()) return;
    api.setTelegramToken(tokenInput.trim());
    setTokenSaved(true);
    setTimeout(() => setTokenSaved(false), 2000);
    handleSync();
  };

  const handleResetOffset = () => {
    api.resetTelegramOffset();
    setSyncMessage("Оффсет сброшен");
    handleSync();
  };

  return (
    <div
      id="telegram-bot-widget"
      className="p-2.5 mx-2 my-2 rounded-lg bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80 shadow-2xs transition-all"
    >
      {/* Header with bot status */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="relative flex items-center justify-center shrink-0">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSyncing
                  ? "bg-amber-400 animate-ping"
                  : isOnline
                  ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                  : "bg-rose-500"
              }`}
            />
            <span
              className={`absolute w-2 h-2 rounded-full ${
                isSyncing ? "bg-amber-500" : isOnline ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
          </div>

          <div className="min-w-0 flex items-center gap-1">
            <Bot size={13} className="text-teal-700 dark:text-teal-300 shrink-0" />
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Открыть бота в Telegram"
              className="font-semibold text-xs text-teal-950 dark:text-teal-100 hover:underline truncate flex items-center gap-0.5"
            >
              @{botUsername}
              <ExternalLink size={10} className="opacity-60 shrink-0" />
            </a>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          title="Настройки токена Telegram"
          className="p-1 rounded text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors"
        >
          <Settings2 size={13} />
        </button>
      </div>

      {/* Main Action Button: Проверить входящие Telegram сейчас */}
      <button
        type="button"
        id="btn-sync-telegram"
        onClick={handleSync}
        disabled={isSyncing}
        className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-xs active:scale-[0.99] transition-all cursor-pointer disabled:opacity-75"
      >
        <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
        <span>
          {isSyncing ? "Синхронизация..." : "Проверить входящие Telegram сейчас"}
        </span>
      </button>

      {/* Status & Help Text */}
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
        <span className="truncate">
          {syncMessage ? (
            <span className="text-teal-700 dark:text-teal-300 font-medium">{syncMessage}</span>
          ) : lastSyncedTime ? (
            `Обновлено: ${lastSyncedTime}`
          ) : (
            "Опрос каждые 5 сек."
          )}
        </span>
        <span className="text-zinc-400 dark:text-zinc-500 shrink-0">Live API</span>
      </div>

      {/* Error display if any */}
      {errorMessage && (
        <div className="mt-1.5 p-1.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded text-[10px] text-rose-700 dark:text-rose-300 flex items-start gap-1">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span className="break-all">{errorMessage}</span>
        </div>
      )}

      {/* Expandable Settings drawer */}
      {showSettings && (
        <div className="mt-2.5 pt-2 border-t border-teal-200/60 dark:border-teal-800/60 text-xs space-y-2">
          <div>
            <label className="block text-[10px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Токен бота (Telegram Bot API):
            </label>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="8809553443:AAFt..."
              className="w-full px-2 py-1 text-[11px] font-mono bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSaveToken}
              className="flex-1 px-2 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-medium transition-colors"
            >
              {tokenSaved ? "✓ Сохранено" : "Сохранить токен"}
            </button>
            <button
              type="button"
              onClick={handleResetOffset}
              title="Сбросить оффсет Telegram (перечитать апдейты)"
              className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] flex items-center gap-1"
            >
              <RotateCcw size={11} />
              <span>Сброс оффсета</span>
            </button>
          </div>

          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 bg-white/70 dark:bg-zinc-900/70 p-1.5 rounded border border-zinc-200 dark:border-zinc-800">
            💡 Напишите боту{" "}
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 dark:text-teal-400 font-medium underline"
            >
              @{botUsername}
            </a>{" "}
            в Telegram с телефона, затем нажмите «Проверить входящие» — диалог и карточка лида сразу появятся в CRM.
          </div>
        </div>
      )}
    </div>
  );
};
