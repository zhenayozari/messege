import React, { useEffect, useState } from "react";
import {
  Building,
  Check,
  CheckCircle2,
  Copy,
  Edit2,
  ExternalLink,
  FileText,
  FolderPlus,
  Layers,
  MessageCircle,
  MessageSquare,
  Plus,
  Radio,
  RotateCcw,
  Send,
  Share2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { ChannelType, NicheType, Project } from "../types";
import { getKnowledgeDocsCount } from "../services/knowledgeBase";
import {
  createProject,
  deleteProject,
  getStoredProjects,
  resetProjectsToDefaults,
  saveProjects,
  setActiveProject as setServiceActiveProject,
  subscribeProjects,
} from "../services/projectsService";

interface ProjectsSettingsProps {
  activeProject: Project;
  onSelectProject?: (project: Project) => void;
}

const NICHE_PRESETS: { value: string; label: string; defaultColor: string; defaultPrompt: string }[] = [
  {
    value: "ceilings",
    label: "Натяжные потолки",
    defaultColor: "#0f766e",
    defaultPrompt:
      "Ты — ведущий эксперт-консультант компании по натяжным потолкам. Отвечай кратко (2-4 предложения), дружелюбно и по делу. Не называй жесткую фиксированную цену без замера — давай вилку цен и мягко приглашай на бесплатный выезд замерщика с каталогами полотен и световых профилей.",
  },
  {
    value: "kitchens",
    label: "Кухни и корпусная мебель",
    defaultColor: "#c2410c",
    defaultPrompt:
      "Ты — опытный дизайнер-консультант по кухонным гарнитурам и заказной мебели. Консультируй по материалам фасадов (МДФ эмаль, пластик, Fenix), столешницам и фурнитуре Blum. Предлагай бесплатный выезд дизайнера с образцами и разработку 3D-проекта.",
  },
  {
    value: "windows",
    label: "Окна и балконы",
    defaultColor: "#2563eb",
    defaultPrompt:
      "Ты — инженер-консультант оконной компании. Уточняй серию профиля (Veka/Rehau), толщину стеклопакета с энергосбережением и предлагай бесплатный замер инженера для точного расчета с учетом откосов и подоконников.",
  },
  {
    value: "furniture",
    label: "Мебель на заказ & Шкафы",
    defaultColor: "#7c3aed",
    defaultPrompt:
      "Ты — специалист по заказной мебели и шкафам-купе. Выясняй пожелания по наполнению, фурнитуре и размерам. Предлагай составить расчет и записаться на бесплатный замер с образцами декоров.",
  },
  {
    value: "repair",
    label: "Ремонт и отделка квартир",
    defaultColor: "#059669",
    defaultPrompt:
      "Ты — ведущий прораб-консультант компании по ремонту квартир. Уточняй тип объекта (новостройка / вторичка), площадь и желаемый уровень отделки. Предлагай бесплатный выезд технолога для составления подробной сметы.",
  },
  {
    value: "general",
    label: "Универсальная сфера услуг",
    defaultColor: "#4f46e5",
    defaultPrompt:
      "Ты — клиентоориентированный AI-консультант компании. Отвечай вежливо, лаконично и экспертно, веди клиента к согласованию заявки или консультации со специалистом.",
  },
];

const COLOR_PRESETS = [
  "#0f766e", // teal
  "#c2410c", // orange
  "#2563eb", // blue
  "#7c3aed", // violet
  "#059669", // emerald
  "#4f46e5", // indigo
  "#be123c", // rose
  "#b45309", // amber
];

export const ProjectsSettings: React.FC<ProjectsSettingsProps> = ({
  activeProject,
  onSelectProject,
}) => {
  const [projectsList, setProjectsList] = useState<Project[]>(() => getStoredProjects());
  const [activeProjId, setActiveProjId] = useState<string>(activeProject.id);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formNicheType, setFormNicheType] = useState<string>("kitchens");
  const [formCustomNiche, setFormCustomNiche] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSystemPrompt, setFormSystemPrompt] = useState("");
  const [formColor, setFormColor] = useState("#0f766e");
  const [formChannels, setFormChannels] = useState<ChannelType[]>(["telegram", "vk"]);
  const [formStarterDocs, setFormStarterDocs] = useState<string[]>([
    "pricing",
    "calculator",
    "company",
    "faq",
  ]);
  const [formSetAsActive, setFormSetAsActive] = useState(true);

  // Synchronize with external changes
  useEffect(() => {
    setProjectsList(getStoredProjects());
    setActiveProjId(activeProject.id);

    const unsubscribe = subscribeProjects((projects, currentActive) => {
      setProjectsList(projects);
      setActiveProjId(currentActive.id);
    });

    return unsubscribe;
  }, [activeProject.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch Active Project in 1 Click
  const handleActivateProject = (project: Project) => {
    const updatedActive = setServiceActiveProject(project.id);
    setActiveProjId(updatedActive.id);
    if (onSelectProject) {
      onSelectProject(updatedActive);
    }
    showToast(`Проект «${project.name}» теперь активен во всей системе!`);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingProjectId(null);
    setFormName("");
    setFormSlug("");
    setFormNicheType("kitchens");
    setFormCustomNiche("");
    setFormDescription("");
    const preset = NICHE_PRESETS.find((p) => p.value === "kitchens");
    setFormSystemPrompt(preset?.defaultPrompt || "");
    setFormColor(preset?.defaultColor || "#c2410c");
    setFormChannels(["telegram", "vk", "site"]);
    setFormStarterDocs(["pricing", "calculator", "company", "faq"]);
    setFormSetAsActive(true);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (proj: Project) => {
    setEditingProjectId(proj.id);
    setFormName(proj.name);
    setFormSlug(proj.slug);
    const isKnownNiche = NICHE_PRESETS.some((p) => p.value === proj.niche_type);
    if (isKnownNiche) {
      setFormNicheType(proj.niche_type);
      setFormCustomNiche("");
    } else {
      setFormNicheType("custom");
      setFormCustomNiche(proj.niche_type);
    }
    setFormDescription(proj.description || "");
    setFormSystemPrompt(proj.system_prompt || "");
    setFormColor(proj.color || "#0f766e");
    setFormChannels(proj.channels || ["telegram", "vk"]);
    setFormStarterDocs(["pricing", "calculator", "company", "faq"]);
    setFormSetAsActive(proj.id === activeProjId);
    setIsModalOpen(true);
  };

  // Slug auto-transliteration when typing name in Create mode
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingProjectId) {
      const translit = val
        .toLowerCase()
        .replace(/[а-яё]/gi, (c) => {
          const map: Record<string, string> = {
            а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
            з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
            п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
            ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
          };
          return map[c.toLowerCase()] || "";
        })
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/--+/g, "-")
        .replace(/^-|-$/g, "");
      setFormSlug(translit);
    }
  };

  // Handle Niche dropdown change with auto-suggested prompt & color
  const handleNicheChange = (nicheVal: string) => {
    setFormNicheType(nicheVal);
    const preset = NICHE_PRESETS.find((p) => p.value === nicheVal);
    if (preset) {
      if (!editingProjectId || !formSystemPrompt) {
        setFormSystemPrompt(preset.defaultPrompt);
      }
      if (!editingProjectId) {
        setFormColor(preset.defaultColor);
      }
    }
  };

  // Save Modal Form
  const handleSaveProjectForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const resolvedNiche = (
      formNicheType === "custom"
        ? formCustomNiche.trim() || "general"
        : formNicheType
    ) as NicheType;

    if (editingProjectId) {
      // Edit existing
      const updatedList = projectsList.map((p) => {
        if (p.id === editingProjectId) {
          return {
            ...p,
            name: formName.trim(),
            slug: formSlug.trim() || p.slug,
            niche_type: resolvedNiche,
            description: formDescription.trim(),
            system_prompt: formSystemPrompt.trim(),
            color: formColor,
            channels: formChannels,
          };
        }
        return p;
      });

      saveProjects(updatedList);
      setProjectsList(updatedList);

      if (formSetAsActive) {
        const active = setServiceActiveProject(editingProjectId);
        setActiveProjId(active.id);
        if (onSelectProject) onSelectProject(active);
      }

      showToast(`Проект «${formName.trim()}» успешно обновлен!`);
    } else {
      // Create new
      const created = createProject({
        name: formName.trim(),
        slug: formSlug.trim(),
        niche_type: resolvedNiche,
        description: formDescription.trim(),
        system_prompt: formSystemPrompt.trim(),
        color: formColor,
        channels: formChannels,
        starterDocs: formStarterDocs,
        setAsActive: formSetAsActive,
      });

      const freshList = getStoredProjects();
      setProjectsList(freshList);

      if (formSetAsActive) {
        setActiveProjId(created.id);
        if (onSelectProject) onSelectProject(created);
        showToast(`Создан и активирован новый проект «${created.name}»!`);
      } else {
        showToast(`Проект «${created.name}» создан с базой знаний.`);
      }
    }

    setIsModalOpen(false);
  };

  // Delete project
  const handleDeleteProject = (proj: Project) => {
    if (projectsList.length <= 1) {
      alert("Нельзя удалить единственный оставшийся проект в системе.");
      return;
    }

    const confirmed = window.confirm(
      `Вы действительно хотите удалить проект «${proj.name}»? База знаний проекта останется в архиве.`,
    );
    if (!confirmed) return;

    try {
      const { remaining, active } = deleteProject(proj.id);
      setProjectsList(remaining);
      setActiveProjId(active.id);
      if (onSelectProject) onSelectProject(active);
      showToast(`Проект «${proj.name}» удален.`);
    } catch (err: any) {
      alert(err.message || "Ошибка удаления проекта");
    }
  };

  // Reset to factory defaults
  const handleResetDefaults = () => {
    const confirmed = window.confirm(
      "Сбросить список проектов к эталонным 3 проектам (Потолки, Кухни, Окна)? Пользовательские проекты будут удалены.",
    );
    if (!confirmed) return;

    const { projects, active } = resetProjectsToDefaults();
    setProjectsList(projects);
    setActiveProjId(active.id);
    if (onSelectProject) onSelectProject(active);
    showToast("Проекты успешно сброшены к начальным эталонам!");
  };

  const getNicheBadgeLabel = (niche: string) => {
    const match = NICHE_PRESETS.find((p) => p.value === niche);
    return match ? match.label : niche;
  };

  const getChannelBadge = (ch: ChannelType) => {
    switch (ch) {
      case "telegram":
        return { name: "Telegram", bg: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800" };
      case "vk":
        return { name: "ВКонтакте", bg: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" };
      case "max":
        return { name: "MAX", bg: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" };
      case "avito":
        return { name: "Авито", bg: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" };
      case "site":
        return { name: "Сайт", bg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700" };
      default:
        return { name: ch, bg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700" };
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-900 text-teal-100 px-4 py-2.5 rounded-xl shadow-xl border border-teal-700 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={16} className="text-teal-300 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Верхний баннер и кнопки действий */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-400">
                <Building size={17} />
              </div>
              <div>
                <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>Проекты и ниши бизнеса</span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                    {projectsList.length} напр.
                  </span>
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs">
                  Изолированные рабочие пространства: каждый бизнес имеет свою базу знаний (RAG), системный промпт ИИ и каналы связи.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetDefaults}
              title="Сбросить к эталонным 3 проектам"
              className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Сброс</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Создать новый проект</span>
            </button>
          </div>
        </div>

        {/* Быстрая плашка текущего активного проекта */}
        <div className="mt-3 p-3 bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs"
              style={{ backgroundColor: activeProject.color || "#0f766e" }}
            >
              {activeProject.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {activeProject.name}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Активен во всем приложении
                </span>
              </div>
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                Ниша: <strong>{getNicheBadgeLabel(activeProject.niche_type)}</strong> • Документов в RAG:{" "}
                <strong>{getKnowledgeDocsCount(activeProject.niche_type)}</strong> • Slug:{" "}
                <code>/{activeProject.slug}</code>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0 hidden md:block">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              AI Copilot и RAG настроены под этот бизнес
            </span>
          </div>
        </div>
      </div>

      {/* Список карточек проектов */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {projectsList.map((proj) => {
          const isActive = proj.id === activeProjId;
          const docsCount = getKnowledgeDocsCount(proj.niche_type);
          const channels = proj.channels || ["telegram", "vk"];

          return (
            <div
              key={proj.id}
              className={`rounded-xl border p-4 bg-white dark:bg-zinc-900 shadow-2xs flex flex-col justify-between transition-all relative group ${
                isActive
                  ? "border-teal-500/80 dark:border-teal-500 ring-2 ring-teal-500/15"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div>
                {/* Шапка карточки */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-2xs shrink-0"
                      style={{ backgroundColor: proj.color || "#0f766e" }}
                    >
                      {proj.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate leading-snug">
                        {proj.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                          {getNicheBadgeLabel(proj.niche_type)}
                        </span>
                        <span>•</span>
                        <code className="text-[10px] text-zinc-400">/{proj.slug}</code>
                      </div>
                    </div>
                  </div>

                  {isActive && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 shrink-0">
                      <Check size={11} />
                      <span>Активен</span>
                    </span>
                  )}
                </div>

                {/* Описание проекта */}
                <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 min-h-[32px] mb-3">
                  {proj.description || "Описание направления и компании не заполнено."}
                </p>

                {/* Системный промпт ИИ превью */}
                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/70 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 mb-3">
                  <div className="flex items-center gap-1 font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                    <Sparkles size={12} className="text-teal-600 dark:text-teal-400" />
                    <span>Системный промпт ИИ:</span>
                  </div>
                  <div className="line-clamp-2 italic">
                    «{proj.system_prompt || "Стандартный системный промпт консультанта"}»
                  </div>
                </div>

                {/* Статистика: База знаний и Каналы */}
                <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-2.5 mb-3 text-xs">
                  <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <FileText size={13} className="text-teal-600" />
                      <span>База знаний (RAG):</span>
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-[11px]">
                      {docsCount} {docsCount === 1 ? "документ" : docsCount < 5 ? "документа" : "документов"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <Share2 size={13} className="text-teal-600" />
                      <span>Каналы:</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-1 justify-end">
                      {channels.map((ch, idx) => {
                        const badge = getChannelBadge(ch);
                        return (
                          <span
                            key={idx}
                            className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${badge.bg}`}
                          >
                            {badge.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {isActive ? (
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-1.5 px-3 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-semibold text-xs border border-teal-200 dark:border-teal-800 flex items-center justify-center gap-1.5 cursor-default"
                  >
                    <CheckCircle2 size={14} className="text-teal-600" />
                    <span>Текущий проект</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleActivateProject(proj)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Radio size={13} />
                    <span>Сделать активным</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenEditModal(proj)}
                  title="Настроить нишу и системный промпт"
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <Edit2 size={14} />
                </button>

                {projectsList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteProject(proj)}
                    title="Удалить проект"
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/50 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Модальное окно: Создание / Редактирование проекта */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Заголовок модалки */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-400">
                  {editingProjectId ? <Edit2 size={16} /> : <FolderPlus size={16} />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {editingProjectId ? "Настройка проекта и ниши" : "Создать новый проект (Нишу)"}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {editingProjectId
                      ? "Изменение параметров бренда, системного промпта и каналов"
                      : "Масштабирование Phoenix AI Hub на новый бизнес или сферу услуг"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProjectForm} className="space-y-3.5 text-xs">
              {/* Название бренда и Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Название бренда / компании <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: ФЕНИКС Мебель на заказ"
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Slug (латиница) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="mebel-custom"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Ниша бизнеса и кастомное поле */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Тип ниши бизнеса
                  </label>
                  <select
                    value={formNicheType}
                    onChange={(e) => handleNicheChange(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  >
                    {NICHE_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                    <option value="custom">Своя ниша (ввести вручную)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Цвет акцента проекта
                  </label>
                  <div className="flex items-center gap-1.5 py-1">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormColor(color)}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                          formColor === color ? "scale-120 ring-2 ring-offset-2 ring-teal-600" : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {formNicheType === "custom" && (
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Укажите вашу нишу
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Автоподбор, Кондиционеры, Двери"
                    value={formCustomNiche}
                    onChange={(e) => setFormCustomNiche(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              )}

              {/* Описание компании */}
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Описание компании и ключевые УТП
                </label>
                <textarea
                  rows={2}
                  placeholder="Опыт, регион работы, главные преимущества для подстановки в диалоги..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none"
                />
              </div>

              {/* Системный промпт для ИИ */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300">
                    Индивидуальный системный промпт для ИИ (AI Copilot)
                  </label>
                  <span className="text-[10px] text-zinc-400">
                    Инструкция нейросети, как общаться в этой нише
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Ты — эксперт-консультант компании..."
                  value={formSystemPrompt}
                  onChange={(e) => setFormSystemPrompt(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />

                {/* Быстрые пресеты стиля общения */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Пресеты стиля:</span>
                  {[
                    {
                      title: "Продающий (Активный)",
                      text:
                        "Ты — активный менеджер по продажам. Отвечай кратко, энергично и уверенно. В каждом ответе аргументируй выгоду и закрывай клиента на выезд мастера или расчет точной сметы.",
                    },
                    {
                      title: "Инженерный (Экспертный)",
                      text:
                        "Ты — ведущий инженер-технолог. Отвечай строго профессионально, разъясняй технические нюансы монтажа и материалов, акцентируй надежность и долговечность по ГОСТ.",
                    },
                    {
                      title: "Сервисный (Заботливый)",
                      text:
                        "Ты — заботливый персональный консультант. Проявляй максимальное внимание к деталям, отвечай тепло, подробно и мягко предлагай удобный формат консультации.",
                    },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormSystemPrompt(preset.text)}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Привязанные каналы связи */}
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Привязанные каналы коммуникации
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "telegram", label: "Telegram Bot" },
                    { id: "vk", label: "ВКонтакте" },
                    { id: "max", label: "MAX Мессенджер" },
                    { id: "avito", label: "Авито Сообщения" },
                    { id: "site", label: "Чат на сайте" },
                  ].map((ch) => {
                    const isChecked = formChannels.includes(ch.id as ChannelType);
                    return (
                      <label
                        key={ch.id}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-teal-50 dark:bg-teal-950/60 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200 font-medium"
                            : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormChannels([...formChannels, ch.id as ChannelType]);
                            } else {
                              setFormChannels(formChannels.filter((c) => c !== ch.id));
                            }
                          }}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>{ch.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Стартовые документы базы знаний (только при создании нового проекта) */}
              {!editingProjectId && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                      <FileText size={13} className="text-teal-600" />
                      <span>Стартовые документы базы знаний (RAG)</span>
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Будут созданы и подключены к ИИ
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {[
                      { id: "pricing", name: "pricing.md", desc: "Прайс-лист и тарифная сетка" },
                      { id: "calculator", name: "calculator.md", desc: "Сметные формулы и расчет" },
                      { id: "company", name: "company.md", desc: "Регламент, договор и гарантии" },
                      { id: "faq", name: "faq.md", desc: "Частые вопросы и возражения" },
                    ].map((doc) => {
                      const isChecked = formStarterDocs.includes(doc.id);
                      return (
                        <label
                          key={doc.id}
                          className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormStarterDocs([...formStarterDocs, doc.id]);
                              } else {
                                setFormStarterDocs(formStarterDocs.filter((d) => d !== doc.id));
                              }
                            }}
                            className="mt-0.5 rounded text-teal-600"
                          />
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {doc.name}
                            </div>
                            <div className="text-[10px] text-zinc-500">{doc.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Чекбокс: сделать активным */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formSetAsActive}
                  onChange={(e) => setFormSetAsActive(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Сделать активным проектом во всей системе сразу после сохранения
                </span>
              </label>

              {/* Нижние кнопки */}
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{editingProjectId ? "Сохранить изменения" : "Создать проект"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
