import React, { useState } from "react";
import {
  Check,
  FolderOpen,
  Image,
  Plus,
  Search,
  Tag,
  UploadCloud,
  X,
} from "lucide-react";
import { MediaAsset, Project } from "../types";

interface MediaLibraryProps {
  activeProject: Project;
  mediaAssets: MediaAsset[];
  onUploadMedia: (asset: Partial<MediaAsset>) => void;
  // Picker modal props
  isPickerMode?: boolean;
  selectedAssetIds?: string[];
  onConfirmSelection?: (selectedAssets: MediaAsset[]) => void;
  onClosePicker?: () => void;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
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
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newTags, setNewTags] = useState("");
  const [pickedIds, setPickedIds] = useState<string[]>(selectedAssetIds);

  const projectMedia = mediaAssets.filter((m) => m.project_id === activeProject.id);

  // Collect all unique tags
  const allTags = Array.from(new Set(projectMedia.flatMap((m) => m.tags)));

  const filteredMedia = projectMedia.filter((m) => {
    if (selectedTag !== "all" && !m.tags.includes(selectedTag)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
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

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onUploadMedia({
      project_id: activeProject.id,
      title: newTitle.trim(),
      url: newUrl.trim() || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
      asset_type: "photo",
      description: "Загружено оператором в медиатеку",
      tags: newTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    });

    setNewTitle("");
    setNewUrl("");
    setNewTags("");
    setShowUploadModal(false);
  };

  const handleConfirmPick = () => {
    if (!onConfirmSelection) return;
    const selected = mediaAssets.filter((m) => pickedIds.includes(m.id));
    onConfirmSelection(selected);
  };

  return (
    <div className={`flex flex-col h-full bg-white select-none overflow-hidden ${isPickerMode ? "rounded-xl" : "flex-1"}`}>
      {/* 1. Header */}
      <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-white shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Image size={18} className="text-teal-700" />
            <span>{isPickerMode ? "Выбор медиафайлов для публикации" : "Медиабиблиотека объектов"}</span>
          </h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            {isPickerMode
              ? `Выберите одно или несколько фото для прикрепления к посту (${pickedIds.length} выбрано)`
              : `Фотографии готовых работ, сертификаты и схемы для карточек контента ${activeProject.name}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors border border-zinc-200"
          >
            <UploadCloud size={14} />
            <span>Загрузить фото</span>
          </button>

          {isPickerMode && (
            <button
              type="button"
              onClick={handleConfirmPick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-2xs"
            >
              <Check size={14} />
              <span>Прикрепить ({pickedIds.length})</span>
            </button>
          )}

          {isPickerMode && onClosePicker && (
            <button
              type="button"
              onClick={onClosePicker}
              className="p-1.5 text-zinc-600 hover:text-zinc-600 hover:bg-zinc-100 rounded-md"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Search & Tag Filters */}
      <div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50/70 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setSelectedTag("all")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedTag === "all"
                ? "bg-zinc-900 text-white shadow-2xs"
                : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
            }`}
          >
            Все ({projectMedia.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedTag === tag
                  ? "bg-zinc-900 text-white shadow-2xs"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по медиа..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* 3. Media Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredMedia.length === 0 ? (
          <div className="text-center py-16 text-zinc-600 text-xs">
            <FolderOpen size={32} className="mx-auto text-zinc-600 mb-2 stroke-[1.5]" />
            <p className="font-medium">В этой категории пока нет медиафайлов</p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Загрузите фото объектов для использования в автопостинге
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {filteredMedia.map((asset) => {
              const isSelected = pickedIds.includes(asset.id);
              return (
                <div
                  key={asset.id}
                  onClick={() => isPickerMode && toggleSelectAsset(asset.id)}
                  className={`group bg-white border rounded-xl overflow-hidden transition-all flex flex-col relative ${
                    isPickerMode ? "cursor-pointer" : ""
                  } ${
                    isSelected
                      ? "ring-2 ring-teal-600 border-teal-600 shadow-md"
                      : "border-zinc-200 hover:shadow-md"
                  }`}
                >
                  <div className="h-44 bg-zinc-100 overflow-hidden relative">
                    <img
                      src={asset.url}
                      alt={asset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-xs uppercase">
                      {asset.asset_type}
                    </span>

                    {isPickerMode && (
                      <div
                        className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-teal-700 text-white shadow-xs"
                            : "bg-white/80 text-transparent border border-zinc-300 backdrop-blur-xs"
                        }`}
                      >
                        <Check size={14} className={isSelected ? "opacity-100" : "opacity-0"} />
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-xs text-zinc-900 line-clamp-1">
                        {asset.title}
                      </h3>
                      <p className="text-[11px] text-zinc-600 line-clamp-2 mt-1 leading-relaxed">
                        {asset.description || "Без описания"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-3">
                      {asset.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-medium"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-zinc-200 p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-zinc-900">Загрузить медиафайл</h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-zinc-600 hover:text-zinc-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Название фото / объекта</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Спальня 14м² световые линии"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">URL изображения</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Теги (через запятую)</label>
                <input
                  type="text"
                  placeholder="гостиная, треки, теневой"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium"
                >
                  Сохранить в библиотеку
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
