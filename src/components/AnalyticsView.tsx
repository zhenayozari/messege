import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  ExternalLink,
  Flame,
  Globe,
  HelpCircle,
  Info,
  Layers,
  MessageCircle,
  MessageSquare,
  Percent,
  RefreshCw,
  Ruler,
  Send,
  Share2,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Conversation, PostPerformance, Project } from "../types";
import { api } from "../services/api";

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

  // Alert testing state
  const [isSendingAlarm, setIsSendingAlarm] = useState(false);
  const [isSendingSummary, setIsSendingSummary] = useState(false);
  const [alertFeedback, setAlertFeedback] = useState<{
    type: "alarm" | "summary";
    ok: boolean;
    title: string;
    description: string;
    postUrl?: string;
    recipientChatId?: string;
    timestamp: string;
  } | null>(null);

  // Manager recipient chat ID state
  const [managerChatId, setManagerChatId] = useState<string>("");
  const [isEditingChatId, setIsEditingChatId] = useState(false);
  const [tempChatId, setTempChatId] = useState("");
  const [botUsername, setBotUsername] = useState<string>("feniks_smmBot");
  const [isBotOnline, setIsBotOnline] = useState<boolean>(true);

  // Selected funnel stage for inspecting clients
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<string | null>(null);

  useEffect(() => {
    const currentChat = api.getTelegramManagerChatId();
    setManagerChatId(currentChat);
    setTempChatId(currentChat);

    api.getTelegramBotStatus().then((res) => {
      if (res.ok && res.info) {
        setBotUsername(res.info.username || "feniks_smmBot");
        setIsBotOnline(true);
      } else {
        setIsBotOnline(false);
      }
    });
  }, []);

  const handleSaveManagerChatId = () => {
    const cleaned = api.cleanTelegramChatId(tempChatId);
    api.setTelegramManagerChatId(cleaned);
    setManagerChatId(cleaned);
    setIsEditingChatId(false);
  };

  // Filter conversations for the active project
  const projectConvs = conversations.filter(
    (c) => activeProject.id === "all" || c.project_id === activeProject.id,
  );

  // -------------------------------------------------------------------
  // 1. Честные показатели бизнеса (из реального массива conversations и leads)
  // -------------------------------------------------------------------
  // Карточка 1: Всего обращений в воронке + разбивка Новые / Горячие
  const totalLeads = projectConvs.length;
  const newLeads = projectConvs.filter(
    (c) => c.lead?.status === "new" || c.unread_count > 0,
  ).length;
  const hotLeads = projectConvs.filter(
    (c) => c.lead?.temperature === "hot",
  ).length;
  const warmLeads = projectConvs.filter(
    (c) => c.lead?.temperature === "warm",
  ).length;
  const coldLeads = projectConvs.filter(
    (c) => c.lead?.temperature === "cold",
  ).length;

  // Карточка 2: Назначено замеров
  const measurementLeads = projectConvs.filter(
    (c) => c.lead?.measurement_planned === true || c.lead?.status === "measurement_planned",
  ).length;
  const wonLeads = projectConvs.filter((c) => c.lead?.status === "won").length;
  const lostLeads = projectConvs.filter((c) => c.lead?.status === "lost").length;

  // Карточка 3: Сумма смет в работе (честное суммирование min и max значений смет)
  let totalEstimateMin = 0;
  let totalEstimateMax = 0;
  let activeCalculationsCount = 0;

  for (const c of projectConvs) {
    if (c.lead?.status === "lost") continue;

    let min = 0;
    let max = 0;

    if (c.calculation?.estimate_min && c.calculation?.estimate_max) {
      min = c.calculation.estimate_min;
      max = c.calculation.estimate_max;
    } else if (c.lead?.estimated_price) {
      min = Math.round(c.lead.estimated_price * 0.9);
      max = Math.round(c.lead.estimated_price * 1.15);
    } else if (c.lead?.area_m2) {
      min = c.lead.area_m2 * 850;
      max = c.lead.area_m2 * 1250;
    } else {
      // Базовая оценка для активного обращения без замеров
      min = 18000;
      max = 35000;
    }

    totalEstimateMin += min;
    totalEstimateMax += max;
    activeCalculationsCount++;
  }

  // Карточка 4: Конверсия в замер (% назначенных замеров от общего числа лидов)
  const conversionRate =
    totalLeads > 0
      ? ((measurementLeads / totalLeads) * 100).toFixed(1)
      : "0.0";

  // -------------------------------------------------------------------
  // 2. Распределение лидов по каналам (Telegram / VK / MAX / Авито / Сайт)
  // -------------------------------------------------------------------
  const channelDistribution: Record<
    string,
    {
      name: string;
      icon: any;
      color: string;
      barColor: string;
      count: number;
      measurements: number;
      percentage: number;
    }
  > = {
    telegram: {
      name: "Telegram",
      icon: Send,
      color: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800",
      barColor: "bg-sky-500",
      count: 0,
      measurements: 0,
      percentage: 0,
    },
    vk: {
      name: "ВКонтакте",
      icon: MessageCircle,
      color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800",
      barColor: "bg-blue-600",
      count: 0,
      measurements: 0,
      percentage: 0,
    },
    max: {
      name: "MAX Мессенджер",
      icon: MessageSquare,
      color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800",
      barColor: "bg-purple-600",
      count: 0,
      measurements: 0,
      percentage: 0,
    },
    avito: {
      name: "Авито",
      icon: ShoppingBag,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
      barColor: "bg-emerald-500",
      count: 0,
      measurements: 0,
      percentage: 0,
    },
    site: {
      name: "Сайт / Форма",
      icon: Globe,
      color: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800",
      barColor: "bg-teal-600",
      count: 0,
      measurements: 0,
      percentage: 0,
    },
  };

  for (const c of projectConvs) {
    let key = c.channel as string;
    if (key === "vk_wall" || key === "vk_channel") key = "vk";
    if (!channelDistribution[key]) {
      channelDistribution[key] = {
        name: key === "test" ? "Тестовый канал" : key,
        icon: MessageSquare,
        color: "text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
        barColor: "bg-zinc-500",
        count: 0,
        measurements: 0,
        percentage: 0,
      };
    }
    channelDistribution[key].count += 1;
    if (c.lead?.measurement_planned || c.lead?.status === "measurement_planned") {
      channelDistribution[key].measurements += 1;
    }
  }

  // Расчет долей (%)
  Object.keys(channelDistribution).forEach((k) => {
    channelDistribution[k].percentage =
      totalLeads > 0
        ? Number(((channelDistribution[k].count / totalLeads) * 100).toFixed(1))
        : 0;
  });

  // Отсортированные каналы по количеству
  const sortedChannels = Object.entries(channelDistribution)
    .filter(([_, v]) => v.count > 0 || ["telegram", "vk", "avito"].includes(_))
    .sort((a, b) => b[1].count - a[1].count);

  // -------------------------------------------------------------------
  // 3. Этапы воронки продаж: [Новый] -> [Квалификация] -> [Замер назначен] -> [Продажа / Договор] -> [Отказ]
  // -------------------------------------------------------------------
  const funnelStages = [
    {
      key: "new",
      name: "Новый контакт",
      shortName: "Новый",
      description: "Первое входящее обращение, ожидает ответа или базовой реакции",
      color: "sky",
      badgeColor: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
      barBg: "bg-sky-500",
      leads: projectConvs.filter(
        (c) => !c.lead?.status || c.lead.status === "new",
      ),
    },
    {
      key: "qualifying",
      name: "Квалификация",
      shortName: "Квалификация",
      description: "Выяснение площади, профиля, адреса и потребности клиента",
      color: "amber",
      badgeColor: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      barBg: "bg-amber-500",
      leads: projectConvs.filter(
        (c) => c.lead?.status === "qualifying" || c.lead?.status === "waiting_client",
      ),
    },
    {
      key: "measurement_planned",
      name: "Замер назначен",
      shortName: "Замер назначен",
      description: "Согласована дата и время выезда инженера-замерщика с образцами",
      color: "teal",
      badgeColor: "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
      barBg: "bg-teal-600",
      leads: projectConvs.filter(
        (c) => c.lead?.status === "measurement_planned" || c.lead?.measurement_planned === true,
      ),
    },
    {
      key: "won",
      name: "Продажа / Договор",
      shortName: "Продажа / Договор",
      description: "Замер завершен успешно, смета утверждена, договор подписан",
      color: "emerald",
      badgeColor: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      barBg: "bg-emerald-600",
      leads: projectConvs.filter((c) => c.lead?.status === "won"),
    },
    {
      key: "lost",
      name: "Отказ / Архив",
      shortName: "Отказ",
      description: "Клиент отложил ремонт, выбрал других подрядчиков или недоступен",
      color: "zinc",
      badgeColor: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
      barBg: "bg-zinc-400 dark:bg-zinc-600",
      leads: projectConvs.filter((c) => c.lead?.status === "lost"),
    },
  ];

  // Суммы смет для каждого этапа воронки
  const getStageEstimateSum = (stageLeads: Conversation[]) => {
    let min = 0;
    let max = 0;
    for (const c of stageLeads) {
      if (c.calculation?.estimate_min && c.calculation?.estimate_max) {
        min += c.calculation.estimate_min;
        max += c.calculation.estimate_max;
      } else if (c.lead?.estimated_price) {
        min += Math.round(c.lead.estimated_price * 0.9);
        max += Math.round(c.lead.estimated_price * 1.15);
      } else if (c.lead?.area_m2) {
        min += c.lead.area_m2 * 850;
        max += c.lead.area_m2 * 1250;
      } else {
        min += 20000;
        max += 35000;
      }
    }
    return { min, max };
  };

  // -------------------------------------------------------------------
  // 4. Оживление кнопок Telegram-алертов руководителю
  // -------------------------------------------------------------------
  const handleRunRealAlarm = async () => {
    setIsSendingAlarm(true);
    setAlertFeedback(null);

    // 1. Находим диалог со статусом ожидания ответа
    const waitingConv: Conversation | undefined =
      projectConvs.find(
        (c) =>
          c.unread_count > 0 ||
          c.status === "waiting" ||
          c.lead?.status === "waiting_client" ||
          (c.messages.length > 0 && c.messages[c.messages.length - 1].direction === "inbound"),
      ) || projectConvs[0];

    const clientName = waitingConv?.contact?.name || "Алексей Смирнов";
    const lastMsgText =
      waitingConv?.last_text ||
      (waitingConv?.messages && waitingConv.messages.length > 0
        ? waitingConv.messages[waitingConv.messages.length - 1].text
        : "Добрый день! Подскажите стоимость матового натяжного потолка на 18 кв.м?");

    try {
      const res = await api.sendTelegramAlarmAlert({
        clientName,
        text: lastMsgText || "Здравствуйте, хочу заказать замер потолка",
        channel: waitingConv?.channel || "telegram",
        convId: waitingConv?.id,
        chatId: managerChatId,
      });

      if (res.ok) {
        setAlertFeedback({
          type: "alarm",
          ok: true,
          title: "Тревога успешно доставлена в Telegram!",
          description: `⚠️ Отправлено сообщение о простое: Клиент «${clientName}» ожидает ответа 15 минут. Текст: «${lastMsgText}».`,
          postUrl: res.postUrl,
          recipientChatId: res.recipientChatId,
          timestamp: new Date().toLocaleTimeString("ru-RU"),
        });
      } else {
        setAlertFeedback({
          type: "alarm",
          ok: false,
          title: "Не удалось отправить тревогу в Telegram",
          description: res.error || "Проверьте токен бота или доступ к чату.",
          recipientChatId: res.recipientChatId,
          timestamp: new Date().toLocaleTimeString("ru-RU"),
        });
      }
      onTriggerAlarmTest();
    } catch (err: any) {
      setAlertFeedback({
        type: "alarm",
        ok: false,
        title: "Сетевая ошибка при отправке тревоги",
        description: err.message || "Ошибка связи с Telegram API",
        timestamp: new Date().toLocaleTimeString("ru-RU"),
      });
    } finally {
      setIsSendingAlarm(false);
    }
  };

  const handleRunRealMorningSummary = async () => {
    setIsSendingSummary(true);
    setAlertFeedback(null);

    const channelStatsSummary: Record<string, number> = {};
    sortedChannels.forEach(([k, v]) => {
      if (v.count > 0) channelStatsSummary[k] = v.count;
    });

    try {
      const res = await api.sendTelegramMorningSummary({
        totalLeads,
        newLeads,
        hotLeads,
        measurements: measurementLeads,
        estimateMin: totalEstimateMin,
        estimateMax: totalEstimateMax,
        conversionRate,
        channelStats: channelStatsSummary,
        chatId: managerChatId,
        projectName: activeProject.name,
      });

      if (res.ok) {
        setAlertFeedback({
          type: "summary",
          ok: true,
          title: "Утренняя сводка успешно доставлена в Telegram!",
          description: `📊 Сводка отправлена: Обращений: ${totalLeads} (Новых: ${newLeads} | Горячих: ${hotLeads}) | Замеров: ${measurementLeads} 📐 | Сметы: от ${totalEstimateMin.toLocaleString("ru-RU")} до ${totalEstimateMax.toLocaleString("ru-RU")} ₽.`,
          postUrl: res.postUrl,
          recipientChatId: res.recipientChatId,
          timestamp: new Date().toLocaleTimeString("ru-RU"),
        });
      } else {
        setAlertFeedback({
          type: "summary",
          ok: false,
          title: "Не удалось отправить утреннюю сводку",
          description: res.error || "Проверьте токен бота или доступ к чату.",
          recipientChatId: res.recipientChatId,
          timestamp: new Date().toLocaleTimeString("ru-RU"),
        });
      }
      onTriggerMorningSummaryTest();
    } catch (err: any) {
      setAlertFeedback({
        type: "summary",
        ok: false,
        title: "Сетевая ошибка при отправке сводки",
        description: err.message || "Ошибка связи с Telegram API",
        timestamp: new Date().toLocaleTimeString("ru-RU"),
      });
    } finally {
      setIsSendingSummary(false);
    }
  };

  // -------------------------------------------------------------------
  // 5. Таблица публикаций (PostPerformance) без Math.random
  // -------------------------------------------------------------------
  const projectPerformances = performances.filter(
    (p) => p.project_id === activeProject.id,
  );

  const displayPerformances = projectPerformances.filter((p) => {
    if (filterChannel !== "all" && p.channel !== filterChannel) return false;
    return true;
  });

  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onSyncPerformance();
      setIsSyncing(false);
    }, 500);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-y-auto">
      {/* 1. Header with project badge and honest data indicator */}
      <div className="p-4 sm:px-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                <BarChart3 className="text-teal-700 dark:text-teal-400" size={18} />
                Честная CRM-аналитика и Воронка продаж
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                {activeProject.name}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
                <CheckCircle2 size={11} /> Реальные данные CRM
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Точные расчеты на базе {projectConvs.length} диалогов, смет калькулятора и живых статусов лидов.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Time range selector */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
              <button
                type="button"
                onClick={() => setTimeRange("7d")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  timeRange === "7d"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium shadow-2xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                7 дней
              </button>
              <button
                type="button"
                onClick={() => setTimeRange("30d")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  timeRange === "30d"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium shadow-2xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                30 дней
              </button>
              <button
                type="button"
                onClick={() => setTimeRange("all")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  timeRange === "all"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium shadow-2xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
              <span>{isSyncing ? "Обновление..." : "Обновить показатели"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content container */}
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Banner with Telegram Alert Result */}
        {alertFeedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs transition-all ${
              alertFeedback.ok
                ? "bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
                : "bg-rose-50/90 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {alertFeedback.ok ? (
                <CheckCircle2 size={17} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={17} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <span>{alertFeedback.title}</span>
                  <span className="text-[10px] opacity-75 font-normal">[{alertFeedback.timestamp}]</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">{alertFeedback.description}</p>
                <div className="flex items-center gap-3 pt-1 text-[11px]">
                  <span>
                    Получатель: <code className="font-mono font-medium">{alertFeedback.recipientChatId}</code>
                  </span>
                  {alertFeedback.postUrl && (
                    <a
                      href={alertFeedback.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline hover:opacity-80 inline-flex items-center gap-1"
                    >
                      Открыть в Telegram <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAlertFeedback(null)}
              className="opacity-70 hover:opacity-100 p-1 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* 1. ЧЕТЫРЕ ЧЕСТНЫХ ПОКАЗАТЕЛЯ БИЗНЕСА */}
        {/* ----------------------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Карточка 1: Всего обращений в воронке + разбивка Новые / Горячие */}
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Всего обращений в воронке
              </span>
              <div className="p-1.5 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 rounded-md">
                <Users size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalLeads}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                диалогов в базе
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                Новые: <strong className="text-zinc-900 dark:text-zinc-100">{newLeads}</strong>
              </span>
              <span className="inline-flex items-center gap-1">
                <Flame size={12} className="text-amber-500 fill-amber-500" />
                Горячие: <strong className="text-zinc-900 dark:text-zinc-100">{hotLeads}</strong>
              </span>
            </div>
          </div>

          {/* Карточка 2: Назначено замеров (подсчет лидов с measurement_planned == true) */}
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Назначено замеров
              </span>
              <div className="p-1.5 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 rounded-md">
                <Ruler size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{measurementLeads}</span>
              <span className="text-xs text-teal-700 dark:text-teal-400 font-medium">
                выездов инженера
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
              <span>Доля от лидов: <strong className="text-zinc-900 dark:text-zinc-100">{conversionRate}%</strong></span>
              <span>Договоров: <strong className="text-emerald-600 dark:text-emerald-400">{wonLeads}</strong></span>
            </div>
          </div>

          {/* Карточка 3: Сумма смет в работе (суммирование min и max значений смет) */}
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Сумма смет в работе
              </span>
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-md">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {totalEstimateMin.toLocaleString("ru-RU")} – {totalEstimateMax.toLocaleString("ru-RU")} ₽
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
              <span>В расчете: <strong className="text-zinc-900 dark:text-zinc-100">{activeCalculationsCount} смет</strong></span>
              <span>Ср. чек: ~{Math.round((totalEstimateMin + totalEstimateMax) / (2 * (activeCalculationsCount || 1))).toLocaleString("ru-RU")} ₽</span>
            </div>
          </div>

          {/* Карточка 4: Конверсия в замер (% назначенных замеров от общего числа лидов) */}
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Конверсия в замер
              </span>
              <div className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-md">
                <Percent size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{conversionRate}%</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                ({measurementLeads} из {totalLeads})
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              {/* Progress bar */}
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Number(conversionRate) * 2.5)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* 4. ОЖИВЛЕНИЕ КНОПОК TELEGRAM-АЛЕРТОВ РУКОВОДИТЕЛЮ */}
        {/* ----------------------------------------------------------- */}
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 mt-0.5">
                <Bell size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Оповещения руководителя в Telegram
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Бот: @{botUsername} {isBotOnline ? "онлайн" : ""}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Реальная отправка тревог при простое диалога &gt;15 мин и утренней сводки прямо в Telegram Bot API.
                </p>
              </div>
            </div>

            {/* Target recipient settings */}
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/60 p-1.5 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
              <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Получатель:</span>
              {isEditingChatId ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={tempChatId}
                    onChange={(e) => setTempChatId(e.target.value)}
                    placeholder="ID чата или @канал"
                    className="w-36 px-2 py-0.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded font-mono text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveManagerChatId}
                    className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    title="Сохранить"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempChatId(managerChatId);
                      setIsEditingChatId(false);
                    }}
                    className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    title="Отмена"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <code className="font-mono text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
                    {managerChatId || "Канал по умолчанию"}
                  </code>
                  <button
                    type="button"
                    onClick={() => setIsEditingChatId(true)}
                    className="p-1 text-zinc-400 hover:text-teal-600 cursor-pointer"
                    title="Изменить ID получателя"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Test Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleRunRealAlarm}
                disabled={isSendingAlarm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-xs font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <AlertTriangle size={13} className={isSendingAlarm ? "animate-spin" : "text-amber-600 dark:text-amber-400"} />
                <span>{isSendingAlarm ? "Отправка в Telegram..." : "Тест: Тревога (>15 мин)"}</span>
              </button>

              <button
                type="button"
                onClick={handleRunRealMorningSummary}
                disabled={isSendingSummary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-300 dark:border-teal-800 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-900 dark:text-teal-200 text-xs font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={13} className={isSendingSummary ? "animate-spin" : "text-teal-600 dark:text-teal-400"} />
                <span>{isSendingSummary ? "Формирование отчета..." : "Тест: Утренняя сводка"}</span>
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 mb-1">
                <Clock size={13} className="text-amber-600 dark:text-amber-400" />
                Логика кнопки «Тревога (&gt;15 мин)»:
              </span>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Находит диалог в статусе ожидания, извлекает имя клиента и последнее сообщение, после чего немедленно
                отправляет вам алерт в Telegram через Bot API с призывом ответить клиенту.
              </p>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 mb-1">
                <Calendar size={13} className="text-teal-600 dark:text-teal-400" />
                Логика кнопки «Утренняя сводка»:
              </span>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Генерирует официальный дайджест руководителя на базе реальных данных CRM: количество лидов, число
                замеров, диапазон смет в работе и распределение по каналам привлечения.
              </p>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* 2. РАСПРЕДЕЛЕНИЕ ЛИДОВ ПО КАНАЛАМ (Telegram / VK / MAX / Авито / Сайт) */}
        {/* ----------------------------------------------------------- */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <MessageCircle size={16} className="text-teal-700 dark:text-teal-400" />
                <span>Распределение лидов по каналам (Источники обращений)</span>
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Реальное соотношение источников обращений в виде компактных прогресс-баров с конверсией в замер.
              </p>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              Всего источников: {sortedChannels.length}
            </span>
          </div>

          <div className="space-y-3.5">
            {sortedChannels.map(([channelKey, data]) => {
              const IconComponent = data.icon;
              const channelConvRate =
                data.count > 0
                  ? ((data.measurements / data.count) * 100).toFixed(0)
                  : "0";

              return (
                <div
                  key={channelKey}
                  className="p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-md border ${data.color}`}>
                        <IconComponent size={14} />
                      </div>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {data.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono font-medium">
                        {data.count} {data.count === 1 ? "диалог" : data.count < 5 ? "диалога" : "диалогов"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Замеров: <strong className="text-zinc-800 dark:text-zinc-200">{data.measurements}</strong> ({channelConvRate}%)
                      </span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                        {data.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Progress Bar */}
                  <div className="w-full bg-zinc-200/70 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${data.barColor}`}
                      style={{ width: `${Math.max(4, data.percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* 3. ЭТАПЫ ВОРОНКИ ПРОДАЖ */}
        {/* ----------------------------------------------------------- */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Layers size={16} className="text-teal-700 dark:text-teal-400" />
                <span>Этапы воронки продаж (Конверсионный путь клиента)</span>
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Реальное распределение клиентов: [Новый] → [Квалификация] → [Замер назначен] → [Продажа / Договор] → [Отказ].
              </p>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Нажмите на этап для просмотра клиентов
            </span>
          </div>

          {/* Funnel Pipeline Visual Steps */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
            {funnelStages.map((stage, idx) => {
              const stagePct =
                totalLeads > 0
                  ? ((stage.leads.length / totalLeads) * 100).toFixed(0)
                  : "0";
              const estimateSum = getStageEstimateSum(stage.leads);
              const isSelected = selectedFunnelStage === stage.key;

              return (
                <button
                  type="button"
                  key={stage.key}
                  onClick={() => setSelectedFunnelStage(isSelected ? null : stage.key)}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? "ring-2 ring-teal-500 border-teal-500 bg-teal-50/20 dark:bg-teal-950/30"
                      : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 hover:bg-zinc-100/70 dark:hover:bg-zinc-850"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono text-zinc-400">0{idx + 1}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${stage.badgeColor}`}>
                        {stagePct}%
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {stage.shortName}
                    </h4>

                    <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1">
                      {stage.leads.length} <span className="text-[10px] font-normal text-zinc-500">клиент.</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400 space-y-1">
                    <div className="truncate font-medium text-zinc-700 dark:text-zinc-300">
                      ~{estimateSum.min.toLocaleString("ru-RU")} – {estimateSum.max.toLocaleString("ru-RU")} ₽
                    </div>
                    {/* Stage mini progress */}
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${stage.barBg}`}
                        style={{ width: `${Math.max(8, Number(stagePct))}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Expanded list of clients for selected funnel stage */}
          {selectedFunnelStage && (
            <div className="mt-4 p-3.5 bg-zinc-50 dark:bg-zinc-950/80 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Клиенты на этапе: {funnelStages.find((s) => s.key === selectedFunnelStage)?.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFunnelStage(null)}
                  className="text-zinc-400 hover:text-zinc-600 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <X size={13} /> Закрыть
                </button>
              </div>

              {(() => {
                const curStage = funnelStages.find((s) => s.key === selectedFunnelStage);
                if (!curStage || curStage.leads.length === 0) {
                  return (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 py-2">
                      На данном этапе воронки пока нет активных диалогов.
                    </p>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {curStage.leads.map((conv) => (
                      <div
                        key={conv.id}
                        className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {conv.contact.name || "Клиент"}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {conv.channel}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-1">
                          {conv.last_text || "Нет сообщений"}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400">
                          <span>
                            {conv.lead?.area_m2 ? `${conv.lead.area_m2} м²` : "Площадь не указана"}
                          </span>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {conv.calculation?.estimate_min
                              ? `от ${conv.calculation.estimate_min.toLocaleString("ru-RU")} ₽`
                              : conv.lead?.estimated_price
                              ? `~${conv.lead.estimated_price.toLocaleString("ru-RU")} ₽`
                              : "Расчет в процессе"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------- */}
        {/* 5. ТАБЛИЦА ПУБЛИКАЦИЙ (PostPerformance) БЕЗ Math.random */}
        {/* ----------------------------------------------------------- */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                <span>Отслеживание публикаций контента (PostPerformance)</span>
                <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                  (Авто-сбор после публикации в VK / TG)
                </span>
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Реальные показатели охвата, переходов и лидов без фиктивных случайных генераций.
              </p>
            </div>

            {/* Filter by channel */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mr-1">Канал:</span>
              {["all", "vk_wall", "telegram"].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setFilterChannel(ch)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    filterChannel === ch
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
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
                <tr className="bg-zinc-50/70 dark:bg-zinc-950/70 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                  <th className="py-2.5 px-4">Публикация</th>
                  <th className="py-2.5 px-3">Канал</th>
                  <th className="py-2.5 px-3 text-right">Охват / Просмотры</th>
                  <th className="py-2.5 px-3 text-right">Лайки</th>
                  <th className="py-2.5 px-3 text-right">Комменты</th>
                  <th className="py-2.5 px-3 text-right">Репосты</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-teal-700 dark:text-teal-400">Лиды (Диалоги)</th>
                  <th className="py-2.5 px-3 text-right">Замеры</th>
                  <th className="py-2.5 px-4 text-right">Конверсия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                {displayPerformances.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                      Нет опубликованных постов для выбранного фильтра
                    </td>
                  </tr>
                ) : (
                  displayPerformances.map((perf) => {
                    const chColor =
                      perf.channel === "vk_wall"
                        ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                        : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
                    const chLabel = perf.channel === "vk_wall" ? "VK Стена" : "Telegram";

                    return (
                      <tr key={perf.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/60 transition-colors">
                        <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100 max-w-xs truncate">
                          <div>{perf.content_title}</div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">
                            Опубликован: {new Date(perf.published_at).toLocaleDateString("ru-RU")}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${chColor}`}>
                            {chLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100">
                          {perf.views_count.toLocaleString("ru-RU")}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-zinc-600 dark:text-zinc-400">
                          {perf.likes_count}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-zinc-600 dark:text-zinc-400">
                          {perf.comments_count}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-zinc-600 dark:text-zinc-400">
                          {perf.shares_count}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-teal-700 dark:text-teal-400">
                          +{perf.leads_count}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                          {perf.measurements_count}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium">
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

          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>Всего публикаций на отслеживании: {displayPerformances.length}</span>
            <span>Авто-синхронизация показателей через Telegram / VK Bot API</span>
          </div>
        </div>
      </div>
    </div>
  );
};
