import React, { useState } from "react";
import { ChevronDown, FolderPlus, Layers, Plus } from "lucide-react";
import { Project } from "../types";

interface ProjectSwitcherProps {
  projects: Project[];
  activeProject: Project;
  onSelectProject: (project: Project) => void;
  onCreateProject: (name: string, nicheType: Project["niche_type"], desc: string) => void;
}

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjNiche, setNewProjNiche] = useState<Project["niche_type"]>("general");
  const [newProjDesc, setNewProjDesc] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    onCreateProject(newProjName.trim(), newProjNiche, newProjDesc.trim());
    setNewProjName("");
    setNewProjDesc("");
    setShowModal(false);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        id="project-switcher-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-100 transition-colors text-left border border-zinc-200/80 bg-white shadow-2xs group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-2xs"
            style={{ backgroundColor: activeProject.color }}
          >
            {activeProject.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-zinc-900 truncate leading-tight flex items-center gap-1.5">
              <span>{activeProject.name}</span>
            </div>
            <div className="text-[11px] text-zinc-600 truncate mt-0.5">
              Ниша: {activeProject.niche_type === "ceilings" ? "Потолки" : activeProject.niche_type === "kitchens" ? "Кухни" : activeProject.niche_type === "windows" ? "Окна" : "Общая"}
            </div>
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`text-zinc-600 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
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
            className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 text-sm animate-in fade-in-50 zoom-in-95 duration-100"
          >
            <div className="px-2.5 py-1 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">
              Проекты (Ниши)
            </div>
            {projects.map((proj) => (
              <button
                key={proj.id}
                type="button"
                onClick={() => {
                  onSelectProject(proj);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 text-left hover:bg-zinc-50 transition-colors ${
                  proj.id === activeProject.id ? "bg-zinc-100/70 font-medium" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-4 h-4 rounded text-[10px] text-white flex items-center justify-center shrink-0"
                    style={{ backgroundColor: proj.color }}
                  >
                    {proj.name.charAt(0)}
                  </div>
                  <span className="truncate text-xs text-zinc-800">{proj.name}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 shrink-0 font-normal">
                  {proj.niche_type}
                </span>
              </button>
            ))}

            <div className="border-t border-zinc-100 my-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-teal-700 hover:bg-teal-50 font-medium transition-colors"
              >
                <Plus size={14} />
                <span>Создать проект (Нишу)</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal for creating a new niche/project */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-zinc-200 p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-zinc-900 font-semibold mb-1">
              <FolderPlus size={18} className="text-teal-600" />
              <h3>Новый проект (Ниша)</h3>
            </div>
            <p className="text-xs text-zinc-600 mb-4">
              Создайте изолированное рабочее пространство с собственной базой знаний, калькулятором и AI-промптом.
            </p>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Название проекта</label>
                <input
                  type="text"
                  required
                  placeholder="Например: ФЕНИКС Окна или Мебель на заказ"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Тип ниши</label>
                <select
                  value={newProjNiche}
                  onChange={(e) => setNewProjNiche(e.target.value as Project["niche_type"])}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 bg-white"
                >
                  <option value="ceilings">Натяжные потолки</option>
                  <option value="kitchens">Кухни и корпусная мебель</option>
                  <option value="windows">Окна и остекление балконов</option>
                  <option value="general">Универсальная ниша / Услуги</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Описание и специфика</label>
                <textarea
                  rows={2}
                  placeholder="Краткое описание для AI-контекста..."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium shadow-xs transition-colors"
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
