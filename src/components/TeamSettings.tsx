import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Phone,
  Mail,
  Edit2,
  Trash2,
  CheckCircle2,
  LogIn,
  Layers,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  Building,
  RotateCcw,
  Search,
  Filter,
  X,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Project, TeamMember, TeamMemberStatus, UserRole } from "../types";
import {
  createTeamMember,
  deleteTeamMember,
  getStoredTeamMembers,
  RBAC_MATRIX,
  resetTeamMembersToDefaults,
  ROLE_DEFINITIONS,
  subscribeTeam,
  updateTeamMember,
} from "../services/teamService";

interface TeamSettingsProps {
  activeProject: Project;
  userRole: UserRole;
  onRoleChange?: (role: UserRole) => void;
  projects?: Project[];
}

const AVATAR_COLORS = [
  "#0d9488", // Teal
  "#6366f1", // Indigo
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#10b981", // Emerald
];

export const TeamSettings: React.FC<TeamSettingsProps> = ({
  activeProject,
  userRole,
  onRoleChange,
  projects = [],
}) => {
  const [members, setMembers] = useState<TeamMember[]>(() => getStoredTeamMembers());
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("operator");
  const [formStatus, setFormStatus] = useState<TeamMemberStatus>("active");
  const [formColor, setFormColor] = useState(AVATAR_COLORS[0]);
  const [formNotes, setFormNotes] = useState("");
  const [formAllProjects, setFormAllProjects] = useState(true);
  const [formAssignedProjects, setFormAssignedProjects] = useState<string[]>([]);

  // RBAC Matrix toggle
  const [isMatrixOpen, setIsMatrixOpen] = useState(true);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeTeam((updated) => {
      setMembers(updated);
    });
    return unsub;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenCreateModal = () => {
    setEditingMember(null);
    setFormName("");
    setFormPhone("+7 (9");
    setFormEmail("");
    setFormRole("operator");
    setFormStatus("active");
    setFormColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
    setFormNotes("");
    setFormAllProjects(true);
    setFormAssignedProjects([activeProject.id]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (m: TeamMember) => {
    setEditingMember(m);
    setFormName(m.name);
    setFormPhone(m.phone);
    setFormEmail(m.email);
    setFormRole(m.role);
    setFormStatus(m.status);
    setFormColor(m.avatar_color || AVATAR_COLORS[0]);
    setFormNotes(m.notes || "");
    const isAll = m.assigned_project_ids.includes("all");
    setFormAllProjects(isAll);
    setFormAssignedProjects(isAll ? [] : m.assigned_project_ids);
    setIsModalOpen(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const assignedIds = formAllProjects ? ["all"] : formAssignedProjects;

    if (editingMember) {
      updateTeamMember(editingMember.id, {
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        role: formRole,
        status: formStatus,
        avatar_color: formColor,
        notes: formNotes.trim(),
        assigned_project_ids: assignedIds.length > 0 ? assignedIds : ["all"],
      });
      showToast(`Сотрудник ${formName} успешно обновлен`);
    } else {
      createTeamMember({
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        role: formRole,
        status: formStatus,
        avatar_color: formColor,
        notes: formNotes.trim(),
        assigned_project_ids: assignedIds.length > 0 ? assignedIds : ["all"],
      });
      showToast(`Новый сотрудник ${formName} добавлен в систему`);
    }

    setIsModalOpen(false);
  };

  const handleDeleteMember = (id: string, name: string) => {
    if (members.length <= 1) {
      alert("Нельзя удалить последнего сотрудника компании.");
      return;
    }
    if (confirm(`Вы уверены, что хотите удалить сотрудника ${name}?`)) {
      deleteTeamMember(id);
      showToast(`Сотрудник ${name} удален из системы`);
    }
  };

  const handleToggleStatus = (m: TeamMember) => {
    const nextStatus: TeamMemberStatus =
      m.status === "active" ? "vacation" : m.status === "vacation" ? "inactive" : "active";
    updateTeamMember(m.id, { status: nextStatus });
    const statusLabels: Record<TeamMemberStatus, string> = {
      active: "Активен",
      vacation: "В отпуске",
      inactive: "Неактивен",
    };
    showToast(`Статус ${m.name} изменен: ${statusLabels[nextStatus]}`);
  };

  const handleSwitchRoleAs = (m: TeamMember) => {
    if (onRoleChange) {
      onRoleChange(m.role);
      showToast(
        `Вы вошли в систему от имени ${m.name} (роль: ${ROLE_DEFINITIONS[m.role]?.title || m.role})`
      );
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Сбросить команду к заводским эталонам (Александр, Екатерина, Анна, Дмитрий)?")) {
      resetTeamMembersToDefaults();
      showToast("Команда сброшена к заводским эталонам");
    }
  };

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const matchesQuery =
      searchQuery.trim() === "" ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.notes && m.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;

    return matchesQuery && matchesRole && matchesStatus;
  });

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getStatusBadge = (status: TeamMemberStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Активен
          </span>
        );
      case "vacation":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            В отпуске
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            Неактивен
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-medium border border-zinc-700 dark:border-zinc-300 animate-slideUp">
          <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                <Users size={18} />
              </div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Команда и разграничение прав (RBAC)
              </h2>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-2xl">
              Управление учетными записями сотрудников, привязка к направлениям бизнеса и настройка матричной ролевой модели безопасности.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetDefaults}
              title="Сбросить список команды к эталонным настройкам"
              className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Сброс</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer hover:shadow-teal-500/20"
            >
              <UserPlus size={15} />
              <span>+ Добавить сотрудника</span>
            </button>
          </div>
        </div>

        {/* Status badges bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
          <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800">
            <div className="text-zinc-400 text-[10px] font-medium">Всего сотрудников</div>
            <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              {members.length} чел.
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
            <div className="text-emerald-700 dark:text-emerald-400 text-[10px] font-medium">
              Активных на смене
            </div>
            <div className="text-base font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
              {members.filter((m) => m.status === "active").length} чел.
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800">
            <div className="text-zinc-400 text-[10px] font-medium">Ролевая матрица</div>
            <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1">
              4 уровня доступа
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/50 dark:border-teal-800/50">
            <div className="text-teal-700 dark:text-teal-400 text-[10px] font-medium">
              Ваша текущая роль
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-teal-900 dark:text-teal-200 mt-1">
              <span>{ROLE_DEFINITIONS[userRole]?.icon}</span>
              <span>{ROLE_DEFINITIONS[userRole]?.shortTitle || userRole}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Search Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Поиск по имени, телефону, email или примечанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                roleFilter === "all"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              Все роли
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("owner")}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                roleFilter === "owner"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              👑 Владельцы
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("manager")}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                roleFilter === "manager"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              💼 Менеджеры
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("operator")}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                roleFilter === "operator"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              💬 Операторы
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("measurer")}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                roleFilter === "measurer"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              📐 Замерщики
            </button>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]"
          >
            <option value="all">Все статусы</option>
            <option value="active">Только активные</option>
            <option value="vacation">В отпуске</option>
            <option value="inactive">Неактивные</option>
          </select>
        </div>
      </div>

      {/* 3. Team Members Grid */}
      <div className="space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-3">
            <Users size={32} className="mx-auto text-zinc-400" />
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
              Сотрудники не найдены
            </div>
            <p className="text-zinc-500 text-xs">
              Попробуйте изменить параметры поиска или сбросить фильтры.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredMembers.map((member) => {
              const roleDef = ROLE_DEFINITIONS[member.role] || ROLE_DEFINITIONS.operator;
              const isCurrentUser = userRole === member.role;
              const isAllProjects = member.assigned_project_ids.includes("all");

              return (
                <div
                  key={member.id}
                  className={`bg-white dark:bg-zinc-900 rounded-xl border transition-all p-4 shadow-2xs flex flex-col justify-between gap-3 relative ${
                    isCurrentUser
                      ? "border-teal-500/80 dark:border-teal-500/60 ring-1 ring-teal-500/20"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  {/* Top Bar inside card */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div
                          style={{ backgroundColor: member.avatar_color || "#0d9488" }}
                          className="w-10 h-10 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs uppercase tracking-wide"
                        >
                          {getInitials(member.name)}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                              {member.name}
                            </h3>
                            {isCurrentUser && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                Текущий вход
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${roleDef.badge}`}
                            >
                              <span>{roleDef.icon}</span>
                              <span>{roleDef.title}</span>
                            </span>

                            {getStatusBadge(member.status)}
                          </div>
                        </div>
                      </div>

                      {/* Card menu controls */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(member)}
                          title="Редактировать сотрудника"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(member.id, member.name)}
                          title="Удалить сотрудника"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Contacts & Projects Info */}
                    <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                        <span className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                          <Phone size={12} />
                          <span>Телефон:</span>
                        </span>
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <span>{member.phone}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(member.phone, `phone-${member.id}`)}
                            title="Скопировать телефон"
                            className="text-zinc-400 hover:text-teal-600"
                          >
                            {copiedId === `phone-${member.id}` ? (
                              <Check size={11} className="text-emerald-500" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                        <span className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                          <Mail size={12} />
                          <span>Email:</span>
                        </span>
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <span className="truncate max-w-[170px]">{member.email}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(member.email, `email-${member.id}`)}
                            title="Скопировать email"
                            className="text-zinc-400 hover:text-teal-600"
                          >
                            {copiedId === `email-${member.id}` ? (
                              <Check size={11} className="text-emerald-500" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Projects / Niches Access */}
                      <div className="flex items-start justify-between gap-2 pt-1">
                        <span className="flex items-center gap-1.5 text-zinc-400 text-[11px] shrink-0">
                          <Building size={12} />
                          <span>Доступ:</span>
                        </span>
                        <div className="flex flex-wrap justify-end gap-1">
                          {isAllProjects ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                              Все направления
                            </span>
                          ) : (
                            member.assigned_project_ids.map((pid) => {
                              const p = projects.find((proj) => proj.id === pid || proj.slug === pid);
                              return (
                                <span
                                  key={pid}
                                  className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
                                >
                                  {p ? p.name.split("—")[0].trim() : pid}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Notes / Specialization */}
                      {member.notes && (
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 italic pt-1 line-clamp-2">
                          «{member.notes}»
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button: "Войти как [Имя]" */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(member)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      Сменить статус
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwitchRoleAs(member)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCurrentUser
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                          : "bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-600 hover:text-white text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:border-transparent"
                      }`}
                    >
                      <LogIn size={13} />
                      <span>{isCurrentUser ? "Вы вошли как этот пользователь" : `Войти как ${member.name.split(" ")[0]}`}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. RBAC Permissions Matrix Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setIsMatrixOpen(!isMatrixOpen)}
          className="w-full p-4 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-teal-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Матрица прав доступа по ролям (RBAC)
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">
                Сводная таблица возможностей для каждой роли в Phoenix AI Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span>{isMatrixOpen ? "Свернуть" : "Развернуть"}</span>
            {isMatrixOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {isMatrixOpen && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300">
                    <th className="py-2.5 px-3 font-semibold w-1/3">Функциональный модуль</th>
                    <th className="py-2.5 px-3 font-semibold text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-amber-700 dark:text-amber-400">👑 Владелец</span>
                        <span className="text-[10px] text-zinc-400 font-normal">Owner</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-indigo-700 dark:text-indigo-400">💼 Менеджер</span>
                        <span className="text-[10px] text-zinc-400 font-normal">Senior Manager</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-teal-700 dark:text-teal-400">💬 Оператор</span>
                        <span className="text-[10px] text-zinc-400 font-normal">Chat Operator</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">📐 Замерщик</span>
                        <span className="text-[10px] text-zinc-400 font-normal">Field Tech</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {RBAC_MATRIX.map((row, idx) => {
                    const renderCell = (val: boolean | string) => {
                      if (val === true) {
                        return (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                            <CheckCircle2 size={13} />
                            <span>Полный</span>
                          </span>
                        );
                      }
                      if (val === false) {
                        return (
                          <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-600">
                            <X size={13} />
                            <span>Нет</span>
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {val}
                        </span>
                      );
                    };

                    return (
                      <tr
                        key={idx}
                        className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-zinc-800 dark:text-zinc-200 font-medium">
                          <div>{row.feature}</div>
                          <div className="text-[10px] text-zinc-400 font-normal mt-0.5">
                            {row.category}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">{renderCell(row.owner)}</td>
                        <td className="py-2.5 px-3 text-center">{renderCell(row.manager)}</td>
                        <td className="py-2.5 px-3 text-center">{renderCell(row.operator)}</td>
                        <td className="py-2.5 px-3 text-center">{renderCell(row.measurer)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-start gap-2">
              <Info size={14} className="text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>Примечание безопасности:</strong> При переключении роли в приложении интерфейс моментально адаптирует доступные вкладки, кнопки отправки AI-сообщений и сметный калькулятор под регламент сотрудника.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Add / Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4 animate-scaleIn max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                  {editingMember ? <Edit2 size={16} /> : <UserPlus size={16} />}
                </div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {editingMember ? "Редактировать сотрудника" : "Добавить сотрудника"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
              {/* ФИО */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  ФИО сотрудника: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Артем Васильев"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full py-1.5 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Телефон и Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Телефон: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+7 (999) 000-00-00"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full py-1.5 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Email:
                  </label>
                  <input
                    type="email"
                    placeholder="user@fenix-potolki.ru"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full py-1.5 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>

              {/* Роль и Статус */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Роль и доступ:
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full py-1.5 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="owner">👑 Владелец (Owner) — Полный доступ</option>
                    <option value="manager">💼 Старший менеджер — Продажи и SMM</option>
                    <option value="operator">💬 Менеджер чата — Диалоги и сметы</option>
                    <option value="measurer">📐 Замерщик / Монтажник — Замеры и адреса</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Статус активности:
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as TeamMemberStatus)}
                    className="w-full py-1.5 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="active">🟢 Активен (В строю)</option>
                    <option value="vacation">🟡 В отпуске</option>
                    <option value="inactive">⚪ Неактивен / Заблокирован</option>
                  </select>
                </div>
              </div>

              {/* Цвет аватара */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Цвет профиля:
                </label>
                <div className="flex items-center gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        formColor === c ? "ring-2 ring-offset-2 ring-teal-500 scale-110" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Привязка к проектам / нишам */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Доступ к направлениям бизнеса:
                </label>
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-zinc-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={formAllProjects}
                      onChange={(e) => setFormAllProjects(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>Все направления компании (без ограничений)</span>
                  </label>

                  {!formAllProjects && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5 pl-5">
                      {projects.map((p) => {
                        const isChecked = formAssignedProjects.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className="flex items-center gap-2 cursor-pointer text-zinc-600 dark:text-zinc-400"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormAssignedProjects([...formAssignedProjects, p.id]);
                                } else {
                                  setFormAssignedProjects(
                                    formAssignedProjects.filter((id) => id !== p.id)
                                  );
                                }
                              }}
                              className="rounded text-teal-600 focus:ring-teal-500"
                            />
                            <span>{p.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Примечание */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Специализация и примечание:
                </label>
                <input
                  type="text"
                  placeholder="Например: Ответственный по потолкам и окнам, выезды в центральный район"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full py-1.5 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-2xs cursor-pointer"
                >
                  {editingMember ? "Сохранить изменения" : "Добавить в команду"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
