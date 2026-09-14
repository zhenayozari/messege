import { TeamMember, UserRole, TeamMemberStatus } from "../types";

export const TEAM_STORAGE_KEY = "phoenix_team_members";

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "tm-1",
    name: "Александр (Мастер / Владелец)",
    email: "alexander@fenix-potolki.ru",
    phone: "+7 (914) 809-23-45",
    role: "owner",
    status: "active",
    assigned_project_ids: ["all"],
    avatar_color: "#0d9488", // Teal
    notes: "Основатель и главный мастер компании. Полный доступ ко всем проектам, настройкам и сметам.",
    created_at: "12.01.2024",
    last_active_at: "В сети",
  },
];

export interface RoleDefinition {
  role: UserRole;
  title: string;
  shortTitle: string;
  badge: string;
  icon: string;
  description: string;
  permissionsSummary: string;
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  owner: {
    role: "owner",
    title: "Владелец (Owner)",
    shortTitle: "Владелец",
    badge: "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700",
    icon: "👑",
    description: "Полный доступ ко всей системе: аналитика, бэкенд, интеграции каналов, прайс-листы и база знаний.",
    permissionsSummary: "Полный доступ (Full Access)",
  },
  manager: {
    role: "manager",
    title: "Старший менеджер (Senior Manager)",
    shortTitle: "Старший менеджер",
    badge: "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700",
    icon: "💼",
    description: "Диалоги, контент-план, календарь выездов, медиатека и аналитика продаж (без системных настроек).",
    permissionsSummary: "Диалоги, Контент, Календарь, Медиа, Аналитика",
  },
  operator: {
    role: "operator",
    title: "Менеджер чата (Operator)",
    shortTitle: "Оператор чата",
    badge: "bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700",
    icon: "💬",
    description: "Работа только в диалогах: общение с клиентами, AI-подсказки и оперативный сметный калькулятор.",
    permissionsSummary: "Только Диалоги и Сметный калькулятор",
  },
  measurer: {
    role: "measurer",
    title: "Замерщик / Монтажник (Field Tech)",
    shortTitle: "Замерщик",
    badge: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
    icon: "📐",
    description: "Просмотр назначенных замеров, контактов клиентов, адресов объектов и технических комментариев.",
    permissionsSummary: "Календарь выездов, карточки объектов и контакты",
  },
};

export interface RbacFeatureRow {
  category: string;
  feature: string;
  owner: boolean | string;
  manager: boolean | string;
  operator: boolean | string;
  measurer: boolean | string;
}

export const RBAC_MATRIX: RbacFeatureRow[] = [
  {
    category: "Коммуникации и продажи",
    feature: "Единое окно чатов (VK, Telegram, MAX, Авито)",
    owner: true,
    manager: true,
    operator: true,
    measurer: "Только назначенные",
  },
  {
    category: "Коммуникации и продажи",
    feature: "AI Copilot подсказки и черновики (RAG-база)",
    owner: true,
    manager: true,
    operator: true,
    measurer: false,
  },
  {
    category: "Коммуникации и продажи",
    feature: "Сметный калькулятор и генерация DOCX смет",
    owner: true,
    manager: true,
    operator: true,
    measurer: "Просмотр сметы",
  },
  {
    category: "Коммуникации и продажи",
    feature: "Контакты клиента, адрес объекта и статус сделки",
    owner: true,
    manager: true,
    operator: true,
    measurer: true,
  },
  {
    category: "Контент и Маркетинг",
    feature: "SMM Контент-план и мульти-постинг",
    owner: true,
    manager: true,
    operator: false,
    measurer: false,
  },
  {
    category: "Контент и Маркетинг",
    feature: "Календарь замеров и план публикаций",
    owner: true,
    manager: true,
    operator: false,
    measurer: "Только выезды",
  },
  {
    category: "Контент и Маркетинг",
    feature: "Медиатека фото и видео выполненных работ",
    owner: true,
    manager: true,
    operator: false,
    measurer: "Загрузка фото с замера",
  },
  {
    category: "Аналитика и Управление",
    feature: "Сквозная аналитика конверсий и ROMI",
    owner: true,
    manager: true,
    operator: false,
    measurer: false,
  },
  {
    category: "Аналитика и Управление",
    feature: "Редактирование прайс-листов и формул наценок",
    owner: true,
    manager: "Только просмотр",
    operator: "Только просмотр",
    measurer: false,
  },
  {
    category: "Аналитика и Управление",
    feature: "Подключение каналов связи (Telegram, VK, MAX)",
    owner: true,
    manager: false,
    operator: false,
    measurer: false,
  },
  {
    category: "Аналитика и Управление",
    feature: "Управление командой, ролями и доступами (RBAC)",
    owner: true,
    manager: false,
    operator: false,
    measurer: false,
  },
];

/**
 * Получить список всех сотрудников из localStorage
 */
export function getStoredTeamMembers(): TeamMember[] {
  if (typeof window === "undefined") {
    return DEFAULT_TEAM_MEMBERS;
  }
  try {
    const raw = localStorage.getItem(TEAM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Очищаем от старых вымышленных сотрудников (Екатерина, Анна, Дмитрий, tm-2, tm-3, tm-4)
        const cleaned = parsed.filter((m: TeamMember) => {
          if (!m || !m.name) return false;
          if (["tm-2", "tm-3", "tm-4"].includes(m.id)) return false;
          const lower = m.name.toLowerCase();
          if (lower.includes("екатерина") || lower.includes("смирнова") || lower.includes("ковалев") || lower.includes("власова")) {
            return false;
          }
          return true;
        });

        // Если в списке остался старый Александр Морозов, обновляем его данные
        const updated = cleaned.map((m: TeamMember) => {
          if (m.id === "tm-1" || m.name.includes("Александр")) {
            return {
              ...m,
              name: "Александр (Мастер / Владелец)",
              phone: "+7 (914) 809-23-45",
              role: "owner" as UserRole,
              status: "active" as TeamMemberStatus,
              assigned_project_ids: ["all"],
              notes: "Основатель и главный мастер компании. Полный доступ ко всем проектам, настройкам и сметам.",
            };
          }
          return m;
        });

        if (updated.length === 0) {
          localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(DEFAULT_TEAM_MEMBERS));
          return DEFAULT_TEAM_MEMBERS;
        }

        // Если состав изменился, синхронизируем localStorage
        if (updated.length !== parsed.length || updated[0].phone !== parsed[0].phone) {
          localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(updated));
        }
        return updated;
      }
    }
  } catch (e) {
    console.error("Failed to parse phoenix_team_members from localStorage:", e);
  }
  // Инициализируем дефолтный список
  try {
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(DEFAULT_TEAM_MEMBERS));
  } catch {
    // ignore
  }
  return DEFAULT_TEAM_MEMBERS;
}

/**
 * Сохранить список сотрудников в localStorage и отправить событие
 */
export function saveTeamMembers(members: TeamMember[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(members));
    window.dispatchEvent(
      new CustomEvent("phoenix_team_updated", { detail: members })
    );
  } catch (e) {
    console.error("Failed to save phoenix_team_members to localStorage:", e);
  }
}

/**
 * Подписаться на обновление списка сотрудников
 */
export function subscribeTeam(callback: (members: TeamMember[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleUpdate = (e: Event) => {
    const customEvent = e as CustomEvent<TeamMember[]>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    } else {
      callback(getStoredTeamMembers());
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === TEAM_STORAGE_KEY) {
      callback(getStoredTeamMembers());
    }
  };

  window.addEventListener("phoenix_team_updated", handleUpdate);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("phoenix_team_updated", handleUpdate);
    window.removeEventListener("storage", handleStorage);
  };
}

/**
 * Добавить сотрудника
 */
export function createTeamMember(memberData: Omit<TeamMember, "id" | "created_at">): TeamMember {
  const current = getStoredTeamMembers();
  const id = `tm-${Date.now()}`;
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;

  const newMember: TeamMember = {
    ...memberData,
    id,
    created_at: dateStr,
    last_active_at: "Только что добавлен",
  };

  const updated = [newMember, ...current];
  saveTeamMembers(updated);
  return newMember;
}

/**
 * Обновить сотрудника
 */
export function updateTeamMember(id: string, patch: Partial<TeamMember>): TeamMember[] {
  const current = getStoredTeamMembers();
  const updated = current.map((m) => (m.id === id ? { ...m, ...patch } : m));
  saveTeamMembers(updated);
  return updated;
}

/**
 * Удалить сотрудника
 */
export function deleteTeamMember(id: string): TeamMember[] {
  const current = getStoredTeamMembers();
  const updated = current.filter((m) => m.id !== id);
  saveTeamMembers(updated);
  return updated;
}

/**
 * Сбросить команду к заводским эталонам
 */
export function resetTeamMembersToDefaults(): TeamMember[] {
  saveTeamMembers(DEFAULT_TEAM_MEMBERS);
  return DEFAULT_TEAM_MEMBERS;
}
