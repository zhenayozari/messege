import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Download,
  Eye,
  Edit3,
  Columns,
  Layers,
  Sparkles,
  Trash2,
  Check,
  FileCode,
  Heading1,
  Heading2,
  Bold,
  List,
  Code,
  Quote,
  Table,
} from "lucide-react";
import Markdown from "react-markdown";
import {
  KnowledgeDoc,
  computeMarkdownChunks,
  exportDocAsMarkdown,
} from "../services/knowledgeBase";

interface MarkdownDocEditorModalProps {
  isOpen: boolean;
  doc: KnowledgeDoc | null;
  onClose: () => void;
  onSave: (updatedDoc: KnowledgeDoc) => void;
  onDelete?: (docId: string) => void;
  niche: string;
}

export const MarkdownDocEditorModal: React.FC<MarkdownDocEditorModalProps> = ({
  isOpen,
  doc,
  onClose,
  onSave,
  onDelete,
  niche,
}) => {
  const [filename, setFilename] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [viewMode, setViewMode] = useState<"split" | "edit" | "preview">("split");
  const [showChunks, setShowChunks] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    if (doc) {
      setFilename(doc.filename);
      setTitle(doc.title);
      setDescription(doc.description || "");
      setContent(doc.content);
    } else {
      setFilename("new_regulation.md");
      setTitle("Новый рабочий регламент");
      setDescription("Описание регламента для RAG");
      setContent(`# Новый рабочий регламент

## 1. Основные положения
- Пункт 1: описание стандарта работы
- Пункт 2: требования к коммуникации с клиентом

## 2. Скрипт ответа на возражения
> «Мы предоставляем официальную гарантию по договору и фиксируем смету на замере.»
`);
    }
  }, [doc, isOpen]);

  if (!isOpen) return null;

  const chunks = computeMarkdownChunks(content);

  const handleSave = () => {
    const cleanedFilename = filename.trim().endsWith(".md")
      ? filename.trim()
      : `${filename.trim()}.md`;

    const updated: KnowledgeDoc = {
      id: doc?.id || `doc_${Date.now()}`,
      filename: cleanedFilename,
      title: title.trim() || "Без названия",
      description: description.trim(),
      content: content,
      niche: doc?.niche || niche,
      chunksCount: chunks.length,
      updatedAt: "Только что",
      isCustom: doc?.isCustom ?? true,
    };

    onSave(updated);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleDownload = () => {
    exportDocAsMarkdown(filename, content);
  };

  // Helper for inserting markdown formatting
  const insertFormatting = (prefix: string, suffix = "") => {
    const textarea = document.getElementById("md-textarea") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${prefix}${selected || "текст"}${suffix}`;
    const newContent =
      content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selected.length || 5)
      );
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Toast confirmation */}
        {saveToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2">
            <Check size={16} />
            <span>Документ успешно сохранен в базе знаний и переиндексирован в RAG!</span>
          </div>
        )}

        {/* 1. Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/80 shrink-0">
              <FileCode size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-100/60 dark:bg-teal-950 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                  {filename}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800 flex items-center gap-1">
                  <Sparkles size={11} />
                  <span>{chunks.length} векторных чанков RAG</span>
                </span>
              </div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                {title || "Редактирование документа базы знаний"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              title="Скачать файл .md"
              className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Скачать .md</span>
            </button>

            {/* Chunks Inspector Toggle */}
            <button
              type="button"
              onClick={() => setShowChunks(!showChunks)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                showChunks
                  ? "bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <Layers size={13} />
              <span className="hidden sm:inline">Чанки RAG</span>
            </button>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Save size={14} />
              <span>Сохранить</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. Metadata Inputs Row */}
        <div className="px-5 py-2.5 bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0 text-xs">
          <div>
            <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
              Имя файла (.md)
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="filename.md"
              className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono focus:outline-teal-600"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
              Заголовок документа
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название регламента или прайса"
              className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-teal-600"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
              Краткое описание для RAG
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="О чем документ и когда его использовать"
              className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-teal-600"
            />
          </div>
        </div>

        {/* 3. Editor Toolbar */}
        <div className="px-5 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 text-zinc-600 dark:text-zinc-400">
            <button
              type="button"
              onClick={() => insertFormatting("# ")}
              title="Заголовок H1"
              className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold"
            >
              <Heading1 size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("## ")}
              title="Заголовок H2"
              className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold"
            >
              <Heading2 size={14} />
            </button>
            <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
            <button
              type="button"
              onClick={() => insertFormatting("**", "**")}
              title="Жирный текст"
              className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("- ")}
              title="Маркированный список"
              className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("> ")}
              title="Цитата / Скрипт"
              className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Quote size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("```\n", "\n```")}
              title="Блок кода"
              className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Code size={14} />
            </button>
            <button
              type="button"
              onClick={() =>
                insertFormatting(
                  "\n| Параметр | Значение |\n|:---|:---|\n| Пример | 1 000 ₽ |\n"
                )
              }
              title="Вставить таблицу"
              className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Table size={14} />
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                viewMode === "edit"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Edit3 size={12} />
              <span>Редактор</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`hidden sm:flex px-2 py-1 rounded items-center gap-1 transition-colors ${
                viewMode === "split"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Columns size={12} />
              <span>Сплит</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                viewMode === "preview"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Eye size={12} />
              <span>Предпросмотр</span>
            </button>
          </div>
        </div>

        {/* 4. Editor / Preview Workspace */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Editor Side */}
          {(viewMode === "edit" || viewMode === "split") && (
            <div
              className={`h-full flex flex-col bg-white dark:bg-zinc-900 ${
                viewMode === "split" ? "w-1/2 border-r border-zinc-200 dark:border-zinc-800" : "w-full"
              }`}
            >
              <textarea
                id="md-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Пишите содержимое документа на Markdown..."
                className="w-full h-full p-4 font-mono text-xs leading-relaxed resize-none focus:outline-hidden bg-transparent text-zinc-900 dark:text-zinc-100 selection:bg-teal-100 dark:selection:bg-teal-900"
                spellCheck={false}
              />
            </div>
          )}

          {/* Preview Side */}
          {(viewMode === "preview" || viewMode === "split") && (
            <div
              className={`h-full overflow-y-auto p-5 bg-zinc-50/50 dark:bg-zinc-950/50 ${
                viewMode === "split" ? "w-1/2" : "w-full"
              }`}
            >
              <div className="max-w-prose mx-auto prose prose-sm dark:prose-invert prose-teal text-xs leading-relaxed">
                <Markdown>{content}</Markdown>
              </div>
            </div>
          )}

          {/* RAG Chunks Inspector Drawer */}
          {showChunks && (
            <div className="w-80 h-full border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-150">
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
                <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  <Layers size={14} className="text-teal-600" />
                  <span>Чанки RAG ({chunks.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChunks(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Семантические фрагменты, которые попадают в векторный индекс для генерации ответов Gemini:
                </p>
                {chunks.map((ch, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-teal-700 dark:text-teal-400 font-mono font-bold">
                      <span>Чанк #{idx + 1}</span>
                      <span className="text-zinc-400">{ch.length} симв.</span>
                    </div>
                    <pre className="text-[10px] font-mono whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 max-h-28 overflow-y-auto leading-normal">
                      {ch}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 5. Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-950/90 flex items-center justify-between text-xs shrink-0">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-3">
            <span>
              Символов: <strong className="text-zinc-800 dark:text-zinc-200">{content.length}</strong>
            </span>
            <span>•</span>
            <span>
              Строк: <strong className="text-zinc-800 dark:text-zinc-200">{content.split("\n").length}</strong>
            </span>
            <span>•</span>
            <span>
              Чанков RAG: <strong className="text-teal-600 dark:text-teal-400">{chunks.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onDelete && doc && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Удалить документ "${filename}" из базы знаний?`)) {
                    onDelete(doc.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Удалить</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium cursor-pointer"
            >
              Отмена
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Save size={14} />
              <span>Сохранить документ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
