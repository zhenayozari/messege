import React, { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Camera,
  Check,
  CheckCheck,
  Download,
  ExternalLink,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  Film,
  Lock,
  Maximize2,
  Mic,
  Pause,
  Play,
  RefreshCw,
  User,
  Video,
  X,
} from "lucide-react";
import { Message } from "../types";
import { downloadTelegramMediaBlob, getProxyMediaUrl } from "../services/telegramClient";

interface MessageBubbleProps {
  message: Message;
  clientName?: string;
  onPreviewImage?: (url: string, title?: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  clientName = "Клиент",
  onPreviewImage,
}) => {
  const isNote = message.sender_type === "note" || message.is_internal_note;
  const isInbound = message.direction === "inbound" && !isNote;
  const isAi = message.sender_type === "ai";

  // Local Blob URL state for reliable media loading & CORS-safe PC downloading
  const [blobUrl, setBlobUrl] = useState<string | null>(
    message.blob_url || (message.media_url?.startsWith("blob:") ? message.media_url : null)
  );
  const [isLoadingBlob, setIsLoadingBlob] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Modals for fullscreen preview
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Handle ESC key for modal closing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsVideoModalOpen(false);
        setIsPhotoModalOpen(false);
      }
    };
    if (isVideoModalOpen || isPhotoModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVideoModalOpen, isPhotoModalOpen]);

  // 1. SMART MEDIA TYPE DETECTION
  const rawFileName =
    message.file_name || (message.attachments && message.attachments[0]?.title) || "";
  const rawSource =
    message.media_url ||
    message.file_path ||
    (message.attachments && message.attachments[0]?.url) ||
    "";
  const lowerFileName = rawFileName.toLowerCase();
  const lowerSource = rawSource.toLowerCase();
  const rawMediaType = message.media_type;

  // Video extension check (.mp4, .mov, .webm, etc.)
  const isVideoExt =
    lowerFileName.endsWith(".mp4") ||
    lowerFileName.endsWith(".mov") ||
    lowerFileName.endsWith(".webm") ||
    lowerFileName.endsWith(".m4v") ||
    lowerFileName.endsWith(".mkv") ||
    lowerSource.includes(".mp4") ||
    lowerSource.includes(".mov") ||
    lowerSource.includes(".webm");

  const isVideo =
    rawMediaType === "video" ||
    rawMediaType === "animation" ||
    isVideoExt ||
    Boolean(message.attachments && message.attachments.some((a) => a.type === "video"));

  const isVideoNote = rawMediaType === "video_note";

  // Photo extension check (.jpg, .png, .webp, etc.)
  const isPhotoExt =
    lowerFileName.endsWith(".jpg") ||
    lowerFileName.endsWith(".jpeg") ||
    lowerFileName.endsWith(".png") ||
    lowerFileName.endsWith(".webp") ||
    lowerFileName.endsWith(".gif") ||
    lowerFileName.endsWith(".bmp") ||
    lowerSource.includes(".jpg") ||
    lowerSource.includes(".jpeg") ||
    lowerSource.includes(".png") ||
    lowerSource.includes(".webp");

  const isPhoto =
    !isVideo &&
    !isVideoNote &&
    (rawMediaType === "photo" ||
      isPhotoExt ||
      Boolean(message.attachments && message.attachments.some((a) => a.type === "photo")));

  const isVoice =
    !isVideo &&
    !isVideoNote &&
    !isPhoto &&
    (rawMediaType === "voice" ||
      lowerFileName.endsWith(".oga") ||
      lowerFileName.endsWith(".ogg"));

  const isDoc =
    !isVideo &&
    !isVideoNote &&
    !isPhoto &&
    !isVoice &&
    (rawMediaType === "document" ||
      Boolean(
        message.attachments &&
          message.attachments.some((a) => a.type === "doc" || a.type === "document")
      ));

  // Resolved active media URL (prefers cached Blob URL, falls back to direct URL or proxy)
  const activeMediaUrl =
    blobUrl ||
    message.media_url ||
    (message.attachments && message.attachments[0]?.url) ||
    null;

  const resolvedFileName =
    rawFileName ||
    (isPhoto ? "photo.jpg" : isVideo ? "video.mp4" : isDoc ? "document.pdf" : "file");

  const messageText = message.caption || message.text;

  // 2. AUTOMATIC FETCH OF TELEGRAM MEDIA BLOB (with proxy fallback and timeout)
  useEffect(() => {
    let isMounted = true;
    if (message.blob_url) {
      setBlobUrl(message.blob_url);
      setLoadError(false);
      return;
    }
    if (message.media_url?.startsWith("blob:")) {
      setBlobUrl(message.media_url);
      setLoadError(false);
      return;
    }

    const source = message.file_path || message.media_url;
    if (!source) return;

    // Only fetch if it looks like a Telegram URL or internal path
    const isTelegramSource =
      source.includes("api.telegram.org") ||
      source.startsWith("documents/") ||
      source.startsWith("photos/") ||
      source.startsWith("voice/") ||
      source.startsWith("video/") ||
      source.startsWith("video_notes/");

    if (!isTelegramSource && !isVideo && !isPhoto) return;

    setIsLoadingBlob(true);
    setLoadError(false);

    const detectedType = isVideo ? "video" : isPhoto ? "photo" : isVoice ? "voice" : message.media_type;

    downloadTelegramMediaBlob(source, detectedType || undefined)
      .then((bUrl) => {
        if (isMounted) {
          if (bUrl) {
            setBlobUrl(bUrl);
            setLoadError(false);
          } else {
            // Direct fetch and proxy both failed
            setLoadError(true);
          }
        }
      })
      .catch((err) => {
        console.warn("Media fetch error in MessageBubble:", err);
        if (isMounted) setLoadError(true);
      })
      .finally(() => {
        if (isMounted) setIsLoadingBlob(false);
      });

    return () => {
      isMounted = false;
    };
  }, [message.blob_url, message.file_path, message.media_url, message.media_type, isVideo, isPhoto, isVoice]);

  // Retry loading media from Telegram / local proxy
  const handleRetryLoad = async () => {
    const source = message.file_path || message.media_url;
    if (!source) return;

    setIsRetrying(true);
    setLoadError(false);
    setImageError(false);

    const detectedType = isVideo ? "video" : isPhoto ? "photo" : isVoice ? "voice" : message.media_type;

    try {
      const bUrl = await downloadTelegramMediaBlob(source, detectedType || undefined, true);
      if (bUrl) {
        setBlobUrl(bUrl);
        setLoadError(false);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    } finally {
      setIsRetrying(false);
    }
  };

  // Safe file download handler
  const handleDownloadMedia = async (e: React.MouseEvent) => {
    if (blobUrl) {
      // Standard <a> download attribute works directly for blob URLs
      return;
    }
    const source = message.file_path || message.media_url;
    if (!source) return;

    e.preventDefault();
    setIsDownloading(true);

    const detectedType = isVideo ? "video" : isPhoto ? "photo" : isVoice ? "voice" : "document";

    try {
      const downloaded = await downloadTelegramMediaBlob(source, detectedType);
      if (downloaded) {
        setBlobUrl(downloaded);
        const link = document.createElement("a");
        link.href = downloaded;
        link.download = resolvedFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (activeMediaUrl) {
        window.open(activeMediaUrl, "_blank");
      }
    } catch (err) {
      console.warn("Download error:", err);
      if (activeMediaUrl) window.open(activeMediaUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  // Voice player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const durationSec = message.duration_sec || 24;

  // Video note state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Sync simulated or real voice playback
  useEffect(() => {
    let interval: any = null;
    const hasRealAudio = Boolean(blobUrl || message.media_url);
    if (isPlaying && !hasRealAudio) {
      const stepMs = 100;
      const totalSteps = (durationSec * 1000) / playbackSpeed / stepMs;
      interval = setInterval(() => {
        setPlayProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 100 / totalSteps;
        });
      }, stepMs);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, durationSec, playbackSpeed, blobUrl, message.media_url]);

  const togglePlay = () => {
    const audioUrl = blobUrl || message.media_url;
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        if (playProgress >= 98) {
          audioRef.current.currentTime = 0;
          setPlayProgress(0);
        }
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn("Audio play error, falling back:", err);
            setIsPlaying(true);
          });
      }
    } else {
      if (isPlaying) {
        setIsPlaying(false);
      } else {
        if (playProgress >= 98) setPlayProgress(0);
        setIsPlaying(true);
      }
    }
  };

  const cycleSpeed = () => {
    const next = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const currentSec = Math.round((playProgress / 100) * durationSec);

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "1.4 МБ";
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  const getDocumentIcon = (fileName?: string | null) => {
    const lower = (fileName || "").toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) {
      return <FileSpreadsheet size={22} className="text-emerald-500 shrink-0" />;
    }
    if (lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx")) {
      return <FileText size={22} className="text-teal-600 dark:text-teal-400 shrink-0" />;
    }
    return <File size={22} className="text-blue-500 shrink-0" />;
  };

  // Open photo lightbox
  const handleOpenPhoto = () => {
    if (onPreviewImage && activeMediaUrl) {
      onPreviewImage(activeMediaUrl, messageText || "Фотография от клиента");
    }
    setIsPhotoModalOpen(true);
  };

  // 1. SPECIAL RENDERING: INTERNAL TEAM NOTE
  if (isNote) {
    return (
      <div className="w-full flex justify-center py-1">
        <div className="w-full max-w-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-xl p-3 shadow-2xs text-xs text-amber-950 dark:text-amber-200">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-amber-200/60 dark:border-amber-900/60 text-[10px] font-medium text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-1.5 font-bold">
              <Lock size={12} className="text-amber-600 dark:text-amber-400" />
              <span>Внутренняя заметка команды</span>
              <span className="font-normal opacity-75">· Не видна клиенту</span>
            </div>
            <time className="font-mono text-amber-700/80 dark:text-amber-400/80">
              {new Date(message.created_at).toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </div>
          <p className="whitespace-pre-wrap leading-relaxed text-amber-900 dark:text-amber-100 font-sans">
            {message.text}
          </p>
        </div>
      </div>
    );
  }

  // 2. STANDARD INBOUND / OUTBOUND MESSAGE
  return (
    <div className={`flex flex-col ${isInbound ? "items-start" : "items-end"} w-full`}>
      {/* Hidden audio element for voice notes with actual URLs */}
      {isVoice && activeMediaUrl && (
        <audio
          ref={audioRef}
          src={activeMediaUrl}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setPlayProgress(0);
          }}
          onTimeUpdate={() => {
            if (audioRef.current && audioRef.current.duration) {
              const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
              setPlayProgress(p);
            }
          }}
        />
      )}

      {/* Header Info: Sender, Time, Delivery / Read status */}
      <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
        {isInbound ? (
          <>
            <User size={11} />
            <span>Клиент ({clientName})</span>
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
          {new Date(message.created_at).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>

        {!isInbound && (
          <div className="flex items-center gap-1">
            {message.delivery_status === "failed" ? (
              <span
                className="inline-flex items-center gap-0.5 text-rose-500 dark:text-rose-400 font-semibold cursor-help"
                title={`Ошибка доставки: ${message.payload?.error || "Сбой отправки в Telegram API"}`}
              >
                <AlertCircle size={12} />
                <span className="text-[9px]">Не доставлено</span>
              </span>
            ) : message.delivery_status === "sending" ? (
              <span
                className="inline-flex items-center gap-0.5 text-zinc-400 dark:text-zinc-500"
                title="Отправка в Telegram..."
              >
                <RefreshCw size={10} className="animate-spin" />
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-0.5"
                title={
                  message.is_read
                    ? "Прочитано клиентом (✓✓)"
                    : message.payload?.tg_message_id
                    ? `Отправлено в Telegram (✓) · ID #${message.payload.tg_message_id} · Ожидает прочтения`
                    : "Отправлено в Telegram (✓)"
                }
              >
                {message.is_read ? (
                  <span
                    className="inline-flex items-center text-emerald-500 dark:text-emerald-400 font-bold"
                    title="Прочитано клиентом (✓✓)"
                  >
                    <CheckCheck size={13} />
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center text-zinc-400 dark:text-zinc-400 font-medium"
                    title="Отправлено в Telegram (✓)"
                  >
                    <Check size={13} />
                  </span>
                )}
                {message.payload?.network === "telegram" && (
                  <span className="text-[9px] text-teal-600 dark:text-teal-400 font-semibold">TG</span>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Bubble Container */}
      <div
        className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
          isInbound
            ? "bg-white dark:bg-zinc-800/95 text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-800 rounded-tl-sm"
            : "bg-teal-700 text-white rounded-tr-sm shadow-xs"
        }`}
      >
        {/* ========================================================================= */}
        {/* TELEGRAM LOADING ERROR STUB: (ERR_CONNECTION_TIMED_OUT / CORS / NETWORK)  */}
        {/* ========================================================================= */}
        {loadError && (
          <div
            className={`p-3 rounded-xl border mb-2 flex flex-col items-center justify-center gap-2 text-center shadow-2xs ${
              isInbound
                ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200"
                : "bg-teal-850 border-amber-400/60 text-white"
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <span>⚠️ Ошибка загрузки из Telegram</span>
            </div>
            <p className="text-[11px] opacity-85 max-w-xs leading-tight">
              Сбой соединения с api.telegram.org (ERR_CONNECTION_TIMED_OUT). Нажмите кнопку ниже для повторной попытки через локальный прокси.
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                type="button"
                onClick={handleRetryLoad}
                disabled={isRetrying}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-colors shadow-2xs cursor-pointer active:scale-95"
              >
                <RefreshCw size={12} className={isRetrying ? "animate-spin" : ""} />
                <span>{isRetrying ? "Загрузка..." : "Нажмите для повторной попытки"}</span>
              </button>
              {activeMediaUrl && (
                <a
                  href={activeMediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-400/50 hover:bg-amber-100/50 dark:hover:bg-amber-900/40 text-xs transition-colors"
                  title="Открыть прямую ссылку"
                >
                  <ExternalLink size={12} />
                  <span>Открыть</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* A. VIDEO ATTACHMENT (Standard Video, .mp4, .mov, .webm, animation)        */}
        {/* ========================================================================= */}
        {isVideo && !isVideoNote && (
          <div className="mb-2 space-y-2">
            <div className="relative rounded-xl overflow-hidden border border-zinc-200/80 dark:border-zinc-700 bg-black shadow-sm group">
              {activeMediaUrl ? (
                <video
                  src={activeMediaUrl}
                  controls
                  preload="metadata"
                  playsInline
                  className="w-full max-h-72 object-contain bg-black"
                  onError={() => {
                    if (!blobUrl && (message.file_path || message.media_url)) {
                      setLoadError(true);
                    }
                  }}
                />
              ) : (
                <div className="h-44 w-full flex flex-col items-center justify-center gap-2 text-zinc-400 bg-zinc-950">
                  {isLoadingBlob ? (
                    <>
                      <RefreshCw size={24} className="animate-spin text-teal-400" />
                      <span className="text-xs text-teal-300">Загрузка видеоплеера...</span>
                    </>
                  ) : (
                    <>
                      <Film size={32} />
                      <span className="text-xs">Видео недоступно для предпросмотра</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons under video player: "Увеличить видео" and "Скачать" */}
            <div className="flex items-center justify-between gap-2 px-0.5 pt-0.5">
              <div
                className={`flex items-center gap-1.5 text-[11px] font-mono truncate max-w-[160px] sm:max-w-[200px] ${
                  isInbound ? "text-zinc-500 dark:text-zinc-400" : "text-teal-100"
                }`}
                title={resolvedFileName}
              >
                <Film size={13} className="text-teal-500 shrink-0" />
                <span className="truncate">{resolvedFileName}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(true)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border shadow-2xs ${
                    isInbound
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      : "bg-teal-850 text-white border-teal-600/60 hover:bg-teal-900"
                  }`}
                  title="Развернуть видео в модальном окне"
                >
                  <Maximize2 size={12} />
                  <span>Увеличить видео</span>
                </button>

                <a
                  href={activeMediaUrl || "#"}
                  download={resolvedFileName}
                  onClick={handleDownloadMedia}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border shadow-2xs ${
                    isInbound
                      ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100"
                      : "bg-white text-teal-900 border-white hover:bg-zinc-100"
                  }`}
                  title="Скачать видео на ПК или телефон"
                >
                  {isDownloading ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Download size={12} />
                  )}
                  <span>Скачать</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* B. VIDEO NOTE (Кружочек Telegram со встроенным плеером и кнопками)        */}
        {/* ========================================================================= */}
        {isVideoNote && (
          <div className="my-2 flex flex-col items-center gap-2">
            <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden border-4 border-teal-500 shadow-md bg-zinc-950 flex items-center justify-center group">
              {activeMediaUrl ? (
                <video
                  ref={videoRef}
                  src={activeMediaUrl}
                  playsInline
                  controls
                  loop
                  className="w-full h-full object-cover"
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onEnded={() => setIsVideoPlaying(false)}
                  onError={() => {
                    if (!blobUrl && (message.file_path || message.media_url)) {
                      setLoadError(true);
                    }
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-teal-400 p-4 text-center">
                  {isLoadingBlob ? (
                    <RefreshCw size={24} className="animate-spin mb-1 text-teal-400" />
                  ) : (
                    <Video size={36} className="mb-1 text-teal-400" />
                  )}
                  <span className="text-[11px] font-semibold">
                    {isLoadingBlob ? "Загрузка видео..." : "Видеокружок TG"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(true)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border shadow-2xs ${
                  isInbound
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200"
                    : "bg-teal-850 text-white border-teal-600/60 hover:bg-teal-900"
                }`}
              >
                <Maximize2 size={11} />
                <span>Увеличить видео</span>
              </button>

              <a
                href={activeMediaUrl || "#"}
                download="video_note.mp4"
                onClick={handleDownloadMedia}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border shadow-2xs ${
                  isInbound
                    ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100"
                    : "bg-white text-teal-900 border-white hover:bg-zinc-100"
                }`}
              >
                <Download size={11} />
                <span>Скачать</span>
              </a>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* C. PHOTO ATTACHMENT (Карточка с картинкой, кнопками «Увеличить» и «Скачать»)*/}
        {/* ========================================================================= */}
        {isPhoto && activeMediaUrl && (
          <div className="space-y-2 mb-2">
            {imageError ? (
              <div className="p-3 bg-zinc-100 dark:bg-zinc-800/90 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 text-center my-1">
                <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                  <Camera size={20} />
                  <span className="text-[11px] font-medium">Не удалось отобразить превью фото</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRetryLoad}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Повторить загрузку</span>
                  </button>
                  <a
                    href={activeMediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-xs font-medium"
                  >
                    <ExternalLink size={13} />
                    <span>Открыть</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div
                  className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 cursor-pointer max-h-72 flex items-center justify-center"
                  onClick={handleOpenPhoto}
                >
                  <img
                    src={activeMediaUrl}
                    alt={messageText || "Вложение фото"}
                    onError={() => setImageError(true)}
                    className="w-full h-auto object-cover max-h-72 transition-transform duration-200 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  {/* Hover overlay with action buttons */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-medium backdrop-blur-[1px]">
                    <span className="bg-black/75 px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs shadow-md">
                      <Eye size={14} />
                      <span>Увеличить фото</span>
                    </span>
                    <a
                      href={activeMediaUrl}
                      download={resolvedFileName}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadMedia(e);
                      }}
                      className="bg-black/75 p-2 rounded-full hover:bg-black/90 transition-colors shadow-md"
                      title="Скачать фото"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                </div>

                {/* Permanent action footer under photo for convenient mobile / click access */}
                <div className="flex items-center justify-between gap-2 px-0.5 pt-0.5">
                  <div
                    className={`flex items-center gap-1 text-[11px] truncate max-w-[160px] sm:max-w-[200px] ${
                      isInbound ? "text-zinc-500 dark:text-zinc-400" : "text-teal-100"
                    }`}
                  >
                    <Camera size={12} className="text-teal-500 shrink-0" />
                    <span className="truncate">{resolvedFileName}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleOpenPhoto}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border shadow-2xs ${
                        isInbound
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          : "bg-teal-850 text-white border-teal-600/60 hover:bg-teal-900"
                      }`}
                    >
                      <Eye size={12} />
                      <span>Увеличить фото</span>
                    </button>

                    <a
                      href={activeMediaUrl || "#"}
                      download={resolvedFileName}
                      onClick={handleDownloadMedia}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border shadow-2xs ${
                        isInbound
                          ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100"
                          : "bg-white text-teal-900 border-white hover:bg-zinc-100"
                      }`}
                      title="Скачать фото на устройство"
                    >
                      {isDownloading ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
                      <span>Скачать</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* D. VOICE MESSAGE PLAYER (Telegram / VK Audio Message)                     */}
        {/* ========================================================================= */}
        {isVoice && (
          <div
            className={`p-2.5 rounded-xl border mb-1.5 flex flex-col gap-2 ${
              isInbound
                ? "bg-zinc-50 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-750"
                : "bg-teal-800/70 border-teal-600/60 text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={togglePlay}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-xs cursor-pointer ${
                  isInbound
                    ? "bg-teal-700 text-white hover:bg-teal-800"
                    : "bg-white text-teal-800 hover:bg-zinc-100"
                }`}
                title={isPlaying ? "Пауза" : "Слушать голосовое"}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
              </button>

              <div className="flex-1 flex items-center gap-0.5 h-7 px-1">
                {[
                  35, 60, 40, 85, 55, 95, 70, 45, 80, 100, 65, 45, 90, 75, 40, 60, 85, 50,
                  70, 90, 40, 65, 80, 55, 35, 75, 60, 40, 90, 50, 30, 60, 45, 70, 40, 65,
                  50, 80, 35, 60,
                ].map((heightPct, idx) => {
                  const barProgressPct = (idx / 40) * 100;
                  const isPassed = playProgress >= barProgressPct;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setPlayProgress(barProgressPct);
                        if (audioRef.current && audioRef.current.duration) {
                          audioRef.current.currentTime =
                            (barProgressPct / 100) * audioRef.current.duration;
                        }
                      }}
                      style={{ height: `${heightPct}%` }}
                      className={`flex-1 min-w-[2px] max-w-[4px] rounded-full cursor-pointer transition-colors ${
                        isPassed
                          ? isInbound
                            ? "bg-teal-600 dark:bg-teal-400"
                            : "bg-white font-bold"
                          : isInbound
                          ? "bg-zinc-300 dark:bg-zinc-700"
                          : "bg-teal-600/60"
                      }`}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={cycleSpeed}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
                  isInbound
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-300"
                    : "bg-teal-900/60 text-white border-teal-500/60 hover:bg-teal-900"
                }`}
                title="Скорость воспроизведения"
              >
                {playbackSpeed}x
              </button>
            </div>

            <div
              className={`flex items-center justify-between text-[10px] px-1 ${
                isInbound ? "text-zinc-500 dark:text-zinc-400" : "text-teal-100"
              }`}
            >
              <div className="flex items-center gap-1 font-mono font-medium">
                <Mic size={10} className={isPlaying ? "animate-pulse text-teal-500" : ""} />
                <span>Голосовое сообщение</span>
              </div>
              <span className="font-mono">
                {isPlaying ? `${formatSeconds(currentSec)} / ` : ""}
                {formatSeconds(durationSec)}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* E. DOCUMENT ATTACHMENT (Only genuine non-photo, non-video documents)      */}
        {/* ========================================================================= */}
        {isDoc && (
          <div
            className={`p-2.5 rounded-xl border mb-1.5 flex items-center justify-between gap-3 ${
              isInbound
                ? "bg-zinc-50 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-750 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                : "bg-teal-800/70 border-teal-600/60 text-white hover:bg-teal-800"
            } transition-colors`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {getDocumentIcon(resolvedFileName)}
              <div className="min-w-0">
                <div
                  className="font-semibold text-xs truncate max-w-[180px] sm:max-w-[240px]"
                  title={resolvedFileName}
                >
                  {resolvedFileName}
                </div>
                <div
                  className={`text-[10px] ${
                    isInbound ? "text-zinc-500 dark:text-zinc-400" : "text-teal-200"
                  }`}
                >
                  {formatFileSize(message.file_size)} • Документ
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {activeMediaUrl && (
                <a
                  href={activeMediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`p-1.5 rounded-lg border transition-colors ${
                    isInbound
                      ? "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:text-teal-600"
                      : "bg-teal-900/80 text-white border-teal-500/60 hover:bg-teal-900"
                  }`}
                  title="Открыть в новой вкладке"
                >
                  <ExternalLink size={13} />
                </a>
              )}
              <a
                href={activeMediaUrl || "#"}
                download={resolvedFileName}
                onClick={handleDownloadMedia}
                className={`p-1.5 px-2 rounded-lg border flex items-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                  isInbound
                    ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100"
                    : "bg-white text-teal-900 border-white hover:bg-zinc-100 shadow-2xs"
                }`}
                title="Скачать файл"
              >
                {isDownloading ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                <span>📥 Скачать файл</span>
              </a>
            </div>
          </div>
        )}

        {/* F. MESSAGE TEXT / CAPTION */}
        {messageText && <p className="whitespace-pre-wrap leading-relaxed">{messageText}</p>}
      </div>

      {/* ========================================================================= */}
      {/* FULLSCREEN LIGHTBOX MODAL: VIDEO                                          */}
      {/* ========================================================================= */}
      {isVideoModalOpen && activeMediaUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[92vh] bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 text-white">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                <Film size={16} className="text-teal-400 shrink-0" />
                <span className="text-xs font-semibold truncate">
                  {messageText || resolvedFileName || "Видеозапись"}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={activeMediaUrl}
                  download={resolvedFileName}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Скачать видеофайл"
                >
                  <Download size={14} />
                  <span>Скачать</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Закрыть (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black">
              <video
                src={activeMediaUrl}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[78vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULLSCREEN LIGHTBOX MODAL: PHOTO                                          */}
      {/* ========================================================================= */}
      {isPhotoModalOpen && activeMediaUrl && !onPreviewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsPhotoModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[92vh] bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 text-white">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                <Camera size={16} className="text-teal-400 shrink-0" />
                <span className="text-xs font-semibold truncate">
                  {messageText || "Фотография от клиента"}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={activeMediaUrl}
                  download={resolvedFileName}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Скачать фото"
                >
                  <Download size={14} />
                  <span>Скачать</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Закрыть (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black">
              <img
                src={activeMediaUrl}
                alt={messageText || "Фотография"}
                className="max-w-full max-h-[78vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
