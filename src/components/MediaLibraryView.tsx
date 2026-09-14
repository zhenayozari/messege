import React, { useState, useRef, useEffect } from "react";
import {
  Check,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  FolderOpen,
  Hash,
  Image as ImageIcon,
  Link as LinkIcon,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { MediaAsset, Project } from "../types";

export interface MediaLibraryViewProps {
  activeProject: Project;
  mediaAssets: MediaAsset[];
  onUploadMedia: (asset: Partial<MediaAsset>) => void;
  // Picker mode support (used when attaching media in Content workspace)
  isPickerMode?: boolean;
  selectedAssetIds?: string[];
  onConfirmSelection?: (selectedAssets: MediaAsset[]) => void;
  onClosePicker?: () => void;
}

const TAG_SUGGESTIONS = [
  "гостиная",
  "теневой",
  "eurokraab",
  "световые_линии",
  "до_после",
  "кухня",
  "спальня",
  "санузел",
  "треки",
  "подсветка",
  "матовый",
  "сертификат",
];

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export const MediaLibraryView: React.FC<MediaLibraryViewProps> = ({
  activeProject,
  mediaAssets,
  onUploadMedia,
  isPickerMode = false,
  selectedAssetIds = [],
  onConfirmSelection,
  onClosePicker,
}) => {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pickedIds, setPickedIds] = useState<string[]>(selectedAssetIds);

  // Upload modal form states
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [assetType, setAssetType] = useState<"photo" | "video">("photo");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fullscreen preview lightbox
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectMedia = mediaAssets.filter((m) => m.project_id === activeProject.id);

  // Collect all unique tags
  const allTags = Array.from(new Set(projectMedia.flatMap((m) => m.tags)));

  const filteredMedia = projectMedia.filter((m) => {
    if (selectedTag !== "all" && !m.tags.includes(selectedTag)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q);
      const matchTags = m.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTags) return false;
    }
    return true;
  });

  const toggleSelectAsset = (assetId: string) => {
    if (pickedIds.includes(assetId)) {
      setPickedIds(pickedIds.filter((id) => id !== assetId));
    } else {
      setPickedIds([...pickedIds, assetId]);
    }
  };

  const handleConfirmPick = () => {
    if (!onConfirmSelection) return;
    const selected = mediaAssets.filter((m) => pickedIds.includes(m.id));
    onConfirmSelection(selected);
  };

  // Process chosen File from PC
  const processSelectedFile = (file: File) => {
    setUploadError(null);
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isImage && !isVideo) {
      setUploadError("Поддерживаются только изображения (JPG, PNG, WebP) и видеофайлы (MP4, WebM)");
      return;
    }

    setSelectedFile(file);
    setAssetType(isVideo ? "video" : "photo");

    // Auto-populate title without extension if not customized or empty
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    if (!newTitle.trim() || newTitle === "Фото объекта" || newTitle === "Видео объекта") {
      setNewTitle(fileNameWithoutExt);
    }

    // Generate immediate object preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().replace(/^#+/, "").toLowerCase();
    if (clean && !tagsList.includes(clean)) {
      setTagsList([...tagsList, clean]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTagsList(tagsList.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const resetUploadModal = () => {
    setSelectedFile(null);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setNewTitle("");
    setNewUrl("");
    setTagsList([]);
    setTagInput("");
    setAssetType("photo");
    setUploadMode("file");
    setUploadError(null);
    setIsProcessing(false);
    setShowUploadModal(false);
  };

  // Save new media asset
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    let finalUrl = "";
    let finalType: "photo" | "video" = assetType;
    let finalFileName: string | null = null;
    let finalFileSize: number | null = null;

    if (uploadMode === "file") {
      if (!selectedFile) {
        setUploadError("Пожалуйста, выберите файл с диска или перетащите его в область загрузки");
        return;
      }

      setIsProcessing(true);
      finalFileName = selectedFile.name;
      finalFileSize = selectedFile.size;

      // Try reading as persistent DataURL (base64) so it survives page reloads in localStorage
      // For very large files (> 6MB) use ObjectURL to avoid exceeding local storage quota
      if (selectedFile.size <= 6 * 1024 * 1024) {
        try {
          finalUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(selectedFile);
          });
        } catch {
          finalUrl = previewUrl || URL.createObjectURL(selectedFile);
        }
      } else {
        finalUrl = previewUrl || URL.createObjectURL(selectedFile);
      }
    } else {
      // URL mode
      if (!newUrl.trim()) {
        setUploadError("Пожалуйста, введите корректный URL медиафайла");
        return;
      }
      finalUrl = newUrl.trim();
      const isVideo = finalUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) !== null;
      finalType = isVideo ? "video" : "photo";
    }

    const titleToSave = newTitle.trim() || (finalFileName ? finalFileName.replace(/\.[^/.]+$/, "") : "Медиафайл объекта");

    // Include current tagInput if user typed but didn't press enter
    const finalTags = [...tagsList];
    if (tagInput.trim()) {
      const clean = tagInput.trim().replace(/^#+/, "").toLowerCase();
      if (!finalTags.includes(clean)) {
        finalTags.push(clean);
      }
    }
    if (finalTags.length === 0) {
      finalTags.push("потолки");
    }

    onUploadMedia({
      project_id: activeProject.id,
      title: titleToSave,
      asset_type: finalType,
      url: finalUrl,
      description: `Загружено с ПК (${formatFileSize(finalFileSize) || "медиафайл"})`,
      tags: finalTags,
      file_size: finalFileSize,
      file_name: finalFileName,
    });

    setIsProcessing(false);
    resetUploadModal();
  };

  return (
    <div
      className={`flex flex-col h-full bg-white dark:bg-zinc-950 select-none overflow-hidden text-zinc-900 dark:text-zinc-100 ${
        isPickerMode ? "rounded-xl" : "flex-1"
      }`}
    >
      {/* 1. Top Header */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ImageIcon size={18} className="text-teal-700 dark:text-teal-400" />
            <span>
              {isPickerMode ? "Выбор медиафайлов для публикации" : "Медиабиблиотека объектов"}
            </span>
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            {isPickerMode
              ? `Выберите медиа для прикрепления к посту (${pickedIds.length} выбрано)`
              : `Фотографии объектов, видео готовых работ и сертификаты для контента «${activeProject.name}»`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white transition-colors shadow-2xs cursor-pointer active:scale-95"
            title="Загрузить новое фото или видео с компьютера"
          >
            <UploadCloud size={15} />
            <span>Загрузить с ПК</span>
          </button>

          {isPickerMode && (
            <button
              type="button"
              onClick={handleConfirmPick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-2xs cursor-pointer"
            >
              <Check size={14} />
              <span>Прикрепить ({pickedIds.length})</span>
            </button>
          )}

          {isPickerMode && onClosePicker && (
            <button
              type="button"
              onClick={onClosePicker}
              className="p-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Search & Tag Filters */}
      <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedTag("all")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              selectedTag === "all"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs font-semibold"
                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            }`}
          >
            Все ({projectMedia.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                selectedTag === tag
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs font-semibold"
                  : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        <div className="relative w-64 shrink-0">
          <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или тегу..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* 3. Media Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/40 dark:bg-zinc-950">
        {filteredMedia.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 dark:text-zinc-400 text-xs">
            <FolderOpen size={36} className="mx-auto text-zinc-400 dark:text-zinc-600 mb-2 stroke-[1.5]" />
            <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
              В этой категории пока нет медиафайлов
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              Загрузите фотографии или видео объектов прямо с вашего компьютера, чтобы использовать их в публикациях
            </p>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Upload size={14} />
              <span>Загрузить первый файл с диска</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredMedia.map((asset) => {
              const isSelected = pickedIds.includes(asset.id);
              const isVideo = asset.asset_type === "video" || asset.url.match(/\.(mp4|webm|mov)(\?.*)?$/i);

              return (
                <div
                  key={asset.id}
                  onClick={() => {
                    if (isPickerMode) {
                      toggleSelectAsset(asset.id);
                    }
                  }}
                  className={`group bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden transition-all flex flex-col relative shadow-2xs hover:shadow-md ${
                    isPickerMode ? "cursor-pointer" : ""
                  } ${
                    isSelected
                      ? "ring-2 ring-teal-600 border-teal-600 shadow-md"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  {/* Thumbnail Container */}
                  <div
                    className="h-44 bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative cursor-pointer flex items-center justify-center"
                    onClick={(e) => {
                      if (!isPickerMode) {
                        e.stopPropagation();
                        setPreviewAsset(asset);
                      }
                    }}
                  >
                    {isVideo ? (
                      <video
                        src={asset.url}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={asset.url}
                        alt={asset.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    )}

                    {/* Media Type & Size Badges */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      {asset.file_size && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                          {formatFileSize(asset.file_size)}
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/70 text-white backdrop-blur-xs uppercase flex items-center gap-1">
                        {isVideo ? <Video size={11} /> : <ImageIcon size={11} />}
                        <span>{isVideo ? "Видео" : "Фото"}</span>
                      </span>
                    </div>

                    {/* Picker Mode Checkbox Indicator */}
                    {isPickerMode && (
                      <div
                        className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-teal-700 text-white shadow-xs scale-105"
                            : "bg-white/80 dark:bg-zinc-900/80 text-transparent border border-zinc-300 dark:border-zinc-700 backdrop-blur-xs"
                        }`}
                      >
                        <Check size={14} className={isSelected ? "opacity-100" : "opacity-0"} />
                      </div>
                    )}

                    {/* Non-picker hover action: Quick Preview */}
                    {!isPickerMode && (
                      <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                        <span className="bg-black/70 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs">
                          <Eye size={13} />
                          <span>Просмотр</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content Info */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 line-clamp-1"
                        title={asset.title}
                      >
                        {asset.title}
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {asset.description || (asset.file_name ? `Файл: ${asset.file_name}` : "Без описания")}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1 max-w-[80%]">
                        {asset.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                      {isPickerMode && (
                        <span
                          className={`text-[10px] font-semibold ${
                            isSelected ? "text-teal-600 dark:text-teal-400" : "text-zinc-400"
                          }`}
                        >
                          {isSelected ? "Выбрано" : "Выбрать"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Interactive File Upload Modal (Drag-and-Drop & Picker) */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) resetUploadModal();
          }}
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full border border-zinc-200 dark:border-zinc-750 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-700/10 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <UploadCloud size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    Загрузить медиафайл
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Добавление фотографий или видео в медиатеку «{activeProject.name}»
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetUploadModal}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
              {/* Error Alert */}
              {uploadError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2">
                  <X size={14} className="shrink-0 text-rose-600" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Mode Switch: File vs URL */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {uploadMode === "file" ? "Загрузка файла с устройства" : "Вставка по внешней ссылке"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode(uploadMode === "file" ? "url" : "file");
                    setUploadError(null);
                  }}
                  className="text-teal-700 dark:text-teal-400 hover:underline text-xs flex items-center gap-1 font-medium cursor-pointer"
                >
                  {uploadMode === "file" ? (
                    <>
                      <LinkIcon size={12} />
                      <span>Вставить по внешней ссылке (URL)</span>
                    </>
                  ) : (
                    <>
                      <Upload size={12} />
                      <span>Загрузить файл с компьютера (ПК)</span>
                    </>
                  )}
                </button>
              </div>

              {/* 1. Drag and Drop Zone (File Mode) */}
              {uploadMode === "file" && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {!selectedFile ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                        isDragging
                          ? "border-teal-600 bg-teal-50/60 dark:bg-teal-950/40"
                          : "border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950 hover:bg-zinc-100/70 dark:hover:bg-zinc-850 hover:border-zinc-400"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 flex items-center justify-center text-teal-700 dark:text-teal-400 shadow-2xs">
                        <UploadCloud size={24} />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                          Перетащите изображение или видео сюда
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          или <span className="text-teal-700 dark:text-teal-400 font-semibold underline">выберите файл с диска</span>
                        </p>
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                        PNG, JPG, WebP, MP4, WebM (до 50 МБ)
                      </span>
                    </div>
                  ) : (
                    /* Selected File Preview Box */
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-3 space-y-3">
                      <div className="relative rounded-lg overflow-hidden bg-black/90 max-h-52 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                        {assetType === "video" ? (
                          <video
                            src={previewUrl || ""}
                            controls
                            playsInline
                            className="max-h-52 w-full object-contain"
                          />
                        ) : (
                          <img
                            src={previewUrl || ""}
                            alt="Превью"
                            className="max-h-52 w-full object-contain"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            setPreviewUrl(null);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors cursor-pointer"
                          title="Удалить выбранный файл"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* File Details Bar */}
                      <div className="flex items-center justify-between text-xs px-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                            {assetType === "video" ? <Video size={14} /> : <ImageIcon size={14} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[220px]">
                              {selectedFile.name}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                              Размер: <strong>{formatFileSize(selectedFile.size)}</strong>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          Заменить файл
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* URL Mode */}
              {uploadMode === "url" && (
                <div className="space-y-2">
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">
                    Прямая ссылка на файл (URL)
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... или https://..."
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                  />
                  {newUrl.trim() && (
                    <div className="mt-2 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-black/60 max-h-40 flex items-center justify-center p-1">
                      <img
                        src={newUrl}
                        alt="Превью по URL"
                        className="max-h-36 object-contain rounded"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Title Field (Auto-filled from file name) */}
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Название объекта / работы <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="например: Спальня 14м² световые линии EuroKRAAB"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                />
              </div>

              {/* Tags Field with Chips Suggestions */}
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Теги публикации (категории)
                </label>

                {/* Active Tags */}
                {tagsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tagsList.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-medium"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-rose-600 dark:hover:text-rose-400 rounded-full"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Tag Input */}
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Hash size={13} className="absolute left-2.5 top-2.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Введите тег и нажмите Enter или кнопку «+»..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      className="w-full pl-7 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddTag(tagInput)}
                    disabled={!tagInput.trim()}
                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium disabled:opacity-40 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="mt-2">
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-1 font-medium">
                    Популярные теги для потолков и интерьера:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {TAG_SUGGESTIONS.map((sug) => {
                      const isAdded = tagsList.includes(sug);
                      return (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            if (isAdded) {
                              handleRemoveTag(sug);
                            } else {
                              handleAddTag(sug);
                            }
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                            isAdded
                              ? "bg-teal-600 border-teal-600 text-white font-semibold"
                              : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          }`}
                        >
                          #{sug}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={resetUploadModal}
                  className="px-3.5 py-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || (uploadMode === "file" && !selectedFile) || (uploadMode === "url" && !newUrl.trim())}
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Сохранение...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Сохранить в библиотеку</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Lightbox Modal for Large Preview */}
      {previewAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setPreviewAsset(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 text-white">
              <div className="min-w-0 pr-4">
                <h4 className="text-xs font-semibold truncate">{previewAsset.title}</h4>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                  {previewAsset.file_size && <span>{formatFileSize(previewAsset.file_size)}</span>}
                  <span>•</span>
                  <span>{previewAsset.tags.map((t) => `#${t}`).join(" ")}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAsset(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content view */}
            <div className="p-2 flex items-center justify-center bg-black/60 overflow-auto">
              {previewAsset.asset_type === "video" || previewAsset.url.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? (
                <video
                  src={previewAsset.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-full max-h-[75vh] object-contain rounded-lg"
                />
              ) : (
                <img
                  src={previewAsset.url}
                  alt={previewAsset.title}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
