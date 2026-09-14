import React, { useState } from "react";
import { ChevronDown, FolderPlus, Layers, Plus } from "lucide-react";
import { Project } from "../types";

export const NICHE_LABELS: Record<string, string> = {
  ceilings: "Потолки",
  kitchens: "Кухни",
  windows: "Окна",
  furniture: "Мебель",
  repair: "Ремонт",
  general: "Общая",
};

interface ProjectSwitcherProps {
  projects: Project[];
  activeProject: Project;
  onSelectProject: (project: Project) => void;
  onCreateProject: (name: string, nicheType: Project["niche_type"], desc: string) => void;
  onOpenProjectsSettings?: () => void;
}

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onOpenProjectsSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjNiche, setNewProjNiche] = useState<string>("furniture");
  const [newProjDesc, setNewProjDesc] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    onCreateProject(newProjName.trim(), newProjNiche as Project["niche_type"], newProjDesc.trim());
    setNewProjName("");
    setNewProjDesc("");
    setShowModal(false);
    setIsOpen(false);
  };

  const getNicheLabel = (niche: string) => NICHE_LABELS[niche] || niche;

  return (
    <div className="relative">
      <button
        id="project-switcher-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs group cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-2xs"
            style={{ backgroundColor: activeProject.color || "#0f766e" }}
          >
            {activeProject.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate leading-tight flex items-center gap-1.5">
              <span>{activeProject.name}</span>
            </div>
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
              Ниша: {getNicheLabel(activeProject.niche_type)}
            </div>
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`text-zinc-500 dark:text-zinc-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div
            id="project-switcher-dropdown"
            className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-sm animate-in fade-in-50 zoom-in-95 duration-100"
          >
            <div className="px-2.5 py-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Проекты (Ниши)</span>
              <span className="text-[10px] text-teal-600 font-semibold">{projects.length}</span>
            </div>
            {projects.map((proj) => (
              <button
                key={proj.id}
                type="button"
                onClick={() => {
                  onSelectProject(proj);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                  proj.id === activeProject.id ? "bg-teal-50/70 dark:bg-teal-950/40 font-medium" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-4 h-4 rounded text-[10px] text-white flex items-center justify-center shrink-0"
                    style={{ backgroundColor: proj.color || "#0f766e" }}
                  >
                    {proj.name.charAt(0)}
                  </div>
                  <span className="truncate text-xs text-zinc-800 dark:text-zinc-200">{proj.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {proj.id === activeProject.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal">
                    {getNicheLabel(proj.niche_type)}
                  </span>
                </div>
              </button>
            ))}

            <div className="border-t border-zinc-100 dark:border-zinc-800 my-1 pt-1 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setShowModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 font-medium transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Создать проект (Нишу)</span>
              </button>
              {onOpenProjectsSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenProjectsSettings();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Layers size={13} />
                  <span>Управление проектами в Настройках</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal for creating a new niche/project */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold mb-1">
              <FolderPlus size={18} className="text-teal-600 dark:text-teal-400" />
              <h3>Новый проект (Ниша бизнеса)</h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
              Создайте изолированное рабочее пространство с собственной базой знаний, калькулятором и AI-промптом.
            </p>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Название бренда / проекта</label>
                <input
                  type="text"
                  required
                  placeholder="Например: ФЕНИКС Мебель на заказ или Студия ремонта"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Тип ниши</label>
                <select
                  value={newProjNiche}
                  onChange={(e) => setNewProjNiche(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="ceilings">Натяжные потолки</option>
                  <option value="kitchens">Кухни и корпусная мебель</option>
                  <option value="windows">Окна и остекление балконов</option>
                  <option value="furniture">Мебель на заказ / Шкафы-купе</option>
                  <option value="repair">Ремонт и отделка квартир</option>
                  <option value="general">Универсальная ниша / Услуги</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Описание и специфика</label>
                <textarea
                  rows={2}
                  placeholder="Краткое описание для AI-контекста..."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium shadow-xs transition-colors cursor-pointer"
                >
                  Создать проект
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
