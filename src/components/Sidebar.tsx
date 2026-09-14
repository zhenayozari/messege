import React from "react";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Flame,
  Image,
  Layers,
  MessageCircle,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  Sun,
  UserCheck,
  Workflow,
  X,
} from "lucide-react";
import { ChannelType, Conversation, LeadStatus, LeadTemperature, NavView, Project, UserRole } from "../types";
import { ProjectSwitcher } from "./ProjectSwitcher";

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  isPolling?: boolean;
  onManualPoll?: () => void;
  projects: Project[];
  activeProject: Project;
  onSelectProject: (p: Project) => void;
  onCreateProject: (name: string, nicheType: Project["niche_type"], desc: string) => void;
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  // Filters
  channelFilter: string;
  onSelectChannelFilter: (ch: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  temperatureFilter: string;
  onTemperatureFilterChange: (t: string) => void;
  attentionOnly: boolean;
  onToggleAttentionOnly: () => void;
  unreadTotal: number;
}

const channelDisplayMap: Record<string, { label: string; color: string }> = {
  vk: { label: "VK", color: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800" },
  vk_wall: { label: "VK стена", color: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  telegram: { label: "TG", color: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  max: { label: "MAX", color: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  avito: { label: "Авито", color: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  test: { label: "TEST", color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800" },
};

const leadStatusMap: Record<string, string> = {
  new: "Новый",
  qualifying: "Квалификация",
  waiting_client: "Ждём ответа",
  measurement_planned: "Замер",
  won: "Продажа",
  lost: "Отказ",
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  userRole,
  onRoleChange,
  isDarkMode = false,
  onToggleDarkMode,
  isPolling = false,
  onManualPoll,
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  conversations,
  selectedConversationId,
  onSelectConversation,
  channelFilter,
  onSelectChannelFilter,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  temperatureFilter,
  onTemperatureFilterChange,
  attentionOnly,
  onToggleAttentionOnly,
  unreadTotal,
}) => {
  const filteredConversations = conversations.filter((c) => {
    if (c.project_id !== activeProject.id) return false;
    if (channelFilter !== "all" && c.channel !== channelFilter) return false;
    if (statusFilter !== "all" && c.lead?.status !== statusFilter) return false;
    if (temperatureFilter !== "all" && c.lead?.temperature !== temperatureFilter) return false;
    if (attentionOnly && c.unread_count === 0 && c.lead?.temperature !== "hot") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.contact.name.toLowerCase().includes(q);
      const matchText = c.last_text.toLowerCase().includes(q);
      const matchPhone = c.contact.phone?.toLowerCase().includes(q);
      if (!matchName && !matchText && !matchPhone) return false;
    }
    return true;
  });

  const availableChannels = ["all", "telegram", "vk", "max", "avito"];

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200/90 dark:border-zinc-800 select-none text-zinc-800 dark:text-zinc-200 overflow-hidden">
      {/* 1. Header: Branding & Project Switcher (Ультра-компактно) */}
      <div className="p-2 border-b border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-4.5 h-4.5 rounded bg-zinc-900 dark:bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold">
              P
            </div>
            <span className="font-semibold text-xs tracking-tight text-zinc-900 dark:text-zinc-100">
              Phoenix AI Hub
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Онлайн
            </span>

            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                title={isDarkMode ? "Включить светлую тему" : "Включить темную тему"}
                className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {isDarkMode ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} />}
              </button>
            )}
          </div>
        </div>

        {/* Scalable Niche / Project selector */}
        <ProjectSwitcher
          projects={projects}
          activeProject={activeProject}
          onSelectProject={onSelectProject}
          onCreateProject={onCreateProject}
          onOpenProjectsSettings={() => onSelectView("settings")}
        />

        {/* Compact Role Switcher (4 RBAC Roles) */}
        <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px]">
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
            <ShieldCheck
              size={12}
              className={
                userRole === "owner"
                  ? "text-amber-600"
                  : userRole === "manager"
                    ? "text-indigo-600"
                    : userRole === "operator"
                      ? "text-teal-600"
                      : "text-emerald-600"
              }
            />
            <span>Роль:</span>
          </span>
          <select
            value={userRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="text-[10px] font-semibold py-0.5 px-1.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 cursor-pointer focus:outline-none"
          >
            <option value="owner">👑 Владелец</option>
            <option value="manager">💼 Старший менеджер</option>
            <option value="operator">💬 Менеджер чата</option>
            <option value="measurer">📐 Замерщик</option>
          </select>
        </div>
      </div>

      {/* 2. Top-level Navigation (Компактное меню с RBAC разграничением) */}
      <nav className="p-1.5 border-b border-zinc-200/80 dark:border-zinc-800 space-y-0.5 bg-zinc-50/70 dark:bg-zinc-950/70 shrink-0">
        {/* Диалоги: Доступны всем ролям */}
        <button
          type="button"
          onClick={() => onSelectView("dialogs")}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
            currentView === "dialogs"
              ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <MessageCircle size={14} className={currentView === "dialogs" ? "text-teal-700 dark:text-teal-400" : "text-zinc-500 dark:text-zinc-400"} />
            <span>Диалоги</span>
          </div>
          {unreadTotal > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white min-w-4 text-center">
              {unreadTotal}
            </span>
          )}
        </button>

        {/* Контент: Владелец и Старший менеджер */}
        {(userRole === "owner" || userRole === "manager") && (
          <button
            type="button"
            onClick={() => onSelectView("content")}
            className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentView === "content"
                ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Workflow size={14} className={currentView === "content" ? "text-teal-700 dark:text-teal-400" : "text-zinc-500 dark:text-zinc-400"} />
            <span>Контент</span>
          </button>
        )}

        {/* Календарь: Владелец, Старший менеджер и Замерщик */}
        {(userRole === "owner" || userRole === "manager" || userRole === "measurer") && (
          <button
            type="button"
            onClick={() => onSelectView("calendar")}
            className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentView === "calendar"
                ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <CalendarClock size={14} className={currentView === "calendar" ? "text-teal-700 dark:text-teal-400" : "text-zinc-500 dark:text-zinc-400"} />
            <span>{userRole === "measurer" ? "Выезды на замер" : "Календарь"}</span>
          </button>
        )}

        {/* Медиабиблиотека: Владелец и Старший менеджер */}
        {(userRole === "owner" || userRole === "manager") && (
          <button
            type="button"
            onClick={() => onSelectView("media")}
            className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentView === "media"
                ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Image size={14} className={currentView === "media" ? "text-teal-700 dark:text-teal-400" : "text-zinc-500 dark:text-zinc-400"} />
            <span>Медиабиблиотека</span>
          </button>
        )}

        {/* Аналитика: Владелец и Старший менеджер */}
        {(userRole === "owner" || userRole === "manager") && (
          <button
            type="button"
            onClick={() => onSelectView("analytics")}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentView === "analytics"
                ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <BarChart3 size={14} className={currentView === "analytics" ? "text-teal-700 dark:text-teal-400" : "text-zinc-500 dark:text-zinc-400"} />
              <span>Аналитика</span>
            </div>
            <span className="text-[9px] font-medium px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              KPI
            </span>
          </button>
        )}

        {/* Настройки: Только Владелец */}
        {userRole === "owner" && (
          <button
            type="button"
            onClick={() => onSelectView("settings")}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentView === "settings"
                ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Settings size={14} className={currentView === "settings" ? "text-teal-700 dark:text-teal-400" : "text-zinc-500 dark:text-zinc-400"} />
              <span>⚙️ Настройки</span>
            </div>
            <span className="text-[9px] font-medium px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              Hub
            </span>
          </button>
        )}
      </nav>

      {/* 3. Зона 3: Максимум пространства для списка диалогов (flex-1 min-h-0) */}
      {currentView === "dialogs" ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Компактный блок поиска и фильтров */}
          <div className="p-2 space-y-1.5 border-b border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Поиск диалогов..."
                className="w-full pl-7 pr-6 py-1 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-1.5 top-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Быстрые фильтры каналов (чипы в одну строчку) */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
              {availableChannels.map((ch) => {
                const label = ch === "all" ? "Все" : ch.toUpperCase();
                const isActive = channelFilter === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => onSelectChannelFilter(ch)}
                    className={`px-1.5 py-0.5 rounded font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs font-semibold"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Статус и внимание */}
            <div className="flex items-center justify-between gap-1 text-[10px]">
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="flex-1 px-1.5 py-0.5 text-[10px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded focus:outline-none text-zinc-700 dark:text-zinc-300"
              >
                <option value="all">Все статусы</option>
                <option value="new">Новые</option>
                <option value="qualifying">Квалификация</option>
                <option value="measurement_planned">Замер назначен</option>
                <option value="won">Продажа</option>
                <option value="lost">Отказ</option>
              </select>

              <button
                type="button"
                onClick={onToggleAttentionOnly}
                title="Только горячие лиды или непрочитанные"
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer shrink-0 font-medium ${
                  attentionOnly
                    ? "bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Flame size={11} className={attentionOnly ? "text-amber-600 dark:text-amber-400" : "text-zinc-500"} />
                <span>Внимание</span>
              </button>

              {(searchQuery || statusFilter !== "all" || temperatureFilter !== "all" || attentionOnly || channelFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange("");
                    onStatusFilterChange("all");
                    onTemperatureFilterChange("all");
                    onSelectChannelFilter("all");
                    if (attentionOnly) onToggleAttentionOnly();
                  }}
                  className="text-[9px] text-zinc-500 dark:text-zinc-400 hover:underline cursor-pointer shrink-0"
                >
                  Сброс
                </button>
              )}
            </div>
          </div>

          {/* Сам список диалогов: занимает ВСЁ оставшееся место (flex-1 min-h-0 overflow-y-auto), вмещает 7-10 диалогов */}
          <div className="flex-1 min-h-0 overflow-y-auto p-1 space-y-1 divide-y-0">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-10 px-3 text-xs text-zinc-500 dark:text-zinc-400">
                <MessageCircle size={22} className="mx-auto text-zinc-400 dark:text-zinc-600 mb-1.5 stroke-[1.5]" />
                <p className="font-medium text-zinc-700 dark:text-zinc-300">Нет диалогов</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Сбросьте фильтры поиска
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConversationId;
                const chBadge = channelDisplayMap[conv.channel] || {
                  label: conv.channel.toUpperCase(),
                  color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800",
                };
                const hasUnread = conv.unread_count > 0;

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => onSelectConversation(conv.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-md transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-white dark:bg-zinc-800 border-zinc-300/90 dark:border-zinc-700 shadow-2xs ring-1 ring-zinc-900/5 dark:ring-white/5"
                        : "bg-transparent border-transparent hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    {/* Строка 1: Бейдж канала, Имя клиента, Индикаторы */}
                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-[9px] font-bold px-1 py-0.2 rounded border uppercase shrink-0 leading-none ${chBadge.color}`}
                        >
                          {chBadge.label}
                        </span>
                        <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                          {conv.contact.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {conv.lead?.temperature === "hot" && (
                          <span className="text-[10px]" title="Горячий лид">🔥</span>
                        )}
                        {hasUnread && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white leading-none">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Строка 2: Превью последнего сообщения */}
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-1 mb-0.5 leading-snug">
                      {conv.last_text || "Нет сообщений"}
                    </div>

                    {/* Строка 3: Статус лида и Время */}
                    <div className="flex items-center justify-between text-[9px] text-zinc-500 dark:text-zinc-400">
                      <span className="truncate max-w-[120px]">
                        {conv.lead?.status ? leadStatusMap[conv.lead.status] || conv.lead.status : "Новый"}
                      </span>
                      <span className="font-mono text-zinc-400 dark:text-zinc-500">
                        {new Date(conv.last_message_at).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0" />
      )}

      {/* 4. Компактный аккуратный Footer: статус (🟢 Live API: TG + VK) и маленькая круглая иконка ручного обновления */}
      <div className="px-2.5 py-1.5 border-t border-zinc-200/80 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/80 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
            {isPolling ? "Опрос TG + VK..." : "🟢 Live API (TG + VK)"}
          </span>
        </div>

        {onManualPoll && (
          <button
            type="button"
            onClick={onManualPoll}
            title="Проверить входящие сообщения Telegram и ВКонтакте сейчас"
            className="p-1 rounded-full text-zinc-500 hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={isPolling ? "animate-spin text-teal-600 dark:text-teal-400" : ""} />
          </button>
        )}
      </div>
    </div>
  );
};
