import React, { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
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
  Lock,
  Mic,
  Pause,
  Play,
  RefreshCw,
  Send,
  User,
  Video,
  Volume2,
  X,
} from "lucide-react";
import { Message } from "../types";
import { downloadTelegramMediaBlob } from "../services/telegramClient";

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
  const [imageError, setImageError] = useState(false);
  const [isDownloadingDoc, setIsDownloadingDoc] = useState(false);

  // Automatically fetch Blob for inbound Telegram media if not already cached
  useEffect(() => {
    let isMounted = true;
    if (message.blob_url) {
      setBlobUrl(message.blob_url);
      return;
    }
    if (message.media_url?.startsWith("blob:")) {
      setBlobUrl(message.media_url);
      return;
    }

    const source = message.file_path || message.media_url;
    if (!source) return;

    setIsLoadingBlob(true);
    downloadTelegramMediaBlob(source, message.media_type || undefined)
      .then((bUrl) => {
        if (isMounted && bUrl) {
          setBlobUrl(bUrl);
        }
      })
      .catch((err) => {
        console.warn("downloadTelegramMediaBlob error in MessageBubble:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingBlob(false);
      });

    return () => {
      isMounted = false;
    };
  }, [message.blob_url, message.file_path, message.media_url, message.media_type]);

  // Voice player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0); // 0 to 100%
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
      const totalSteps = ((durationSec * 1000) / playbackSpeed) / stepMs;
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
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn("Audio element play error, falling back:", err);
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

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsVideoPlaying(true);
      }
    } else {
      setIsVideoPlaying(!isVideoPlaying);
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

  // Format file size
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "1.4 МБ";
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  // Document icon helper
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

  // 2. STANDARD INBOUND / OUTBOUND MESSAGE WITH RICH MEDIA
  const mediaType = message.media_type;
  const hasPhoto =
    mediaType === "photo" ||
    (!mediaType && message.attachments && message.attachments.some((a) => a.type === "photo"));
  const rawPhotoUrl =
    message.media_url ||
    (message.attachments && message.attachments.find((a) => a.type === "photo")?.url);
  const photoUrl = blobUrl || rawPhotoUrl;

  const isVoice = mediaType === "voice";
  const activeAudioUrl = blobUrl || message.media_url;

  const isVideoNote = mediaType === "video_note";
  const isVideo = mediaType === "video";
  const activeVideoUrl = blobUrl || message.media_url;

  const isDoc =
    mediaType === "document" ||
    (!mediaType &&
      message.attachments &&
      message.attachments.some((a) => a.type === "doc" || a.type === "document"));
  const docUrl =
    message.media_url ||
    (message.attachments &&
      message.attachments.find((a) => a.type === "doc" || a.type === "document")?.url);
  const activeDocUrl = blobUrl || docUrl;
  const docName =
    message.file_name ||
    (message.attachments && message.attachments.find((a) => a.type === "doc")?.title) ||
    "Документ_вложение.pdf";

  const messageText = message.caption || message.text;

  // Safe download document handler without CORS errors
  const handleDownloadDocument = async (e: React.MouseEvent) => {
    if (blobUrl) {
      // Direct download of blob url works with browser download attribute
      return;
    }
    const source = message.file_path || message.media_url;
    if (!source) return;

    e.preventDefault();
    setIsDownloadingDoc(true);
    try {
      const downloaded = await downloadTelegramMediaBlob(source, "document");
      if (downloaded) {
        setBlobUrl(downloaded);
        const link = document.createElement("a");
        link.href = downloaded;
        link.download = docName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (docUrl) {
        window.open(docUrl, "_blank");
      }
    } catch (err) {
      console.warn("Failed to download document blob:", err);
      if (docUrl) window.open(docUrl, "_blank");
    } finally {
      setIsDownloadingDoc(false);
    }
  };

  return (
    <div className={`flex flex-col ${isInbound ? "items-start" : "items-end"} w-full`}>
      {/* Hidden audio element for voice notes with actual URLs */}
      {isVoice && activeAudioUrl && (
        <audio
          ref={audioRef}
          src={activeAudioUrl}
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

      {/* Header Info: Sender, Time, Read status */}
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

        {/* Honest Delivery Status (1 Checkmark vs 2 Checkmarks) */}
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
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
          isInbound
            ? "bg-white dark:bg-zinc-800/95 text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-800 rounded-tl-sm"
            : "bg-teal-700 text-white rounded-tr-sm shadow-xs"
        }`}
      >
        {/* A. PHOTO ATTACHMENT */}
        {hasPhoto && photoUrl && (
          <div className="space-y-2 mb-2">
            {imageError ? (
              <div className="p-3 bg-zinc-100 dark:bg-zinc-800/90 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 text-center my-1">
                <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                  <Camera size={20} />
                  <span className="text-[11px] font-medium">Не удалось загрузить превью фото</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs transition-colors shadow-2xs"
                  >
                    <Eye size={13} />
                    <span>📷 Скачать / Открыть фото</span>
                  </a>
                </div>
              </div>
            ) : (
              <div
                className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 cursor-pointer max-h-72 flex items-center justify-center"
                onClick={() =>
                  onPreviewImage &&
                  onPreviewImage(photoUrl, messageText || "Фотография от клиента")
                }
              >
                <img
                  src={photoUrl}
                  alt={messageText || "Вложение фото"}
                  onError={() => setImageError(true)}
                  className="w-full h-auto object-cover max-h-72 transition-transform duration-200 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-medium">
                  <span className="bg-black/70 px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
                    <Eye size={13} />
                    <span>Увеличить фото</span>
                  </span>
                  <a
                    href={photoUrl}
                    download="photo.jpg"
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-black/70 p-1.5 rounded-full hover:bg-black/90 transition-colors"
                    title="Скачать исходный файл"
                  >
                    <Download size={13} />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* B. VOICE MESSAGE PLAYER (Telegram / VK Audio Message) */}
        {isVoice && (
          <div
            className={`p-2.5 rounded-xl border mb-1.5 flex flex-col gap-2 ${
              isInbound
                ? "bg-zinc-50 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-750"
                : "bg-teal-800/70 border-teal-600/60 text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {/* Play / Pause button */}
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

              {/* Waveform Visualization Bars */}
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

              {/* Speed toggle chip */}
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

            {/* Timer & Meta */}
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

        {/* C. VIDEO NOTE (Кружочек Telegram со встроенным плеером) */}
        {isVideoNote && (
          <div className="my-1.5 flex flex-col items-center">
            <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden border-4 border-teal-500 shadow-md bg-zinc-950 flex items-center justify-center group">
              {activeVideoUrl ? (
                <video
                  ref={videoRef}
                  src={activeVideoUrl}
                  playsInline
                  controls
                  loop
                  className="w-full h-full object-cover"
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onEnded={() => setIsVideoPlaying(false)}
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
            <span
              className={`text-[10px] mt-1.5 font-mono ${
                isInbound ? "text-zinc-500 dark:text-zinc-400" : "text-teal-100"
              }`}
            >
              Кружочек Telegram · {formatSeconds(durationSec)}
            </span>
          </div>
        )}

        {/* C2. STANDARD VIDEO ATTACHMENT */}
        {isVideo && activeVideoUrl && (
          <div className="my-1.5 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-black">
            <video
              src={activeVideoUrl}
              controls
              playsInline
              className="max-h-72 w-full object-contain"
            />
          </div>
        )}

        {/* D. DOCUMENT ATTACHMENT (Карточка с иконкой, названием и кнопками) */}
        {isDoc && (
          <div
            className={`p-2.5 rounded-xl border mb-1.5 flex items-center justify-between gap-3 ${
              isInbound
                ? "bg-zinc-50 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-750 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                : "bg-teal-800/70 border-teal-600/60 text-white hover:bg-teal-800"
            } transition-colors`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {getDocumentIcon(docName)}
              <div className="min-w-0">
                <div
                  className="font-semibold text-xs truncate max-w-[180px] sm:max-w-[240px]"
                  title={docName}
                >
                  {docName}
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
              {activeDocUrl && (
                <a
                  href={activeDocUrl}
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
                href={activeDocUrl || "#"}
                download={docName}
                onClick={handleDownloadDocument}
                className={`p-1.5 px-2 rounded-lg border flex items-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                  isInbound
                    ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100"
                    : "bg-white text-teal-900 border-white hover:bg-zinc-100 shadow-2xs"
                }`}
                title="Скачать файл на ПК"
              >
                {isDownloadingDoc ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                <span>📥 Скачать файл</span>
              </a>
            </div>
          </div>
        )}

        {/* E. MESSAGE TEXT / CAPTION */}
        {messageText && <p className="whitespace-pre-wrap leading-relaxed">{messageText}</p>}
      </div>
    </div>
  );
};
