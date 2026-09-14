import React, { useState, useEffect, useMemo } from "react";
import {
  AlertCircle,
  BookOpen,
  Building,
  Check,
  ChevronRight,
  Code2,
  Database,
  Download,
  Edit2,
  FileText,
  Filter,
  Info,
  Layers,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  Shield,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  User,
  Users,
  Zap,
} from "lucide-react";
import {
  DEFAULT_PRICE_ITEMS,
  getPricingItems,
  PriceItem,
  resetPricingToDefaults,
  savePricingItems,
} from "../services/pricing";
import {
  KnowledgeDoc,
  getKnowledgeDocs,
  saveKnowledgeDoc,
  deleteKnowledgeDoc,
  resetKnowledgeDocsToDefaults,
  exportDocAsMarkdown,
  subscribeKnowledgeUpdated,
} from "../services/knowledgeBase";
import { ChannelConnectorStatus, Project, UserRole } from "../types";
import { AccountsView } from "./AccountsView";
import { BackendCodeView } from "./BackendCodeView";
import { MarkdownDocEditorModal } from "./MarkdownDocEditorModal";
import { ProjectsSettings } from "./ProjectsSettings";
import { TeamSettings } from "./TeamSettings";

export type SettingsTab =
  | "pricing"
  | "knowledge"
  | "projects"
  | "team"
  | "integrations"
  | "backend";

interface SettingsViewProps {
  activeProject: Project;
  userRole: UserRole;
  onNavigateToDialogs?: () => void;
  connectors?: ChannelConnectorStatus[];
  onSyncTelegram?: () => void;
  onSyncVk?: () => void;
  initialTab?: SettingsTab;
  onSelectProject?: (project: Project) => void;
  onRoleChange?: (role: UserRole) => void;
  projects?: Project[];
}

const CATEGORY_NAMES: Record<PriceItem["category"], { name: string; badge: string }> = {
  fabric: { name: "Полотна", badge: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  profile: { name: "Профили", badge: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  angles: { name: "Углы", badge: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  lights: { name: "Освещение и треки", badge: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  cornices: { name: "Карнизы и шторы", badge: "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800" },
  discounts: { name: "Скидки (%)", badge: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  activeProject,
  userRole,
  onNavigateToDialogs,
  connectors = [],
  onSyncTelegram,
  onSyncVk,
  initialTab = "pricing",
  onSelectProject,
  onRoleChange,
  projects = [],
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [pricingItems, setPricingItems] = useState<PriceItem[]>(() => getPricingItems());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [savedSuccessToast, setSavedSuccessToast] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // ==================== База знаний (RAG) State ====================
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>(() =>
    getKnowledgeDocs(activeProject.niche_type)
  );
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [selectedDocForEdit, setSelectedDocForEdit] = useState<KnowledgeDoc | null>(null);
  const [isDocEditorOpen, setIsDocEditorOpen] = useState(false);
  const [knowledgeToast, setKnowledgeToast] = useState<string | null>(null);
  const fileUploadInputRef = React.useRef<HTMLInputElement | null>(null);

  // Синхронизация базы знаний при переключении ниши/проекта или внешнем событии
  useEffect(() => {
    setKnowledgeDocs(getKnowledgeDocs(activeProject.niche_type));
    const unsub = subscribeKnowledgeUpdated(() => {
      setKnowledgeDocs(getKnowledgeDocs(activeProject.niche_type));
    });
    return unsub;
  }, [activeProject.niche_type]);

  // Новая позиция для модалки прайса
  const [newItem, setNewItem] = useState<{
    category: PriceItem["category"];
    name: string;
    unit: string;
    min: number;
    max: number;
    description: string;
  }>({
    category: "fabric",
    name: "",
    unit: "м²",
    min: 500,
    max: 1000,
    description: "",
  });

  // Загружаем данные прайс-листа при открытии (в первую очередь из localStorage: phoenix_custom_pricing)
  useEffect(() => {
    setPricingItems(getPricingItems());
    setHasChanges(false);
  }, []);

  // Изменение цены в строке (АВТОМАТИЧЕСКОЕ сохранение в localStorage при любом вводе)
  const handlePriceChange = (id: string, field: "min" | "max", val: number) => {
    setPricingItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const itemUp = { ...item, [field]: Math.max(0, val) };
          if (field === "min" && itemUp.min > itemUp.max) {
            itemUp.max = itemUp.min;
          }
          return itemUp;
        }
        return item;
      });
      // Автоматически персистим в localStorage("phoenix_custom_pricing")
      savePricingItems(updated);
      return updated;
    });
    setHasChanges(false);
    setSavedSuccessToast(true);
    setTimeout(() => setSavedSuccessToast(false), 2000);
  };

  // Удаление позиции (для кастомных) с авто-сохранением
  const handleDeleteItem = (id: string) => {
    setPricingItems((prev) => {
      const updated = prev.filter((it) => it.id !== id);
      savePricingItems(updated);
      return updated;
    });
    setHasChanges(false);
    setSavedSuccessToast(true);
    setTimeout(() => setSavedSuccessToast(false), 2000);
  };

  // Ручное подтверждение сохранения прайс-листа
  const handleSavePrices = () => {
    savePricingItems(pricingItems);
    setHasChanges(false);
    setSavedSuccessToast(true);
    setTimeout(() => setSavedSuccessToast(false), 2500);
  };

  // Сбросить к заводским ценам (корректно очищает localStorage и возвращает эталон)
  const handleResetToFactory = () => {
    if (
      window.confirm(
        "Вы уверены, что хотите сбросить прайс-лист к заводским ценам по умолчанию? Все пользовательские изменения цен будут удалены из локального хранилища и возвращены к эталону."
      )
    ) {
      const def = resetPricingToDefaults();
      setPricingItems(def);
      setHasChanges(false);
      setSavedSuccessToast(true);
      setTimeout(() => setSavedSuccessToast(false), 2500);
    }
  };

  // Добавить новую позицию в прайс-лист
  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const created: PriceItem = {
      id,
      category: newItem.category,
      name: newItem.name.trim(),
      unit: newItem.unit.trim() || "шт",
      min: Number(newItem.min) || 0,
      max: Number(newItem.max) || Number(newItem.min) || 0,
      description: newItem.description.trim() || "Пользовательская позиция",
      isCustom: true,
    };

    setPricingItems((prev) => {
      const updated = [created, ...prev];
      savePricingItems(updated);
      return updated;
    });
    setHasChanges(false);
    setShowAddModal(false);
    setSavedSuccessToast(true);
    setTimeout(() => setSavedSuccessToast(false), 2000);
    setNewItem({
      category: "fabric",
      name: "",
      unit: "м²",
      min: 500,
      max: 1000,
      description: "",
    });
  };

  // ==================== Обработчики Базы Знаний ====================
  const handleOpenEditDoc = (doc: KnowledgeDoc) => {
    setSelectedDocForEdit(doc);
    setIsDocEditorOpen(true);
  };

  const handleOpenCreateDoc = () => {
    setSelectedDocForEdit(null);
    setIsDocEditorOpen(true);
  };

  const handleSaveKnowledgeDoc = (docToSave: KnowledgeDoc) => {
    saveKnowledgeDoc(docToSave);
    setKnowledgeDocs(getKnowledgeDocs(activeProject.niche_type));
    setKnowledgeToast(`Документ «${docToSave.filename}» сохранен и переиндексирован в RAG`);
    setTimeout(() => setKnowledgeToast(null), 3000);
  };

  const handleDeleteKnowledgeDoc = (docId: string) => {
    deleteKnowledgeDoc(docId);
    setKnowledgeDocs(getKnowledgeDocs(activeProject.niche_type));
    setKnowledgeToast("Документ удален из базы знаний");
    setTimeout(() => setKnowledgeToast(null), 3000);
  };

  const handleResetKnowledgeToFactory = () => {
    if (
      window.confirm(
        "Сбросить базу знаний текущего проекта к заводскому эталону? Все отредактированные регламенты будут возвращены к оригинальным версиям."
      )
    ) {
      const reset = resetKnowledgeDocsToDefaults();
      setKnowledgeDocs(
        activeProject.niche_type
          ? reset.filter((d) => d.niche === activeProject.niche_type || d.niche === "all")
          : reset
      );
      setKnowledgeToast("База знаний возвращена к эталону по умолчанию");
      setTimeout(() => setKnowledgeToast(null), 3000);
    }
  };

  const handleDownloadKnowledgeDoc = (doc: KnowledgeDoc, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    exportDocAsMarkdown(doc.filename, doc.content);
  };

  const handleUploadMdFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setSelectedDocForEdit({
          id: `custom_${Date.now()}`,
          filename: file.name.endsWith(".md") ? file.name : `${file.name}.md`,
          title: file.name.replace(/\.(md|txt)$/i, ""),
          description: "Загруженный регламент компании",
          content: text,
          niche: activeProject.niche_type || "ceilings",
          chunksCount: 0,
          updatedAt: "Только что",
          isCustom: true,
        });
        setIsDocEditorOpen(true);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Фильтрация документов базы знаний
  const filteredKnowledgeDocs = useMemo(() => {
    if (!knowledgeSearch.trim()) return knowledgeDocs;
    const q = knowledgeSearch.toLowerCase();
    return knowledgeDocs.filter(
      (d) =>
        d.filename.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q)
    );
  }, [knowledgeDocs, knowledgeSearch]);

  // Фильтрация позиций таблицы
  const filteredItems = useMemo(() => {
    return pricingItems.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mName = item.name.toLowerCase().includes(q);
        const mDesc = item.description?.toLowerCase().includes(q);
        if (!mName && !mDesc) return false;
      }
      return true;
    });
  }, [pricingItems, selectedCategory, searchQuery]);

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 select-none overflow-hidden text-xs">
      {/* 1. Header Настроек */}
      <div className="p-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Settings size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Центр настроек системы
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/50 dark:border-amber-800">
                Роль: Владелец
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Управление прайс-листами, тарификатором смет, базой знаний и параметрами ниши
            </p>
          </div>
        </div>

        {/* Индикатор сохранения / Тост */}
        <div className="flex items-center gap-2">
          {savedSuccessToast && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-medium animate-fadeIn">
              <Check size={14} className="text-emerald-600" />
              <span>Тарифы успешно обновлены и синхронизированы с калькулятором!</span>
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToFactory}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer"
                title="Вернуть изначальные заводские расценки"
              >
                <RotateCcw size={13} />
                <span>Заводские цены</span>
              </button>

              <button
                type="button"
                onClick={handleSavePrices}
                disabled={!hasChanges}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-semibold text-xs transition-all shadow-xs cursor-pointer ${
                  hasChanges
                    ? "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-700/20"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                }`}
              >
                <Save size={14} />
                <span>{hasChanges ? "Сохранить прайс-лист *" : "Сохранено"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Навигация по подразделам (Табы) */}
      <div className="bg-zinc-100/80 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 px-3 pt-1.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium text-xs transition-colors cursor-pointer ${
              activeTab === "pricing"
                ? "border-teal-600 text-teal-700 dark:text-teal-400 font-bold bg-white dark:bg-zinc-800 rounded-t-md"
                : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Tag size={14} className={activeTab === "pricing" ? "text-teal-600" : ""} />
            <span>🏷️ Прайс-лист и тарифы</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold">
              {pricingItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("knowledge")}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium text-xs transition-colors cursor-pointer ${
              activeTab === "knowledge"
                ? "border-teal-600 text-teal-700 dark:text-teal-400 font-bold bg-white dark:bg-zinc-800 rounded-t-md"
                : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <BookOpen size={14} className={activeTab === "knowledge" ? "text-teal-600" : ""} />
            <span>📚 База знаний (RAG)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              4 док.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("projects")}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium text-xs transition-colors cursor-pointer ${
              activeTab === "projects"
                ? "border-teal-600 text-teal-700 dark:text-teal-400 font-bold bg-white dark:bg-zinc-800 rounded-t-md"
                : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Building size={14} className={activeTab === "projects" ? "text-teal-600" : ""} />
            <span>🏢 Проекты и ниши</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium text-xs transition-colors cursor-pointer ${
              activeTab === "team"
                ? "border-teal-600 text-teal-700 dark:text-teal-400 font-bold bg-white dark:bg-zinc-800 rounded-t-md"
                : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Users size={14} className={activeTab === "team" ? "text-teal-600" : ""} />
            <span>👥 Команда</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("integrations")}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium text-xs transition-colors cursor-pointer ${
              activeTab === "integrations"
                ? "border-teal-600 text-teal-700 dark:text-teal-400 font-bold bg-white dark:bg-zinc-800 rounded-t-md"
                : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Radio size={14} className={activeTab === "integrations" ? "text-teal-600" : ""} />
            <span>🔌 Интеграции</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-medium">
              API
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("backend")}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium text-xs transition-colors cursor-pointer ${
              activeTab === "backend"
                ? "border-teal-600 text-teal-700 dark:text-teal-400 font-bold bg-white dark:bg-zinc-800 rounded-t-md"
                : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Code2 size={14} className={activeTab === "backend" ? "text-teal-600" : ""} />
            <span>💻 Бэкенд-код</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              Py
            </span>
          </button>
        </div>

        {hasChanges && (
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle size={13} />
            Есть несохранённые изменения тарифов
          </span>
        )}
      </div>

      {/* 3. Основная область вкладки */}
      <div
        className={`flex-1 overflow-y-auto ${
          activeTab === "integrations" || activeTab === "backend" ? "p-0" : "p-4"
        }`}
      >
        {/* ==================== Вкладка 1: Прайс-лист и тарифы ==================== */}
        {activeTab === "pricing" && (
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Тулбар фильтрации и поиска */}
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              {/* Категории */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "all", label: "Все разделы" },
                  { id: "fabric", label: "Полотна" },
                  { id: "profile", label: "Профили" },
                  { id: "angles", label: "Углы" },
                  { id: "lights", label: "Освещение" },
                  { id: "cornices", label: "Карнизы" },
                  { id: "discounts", label: "Скидки" },
                ].map((cat) => {
                  const isSel = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isSel
                          ? "bg-teal-700 text-white font-semibold shadow-2xs"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Поиск и кнопка добавления */}
              <div className="flex items-center gap-2">
                <div className="relative w-56">
                  <Search size={13} className="absolute left-2.5 top-2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию..."
                    className="w-full pl-7 pr-3 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Добавить позицию</span>
                </button>
              </div>
            </div>

            {/* Таблица тарифов */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Категория</th>
                      <th className="py-2.5 px-3">Наименование и спецификация</th>
                      <th className="py-2.5 px-3 w-20 text-center">Ед. изм.</th>
                      <th className="py-2.5 px-3 w-32 text-right">Мин. цена</th>
                      <th className="py-2.5 px-3 w-32 text-right">Макс. цена</th>
                      <th className="py-2.5 px-3 w-16 text-center">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80 text-xs">
                    {filteredItems.map((item) => {
                      const catInfo = CATEGORY_NAMES[item.category] || {
                        name: item.category,
                        badge: "bg-zinc-100 text-zinc-700",
                      };
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          {/* Категория */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${catInfo.badge}`}
                            >
                              {catInfo.name}
                            </span>
                          </td>

                          {/* Наименование */}
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {item.name}
                              {item.isCustom && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[9px] font-medium">
                                  кастомная
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {item.description}
                              </div>
                            )}
                          </td>

                          {/* Ед. изм. */}
                          <td className="py-2.5 px-3 text-center font-mono text-zinc-600 dark:text-zinc-400 font-medium">
                            {item.unit}
                          </td>

                          {/* Мин. цена */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100000"
                                value={item.min}
                                onChange={(e) =>
                                  handlePriceChange(item.id, "min", Number(e.target.value))
                                }
                                className="w-20 py-1 px-2 text-right font-mono font-bold text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                              />
                              <span className="text-[10px] text-zinc-400">
                                {item.unit === "%" ? "%" : "₽"}
                              </span>
                            </div>
                          </td>

                          {/* Макс. цена */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100000"
                                value={item.max}
                                onChange={(e) =>
                                  handlePriceChange(item.id, "max", Number(e.target.value))
                                }
                                className="w-20 py-1 px-2 text-right font-mono font-bold text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                              />
                              <span className="text-[10px] text-zinc-400">
                                {item.unit === "%" ? "%" : "₽"}
                              </span>
                            </div>
                          </td>

                          {/* Действия */}
                          <td className="py-2.5 px-3 text-center">
                            {item.isCustom ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                title="Удалить позицию"
                                className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-400 italic" title="Системная формула">
                                базовая
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-400">
                          По вашему запросу ничего не найдено
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Подсказка внизу */}
            <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 rounded-xl text-zinc-700 dark:text-zinc-300 flex items-start gap-2 text-[11px]">
              <Sparkles size={16} className="text-teal-600 shrink-0 mt-0.5" />
              <div>
                <strong>Связь с калькулятором и AI:</strong> Все отредактированные тарифы немедленно применяются при расчете вилки сметы в правой панели диалога с клиентом, а также передаются AI-ассистенту и попадают в скачиваемый официальный Word (.docx) документ.
              </div>
            </div>
          </div>
        )}

        {/* ==================== Вкладка 2: База знаний (RAG) ==================== */}
        {activeTab === "knowledge" && (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Уведомление о сохранении базы знаний */}
            {knowledgeToast && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 flex items-center gap-2 text-xs font-medium animate-in fade-in">
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span>{knowledgeToast}</span>
              </div>
            )}

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Database size={16} className="text-teal-600" />
                    <span>Векторная база знаний (RAG Pipeline)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      {activeProject.name}
                    </span>
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 text-[11px]">
                    Специализированные документы компании, регламенты, прайсы и скрипты для контекста Gemini 2.5 Flash
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Скрытый инпут загрузки файла */}
                  <input
                    type="file"
                    ref={fileUploadInputRef}
                    onChange={handleUploadMdFile}
                    accept=".md,.txt"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileUploadInputRef.current?.click()}
                    title="Загрузить регламент .md с диска"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Upload size={13} />
                    <span>Загрузить .md</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetKnowledgeToFactory}
                    title="Сбросить все регламенты к заводским эталонам"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <RotateCcw size={13} />
                    <span>Сброс к эталону</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenCreateDoc}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs cursor-pointer shadow-2xs transition-colors"
                  >
                    <Plus size={13} />
                    <span>+ Добавить регламент</span>
                  </button>
                </div>
              </div>

              {/* Поиск по документам */}
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <div className="relative flex-1 max-w-sm">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="text"
                    placeholder="Поиск по документам и регламентам..."
                    value={knowledgeSearch}
                    onChange={(e) => setKnowledgeSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs focus:outline-teal-600 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="text-[11px] text-zinc-400 shrink-0">
                  <span>
                    Документов: <strong className="text-zinc-700 dark:text-zinc-300">{filteredKnowledgeDocs.length}</strong>
                  </span>
                  <span className="mx-1.5">•</span>
                  <span>
                    Чанков RAG:{" "}
                    <strong className="text-teal-600 dark:text-teal-400">
                      {filteredKnowledgeDocs.reduce((acc, d) => acc + (d.chunksCount || 0), 0)}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Карточки файлов знаний */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {filteredKnowledgeDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleOpenEditDoc(doc)}
                    className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 hover:bg-white dark:hover:bg-zinc-900 hover:border-teal-400/80 dark:hover:border-teal-700 transition-all flex flex-col justify-between cursor-pointer group shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
                          <span className="font-mono font-bold text-teal-800 dark:text-teal-300 text-xs truncate">
                            {doc.filename}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-medium shrink-0">
                          <Check size={10} />
                          Синхронизирован с RAG
                        </span>
                      </div>

                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs mt-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {doc.title}
                      </div>

                      {doc.description && (
                        <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-1 line-clamp-2 leading-relaxed">
                          {doc.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/60">
                      <span className="font-medium text-teal-700 dark:text-teal-400">
                        {doc.chunksCount} векторных чанков
                      </span>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDownloadKnowledgeDoc(doc)}
                          title="Скачать .md файл"
                          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                        >
                          <Download size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditDoc(doc)}
                          title="Редактировать в Markdown-редакторе"
                          className="p-1 rounded hover:bg-teal-50 dark:hover:bg-teal-950 text-teal-600 dark:text-teal-400 transition-colors cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>

                        {doc.isCustom && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Удалить документ "${doc.filename}"?`)) {
                                handleDeleteKnowledgeDoc(doc.id);
                              }
                            }}
                            title="Удалить регламент"
                            className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredKnowledgeDocs.length === 0 && (
                  <div className="col-span-2 py-10 text-center text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <Database size={24} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-medium">Документы не найдены</p>
                    <p className="text-[11px] mt-0.5">Попробуйте изменить поисковый запрос или добавьте новый регламент</p>
                  </div>
                )}
              </div>
            </div>

            {/* Подсказка о работе RAG */}
            <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 rounded-xl text-zinc-700 dark:text-zinc-300 flex items-start gap-2 text-[11px]">
              <Sparkles size={16} className="text-teal-600 shrink-0 mt-0.5" />
              <div>
                <strong>Принцип работы RAG:</strong> При каждом вопросе клиента нейросеть Gemini 2.5 Flash семантически сопоставляет запрос с векторными чанками этих документов (pricing.md, calculator.md, company.md, faq.md) и генерирует аргументированный ответ строго по регламентам компании.
              </div>
            </div>
          </div>
        )}

        {/* ==================== Вкладка 3: Проекты и ниши ==================== */}
        {activeTab === "projects" && (
          <div className="max-w-5xl mx-auto">
            <ProjectsSettings
              activeProject={activeProject}
              onSelectProject={onSelectProject}
            />
          </div>
        )}

        {/* ==================== Вкладка 4: Команда и доступ ==================== */}
        {activeTab === "team" && (
          <div className="max-w-5xl mx-auto">
            <TeamSettings
              activeProject={activeProject}
              userRole={userRole}
              onRoleChange={onRoleChange}
              projects={projects}
            />
          </div>
        )}

        {/* ==================== Вкладка 5: Интеграции и Аккаунты ==================== */}
        {activeTab === "integrations" && (
          <div className="h-full flex flex-col">
            <AccountsView
              connectors={connectors || []}
              onSyncTelegram={onSyncTelegram}
              onSyncVk={onSyncVk}
              activeProjectId={activeProject.id}
            />
          </div>
        )}

        {/* ==================== Вкладка 6: Исходный код бэкенда ==================== */}
        {activeTab === "backend" && (
          <div className="h-full flex flex-col">
            <BackendCodeView />
          </div>
        )}
      </div>

      {/* 4. Модальное окно добавления позиции */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-4 shadow-xl space-y-3 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Plus size={16} className="text-teal-600" />
                <span>Добавить позицию в прайс-лист</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Категория:
                </label>
                <select
                  value={newItem.category}
                  onChange={(e) =>
                    setNewItem({ ...newItem, category: e.target.value as PriceItem["category"] })
                  }
                  className="w-full py-1.5 px-2 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-1 focus:ring-teal-500"
                >
                  <option value="fabric">Полотна</option>
                  <option value="profile">Профили</option>
                  <option value="angles">Углы</option>
                  <option value="lights">Освещение и треки</option>
                  <option value="cornices">Карнизы и шторы</option>
                  <option value="discounts">Скидки</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Наименование позиции:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Монтаж диффузора вытяжки"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full py-1.5 px-2 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Ед. изм.:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="шт / пог.м / м²"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full py-1.5 px-2 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Мин. цена (₽):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.min}
                    onChange={(e) => setNewItem({ ...newItem, min: Number(e.target.value) })}
                    className="w-full py-1.5 px-2 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Макс. цена (₽):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.max}
                    onChange={(e) => setNewItem({ ...newItem, max: Number(e.target.value) })}
                    className="w-full py-1.5 px-2 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Описание / примечание:
                </label>
                <input
                  type="text"
                  placeholder="Краткое пояснение для сметы"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full py-1.5 px-2 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer shadow-xs"
                >
                  Добавить в прайс-лист
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальный Markdown-редактор базы знаний с предпросмотром и инспектором чанков */}
      <MarkdownDocEditorModal
        isOpen={isDocEditorOpen}
        doc={selectedDocForEdit}
        onClose={() => setIsDocEditorOpen(false)}
        onSave={handleSaveKnowledgeDoc}
        onDelete={handleDeleteKnowledgeDoc}
        niche={activeProject.niche_type || "ceilings"}
      />
    </div>
  );
};
