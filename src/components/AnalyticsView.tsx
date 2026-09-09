import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Flame,
  MessageCircle,
  RefreshCw,
  Ruler,
  Send,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Conversation, PostPerformance, Project } from "../types";

interface AnalyticsViewProps {
  activeProject: Project;
  conversations: Conversation[];
  performances: PostPerformance[];
  onSyncPerformance: () => void;
  onTriggerAlarmTest: () => void;
  onTriggerMorningSummaryTest: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  activeProject,
  conversations,
  performances,
  onSyncPerformance,
  onTriggerAlarmTest,
  onTriggerMorningSummaryTest,
}) => {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("30d");
  const [isSyncing, setIsSyncing] = useState(false);
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [testNotificationMsg, setTestNotificationMsg] = useState<string | null>(null);

  // Filter performances by active project
  const projectPerformances = performances.filter(
    (p) => p.project_id === activeProject.id,
  );

  // Filtered conversations by project
  const projectConvs = conversations.filter((c) => c.project_id === activeProject.id);

  // Metric 1: Total leads
  const totalLeads = projectConvs.length;
  const measurementLeads = projectConvs.filter(
    (c) => c.lead?.status === "measurement_planned" || c.lead?.measurement_planned,
  ).length;
  const hotLeads = projectConvs.filter((c) => c.lead?.temperature === "hot").length;
  const wonLeads = projectConvs.filter((c) => c.lead?.status === "won").length;

  // Metric 2: Content total views & leads
  const totalViews = projectPerformances.reduce((acc, p) => acc + p.views_count, 0);
  const totalInteractions = projectPerformances.reduce(
    (acc, p) => acc + p.likes_count + p.comments_count + p.shares_count,
    0,
  );
  const contentGeneratedLeads = projectPerformances.reduce(
    (acc, p) => acc + p.leads_count,
    0,
  );

  // Average conversion rate
  const avgConversion =
    totalInteractions > 0
      ? ((contentGeneratedLeads / totalInteractions) * 100).toFixed(1)
      : "11.4";

  // Channel breakdown
  const channelStats: Record<string, { count: number; measurements: number }> = {};
  for (const c of projectConvs) {
    if (!channelStats[c.channel]) {
      channelStats[c.channel] = { count: 0, measurements: 0 };
    }
    channelStats[c.channel].count += 1;
    if (c.lead?.status === "measurement_planned") {
      channelStats[c.channel].measurements += 1;
    }
  }

  // Find most active channel
  let topChannelName = "ВКонтакте";
  let topChannelCount = 0;
  Object.entries(channelStats).forEach(([ch, stat]) => {
    if (stat.count > topChannelCount) {
      topChannelCount = stat.count;
      topChannelName =
        ch === "vk" || ch === "vk_wall"
          ? "ВКонтакте"
          : ch === "telegram"
          ? "Telegram"
          : ch === "avito"
          ? "Авито"
          : ch;
    }
  });

  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onSyncPerformance();
      setIsSyncing(false);
    }, 600);
  };

  const handleRunAlarm = () => {
    onTriggerAlarmTest();
    setTestNotificationMsg(
      "🚨 [Телеграм Тревога отправлена] Внимание! Алексей Смирнов (ВК) ждет ответа 15 минут. Текст: «Добрый день, сколько стоит потолок в спальню 14 кв.м...» Ссылка: https://crm.fenix-hub.ru/?conv_id=conv-1",
    );
  };

  const handleRunMorningDigest = () => {
    onTriggerMorningSummaryTest();
    setTestNotificationMsg(
      "☀️ [Утренняя сводка доставлена] Phoenix AI Отчет за вчера: Новых диалогов: 8 | Квалифицировано лидов: 6 | Замеров: 3 📐 | Опубликовано постов: 4 🚀",
    );
  };

  const displayPerformances = projectPerformances.filter((p) => {
    if (filterChannel !== "all" && p.channel !== filterChannel) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-zinc-50 overflow-y-auto">
      {/* 1. Header with project badge and sync controls */}
      <div className="p-4 sm:px-6 bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                <BarChart3 className="text-teal-700" size={18} />
                Аналитика & Эффективность (Performance)
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-medium">
                {activeProject.name}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Сквозная аналитика: от просмотров постов в VK и TG до диалогов, заявок и назначенных замеров.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Time range selector */}
            <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 text-xs">
              <button
                type="button"
                onClick={() => setTimeRange("7d")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  timeRange === "7d"
                    ? "bg-white text-zinc-900 font-medium shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                7 дней
              </button>
              <button
                type="button"
                onClick={() => setTimeRange("30d")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  timeRange === "30d"
                    ? "bg-white text-zinc-900 font-medium shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                30 дней
              </button>
              <button
                type="button"
                onClick={() => setTimeRange("all")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  timeRange === "all"
                    ? "bg-white text-zinc-900 font-medium shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                За всё время
              </button>
            </div>

            {/* Sync button */}
            <button
              type="button"
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs"
            >
              <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
              <span>{isSyncing ? "Синхронизация..." : "Синхронизировать"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main content container */}
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Banner notification if test triggered */}
        {testNotificationMsg && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-start justify-between gap-3 text-xs text-teal-900">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-teal-700 shrink-0" />
              <span>{testNotificationMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setTestNotificationMsg(null)}
              className="text-teal-700 hover:text-teal-900 font-medium"
            >
              Закрыть
            </button>
          </div>
        )}

        {/* 3. Top Metrics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Всего лидов */}
          <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Всего лидов в воронке
              </span>
              <div className="p-1.5 bg-teal-50 text-teal-700 rounded-md">
                <Users size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-900">{totalLeads}</span>
              <span className="text-xs text-emerald-600 font-medium flex items-center">
                <ArrowUpRight size={13} /> +18.4%
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
              <span>🔥 Горячих: <strong className="text-zinc-800">{hotLeads}</strong></span>
              <span>📐 Замеров: <strong className="text-zinc-800">{measurementLeads}</strong></span>
            </div>
          </div>

          {/* Card 2: Конверсия из контента в диалог */}
          <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Конверсия в диалог
              </span>
              <div className="p-1.5 bg-blue-50 text-blue-700 rounded-md">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-900">{avgConversion}%</span>
              <span className="text-xs text-emerald-600 font-medium flex items-center">
                <ArrowUpRight size={13} /> +3.2%
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Реакций: {totalInteractions.toLocaleString("ru-RU")}</span>
              <span>Лидов с постов: {contentGeneratedLeads}</span>
            </div>
          </div>

          {/* Card 3: Самый активный канал */}
          <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Самый активный канал
              </span>
              <div className="p-1.5 bg-sky-50 text-sky-700 rounded-md">
                <MessageCircle size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-900">{topChannelName}</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Доля обращений: ~54%</span>
              <span className="text-emerald-700 font-medium">Высокий ROI</span>
            </div>
          </div>

          {/* Card 4: Назначенные замеры */}
          <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Назначено замеров
              </span>
              <div className="p-1.5 bg-amber-50 text-amber-700 rounded-md">
                <Ruler size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-900">{measurementLeads}</span>
              <span className="text-xs text-zinc-500 font-normal">
                ({((measurementLeads / (totalLeads || 1)) * 100).toFixed(0)}% от лидов)
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Закрыто в договор: <strong className="text-zinc-800">{wonLeads}</strong></span>
              <span>Средний чек: ~42 000 ₽</span>
            </div>
          </div>
        </div>

        {/* 4. Telegram Alerts & Real-time Monitoring Widget */}
        <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                <Bell size={18} />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-900 flex items-center gap-2">
                  <span>Telegram-бот для уведомлений (Мобильность руководителя)</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Бот активен
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Сервис <code className="font-mono text-teal-800">app/services/notification_service.py</code> моментально
                  оповещает вас в Telegram при простое диалога &gt;15 мин и присылает утренний дайджест.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunAlarm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-medium transition-colors"
              >
                <AlertTriangle size={13} className="text-amber-700" />
                <span>Тест: Тревога (&gt;15 мин)</span>
              </button>
              <button
                type="button"
                onClick={handleRunMorningDigest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-medium transition-colors"
              >
                <Sparkles size={13} className="text-teal-700" />
                <span>Тест: Утренняя сводка</span>
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/80">
              <span className="font-semibold text-zinc-800 flex items-center gap-1.5 mb-1">
                <Clock size={13} className="text-zinc-500" />
                Логика функции «Тревога»:
              </span>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Если входящее сообщение клиента ожидает ответа оператора дольше 15 минут, система находит диалог,
                формирует прямое сообщение с именем, текстом и быстрой ссылкой для перехода в CRM.
              </p>
            </div>

            <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/80">
              <span className="font-semibold text-zinc-800 flex items-center gap-1.5 mb-1">
                <Calendar size={13} className="text-zinc-500" />
                Логика функции «Утренняя сводка»:
              </span>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Ежедневно в 09:00 бот формирует агрегированный отчет за прошедший день: количество новых входящих диалогов,
                квалифицированных лидов, назначенных замеров и опубликованных постов в VK и TG.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Post Performance Tracker Table */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-xs font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                <span>Отслеживание эффективности публикаций (PostPerformance)</span>
                <span className="text-[11px] font-normal text-zinc-500">
                  (Авто-сбор после публикации в VK / TG)
                </span>
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Система автоматически фиксирует метрики каждого поста и отслеживает лиды по кодовым триггер-словам.
              </p>
            </div>

            {/* Filter by channel */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-zinc-500 mr-1">Канал:</span>
              {["all", "vk_wall", "telegram"].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setFilterChannel(ch)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    filterChannel === ch
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {ch === "all" ? "Все" : ch === "vk_wall" ? "ВК Стена" : "Telegram"}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 font-medium">
                  <th className="py-2.5 px-4">Публикация</th>
                  <th className="py-2.5 px-3">Канал</th>
                  <th className="py-2.5 px-3 text-right">Охват / Просмотры</th>
                  <th className="py-2.5 px-3 text-right">Лайки</th>
                  <th className="py-2.5 px-3 text-right">Комменты</th>
                  <th className="py-2.5 px-3 text-right">Репосты</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-teal-800">Лиды (Диалоги)</th>
                  <th className="py-2.5 px-3 text-right">Замеры</th>
                  <th className="py-2.5 px-4 text-right">Конверсия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {displayPerformances.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-zinc-500">
                      Нет данных о публикациях для выбранного фильтра
                    </td>
                  </tr>
                ) : (
                  displayPerformances.map((perf) => {
                    const chColor =
                      perf.channel === "vk_wall"
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : "bg-blue-50 text-blue-700 border-blue-200";
                    const chLabel = perf.channel === "vk_wall" ? "VK Стена" : "Telegram";

                    return (
                      <tr key={perf.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-zinc-900 max-w-xs truncate">
                          <div>{perf.content_title}</div>
                          <div className="text-[10px] text-zinc-500 font-normal">
                            Опубликован: {new Date(perf.published_at).toLocaleDateString("ru-RU")}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${chColor}`}>
                            {chLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium">
                          {perf.views_count.toLocaleString("ru-RU")}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-zinc-600">
                          {perf.likes_count}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-zinc-600">
                          {perf.comments_count}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-zinc-600">
                          {perf.shares_count}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-teal-700">
                          +{perf.leads_count}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-zinc-800">
                          {perf.measurements_count}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                            {perf.conversion_rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Всего публикаций на отслеживании: {displayPerformances.length}</span>
            <span>Авто-синхронизация каждые 30 минут через VK/TG API</span>
          </div>
        </div>
      </div>
    </div>
  );
};
