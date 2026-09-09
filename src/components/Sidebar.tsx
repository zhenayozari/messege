import React from "react";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Code2,
  Flame,
  Image,
  Layers,
  MessageCircle,
  Moon,
  Radio,
  RefreshCw,
  Search,
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
  vk: { label: "VK", color: "bg-sky-50 text-sky-700 border-sky-200" },
  vk_wall: { label: "VK стена", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  telegram: { label: "TG", color: "bg-blue-50 text-blue-700 border-blue-200" },
  max: { label: "MAX", color: "bg-amber-50 text-amber-700 border-amber-200" },
  avito: { label: "Авито", color: "bg-purple-50 text-purple-700 border-purple-200" },
  instagram: { label: "IG", color: "bg-pink-50 text-pink-700 border-pink-200" },
  test: { label: "TEST", color: "bg-zinc-100 text-zinc-700 border-zinc-200" },
};

const leadStatusMap: Record<string, string> = {
  new: "Новый",
  qualifying: "Квалификация",
  waiting_client: "Ждём ответа",
  measurement_planned: "Замер назначен",
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
    // Project filter
    if (c.project_id !== activeProject.id) return false;
    // Channel filter
    if (channelFilter !== "all" && c.channel !== channelFilter) return false;
    // Status filter
    if (statusFilter !== "all" && c.lead?.status !== statusFilter) return false;
    // Temp filter
    if (temperatureFilter !== "all" && c.lead?.temperature !== temperatureFilter) return false;
    // Attention filter
    if (attentionOnly && c.unread_count === 0 && c.lead?.temperature !== "hot") return false;
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.contact.name.toLowerCase().includes(q);
      const matchText = c.last_text.toLowerCase().includes(q);
      const matchPhone = c.contact.phone?.toLowerCase().includes(q);
      if (!matchName && !matchText && !matchPhone) return false;
    }
    return true;
  });

  const availableChannels = ["all", "vk", "telegram", "max", "avito"];

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200/90 dark:border-zinc-800 select-none text-zinc-800 dark:text-zinc-200">
      {/* 1. App branding & Project Switcher */}
      <div className="p-3 border-b border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-zinc-900 dark:bg-teal-600 flex items-center justify-center text-white text-[11px] font-bold">
              P
            </div>
            <span className="font-semibold text-xs tracking-tight text-zinc-900 dark:text-zinc-100">
              Phoenix AI Hub
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Онлайн
            </span>

            {/* Dark Mode Toggle Button */}
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                title={isDarkMode ? "Включить светлую тему" : "Включить темную тему"}
                className="p-1 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {isDarkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
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
        />

        {/* Role Selector Switcher (RBAC) */}
        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
            <ShieldCheck size={13} className={userRole === "owner" ? "text-amber-600" : "text-teal-600"} />
            <span>Роль:</span>
          </div>
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-[10px]">
            <button
              type="button"
              onClick={() => onRoleChange("owner")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                userRole === "owner"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              👑 Владелец
            </button>
            <button
              type="button"
              onClick={() => onRoleChange("manager")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                userRole === "manager"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              👤 Менеджер
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top-level Notion / Linear Navigation */}
      <nav className="p-2 border-b border-zinc-200/80 dark:border-zinc-800 space-y-0.5 bg-zinc-50/50 dark:bg-zinc-950/50">
        <button
          type="button"
          onClick={() => onSelectView("dialogs")}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            currentView === "dialogs"
              ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageCircle size={15} className={currentView === "dialogs" ? "text-teal-700 dark:text-teal-400" : "text-zinc-600 dark:text-zinc-400"} />
            <span>Диалоги</span>
          </div>
          {unreadTotal > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white min-w-4 text-center">
              {unreadTotal}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectView("content")}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            currentView === "content"
              ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <Workflow size={15} className={currentView === "content" ? "text-teal-700 dark:text-teal-400" : "text-zinc-600 dark:text-zinc-400"} />
          <span>Контент</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView("calendar")}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            currentView === "calendar"
              ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <CalendarClock size={15} className={currentView === "calendar" ? "text-teal-700 dark:text-teal-400" : "text-zinc-600 dark:text-zinc-400"} />
          <span>Календарь</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView("media")}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            currentView === "media"
              ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <Image size={15} className={currentView === "media" ? "text-teal-700 dark:text-teal-400" : "text-zinc-600 dark:text-zinc-400"} />
          <span>Медиабиблиотека</span>
        </button>

        {/* OWNER-ONLY VIEWS: Analytics, Accounts, Backend */}
        {userRole === "owner" && (
          <>
            <button
              type="button"
              onClick={() => onSelectView("analytics")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentView === "analytics"
                  ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 size={15} className={currentView === "analytics" ? "text-teal-700 dark:text-teal-400" : "text-zinc-600 dark:text-zinc-400"} />
                <span>Аналитика</span>
              </div>
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                KPI
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectView("accounts")}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentView === "accounts"
                  ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Radio size={15} className={currentView === "accounts" ? "text-teal-700 dark:text-teal-400" : "text-zinc-600 dark:text-zinc-400"} />
              <span>Аккаунты</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectView("backend")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentView === "backend"
                  ? "bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-200/60 dark:border-teal-800 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <Code2 size={15} className={currentView === "backend" ? "text-teal-700 dark:text-teal-400" : "text-zinc-600 dark:text-zinc-400"} />
                <span>Бэкенд-код</span>
              </div>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Python
              </span>
            </button>
          </>
        )}

        {/* Manager restriction badge */}
        {userRole === "manager" && (
          <div className="p-2 mt-1 bg-zinc-100/70 dark:bg-zinc-800/70 rounded border border-zinc-200 dark:border-zinc-700 text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">
            🔒 Режим «Менеджер»: открыты только Диалоги и Контент. Вкладки «Аккаунты», «Код» и «Аналитика» скрыты.
          </div>
        )}
      </nav>

      {/* 3. Filter controls (Visible primarily in Dialogs view) */}
      {currentView === "dialogs" && (
        <>
          <div className="p-2.5 space-y-2 border-b border-zinc-200/80 bg-white">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Поиск по диалогам и клиентам..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white placeholder:text-zinc-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-2 text-zinc-600 hover:text-zinc-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Channel Filters Pill Strip */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-xs">
              {availableChannels.map((ch) => {
                const label = ch === "all" ? "Все" : ch.toUpperCase();
                const isActive = channelFilter === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => onSelectChannelFilter(ch)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? "bg-zinc-900 text-white shadow-2xs"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Dropdowns for Status & Temperature */}
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="w-full px-2 py-1 text-[11px] bg-zinc-50 border border-zinc-200 rounded focus:outline-none text-zinc-700"
              >
                <option value="all">Все статусы</option>
                <option value="new">Новые</option>
                <option value="qualifying">Квалификация</option>
                <option value="measurement_planned">Замер назначен</option>
                <option value="won">Продажа</option>
                <option value="lost">Отказ</option>
              </select>

              <select
                value={temperatureFilter}
                onChange={(e) => onTemperatureFilterChange(e.target.value)}
                className="w-full px-2 py-1 text-[11px] bg-zinc-50 border border-zinc-200 rounded focus:outline-none text-zinc-700"
              >
                <option value="all">Все температуры</option>
                <option value="hot">🔥 Горячий</option>
                <option value="warm">⚡ Тёплый</option>
                <option value="cold">❄️ Холодный</option>
              </select>
            </div>

            {/* Quick Action: Attention Filter */}
            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={onToggleAttentionOnly}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  attentionOnly
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <Flame size={12} className={attentionOnly ? "text-amber-600" : "text-zinc-600"} />
                <span>Требуют внимания</span>
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
                  className="text-[10px] text-zinc-600 hover:text-zinc-700 underline"
                >
                  Сброс
                </button>
              )}
            </div>
          </div>

          {/* 4. Scrollable Conversations List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1 divide-y-0">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-10 px-4 text-xs text-zinc-600">
                <MessageCircle size={24} className="mx-auto text-zinc-600 mb-2 stroke-[1.5]" />
                <p className="font-medium text-zinc-600">Нет диалогов по выбранным фильтрам</p>
                <p className="text-[11px] text-zinc-600 mt-1">
                  Переключите нишу или сбросьте параметры фильтрации
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConversationId;
                const chBadge = channelDisplayMap[conv.channel] || {
                  label: conv.channel.toUpperCase(),
                  color: "bg-zinc-100 text-zinc-700 border-zinc-200",
                };
                const hasUnread = conv.unread_count > 0;

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => onSelectConversation(conv.id)}
                    className={`w-full text-left p-2.5 rounded-lg transition-all border ${
                      isSelected
                        ? "bg-white border-zinc-300/90 shadow-2xs ring-1 ring-zinc-900/5"
                        : "bg-transparent border-transparent hover:bg-zinc-100/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase shrink-0 ${chBadge.color}`}
                        >
                          {chBadge.label}
                        </span>
                        <span className="font-medium text-xs text-zinc-900 truncate">
                          {conv.contact.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {conv.lead?.temperature === "hot" && (
                          <span className="text-[10px]" title="Горячий лид">🔥</span>
                        )}
                        {hasUnread && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white leading-none">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] text-zinc-600 line-clamp-1 mb-1.5 leading-snug">
                      {conv.last_text || "Нет сообщений"}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-600">
                      <span>
                        {conv.lead?.status ? leadStatusMap[conv.lead.status] || conv.lead.status : "Новый"}
                      </span>
                      <span>
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
        </>
      )}

      {/* Footer minimal info + Real-time Polling indicator */}
      <div className="p-2.5 border-t border-zinc-200/80 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="truncate text-[10px] text-zinc-600 dark:text-zinc-400">
            {isPolling ? "Опрос каналов (10с)..." : "Синхронизация: каждые 10с"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {onManualPoll && (
            <button
              type="button"
              onClick={onManualPoll}
              title="Обновить диалоги сейчас"
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <RefreshCw size={11} className={isPolling ? "animate-spin text-teal-700 dark:text-teal-400" : ""} />
            </button>
          )}
          <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">v2.5</span>
        </div>
      </div>
    </div>
  );
};
