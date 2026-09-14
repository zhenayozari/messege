/**
 * Phoenix AI Hub — Projects & Niches Service
 * Управление проектами (нишами бизнеса), активным проектом и персистентностью в localStorage
 */

import { ChannelType, NicheType, Project } from "../types";
import { createStarterDocsForProject } from "./knowledgeBase";

export const PROJECTS_LIST_STORAGE_KEY = "phoenix_projects_list";
export const ACTIVE_PROJECT_ID_STORAGE_KEY = "phoenix_active_project_id";

/**
 * Эталонный список проектов по умолчанию
 */
export const DEFAULT_PROJECTS: Project[] = [
  {
    id: "proj-ceilings",
    name: "ФЕНИКС PRO Потолки",
    slug: "ceilings",
    niche_type: "ceilings",
    description:
      "Натяжные потолки в Улан-Удэ и районах Бурятии. Теневые зазоры EuroKRAAB, парящие линии, трековые системы, скрытые ниши под шторы.",
    knowledge_dir: "/app/knowledge/ceilings",
    system_prompt:
      "Ты — старший эксперт-консультант компании ФЕНИКС PRO по натяжным потолкам. Отвечай вежливо, лаконично (2-4 предложения). Не называй одну жесткую цену без замера, всегда давай вилку цен и мягко приглашай на бесплатный замер с каталогами полотен и профилей.",
    is_active: true,
    color: "#0f766e", // teal-700
    created_at: "2026-08-01T10:00:00Z",
    channels: ["vk", "telegram", "max", "avito"],
  },
  {
    id: "proj-kitchens",
    name: "ФЕНИКС Кухни & Корпус",
    slug: "kitchens",
    niche_type: "kitchens",
    description:
      "Кухонные гарнитуры и корпусная мебель на заказ под ключ с бесплатным выездом дизайнера и 3D-проектом.",
    knowledge_dir: "/app/knowledge/kitchens",
    system_prompt:
      "Ты — ведущий дизайнер-консультант компании ФЕНИКС Кухни. Консультируй по материалам фасадов (МДФ в эмали, пластик HPL, Fenix), столешницам и австрийской фурнитуре Blum. Предлагай бесплатный выезд дизайнера с образцами материалов и составление 3D-проекта.",
    is_active: false,
    color: "#c2410c", // orange-700
    created_at: "2026-08-15T12:00:00Z",
    channels: ["vk", "telegram", "site"],
  },
  {
    id: "proj-windows",
    name: "ФЕНИКС Окна & Балконы",
    slug: "windows",
    niche_type: "windows",
    description:
      "Пластиковые окна Veka/Rehau, теплое остекление, утепление и внутренняя отделка лоджий.",
    knowledge_dir: "/app/knowledge/windows",
    system_prompt:
      "Ты — инженер-консультант компании ФЕНИКС Окна. Уточняй серию профиля (Veka Euroline 58мм или Softline 70мм для сибирских морозов), тип стеклопакета (с серебряным напылением Solar) и предлагай бесплатный замер технолога для точного расчета с учетом откосов и подоконников.",
    is_active: false,
    color: "#2563eb", // blue-600
    created_at: "2026-08-20T09:00:00Z",
    channels: ["telegram", "avito", "site"],
  },
];

/**
 * Получить список всех проектов из localStorage
 */
export function getStoredProjects(): Project[] {
  if (typeof window === "undefined") return DEFAULT_PROJECTS;

  try {
    const raw = localStorage.getItem(PROJECTS_LIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read projects from localStorage:", e);
  }

  // Если в хранилище пусто — инициализируем эталоном
  try {
    localStorage.setItem(PROJECTS_LIST_STORAGE_KEY, JSON.stringify(DEFAULT_PROJECTS));
  } catch (e) {
    console.error("Failed to seed projects to localStorage:", e);
  }

  return [...DEFAULT_PROJECTS];
}

/**
 * Получить ID активного проекта
 */
export function getActiveProjectId(): string {
  if (typeof window === "undefined") return DEFAULT_PROJECTS[0].id;

  try {
    const activeId = localStorage.getItem(ACTIVE_PROJECT_ID_STORAGE_KEY);
    const projects = getStoredProjects();
    if (activeId && projects.some((p) => p.id === activeId)) {
      return activeId;
    }
    // Если сохраненный id не найден, берем первый проект
    if (projects.length > 0) {
      const defaultId = projects[0].id;
      localStorage.setItem(ACTIVE_PROJECT_ID_STORAGE_KEY, defaultId);
      return defaultId;
    }
  } catch (e) {
    console.error("Failed to get active project ID:", e);
  }

  return DEFAULT_PROJECTS[0].id;
}

/**
 * Получить объект текущего активного проекта
 */
export function getActiveProject(): Project {
  const projects = getStoredProjects();
  const activeId = getActiveProjectId();
  const found = projects.find((p) => p.id === activeId);
  return found || projects[0] || DEFAULT_PROJECTS[0];
}

/**
 * Сохранить обновленный список проектов
 */
export function saveProjects(projects: Project[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(PROJECTS_LIST_STORAGE_KEY, JSON.stringify(projects));
    window.dispatchEvent(
      new CustomEvent("phoenix_projects_updated", {
        detail: { projects, activeProject: getActiveProject() },
      }),
    );
  } catch (e) {
    console.error("Failed to save projects to localStorage:", e);
  }
}

/**
 * Переключить активный проект (в 1 клик)
 */
export function setActiveProject(projectId: string): Project {
  const projects = getStoredProjects();
  const target = projects.find((p) => p.id === projectId);
  if (!target) {
    return getActiveProject();
  }

  // Обновляем флаг is_active в списке проектов
  const updatedProjects = projects.map((p) => ({
    ...p,
    is_active: p.id === projectId,
  }));

  try {
    localStorage.setItem(ACTIVE_PROJECT_ID_STORAGE_KEY, projectId);
    localStorage.setItem(PROJECTS_LIST_STORAGE_KEY, JSON.stringify(updatedProjects));

    const updatedActive = { ...target, is_active: true };

    // Оповещаем все компоненты приложения
    window.dispatchEvent(
      new CustomEvent("phoenix_projects_updated", {
        detail: { projects: updatedProjects, activeProject: updatedActive },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("phoenix_active_project_changed", {
        detail: { activeProject: updatedActive },
      }),
    );

    return updatedActive;
  } catch (e) {
    console.error("Failed to set active project:", e);
    return target;
  }
}

export interface CreateProjectInput {
  name: string;
  slug?: string;
  niche_type: NicheType;
  description: string;
  system_prompt: string;
  color?: string;
  channels?: ChannelType[];
  starterDocs?: string[];
  setAsActive?: boolean;
}

/**
 * Создать новый проект (нишу) с автоматическим формированием стартовых регламентов
 */
export function createProject(input: CreateProjectInput): Project {
  const projects = getStoredProjects();

  const slug =
    input.slug && input.slug.trim()
      ? input.slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "-")
      : input.name
          .toLowerCase()
          .trim()
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
          .replace(/^-|-$/g, "") || `niche-${Date.now()}`;

  const defaultColors: Record<string, string> = {
    ceilings: "#0f766e", // teal
    kitchens: "#c2410c", // orange
    windows: "#2563eb",  // blue
    furniture: "#7c3aed", // violet
    repair: "#059669",   // emerald
    general: "#4f46e5",  // indigo
  };

  const projectColor =
    input.color || defaultColors[input.niche_type] || "#4f46e5";

  const newProject: Project = {
    id: `proj-${slug}-${Date.now().toString().slice(-4)}`,
    name: input.name.trim(),
    slug,
    niche_type: input.niche_type,
    description: input.description.trim(),
    knowledge_dir: `/app/knowledge/${slug}`,
    system_prompt: input.system_prompt.trim(),
    is_active: !!input.setAsActive,
    color: projectColor,
    created_at: new Date().toISOString(),
    channels: input.channels && input.channels.length > 0 ? input.channels : ["telegram", "vk"],
    starter_docs: input.starterDocs || ["pricing", "calculator", "company", "faq"],
  };

  // 1. Создаем стартовые документы RAG базы знаний под эту нишу/slug
  if (input.starterDocs && input.starterDocs.length > 0) {
    createStarterDocsForProject(
      newProject.niche_type,
      newProject.name,
      newProject.description,
      input.starterDocs,
    );
  }

  // 2. Добавляем в общий список
  let updatedList: Project[];
  if (input.setAsActive) {
    updatedList = [
      ...projects.map((p) => ({ ...p, is_active: false })),
      newProject,
    ];
  } else {
    updatedList = [...projects, newProject];
  }

  saveProjects(updatedList);

  if (input.setAsActive) {
    setActiveProject(newProject.id);
  }

  return newProject;
}

/**
 * Редактировать параметры существующего проекта
 */
export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const projects = getStoredProjects();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const current = projects[index];
  const updated: Project = {
    ...current,
    ...updates,
    id: current.id, // ID не меняется
  };

  projects[index] = updated;
  saveProjects(projects);

  const activeId = getActiveProjectId();
  if (activeId === id) {
    window.dispatchEvent(
      new CustomEvent("phoenix_active_project_changed", {
        detail: { activeProject: updated },
      }),
    );
  }

  return updated;
}

/**
 * Удалить проект (нельзя удалить единственный оставшийся проект)
 */
export function deleteProject(id: string): { remaining: Project[]; active: Project } {
  const projects = getStoredProjects();
  if (projects.length <= 1) {
    throw new Error("Нельзя удалить единственный проект в системе!");
  }

  const remaining = projects.filter((p) => p.id !== id);
  const activeId = getActiveProjectId();

  let nextActive: Project;
  if (activeId === id) {
    nextActive = { ...remaining[0], is_active: true };
    localStorage.setItem(ACTIVE_PROJECT_ID_STORAGE_KEY, nextActive.id);
  } else {
    nextActive = getActiveProject();
  }

  saveProjects(remaining);

  if (activeId === id) {
    setActiveProject(nextActive.id);
  }

  return { remaining, active: nextActive };
}

/**
 * Сбросить проекты к заводскому эталону (Потолки, Кухни, Окна)
 */
export function resetProjectsToDefaults(): { projects: Project[]; active: Project } {
  try {
    localStorage.removeItem(PROJECTS_LIST_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_PROJECT_ID_STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear projects from localStorage:", e);
  }

  const projects = [...DEFAULT_PROJECTS];
  const active = projects[0];

  saveProjects(projects);
  setActiveProject(active.id);

  return { projects, active };
}

/**
 * Подписка на обновление проектов и переключение активного
 */
export function subscribeProjects(
  callback: (projects: Project[], activeProject: Project) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleUpdate = () => {
    callback(getStoredProjects(), getActiveProject());
  };

  window.addEventListener("phoenix_projects_updated", handleUpdate);
  window.addEventListener("phoenix_active_project_changed", handleUpdate);
  window.addEventListener("storage", (e) => {
    if (
      e.key === PROJECTS_LIST_STORAGE_KEY ||
      e.key === ACTIVE_PROJECT_ID_STORAGE_KEY
    ) {
      handleUpdate();
    }
  });

  return () => {
    window.removeEventListener("phoenix_projects_updated", handleUpdate);
    window.removeEventListener("phoenix_active_project_changed", handleUpdate);
  };
}
