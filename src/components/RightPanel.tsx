import React, { useState, useMemo, useEffect } from "react";
import {
  AlertCircle,
  Bell,
  BookOpen,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Flame,
  Folder,
  GitMerge,
  Info,
  Layers,
  Lightbulb,
  MapPin,
  Percent,
  Phone,
  Plus,
  Minus,
  Save,
  Search,
  Sliders,
  Sparkles,
  Tag,
  Trash2,
  User,
  Users,
  X,
  Zap,
  FileDown,
} from "lucide-react";
import { Conversation, LeadCalculation, LeadStatus, LeadTemperature, Project } from "../types";
import {
  calculateCeilingsEstimate,
  calculatePerimeter,
  CorniceKey,
  DiscountsState,
  LightsState,
  PRICES,
  ProfileKey,
  subscribePricingUpdated,
} from "../services/pricing";
import { downloadEstimateDocx } from "../services/exportDocx";
import {
  getKnowledgeDocsMap,
  subscribeKnowledgeUpdated,
} from "../services/knowledgeBase";

const PROJECT_KNOWLEDGE_EXCERPTS: Record<string, Record<string, { title: string; content: string }>> = {
  ceilings: {
    "pricing.md": {
      title: "Прайс-лист и расценки ФЕНИКС PRO",
      content:
        "• Полотно матовое MSD Premium: 650 - 1 200 ₽/м² (с работой)\n• Теневой зазор EuroKRAAB: 1 100 - 1 500 ₽/пог.м\n• Теневой ПВХ пластик: 800 - 1 100 ₽/пог.м\n• Парящий потолок с подсветкой: 700 - 1 500 ₽/пог.м\n• Скрытая ниша ПК-5 под карниз: 1 500 - 4 500 ₽/пог.м\n• Светильники GX53: 400 - 550 ₽/точка\n• Скидка новоселам, пенсионерам, многодетным: -10%.",
    },
    "calculator.md": {
      title: "Формула расчета и вилка цен",
      content:
        "Формула: Полотно + Профиль периметра + Углы + Освещение + Карнизы - Скидка.\nНикогда не называть одну фиксированную цифру без выезда замерщика: всегда озвучивать вилку цен и мягко приглашать на бесплатный замер с каталогами образцов профилей и полотен.",
    },
    "company.md": {
      title: "Стандарты монтажа ФЕНИКС PRO",
      content:
        "• Опыт в Улан-Удэ и Бурятии: более 9 лет\n• Чистый монтаж перфораторами с пылеудалением без пыли\n• Взрывобезопасные полимерные композитные баллоны\n• Гарантия 15 лет по официальному договору.",
    },
    "faq.md": {
      title: "Частые вопросы заказчиков",
      content:
        "• Обои или потолок: при теневом профиле обои клеятся до потолка\n• Опуск уровня: 3-4 см без спотов, 5-7 см со спотами\n• Монтаж 1 комнаты занимает 3-4 часа, квартиры — 1 рабочий день.",
    },
  },
  kitchens: {
    "pricing.md": {
      title: "Прайс-лист ФЕНИКС Кухни",
      content:
        "• Кухни МДФ плёнка: от 35 000 ₽/пог.м\n• Крашеная эмаль матовая/глянец: от 48 000 ₽/пог.м\n• Фасады Fenix NTM: от 65 000 ₽/пог.м\n• Столешницы: влагостойкий пластик HPL (от 6 000 ₽/м), акриловый камень (от 18 000 ₽/пог.м)\n• Фурнитура Blum с доводчиками плавного хода.",
    },
    "calculator.md": {
      title: "Расчет кухонных гарнитуров",
      content:
        "Расчет ведется по погонным метрам верхних и нижних баз.\nБесплатный выезд дизайнера-замерщика с образцами материалов и составление 3D-проекта на ноутбуке.",
    },
  },
  windows: {
    "pricing.md": {
      title: "Прайс-лист ФЕНИКС Окна",
      content:
        "• Двухстворчатое окно (1300х1400 мм) под ключ: от 17 500 ₽\n• Трехстворчатое окно: от 24 000 ₽\n• Балконный блок (дверь + окно): от 27 000 ₽\n• Немецкий 5-камерный профиль, энергосберегающие стеклопакеты.",
    },
  },
};

const LEAD_STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  new: {
    label: "Новый",
    bg: "bg-blue-50 dark:bg-blue-950/50",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  qualifying: {
    label: "Квалификация",
    bg: "bg-indigo-50 dark:bg-indigo-950/50",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  waiting_client: {
    label: "Ждём ответа",
    bg: "bg-amber-50 dark:bg-amber-950/50",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  measurement_planned: {
    label: "Замер назначен",
    bg: "bg-teal-50 dark:bg-teal-950/50",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
  },
  won: {
    label: "Продажа (Сделка)",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  lost: {
    label: "Отказ",
    bg: "bg-rose-50 dark:bg-rose-950/50",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
  },
};

interface RightPanelProps {
  activeProject: Project;
  conversation: Conversation | null;
  allConversations?: Conversation[];
  onUpdateLead: (updates: Partial<Conversation["lead"]>) => void;
  onUpdateCalculation: (calc: Partial<LeadCalculation>) => void;
  onMergeContacts?: (mainContactId: string, duplicateContactId: string) => void;
}

interface FullCalcParams {
  convId: string;
  area: number;
  perimeterManual: boolean;
  customPerimeter: number;
  profileKey: ProfileKey;
  angles: number;
  corniceType: CorniceKey;
  corniceLength: number;
  corniceLed: boolean;
  lights: LightsState;
  discounts: DiscountsState;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  activeProject,
  conversation,
  allConversations = [],
  onUpdateLead,
  onUpdateCalculation,
  onMergeContacts,
}) => {
  const [activeTab, setActiveTab] = useState<"deal" | "info">("deal");
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSearch, setMergeSearch] = useState("");
  const [selectedDuplicateId, setSelectedDuplicateId] = useState<string | null>(null);
  const [copiedPhoneToast, setCopiedPhoneToast] = useState(false);
  const [copiedEstimateToast, setCopiedEstimateToast] = useState(false);
  const [previewKnowledgeFile, setPreviewKnowledgeFile] = useState<string | null>(null);

  // Живая база знаний (синхронизирована с localStorage и Markdown-редактором)
  const [knowledgeMap, setKnowledgeMap] = useState(() =>
    getKnowledgeDocsMap(activeProject.niche_type)
  );

  useEffect(() => {
    setKnowledgeMap(getKnowledgeDocsMap(activeProject.niche_type));
    const unsub = subscribeKnowledgeUpdated(() => {
      setKnowledgeMap(getKnowledgeDocsMap(activeProject.niche_type));
    });
    return unsub;
  }, [activeProject.niche_type]);

  // Аккордеоны правой панели
  const [openRoomAngles, setOpenRoomAngles] = useState(true); // открыт по умолчанию
  const [openLights, setOpenLights] = useState(false);
  const [openCornices, setOpenCornices] = useState(false);
  const [openBreakdown, setOpenBreakdown] = useState(false);

  // Изолированное состояние параметров калькулятора (защищено от фонового поллинга сообщений)
  const [calcParams, setCalcParams] = useState<FullCalcParams>(() => {
    const initArea = conversation?.calculation?.area_m2 || conversation?.lead?.area_m2 || 18;
    const calcP = conversation?.calculation?.perimeter_m || calculatePerimeter(initArea);
    const initProfile: ProfileKey =
      (conversation?.calculation?.profile_type as ProfileKey) || "shadow_metal";

    let initCorniceType: CorniceKey = "hidden";
    if (conversation?.lead?.cornice === false) {
      initCorniceType = "none";
    }

    return {
      convId: conversation?.id || "",
      area: initArea,
      perimeterManual: !!conversation?.calculation?.perimeter_m,
      customPerimeter: calcP,
      profileKey: initProfile,
      angles: conversation?.calculation?.angles_count || 4,
      corniceType: initCorniceType,
      corniceLength: 3.0,
      corniceLed: true,
      lights: {
        gx53: 0,
        spot: conversation?.lead?.lights_count ?? 4,
        embedded: 0,
        chandelier: 0,
        light_line: 0,
        track_overlay: 0,
        track_embedded: 0,
        track_magnetic: 0,
      },
      discounts: {
        novosel: false,
        pensioner: false,
        multikids: false,
      },
    };
  });

  // При переключении на ДРУГОЙ диалог инициализируем калькулятор параметрами этого диалога
  useEffect(() => {
    if (conversation && conversation.id !== calcParams.convId) {
      const newArea = conversation.calculation?.area_m2 || conversation.lead?.area_m2 || 18;
      const newPerimeter = conversation.calculation?.perimeter_m || calculatePerimeter(newArea);
      const newProfile: ProfileKey =
        (conversation.calculation?.profile_type as ProfileKey) || "shadow_metal";
      const newCorniceType: CorniceKey =
        conversation.lead?.cornice === false ? "none" : "hidden";

      setCalcParams({
        convId: conversation.id,
        area: newArea,
        perimeterManual: !!conversation.calculation?.perimeter_m,
        customPerimeter: newPerimeter,
        profileKey: newProfile,
        angles: conversation.calculation?.angles_count || 4,
        corniceType: newCorniceType,
        corniceLength: 3.0,
        corniceLed: true,
        lights: {
          gx53: 0,
          spot: conversation.lead?.lights_count ?? 4,
          embedded: 0,
          chandelier: 0,
          light_line: 0,
          track_overlay: 0,
          track_embedded: 0,
          track_magnetic: 0,
        },
        discounts: {
          novosel: false,
          pensioner: false,
          multikids: false,
        },
      });
    }
  }, [conversation?.id, calcParams.convId]);

  if (!conversation || !conversation.lead) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-zinc-500 dark:text-zinc-400 text-xs bg-zinc-50/50 dark:bg-zinc-950">
        <Info size={24} className="text-zinc-400 dark:text-zinc-500 mb-2 stroke-[1.5]" />
        <p className="text-center font-medium text-zinc-800 dark:text-zinc-200">Нет активного лида</p>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center mt-1 max-w-[240px]">
          Выберите диалог в левой колонке для просмотра сделки, сметы и базы знаний.
        </p>
      </div>
    );
  }

  const lead = conversation.lead;
  const contact = conversation.contact;

  // Phone Copy Action
  const handleCopyPhone = () => {
    if (!contact.phone) return;
    navigator.clipboard.writeText(contact.phone);
    setCopiedPhoneToast(true);
    setTimeout(() => setCopiedPhoneToast(false), 2000);
  };

  // Temperature cycle
  const handleCycleTemperature = () => {
    const temps: LeadTemperature[] = ["cold", "warm", "hot"];
    const currentIdx = temps.indexOf(lead.temperature);
    const nextTemp = temps[(currentIdx + 1) % temps.length];
    onUpdateLead({ temperature: nextTemp });
  };

  // Follow-up quick buttons
  const handleSetQuickFollowUp = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(12, 0, 0, 0);
    onUpdateLead({ next_follow_up_at: d.toISOString() });
  };

  // Ревизия цен для мгновенной реактивности калькулятора при сохранении в Центре настроек
  const [pricingRevision, setPricingRevision] = useState(0);

  useEffect(() => {
    return subscribePricingUpdated(() => {
      setPricingRevision((prev) => prev + 1);
    });
  }, []);

  // Быстрый расчет сметы на лету из изолированного стейта калькулятора
  const currentEstimate = useMemo(() => {
    return calculateCeilingsEstimate({
      area: Math.max(1, calcParams.area),
      customPerimeter: calcParams.perimeterManual ? calcParams.customPerimeter : undefined,
      profileType: calcParams.profileKey,
      anglesCount: calcParams.angles,
      corniceType: calcParams.corniceType,
      corniceLength: calcParams.corniceLength,
      corniceWithLed: calcParams.corniceLed,
      lights: calcParams.lights,
      discounts: calcParams.discounts,
    });
  }, [calcParams, pricingRevision]);

  // Обработчик обновления параметров с синхронизацией в CRM
  const handleUpdateCalculator = (updates: Partial<FullCalcParams>) => {
    const updated = {
      ...calcParams,
      ...updates,
    };
    setCalcParams(updated);

    const est = calculateCeilingsEstimate({
      area: Math.max(1, updated.area),
      customPerimeter: updated.perimeterManual ? updated.customPerimeter : undefined,
      profileType: updated.profileKey,
      anglesCount: updated.angles,
      corniceType: updated.corniceType,
      corniceLength: updated.corniceLength,
      corniceWithLed: updated.corniceLed,
      lights: updated.lights,
      discounts: updated.discounts,
    });

    onUpdateCalculation({
      area_m2: est.area,
      perimeter_m: est.perimeter,
      profile_type: est.profileType,
      angles_count: updated.angles,
      estimate_min: est.estimateMin,
      estimate_max: est.estimateMax,
      breakdown: est.breakdown,
    });

    const totalLights =
      (updated.lights.spot || 0) +
      (updated.lights.gx53 || 0) +
      (updated.lights.embedded || 0) +
      (updated.lights.chandelier || 0);

    onUpdateLead({
      area_m2: est.area,
      lights_count: totalLights,
      cornice: updated.corniceType !== "none",
      estimated_price: est.estimateMin,
    });
  };

  // Копирование вилки расчета в буфер обмена для быстрой отправки клиенту
  const handleCopyEstimateSummary = () => {
    const profileNames: Record<ProfileKey, string> = {
      classic: "Классический (с маскировочной лентой)",
      shadow_metal: "Теневой EuroKraab (алюминий)",
      shadow_plastic: "Теневой (пластик)",
      shadow_fake: "Теневой имитация (с чёрной вставкой)",
      floating_single: "Парящий (одноцветная LED-подсветка)",
      floating_rgb: "Парящий RGB / Бегущий огонь",
      contour: "Контурный с подсветкой",
      shadow: "Теневой EuroKraab (алюминий)",
      shadow_pvc: "Теневой (пластик)",
      shadow_eurokraab: "Теневой EuroKraab (алюминий)",
      floating: "Парящий (одноцветная LED-подсветка)",
    };

    const corniceNames: Record<CorniceKey, string> = {
      none: "Без карниза",
      hidden: `Скрытый ПК-5 (${calcParams.corniceLength} м${calcParams.corniceLed ? ", с подсветкой" : ""})`,
      niche: `Ниша под карниз (${calcParams.corniceLength} м${calcParams.corniceLed ? ", с подсветкой" : ""})`,
      overlay_plastic: `Накладной пластиковый (${calcParams.corniceLength} м)`,
      single_row: `Однорядный (${calcParams.corniceLength} м${calcParams.corniceLed ? ", с подсветкой" : ""})`,
    };

    const text = [
      `📐 Предварительный расчет потолка (ФЕНИКС PRO):`,
      `• Площадь: ${calcParams.area} м², периметр: ~${currentEstimate.perimeter} пог.м`,
      `• Профиль: ${profileNames[calcParams.profileKey] || calcParams.profileKey}`,
      `• Количество углов: ${calcParams.angles} шт`,
      calcParams.corniceType !== "none" ? `• Карниз: ${corniceNames[calcParams.corniceType]}` : null,
      currentEstimate.appliedDiscountPercent > 0
        ? `• Скидка: −${currentEstimate.appliedDiscountPercent}%`
        : null,
      ``,
      `💰 Ориентировочная стоимость: ${currentEstimate.estimateMin.toLocaleString("ru-RU")} – ${currentEstimate.estimateMax.toLocaleString("ru-RU")} ₽`,
      `* Точная сумма фиксируется мастером на бесплатном замере с каталогами образцов полотен и профилей.`,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    setCopiedEstimateToast(true);
    setTimeout(() => setCopiedEstimateToast(false), 2200);
  };

  // Merge Candidates
  const duplicateCandidates = allConversations
    .filter((c) => c.contact_id !== contact.id)
    .filter((c) => {
      if (!mergeSearch.trim()) return true;
      const q = mergeSearch.toLowerCase();
      const matchName = c.contact.name.toLowerCase().includes(q);
      const matchPhone = c.contact.phone?.includes(q);
      const matchCity = c.contact.city?.toLowerCase().includes(q);
      return matchName || matchPhone || matchCity;
    });

  const selectedDuplicate = allConversations.find(
    (c) => c.contact_id === selectedDuplicateId,
  );

  const handleExecuteMerge = () => {
    if (!selectedDuplicateId || !onMergeContacts) return;
    onMergeContacts(contact.id, selectedDuplicateId);
    setShowMergeModal(false);
    setSelectedDuplicateId(null);
  };

  // Подсчет суммарного освещения для бейджа
  const totalLightCount =
    (calcParams.lights.gx53 || 0) +
    (calcParams.lights.spot || 0) +
    (calcParams.lights.embedded || 0) +
    (calcParams.lights.chandelier || 0);

  const totalLightLines =
    (calcParams.lights.light_line || 0) +
    (calcParams.lights.track_overlay || 0) +
    (calcParams.lights.track_embedded || 0) +
    (calcParams.lights.track_magnetic || 0);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 select-none text-xs text-zinc-800 dark:text-zinc-200 overflow-hidden">
      {/* 1. TOP-HERO: Client, Phone, Funnel, Temp (Пинкованная верхняя плашка) */}
      <div className="shrink-0 p-3 bg-zinc-50/90 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-xs space-y-2.5">
        {/* Row 1: Avatar, Name & Temp */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-700 dark:bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              {contact.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                {contact.name}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {contact.primary_channel}
                </span>
                {contact.city && (
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-0.5 truncate">
                    <MapPin size={9} />
                    {contact.city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Temperature Badge */}
          <button
            type="button"
            onClick={handleCycleTemperature}
            title="Кликните, чтобы изменить температуру лида"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all border cursor-pointer ${
              lead.temperature === "hot"
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-500/20"
                : lead.temperature === "warm"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-500/20"
                : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800 hover:bg-sky-500/20"
            }`}
          >
            {lead.temperature === "hot" ? (
              <>
                <Flame size={11} className="text-rose-500 animate-pulse" />
                <span>Горячий</span>
              </>
            ) : lead.temperature === "warm" ? (
              <>
                <Zap size={11} className="text-amber-500" />
                <span>Тёплый</span>
              </>
            ) : (
              <>
                <span>❄️</span>
                <span>Холодный</span>
              </>
            )}
          </button>
        </div>

        {/* Row 2: 1-Click Phone & Status */}
        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/80">
          {contact.phone ? (
            <div className="flex items-center gap-1 min-w-0">
              <a
                href={`tel:${contact.phone}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 font-medium text-[11px] hover:bg-emerald-100/70 transition-colors"
                title="Позвонить клиенту в 1 клик"
              >
                <Phone size={11} className="text-emerald-600 dark:text-emerald-400" />
                <span className="font-mono font-semibold">{contact.phone}</span>
              </a>

              <button
                type="button"
                onClick={handleCopyPhone}
                className="p-1 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Скопировать телефон"
              >
                {copiedPhoneToast ? (
                  <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
          ) : (
            <div className="text-[10px] text-zinc-400 italic">Телефон не указан</div>
          )}

          {/* Funnel Selector */}
          <div className="relative">
            <select
              value={lead.status}
              onChange={(e) => onUpdateLead({ status: e.target.value as LeadStatus })}
              className={`py-0.5 px-2 text-[10px] font-semibold rounded border focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer appearance-none pr-5 ${
                LEAD_STATUS_CONFIG[lead.status]?.bg || "bg-zinc-50"
              } ${LEAD_STATUS_CONFIG[lead.status]?.text || "text-zinc-800"} ${
                LEAD_STATUS_CONFIG[lead.status]?.border || "border-zinc-200"
              }`}
            >
              <option value="new">🆕 Новый</option>
              <option value="qualifying">🎯 Квалификация</option>
              <option value="waiting_client">⏳ Ждём ответа</option>
              <option value="measurement_planned">📐 Замер назначен</option>
              <option value="won">🏆 Продажа</option>
              <option value="lost">❌ Отказ</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-zinc-400">
              <ChevronDown size={11} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. TAB SWITCHER */}
      <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-950 p-1 gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("deal")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md font-medium text-xs transition-all cursor-pointer ${
            activeTab === "deal"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold border border-zinc-200/80 dark:border-zinc-800"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          <Calculator size={13} className={activeTab === "deal" ? "text-teal-600 dark:text-teal-400" : ""} />
          <span>Сделка & Смета</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("info")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md font-medium text-xs transition-all cursor-pointer ${
            activeTab === "info"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold border border-zinc-200/80 dark:border-zinc-800"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          <BookOpen size={13} className={activeTab === "info" ? "text-teal-600 dark:text-teal-400" : ""} />
          <span>Инфо & База знаний</span>
        </button>
      </div>

      {/* 3. TAB CONTENT (SCROLLABLE) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ==================== TAB 1: СДЕЛКА & СМЕТА ==================== */}
        {activeTab === "deal" && (
          <div className="space-y-3">
            {/* 1. HERO КАРТОЧКА ВИЛКИ ЦЕН */}
            <div className="bg-gradient-to-br from-teal-950 via-zinc-900 to-zinc-950 text-white p-3 rounded-xl border border-teal-800/40 shadow-sm relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-teal-300">
                      Ориентир сметы (Вилка цен)
                    </span>
                    {currentEstimate.appliedDiscountPercent > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500 text-white">
                        −{currentEstimate.appliedDiscountPercent}%
                      </span>
                    )}
                  </div>

                  <div className="text-lg font-extrabold mt-0.5 tracking-tight text-white flex items-baseline gap-1">
                    <span>{currentEstimate.estimateMin.toLocaleString("ru-RU")}</span>
                    <span className="text-teal-300/80 font-normal text-sm">–</span>
                    <span>{currentEstimate.estimateMax.toLocaleString("ru-RU")} ₽</span>
                  </div>

                  {currentEstimate.appliedDiscountPercent > 0 && (
                    <div className="text-[10px] text-zinc-400 line-through">
                      Базовая цена: {currentEstimate.rawMin.toLocaleString("ru-RU")} –{" "}
                      {currentEstimate.rawMax.toLocaleString("ru-RU")} ₽
                    </div>
                  )}
                </div>

                {/* Кнопка "Скопировать расчет" */}
                <button
                  type="button"
                  onClick={handleCopyEstimateSummary}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-500/30 text-[10px] font-medium transition-colors cursor-pointer"
                  title="Скопировать красивое резюме сметы в буфер"
                >
                  {copiedEstimateToast ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span>Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>В ответ</span>
                    </>
                  )}
                </button>
              </div>

              {/* Метрики в 1 строку */}
              <div className="mt-2 pt-2 border-t border-teal-800/40 flex items-center justify-between text-[10px] text-teal-100/80">
                <span>
                  S: <strong>{calcParams.area} м²</strong>
                </span>
                <span>
                  P: <strong>~{currentEstimate.perimeter} м</strong>
                </span>
                <span>
                  Углы: <strong>{calcParams.angles} шт</strong>
                </span>
                <span>
                  Свет: <strong>{totalLightCount} шт</strong>
                </span>
              </div>
            </div>

            {/* 2. АККОРДЕОНЫ ПАРАМЕТРОВ */}

            {/* 📐 БЛОК 1: ПОМЕЩЕНИЕ И УГЛЫ (Открыт по умолчанию) */}
            <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setOpenRoomAngles(!openRoomAngles)}
                className="w-full flex items-center justify-between p-2.5 text-left font-bold text-xs text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">📐</span>
                  <span>Помещение и углы</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
                  <span>
                    {calcParams.area} м² · {calcParams.angles} углов
                  </span>
                  {openRoomAngles ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {openRoomAngles && (
                <div className="p-3 pt-1 border-t border-zinc-200/80 dark:border-zinc-800 space-y-3">
                  {/* Площадь */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                        Площадь комнаты:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="3"
                          max="150"
                          value={calcParams.area}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value));
                            const autoP = calculatePerimeter(val);
                            handleUpdateCalculator({
                              area: val,
                              customPerimeter: autoP,
                              perimeterManual: false,
                            });
                          }}
                          className="w-12 py-0.5 px-1 text-center font-bold text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-teal-500"
                        />
                        <span className="text-zinc-500 text-[11px]">м²</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="1"
                      value={calcParams.area}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const autoP = calculatePerimeter(val);
                        handleUpdateCalculator({
                          area: val,
                          customPerimeter: autoP,
                          perimeterManual: false,
                        });
                      }}
                      className="w-full accent-teal-600 cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg"
                    />
                    <div className="flex justify-between text-[9px] text-zinc-400 mt-0.5">
                      <span>5 м²</span>
                      <span>25 м²</span>
                      <span>50 м²</span>
                      <span>100 м²</span>
                    </div>
                  </div>

                  {/* Периметр */}
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="text-zinc-600 dark:text-zinc-300 font-medium">Периметр:</span>
                      <span className="text-[10px] text-zinc-400 ml-1">
                        ({currentEstimate.perimeter <= 16 ? "полотно до 16м" : "широкое >16м"})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateCalculator({
                            customPerimeter: Math.max(6, currentEstimate.perimeter - 1),
                            perimeterManual: true,
                          })
                        }
                        className="w-5 h-5 flex items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="font-bold text-xs font-mono w-7 text-center">
                        {currentEstimate.perimeter}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateCalculator({
                            customPerimeter: currentEstimate.perimeter + 1,
                            perimeterManual: true,
                          })
                        }
                        className="w-5 h-5 flex items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                      >
                        <Plus size={11} />
                      </button>
                      <span className="text-zinc-400 text-[10px]">пог.м</span>
                    </div>
                  </div>

                  {/* Выбор профиля */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Тип профиля по периметру:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      {[
                        { id: "shadow_metal", label: "Теневой EuroKraab", price: "1100–1500 ₽/м" },
                        { id: "shadow_plastic", label: "Теневой ПВХ", price: "800–1100 ₽/м" },
                        { id: "shadow_fake", label: "Имитация теневого", price: "500–700 ₽/м" },
                        { id: "classic", label: "Классический (лента)", price: "300–500 ₽/м" },
                        { id: "floating_single", label: "Парящий LED", price: "700–1000 ₽/м" },
                        { id: "floating_rgb", label: "Парящий RGB", price: "900–1500 ₽/м" },
                      ].map((p) => {
                        const isSel = calcParams.profileKey === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              handleUpdateCalculator({ profileKey: p.id as ProfileKey })
                            }
                            className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                              isSel
                                ? "bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-800 dark:text-teal-200 font-semibold shadow-2xs"
                                : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <div className="font-semibold truncate">{p.label}</div>
                            <div className="text-[9px] text-zinc-400">{p.price}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Счетчик углов */}
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                        Количество углов в комнате:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateCalculator({ angles: Math.max(4, calcParams.angles - 1) })
                          }
                          disabled={calcParams.angles <= 4}
                          className="w-6 h-6 flex items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-200 disabled:opacity-40 cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="font-bold text-xs font-mono w-6 text-center">
                          {calcParams.angles}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateCalculator({ angles: Math.min(30, calcParams.angles + 1) })
                          }
                          className="w-6 h-6 flex items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="text-[9px] text-zinc-400 leading-tight">
                      {calcParams.profileKey === "classic" ||
                      calcParams.profileKey === "contour" ||
                      calcParams.profileKey === "shadow_fake"
                        ? "4 базовых угла бесплатно, свыше 4-х — 330–400 ₽/шт"
                        : calcParams.profileKey === "floating_single" ||
                          calcParams.profileKey === "floating_rgb"
                        ? "Все углы парящего профиля рассчитываются по 400–550 ₽/шт"
                        : "Теневые углы: внутренние 400–500 ₽, внешние 800–900 ₽/шт"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 💡 БЛОК 2: ОСВЕЩЕНИЕ (Свернут / открывается по клику) */}
            <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setOpenLights(!openLights)}
                className="w-full flex items-center justify-between p-2.5 text-left font-bold text-xs text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">💡</span>
                  <span>Освещение и треки</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
                  <span>
                    {totalLightCount} шт
                    {totalLightLines > 0 ? ` · ${totalLightLines}м` : ""}
                  </span>
                  {openLights ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {openLights && (
                <div className="p-3 pt-1 border-t border-zinc-200/80 dark:border-zinc-800 space-y-2">
                  {[
                    { key: "gx53", label: "Точечные светильники GX53", price: "400–550 ₽/шт", unit: "шт", step: 1 },
                    { key: "spot", label: "Накладные споты-стаканчики", price: "550–650 ₽/шт", unit: "шт", step: 1 },
                    { key: "embedded", label: "Встраиваемые светильники", price: "550–1150 ₽/шт", unit: "шт", step: 1 },
                    { key: "chandelier", label: "Люстра (установка)", price: "800–2500 ₽/шт", unit: "шт", step: 1 },
                    { key: "light_line", label: "Световые линии", price: "3000–4500 ₽/м", unit: "пог.м", step: 0.5 },
                    { key: "track_overlay", label: "Накладной трек", price: "600–1500 ₽/м", unit: "пог.м", step: 0.5 },
                    { key: "track_embedded", label: "Встроенный трек", price: "2500–3200 ₽/м", unit: "пог.м", step: 0.5 },
                    { key: "track_magnetic", label: "Магнитный трек премиум", price: "4500–6500 ₽/м", unit: "пог.м", step: 0.5 },
                  ].map((item) => {
                    const val = (calcParams.lights as any)[item.key] || 0;
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/60 text-[11px]"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                            {item.label}
                          </div>
                          <div className="text-[9px] text-zinc-400">{item.price}</div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateCalculator({
                                lights: {
                                  ...calcParams.lights,
                                  [item.key]: Math.max(0, val - item.step),
                                },
                              })
                            }
                            className="w-5 h-5 flex items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                          >
                            <Minus size={11} />
                          </button>

                          <span className="w-8 text-center font-bold font-mono text-xs">
                            {val}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateCalculator({
                                lights: {
                                  ...calcParams.lights,
                                  [item.key]: val + item.step,
                                },
                              })
                            }
                            className="w-5 h-5 flex items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 🪟 БЛОК 3: КАРНИЗЫ И ШТОРЫ (Свернут / открывается по клику) */}
            <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setOpenCornices(!openCornices)}
                className="w-full flex items-center justify-between p-2.5 text-left font-bold text-xs text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🪟</span>
                  <span>Карнизы и шторы</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
                  <span>
                    {calcParams.corniceType === "none"
                      ? "Без карниза"
                      : `${calcParams.corniceLength} пог.м`}
                  </span>
                  {openCornices ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {openCornices && (
                <div className="p-3 pt-1 border-t border-zinc-200/80 dark:border-zinc-800 space-y-2.5">
                  {/* Выбор типа карниза */}
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    {[
                      { id: "none", label: "Без карниза", price: "0 ₽" },
                      { id: "hidden", label: "Скрытый ПК-5", price: "1500–4500 ₽/м" },
                      { id: "niche", label: "Ниша с перегибом", price: "1500–3500 ₽/м" },
                      { id: "overlay_plastic", label: "Накладной пластик", price: "300–900 ₽/м" },
                      { id: "single_row", label: "Однорядный", price: "800–3000 ₽/м" },
                    ].map((c) => {
                      const isSel = calcParams.corniceType === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            handleUpdateCalculator({ corniceType: c.id as CorniceKey })
                          }
                          className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                            isSel
                              ? "bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-800 dark:text-teal-200 font-semibold shadow-2xs"
                              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <div className="font-semibold truncate">{c.label}</div>
                          <div className="text-[9px] text-zinc-400">{c.price}</div>
                        </button>
                      );
                    })}
                  </div>

                  {calcParams.corniceType !== "none" && (
                    <div className="space-y-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                      {/* Длина */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          Длина карниза:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateCalculator({
                                corniceLength: Math.max(1, calcParams.corniceLength - 0.5),
                              })
                            }
                            className="w-5 h-5 flex items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="font-bold font-mono text-xs w-8 text-center">
                            {calcParams.corniceLength}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateCalculator({
                                corniceLength: calcParams.corniceLength + 0.5,
                              })
                            }
                            className="w-5 h-5 flex items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                          >
                            <Plus size={11} />
                          </button>
                          <span className="text-[10px] text-zinc-400">м</span>
                        </div>
                      </div>

                      {/* Галочка LED */}
                      {calcParams.corniceType !== "overlay_plastic" && (
                        <label className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                          <span className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200">
                            Со скрытой LED-подсветкой (+400–700 ₽/м)
                          </span>
                          <input
                            type="checkbox"
                            checked={calcParams.corniceLed}
                            onChange={(e) =>
                              handleUpdateCalculator({ corniceLed: e.target.checked })
                            }
                            className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 🎁 БЛОК 4: СКИДКИ (Компактные чипы в 1 ряд) */}
            <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <span>🎁</span>
                  <span>Скидка клиента (−10%)</span>
                </span>
                <span className="text-[9px] text-zinc-400">не суммируются</span>
              </div>

              <div className="grid grid-cols-3 gap-1 text-[10px]">
                {[
                  { key: "novosel", label: "Новосёл −10%" },
                  { key: "pensioner", label: "Пенсионер −10%" },
                  { key: "multikids", label: "Многодетные −10%" },
                ].map((d) => {
                  const isChecked = (calcParams.discounts as any)[d.key];
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() =>
                        handleUpdateCalculator({
                          discounts: {
                            ...calcParams.discounts,
                            [d.key]: !isChecked,
                          },
                        })
                      }
                      className={`py-1 px-1 rounded-md text-center font-semibold transition-colors cursor-pointer border ${
                        isChecked
                          ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs"
                          : "bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 📊 БЛОК 5: ДЕТАЛИЗАЦИЯ СМЕТЫ */}
            <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setOpenBreakdown(!openBreakdown)}
                className="w-full flex items-center justify-between p-2.5 text-left font-bold text-xs text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">📊</span>
                  <span>Детализация сметы</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
                  <span>{currentEstimate.breakdown.length} позиций</span>
                  {openBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {openBreakdown && (
                <div className="p-3 pt-1 border-t border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
                  <div className="space-y-1 text-[11px]">
                    {currentEstimate.breakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-zinc-600 dark:text-zinc-300 py-1 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0"
                      >
                        <span className="truncate pr-2 font-medium">{item.label}</span>
                        <span className="font-mono text-zinc-900 dark:text-zinc-100 shrink-0 font-semibold">
                          {item.min_total.toLocaleString("ru-RU")} –{" "}
                          {item.max_total.toLocaleString("ru-RU")} ₽
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Итоговая строка */}
                  <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    <span>ИТОГО ВИЛКА:</span>
                    <span className="font-mono text-teal-600 dark:text-teal-400">
                      {currentEstimate.estimateMin.toLocaleString("ru-RU")} –{" "}
                      {currentEstimate.estimateMax.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>

                  {/* Кнопка экспорта сметы в Word (.docx) */}
                  <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        downloadEstimateDocx({
                          clientName: contact.name,
                          clientPhone: contact.phone,
                          clientCity: contact.city,
                          clientChannel: contact.primary_channel,
                          dateStr: new Date().toLocaleDateString("ru-RU"),
                          masterName: "Александр",
                          masterPhone: "+7 (914) 809-23-45",
                          breakdown: currentEstimate.breakdown,
                          estimateMin: currentEstimate.estimateMin,
                          estimateMax: currentEstimate.estimateMax,
                          rawMin: currentEstimate.rawMin,
                          rawMax: currentEstimate.rawMax,
                          discountPercent: currentEstimate.appliedDiscountPercent,
                        });
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <FileDown size={14} className="text-teal-100" />
                      <span>📄 Скачать смету (.docx)</span>
                    </button>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center mt-1">
                      Фирменный бланк с печатью мастера и гарантией 3–10 лет
                    </p>
                  </div>

                  <div className="mt-2 p-2 rounded-lg bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-900/60 text-[10px] text-teal-900 dark:text-teal-200 leading-tight flex items-start gap-1.5">
                    <Info size={12} className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                    <span>
                      Клиенту озвучивается вилка цен с приглашением на бесплатный замер с каталогами
                      образцов профилей и светильников.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. CRM: ДАТА И СТАТУС ЗАМЕРА */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Calendar size={13} className="text-teal-600 dark:text-teal-400" />
                  Дата и статус замера
                </span>
                {lead.status === "measurement_planned" && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                    Замер назначен
                  </span>
                )}
              </div>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lead.status === "measurement_planned"}
                  onChange={(e) =>
                    onUpdateLead({
                      status: e.target.checked ? "measurement_planned" : "qualifying",
                    })
                  }
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                  Бесплатный замер назначен
                </span>
              </label>

              <div>
                <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">
                  Желаемая дата / время:
                </label>
                <input
                  type="text"
                  value={lead.desired_date || ""}
                  onChange={(e) => onUpdateLead({ desired_date: e.target.value })}
                  placeholder="Например: завтра в 18:00 или суббота"
                  className="w-full px-2.5 py-1 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* 4. FOLLOW-UP */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-2">
              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Bell size={13} className="text-teal-600 dark:text-teal-400" />
                Контроль и напоминания (Follow-up)
              </span>

              <input
                type="datetime-local"
                value={lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 16) : ""}
                onChange={(e) => onUpdateLead({ next_follow_up_at: e.target.value })}
                className="w-full px-2.5 py-1 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-teal-500"
              />

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-400">Быстро:</span>
                <button
                  type="button"
                  onClick={() => handleSetQuickFollowUp(1)}
                  className="px-2 py-0.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded text-[10px] font-medium cursor-pointer"
                >
                  +1 день
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickFollowUp(3)}
                  className="px-2 py-0.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded text-[10px] font-medium cursor-pointer"
                >
                  +3 дня
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickFollowUp(7)}
                  className="px-2 py-0.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded text-[10px] font-medium cursor-pointer"
                >
                  +1 неделя
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: ИНФО & БАЗА ЗНАНИЙ ==================== */}
        {activeTab === "info" && (
          <div className="space-y-3">
            {/* 1. Адрес и слияние контактов */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-2">
              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <MapPin size={13} className="text-teal-600 dark:text-teal-400" />
                Адрес объекта и контакты
              </span>

              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Адрес объекта / район:</label>
                <input
                  type="text"
                  value={lead.address || ""}
                  onChange={(e) => onUpdateLead({ address: e.target.value })}
                  placeholder="Например: ул. Ленина 42, ЖК Солнечный"
                  className="w-full px-2.5 py-1 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Город:</label>
                  <input
                    type="text"
                    value={contact.city || "Улан-Удэ"}
                    readOnly
                    className="w-full px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-700 dark:text-zinc-300 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Основной канал:</label>
                  <input
                    type="text"
                    value={contact.primary_channel.toUpperCase()}
                    readOnly
                    className="w-full px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-700 dark:text-zinc-300 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowMergeModal(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <GitMerge size={13} className="text-teal-600 dark:text-teal-400" />
                  <span>Склеить профиль (поиск дубликатов)</span>
                </button>
              </div>
            </div>

            {/* 2. RAG Knowledge Base */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-teal-600 dark:text-teal-400" />
                  Выжимка RAG-источников (База знаний)
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                  Активно
                </span>
              </div>

              <div className="space-y-1.5">
                {Object.entries(knowledgeMap).map(([fileName, data]) => (
                  <div
                    key={fileName}
                    className="p-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
                        <span className="font-semibold text-[11px] truncate">{data.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewKnowledgeFile(fileName)}
                        className="text-[10px] text-teal-600 dark:text-teal-400 font-medium hover:underline cursor-pointer ml-1 shrink-0"
                      >
                        Просмотр
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RAG Knowledge Modal */}
      {previewKnowledgeFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <FileText size={14} className="text-teal-600" />
                <span>
                  {knowledgeMap[previewKnowledgeFile]?.title || previewKnowledgeFile}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setPreviewKnowledgeFile(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <X size={14} />
              </button>
            </div>
            <pre className="text-[11px] font-mono whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 max-h-80 overflow-y-auto leading-relaxed text-zinc-700 dark:text-zinc-300">
              {knowledgeMap[previewKnowledgeFile]?.content}
            </pre>
            <button
              type="button"
              onClick={() => setPreviewKnowledgeFile(null)}
              className="w-full py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <GitMerge size={14} className="text-teal-600" />
                <span>Объединение дубликатов</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <X size={14} />
              </button>
            </div>

            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={mergeSearch}
                onChange={(e) => setMergeSearch(e.target.value)}
                placeholder="Поиск по имени или телефону..."
                className="w-full pl-7 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1">
              {duplicateCandidates.length === 0 ? (
                <div className="text-center py-4 text-xs text-zinc-400">Дубликаты не найдены</div>
              ) : (
                duplicateCandidates.map((c) => (
                  <button
                    key={c.contact_id}
                    type="button"
                    onClick={() => setSelectedDuplicateId(c.contact_id)}
                    className={`w-full text-left p-2 rounded-lg border text-xs cursor-pointer ${
                      selectedDuplicateId === c.contact_id
                        ? "bg-teal-50 dark:bg-teal-950/60 border-teal-500 font-semibold"
                        : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <div className="font-semibold">{c.contact.name}</div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {c.contact.phone || "Без телефона"} · {c.channel.toUpperCase()}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                className="flex-1 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={!selectedDuplicateId}
                onClick={handleExecuteMerge}
                className="flex-1 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                Объединить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
