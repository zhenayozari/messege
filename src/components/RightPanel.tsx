import React, { useState } from "react";
import {
  AlertCircle,
  Bell,
  BookOpen,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Flame,
  Folder,
  GitMerge,
  Info,
  MapPin,
  Phone,
  Plus,
  Save,
  Search,
  Sliders,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Conversation, LeadCalculation, LeadStatus, LeadTemperature, Project } from "../types";

const PROJECT_KNOWLEDGE_EXCERPTS: Record<string, Record<string, { title: string; content: string }>> = {
  ceilings: {
    "pricing.md": {
      title: "Прайс-лист и расценки ФЕНИКС PRO",
      content:
        "• Полотно матовое MSD Premium: 850 - 1 100 ₽/м² (с работой)\n• Теневой зазор EuroKRAAB: 950 - 1 200 ₽/пог.м\n• Парящий потолок с подсветкой: 850 - 1 050 ₽/пог.м\n• Скрытая ниша ПК-5 под карниз с LED: 1 800 - 2 400 ₽/пог.м\n• Монтаж спота: 550 ₽/точка\n• Скидка новоселам: -10% по выписке ЕГРН.",
    },
    "calculator.md": {
      title: "Формула расчета и вилка цен",
      content:
        "Формула: (Площадь * 900) + (Периметр * Профиль) + Светильники + Карниз.\nНикогда не называть одну фиксированную цифру без выезда замерщика: всегда указывать вилку ±10-15% и мягко звать на бесплатный замер.",
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

interface RightPanelProps {
  activeProject: Project;
  conversation: Conversation | null;
  allConversations?: Conversation[];
  onUpdateLead: (updates: Partial<Conversation["lead"]>) => void;
  onUpdateCalculation: (calc: Partial<LeadCalculation>) => void;
  onMergeContacts?: (mainContactId: string, duplicateContactId: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  activeProject,
  conversation,
  allConversations = [],
  onUpdateLead,
  onUpdateCalculation,
  onMergeContacts,
}) => {
  const [activeTab, setActiveTab] = useState<"lead" | "calc" | "ai_context">("lead");
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSearch, setMergeSearch] = useState("");
  const [selectedDuplicateId, setSelectedDuplicateId] = useState<string | null>(null);
  const [mergeSuccessToast, setMergeSuccessToast] = useState<string | null>(null);
  const [previewKnowledgeFile, setPreviewKnowledgeFile] = useState<string | null>(null);

  if (!conversation || !conversation.lead) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-zinc-600 text-xs bg-zinc-50/50">
        <Info size={20} className="text-zinc-600 mb-2 stroke-[1.5]" />
        <p className="text-center font-medium">Нет активного лида</p>
        <p className="text-[11px] text-zinc-600 text-center mt-1">
          Выберите диалог, чтобы редактировать параметры лида, рассчитать стоимость и посмотреть контекст ИИ.
        </p>
      </div>
    );
  }

  const lead = conversation.lead;
  const calc = conversation.calculation;
  const contact = conversation.contact;

  // Other contacts for merge candidates
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
    setMergeSuccessToast(`Профиль «${selectedDuplicate?.contact.name}» успешно объединен с «${contact.name}»!`);
    setShowMergeModal(false);
    setSelectedDuplicateId(null);
    setTimeout(() => setMergeSuccessToast(null), 4000);
  };

  const handleSetQuickFollowUp = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(12, 0, 0, 0);
    onUpdateLead({ next_follow_up_at: d.toISOString() });
  };

  // Handler for ceiling calculations
  const handleCalculateCeilings = (
    area: number,
    profileType: string,
    lightsCount: number,
    hasCornice: boolean,
  ) => {
    // Dynamic price calculation formula
    const basePerM2 = 900;
    const profilePerM = profileType === "shadow" ? 950 : profileType === "floating" ? 850 : 350;
    const perimeter = Math.round(Math.sqrt(area) * 4 * 10) / 10;
    const lightPrice = lightsCount * 550;
    const cornicePrice = hasCornice ? 6500 : 0;

    const subtotal = area * basePerM2 + perimeter * profilePerM + lightPrice + cornicePrice;
    const minEst = Math.max(12000, Math.round((subtotal * 0.95) / 100) * 100);
    const maxEst = Math.max(12000, Math.round((subtotal * 1.15) / 100) * 100);

    onUpdateCalculation({
      area_m2: area,
      perimeter_m: perimeter,
      profile_type: profileType,
      estimate_min: minEst,
      estimate_max: maxEst,
      breakdown: [
        {
          category: "fabric",
          label: `Полотно матовое (${area} м²)`,
          unit: "м2",
          quantity: area,
          min_total: area * 800,
          max_total: area * 1000,
        },
        {
          category: "profile",
          label: `Профиль ${profileType} (${perimeter} м)`,
          unit: "пог.м",
          quantity: perimeter,
          min_total: Math.round(perimeter * (profilePerM * 0.9)),
          max_total: Math.round(perimeter * (profilePerM * 1.1)),
        },
        ...(lightsCount > 0
          ? [
              {
                category: "lights",
                label: `Освещение (${lightsCount} шт.)`,
                unit: "шт",
                quantity: lightsCount,
                min_total: lightsCount * 500,
                max_total: lightsCount * 650,
              },
            ]
          : []),
        ...(hasCornice
          ? [
              {
                category: "cornice",
                label: "Скрытый карниз с нишей",
                unit: "шт",
                quantity: 1,
                min_total: 5500,
                max_total: 7500,
              },
            ]
          : []),
      ],
    });

    onUpdateLead({
      area_m2: area,
      lights_count: lightsCount,
      cornice: hasCornice,
      estimated_price: minEst,
    });
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-zinc-200 select-none text-xs text-zinc-800 overflow-hidden">
      {/* 1. Header Tabs */}
      <div className="flex items-center border-b border-zinc-200 bg-zinc-50/70 p-1.5 gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("lead")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-colors ${
            activeTab === "lead"
              ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/80"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <User size={13} className={activeTab === "lead" ? "text-teal-700" : ""} />
          <span>Детали лида</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("calc")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-colors ${
            activeTab === "calc"
              ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/80"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <Calculator size={13} className={activeTab === "calc" ? "text-teal-700" : ""} />
          <span>Расчет</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ai_context")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-colors ${
            activeTab === "ai_context"
              ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/80"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <Sparkles size={13} className={activeTab === "ai_context" ? "text-teal-700" : ""} />
          <span>Контекст ИИ</span>
        </button>
      </div>

      {/* 2. Tab Content Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: ЛИД */}
        {activeTab === "lead" && (
          <div className="space-y-4">
            {/* Contact Card & Merge Duplicates Button */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-xs">
                    {contact.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-zinc-900 leading-tight">
                      {contact.name}
                    </h3>
                    <span className="text-[10px] text-zinc-600">
                      Канал: <strong className="uppercase">{contact.primary_channel}</strong>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMergeModal(true)}
                  className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 bg-white hover:bg-zinc-100 text-zinc-700 rounded-md border border-zinc-300 transition-colors shadow-2xs"
                  title="Найти и объединить дубликат профиля в CRM"
                >
                  <GitMerge size={12} className="text-teal-700" />
                  <span>Склеить профиль</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-zinc-200/80">
                <div>
                  <span className="text-zinc-600 block text-[10px]">Телефон</span>
                  <span className="font-medium text-zinc-900">
                    {contact.phone || "Не указан"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-600 block text-[10px]">Город</span>
                  <span className="font-medium text-zinc-900">
                    {contact.city || "Улан-Удэ"}
                  </span>
                </div>
              </div>
            </div>

            {mergeSuccessToast && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg p-2.5 text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>{mergeSuccessToast}</span>
              </div>
            )}

            {/* Блок «Источники ответа» (Прозрачность RAG в карточке лида) */}
            {conversation.pending_suggestion?.rag_sources && (
              <div className="bg-gradient-to-r from-teal-50/80 to-emerald-50/80 border border-teal-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-teal-900 flex items-center gap-1.5 text-xs">
                    <BookOpen size={13} className="text-teal-700" />
                    <span>Источники ответа ИИ</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("ai_context")}
                    className="text-[10px] text-teal-700 hover:text-teal-950 font-medium"
                  >
                    Вся база →
                  </button>
                </div>
                <p className="text-[11px] text-zinc-600">
                  Черновик ответа сформирован на основе документов проекта ({activeProject.knowledge_dir}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {conversation.pending_suggestion.rag_sources.map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => {
                        setPreviewKnowledgeFile(src);
                        setActiveTab("ai_context");
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-teal-300 text-teal-900 text-[11px] font-medium shadow-2xs hover:bg-teal-50 transition-colors"
                      title="Нажмите, чтобы просмотреть выдержку"
                    >
                      <FileText size={11} className="text-teal-600" />
                      <span>{src}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up & Reminders Planning */}
            <div className="bg-white border border-teal-200/70 rounded-xl p-3 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900 flex items-center gap-1.5 text-xs">
                  <Bell size={13} className="text-teal-700" />
                  <span>Напоминания и Follow-up</span>
                </span>
                {lead.next_follow_up_at && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    Запланировано
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 mb-1 flex items-center gap-1">
                  <Clock size={12} />
                  <span>Следующий контакт (напоминание клиенту)</span>
                </label>
                <input
                  type="datetime-local"
                  value={
                    lead.next_follow_up_at
                      ? lead.next_follow_up_at.slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    onUpdateLead({
                      next_follow_up_at: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    })
                  }
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              {/* Quick Pills for +1, +3, +7 days */}
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-zinc-600 mr-1">Быстро:</span>
                <button
                  type="button"
                  onClick={() => handleSetQuickFollowUp(1)}
                  className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium transition-colors"
                >
                  +1 день
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickFollowUp(3)}
                  className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium transition-colors"
                >
                  +3 дня
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickFollowUp(7)}
                  className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium transition-colors"
                >
                  +1 неделя
                </button>
              </div>

              <div className="pt-1.5 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-600">
                <span>Последнее авто-напоминание:</span>
                <strong className="text-zinc-700 font-medium">
                  {lead.last_notification_at
                    ? new Date(lead.last_notification_at).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Не отправлялось"}
                </strong>
              </div>
            </div>

            {/* Status & Temperature */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900">Квалификация</span>
                <span className="text-[11px] font-mono text-zinc-600">ID: {lead.id.slice(0, 6)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">Статус лида</label>
                  <select
                    value={lead.status}
                    onChange={(e) => onUpdateLead({ status: e.target.value as LeadStatus })}
                    className="w-full text-xs bg-white border border-zinc-300 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  >
                    <option value="new">Новый</option>
                    <option value="qualifying">Квалификация</option>
                    <option value="waiting_client">Ждём клиента</option>
                    <option value="measurement_planned">Замер назначен</option>
                    <option value="won">Продажа</option>
                    <option value="lost">Отказ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">Температура</label>
                  <select
                    value={lead.temperature}
                    onChange={(e) => onUpdateLead({ temperature: e.target.value as LeadTemperature })}
                    className="w-full text-xs bg-white border border-zinc-300 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  >
                    <option value="hot">🔥 Горячий</option>
                    <option value="warm">⚡ Тёплый</option>
                    <option value="cold">❄️ Холодный</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-zinc-200/80 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lead.measurement_planned}
                    onChange={(e) => onUpdateLead({ measurement_planned: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-700 focus:ring-teal-600"
                  />
                  <span className="font-medium text-zinc-800">Бесплатный замер назначен</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lead.phone_received}
                    onChange={(e) => onUpdateLead({ phone_received: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-700 focus:ring-teal-600"
                  />
                  <span className="font-medium text-zinc-800">Контактный телефон получен</span>
                </label>
              </div>
            </div>

            {/* Address & Desired Date */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 mb-1 flex items-center gap-1">
                  <MapPin size={12} />
                  <span>Адрес объекта / район</span>
                </label>
                <input
                  type="text"
                  value={lead.address || ""}
                  placeholder="Например: ул. Бабушкина, 42 или 105 квартал"
                  onChange={(e) => onUpdateLead({ address: e.target.value })}
                  className="w-full text-xs bg-white border border-zinc-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 mb-1 flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Желаемый срок / дата замера</span>
                </label>
                <input
                  type="text"
                  value={lead.desired_date || ""}
                  placeholder="Например: суббота с 14:00 до 16:00"
                  onChange={(e) => onUpdateLead({ desired_date: e.target.value })}
                  className="w-full text-xs bg-white border border-zinc-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            {/* Niche-specific or custom parameters preview */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-zinc-900">
                  Параметры ({activeProject.niche_type === "ceilings" ? "Потолки" : activeProject.niche_type === "kitchens" ? "Кухни" : "Окна"})
                </span>
                <span className="text-[10px] text-teal-700 font-medium">Синхронизировано с AI</span>
              </div>

              {activeProject.niche_type === "ceilings" ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded border border-zinc-200">
                    <span className="text-[10px] text-zinc-600 block">Площадь</span>
                    <span className="font-bold text-zinc-900">
                      {lead.area_m2 ? `${lead.area_m2} м²` : "Не указана"}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded border border-zinc-200">
                    <span className="text-[10px] text-zinc-600 block">Светильников</span>
                    <span className="font-bold text-zinc-900">
                      {lead.lights_count ? `${lead.lights_count} шт.` : "Не указано"}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded border border-zinc-200">
                    <span className="text-[10px] text-zinc-600 block">Карниз</span>
                    <span className="font-bold text-zinc-900">
                      {lead.cornice ? "Да, скрытый/ниша" : "Без карниза"}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded border border-zinc-200">
                    <span className="text-[10px] text-zinc-600 block">Ориентир цены</span>
                    <span className="font-bold text-teal-800">
                      {lead.estimated_price ? `${lead.estimated_price.toLocaleString("ru-RU")} ₽` : "В расчете"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs space-y-1.5">
                  <div className="p-2 bg-white rounded border border-zinc-200">
                    <span className="text-[10px] text-zinc-600 block">Предварительная смета</span>
                    <span className="font-bold text-teal-800 text-sm">
                      {lead.estimated_price ? `${lead.estimated_price.toLocaleString("ru-RU")} руб.` : "Уточняется"}
                    </span>
                  </div>
                  {lead.custom_fields && (
                    <div className="p-2 bg-white rounded border border-zinc-200 font-mono text-[11px] text-zinc-600">
                      {JSON.stringify(lead.custom_fields, null, 2)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: РАСЧЕТ СТОИМОСТИ (КАЛЬКУЛЯТОР) */}
        {activeTab === "calc" && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-900">
                Калькулятор предварительной сметы
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                {activeProject.name}
              </span>
            </div>

            {activeProject.niche_type === "ceilings" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1">Площадь, м²</label>
                    <input
                      type="number"
                      value={calc?.area_m2 || lead.area_m2 || 18}
                      onChange={(e) =>
                        handleCalculateCeilings(
                          parseFloat(e.target.value) || 0,
                          calc?.profile_type || "shadow",
                          calc?.lights?.spot || lead.lights_count || 6,
                          calc?.cornices?.cornice_1 ? true : lead.cornice || false,
                        )
                      }
                      className="w-full text-xs bg-white border border-zinc-300 rounded-lg p-2 focus:ring-1 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1">Периметр, пог.м</label>
                    <input
                      type="number"
                      readOnly
                      value={calc?.perimeter_m || 17.5}
                      className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-zinc-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">Тип профиля / примыкания</label>
                  <select
                    value={calc?.profile_type || "shadow"}
                    onChange={(e) =>
                      handleCalculateCeilings(
                        calc?.area_m2 || lead.area_m2 || 18,
                        e.target.value,
                        calc?.lights?.spot || lead.lights_count || 6,
                        calc?.cornices?.cornice_1 ? true : lead.cornice || false,
                      )
                    }
                    className="w-full text-xs bg-white border border-zinc-300 rounded-lg p-2 focus:ring-1 focus:ring-teal-600"
                  >
                    <option value="classic">Классический с маскировочной вставкой</option>
                    <option value="shadow">Теневой зазор EuroKRAAB (без заглушек)</option>
                    <option value="floating">Парящий потолок (подсветка периметра)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1">Споты / светильники</label>
                    <input
                      type="number"
                      value={calc?.lights?.spot ?? lead.lights_count ?? 6}
                      onChange={(e) =>
                        handleCalculateCeilings(
                          calc?.area_m2 || lead.area_m2 || 18,
                          calc?.profile_type || "shadow",
                          parseInt(e.target.value, 10) || 0,
                          calc?.cornices?.cornice_1 ? true : lead.cornice || false,
                        )
                      }
                      className="w-full text-xs bg-white border border-zinc-300 rounded-lg p-2 focus:ring-1 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1">Скрытый карниз</label>
                    <select
                      value={calc?.cornices?.cornice_1 ? "yes" : lead.cornice ? "yes" : "no"}
                      onChange={(e) =>
                        handleCalculateCeilings(
                          calc?.area_m2 || lead.area_m2 || 18,
                          calc?.profile_type || "shadow",
                          calc?.lights?.spot || lead.lights_count || 6,
                          e.target.value === "yes",
                        )
                      }
                      className="w-full text-xs bg-white border border-zinc-300 rounded-lg p-2 focus:ring-1 focus:ring-teal-600"
                    >
                      <option value="no">Без карниза</option>
                      <option value="yes">Скрытая ниша + LED (ПК-5)</option>
                    </select>
                  </div>
                </div>

                {/* Estimate Result Box */}
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-emerald-900">
                  <div className="text-[11px] font-medium text-emerald-800 mb-0.5">
                    Предварительная вилка (под ключ):
                  </div>
                  <div className="text-base font-bold">
                    {calc?.estimate_min ? (
                      calc.estimate_min === calc.estimate_max ? (
                        `${calc.estimate_min.toLocaleString("ru-RU")} ₽`
                      ) : (
                        `от ${calc.estimate_min.toLocaleString("ru-RU")} до ${calc.estimate_max?.toLocaleString("ru-RU")} ₽`
                      )
                    ) : (
                      "34 500 - 39 800 ₽"
                    )}
                  </div>
                  <div className="text-[10px] text-emerald-800 mt-1">
                    Точная смета фиксируется инженером на бесплатном замере.
                  </div>
                </div>

                {/* Line Item Breakdown */}
                {calc?.breakdown && calc.breakdown.length > 0 && (
                  <div className="space-y-1 text-[11px] border border-zinc-200 rounded-lg divide-y divide-zinc-100 overflow-hidden">
                    {calc.breakdown.map((item, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between bg-white">
                        <span className="text-zinc-700">{item.label}</span>
                        <span className="font-medium text-zinc-900 shrink-0">
                          {item.min_total.toLocaleString("ru-RU")} ₽
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Other Niche Calculators (e.g. Kitchens / Windows) */
              <div className="space-y-3">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-zinc-900">
                    Модульный калькулятор ниши: {activeProject.niche_type}
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    Для данного проекта подключена динамическая база цен из {activeProject.knowledge_dir}/prices.json.
                  </p>
                  <div className="p-2.5 bg-white border border-zinc-200 rounded text-xs space-y-1">
                    <div className="flex justify-between font-medium">
                      <span>Ориентир стоимости:</span>
                      <span className="text-teal-800">
                        {lead.estimated_price?.toLocaleString("ru-RU") || "175 000 - 220 000"} ₽
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: КОНТЕКСТ ИИ & БАЗА ЗНАНИЙ */}
        {activeTab === "ai_context" && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-900">Сценарии и База знаний</span>
              <span className="text-[10px] text-teal-700 font-medium">{activeProject.slug}</span>
            </div>

            {/* БЛОК: ИСТОЧНИКИ ОТВЕТА (RAG БАЗА ЗНАНИЙ) */}
            <div className="bg-white border border-teal-200/80 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-900">
                  <BookOpen size={14} className="text-teal-700" />
                  <span>Источники ответа (RAG)</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                  <Folder size={10} className="text-zinc-600" />
                  <span>{activeProject.knowledge_dir || "knowledge/ceilings/"}</span>
                </div>
              </div>

              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Документы базы знаний проекта, используемые ИИ при подготовке ответов и расчетов. Для ценовых запросов приоритетно подключаются <span className="font-mono font-semibold text-teal-800">pricing.md</span> и <span className="font-mono font-semibold text-teal-800">calculator.md</span>.
              </p>

              {/* Files in Project's knowledge_dir */}
              <div className="space-y-1.5">
                {Object.entries(
                  PROJECT_KNOWLEDGE_EXCERPTS[activeProject.niche_type] ||
                    PROJECT_KNOWLEDGE_EXCERPTS.ceilings
                ).map(([fileName, doc]) => {
                  const isUsedInCurrent =
                    conversation.pending_suggestion?.rag_sources?.includes(fileName);

                  return (
                    <div
                      key={fileName}
                      className={`p-2 rounded-lg border text-xs transition-all ${
                        isUsedInCurrent
                          ? "bg-teal-50/70 border-teal-300 shadow-2xs"
                          : "bg-zinc-50/70 border-zinc-200 hover:bg-zinc-100/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <FileText
                            size={13}
                            className={isUsedInCurrent ? "text-teal-700" : "text-zinc-500"}
                          />
                          <span className="font-mono font-semibold text-zinc-900 text-[11px]">
                            {fileName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isUsedInCurrent && (
                            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-teal-200/80 text-teal-900">
                              Использовано в ответе
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewKnowledgeFile(
                                previewKnowledgeFile === fileName ? null : fileName
                              )
                            }
                            className="text-[10px] font-medium text-teal-700 hover:text-teal-900 underline"
                          >
                            {previewKnowledgeFile === fileName ? "Скрыть" : "Посмотреть"}
                          </button>
                        </div>
                      </div>

                      <div className="text-[10px] text-zinc-500 mt-0.5">{doc.title}</div>

                      {/* Expandable Preview */}
                      {previewKnowledgeFile === fileName && (
                        <div className="mt-2 pt-2 border-t border-zinc-200/80 text-[11px] text-zinc-700 font-sans whitespace-pre-line bg-white p-2 rounded border border-zinc-200 leading-relaxed font-mono">
                          {doc.content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sales Playbook Guide */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                <BookOpen size={13} className="text-teal-600" />
                <span>Мини-сценарий продаж</span>
              </div>
              <ul className="text-[11px] text-zinc-700 space-y-1 list-disc list-inside leading-relaxed">
                <li>Отвечать дружелюбно и конкретно, без канцелярских фраз.</li>
                <li>Задавать максимум 1 уточняющий вопрос за раз.</li>
                <li>Если есть расчет — называть как предварительный ориентир.</li>
                <li>
                  <strong className="text-zinc-900">Главная цель:</strong> мягко подвести к бесплатному замеру.
                </li>
                <li>Использовать фразу «бесплатный замер», избегать «свободный замер».</li>
              </ul>
            </div>

            {/* Objections quick cheatsheet */}
            <div className="border border-zinc-200 rounded-xl p-3 space-y-2.5 bg-white">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                <Zap size={13} className="text-amber-600" />
                <span>Отработка возражений</span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="p-2 bg-zinc-50 rounded border border-zinc-200/80">
                  <span className="font-semibold text-zinc-900 block mb-0.5">«Дорого / У других дешевле»</span>
                  <p className="text-zinc-600">
                    «Понимаю! Часто низкая цена в рекламе не учитывает профиль, светильники и обход труб. Наш мастер бесплатно замерит и посчитает точную смету без сюрпризов.»
                  </p>
                </div>

                <div className="p-2 bg-zinc-50 rounded border border-zinc-200/80">
                  <span className="font-semibold text-zinc-900 block mb-0.5">«Назовите точную цену без замера»</span>
                  <p className="text-zinc-600">
                    «Мы можем назвать точную вилку по фото и размерам, но на месте важно проверить углы, проводку и стены, чтобы потом не менять стоимость.»
                  </p>
                </div>

                <div className="p-2 bg-rose-50/70 rounded border border-rose-200 text-rose-900">
                  <span className="font-semibold block mb-0.5">⚠️ Претензия или жалоба</span>
                  <p className="text-rose-700">
                    ИИ автоматически переключается в режим <strong>human_required</strong>. Менеджер берет диалог лично.
                  </p>
                </div>
              </div>
            </div>

            {/* Active System Prompt Preview */}
            <div className="border border-zinc-200 rounded-xl p-3 bg-zinc-50 space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-900 block">Промпт для {activeProject.name}</span>
              <p className="text-[11px] text-zinc-600 italic bg-white p-2 rounded border border-zinc-200/70 leading-relaxed font-mono">
                {activeProject.system_prompt}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Duplicate Contact Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <GitMerge size={18} className="text-teal-700" />
                <div>
                  <h3 className="font-bold text-sm text-zinc-900">
                    Склейка профилей и объединение дубликатов
                  </h3>
                  <p className="text-[11px] text-zinc-600">
                    CRM объединит историю сообщений, лид и данные
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMergeModal(false);
                  setSelectedDuplicateId(null);
                }}
                className="p-1 text-zinc-600 hover:text-zinc-600 hover:bg-zinc-200/60 rounded"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Target Main Contact */}
              <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl">
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block mb-1">
                  Основной профиль (сохраняется)
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-900">{contact.name}</span>
                  <span className="text-zinc-600">{contact.phone || "Без телефона"}</span>
                </div>
                <div className="text-[11px] text-teal-800 mt-1">
                  Канал: {contact.primary_channel.toUpperCase()} • Все диалоги будут прикреплены сюда.
                </div>
              </div>

              {/* Search candidate duplicates */}
              <div>
                <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                  Выберите дубликат для объединения:
                </label>
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-600" />
                  <input
                    type="text"
                    value={mergeSearch}
                    onChange={(e) => setMergeSearch(e.target.value)}
                    placeholder="Поиск по имени, телефону или городу..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100">
                  {duplicateCandidates.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-600">
                      Дубликатов по запросу не найдено.
                    </div>
                  ) : (
                    duplicateCandidates.map((cand) => {
                      const isSelected = selectedDuplicateId === cand.contact_id;
                      return (
                        <button
                          key={cand.id}
                          type="button"
                          onClick={() => setSelectedDuplicateId(cand.contact_id)}
                          className={`w-full text-left p-3 text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-teal-50/70 border-l-4 border-teal-700"
                              : "hover:bg-zinc-50"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-zinc-900 flex items-center gap-2">
                              <span>{cand.contact.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 uppercase font-mono">
                                {cand.channel}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-600 mt-0.5">
                              {cand.contact.phone || "Телефон не указан"} • {cand.contact.city || "Улан-Удэ"}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-zinc-600 block">
                              {cand.messages.length} сообщ.
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-teal-700">Выбран</span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Merge details warning/info */}
              {selectedDuplicate && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle size={15} className="text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    Профиль <strong>{selectedDuplicate.contact.name}</strong> будет объединен с <strong>{contact.name}</strong>. Все сообщения ({selectedDuplicate.messages.length}) и данные лида перейдут в карточку основного контакта. Дублирующий контакт будет удален.
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowMergeModal(false);
                  setSelectedDuplicateId(null);
                }}
                className="px-3.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-200/60 rounded-lg font-medium"
              >
                Отмена
              </button>

              <button
                type="button"
                disabled={!selectedDuplicateId}
                onClick={handleExecuteMerge}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <GitMerge size={13} />
                <span>Склеить профили</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
