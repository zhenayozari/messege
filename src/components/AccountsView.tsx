import React from "react";
import {
  CheckCircle2,
  Code,
  Globe,
  Radio,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { ChannelConnectorStatus } from "../types";

interface AccountsViewProps {
  connectors: ChannelConnectorStatus[];
}

export const AccountsView: React.FC<AccountsViewProps> = ({ connectors }) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none overflow-y-auto p-6 space-y-6">
      {/* 1. Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Radio size={18} className="text-teal-700" />
            <span>Каналы и коннекторы (ВКонтакте, Telegram, MAX)</span>
          </h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            Управление интеграциями, Long Polling демонами и публикациями без необходимости публичных вебхуков.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600 flex items-center gap-1.5 bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200">
            <RefreshCw size={12} className="animate-spin text-teal-700" />
            <span>Long Polling активен</span>
          </span>
        </div>
      </div>

      {/* 2. Connectors Status Cards Grid */}
      <div className="grid grid-cols-2 gap-5">
        {connectors.map((c) => {
          const isConnected = c.connected;
          return (
            <div
              key={c.channel}
              className={`p-5 rounded-xl border transition-all ${
                isConnected
                  ? "bg-white border-zinc-200/90 shadow-xs"
                  : "bg-zinc-50 border-zinc-200/80"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-zinc-100 text-zinc-700">
                    {c.channel}
                  </span>
                  <h3 className="font-semibold text-sm text-zinc-900 mt-1.5">{c.name}</h3>
                </div>

                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                    isConnected
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                  />
                  <span>{isConnected ? "Подключено" : "Шаблон готов"}</span>
                </span>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed mb-4">{c.details}</p>

              <div className="space-y-1.5 pt-3 border-t border-zinc-100 text-[11px]">
                <div className="flex justify-between text-zinc-600">
                  <span>Режим приема:</span>
                  <strong className="font-medium text-zinc-900">
                    {c.polling_mode === "long_polling" ? "Long Polling (локально)" : "Ручной / API"}
                  </strong>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Heartbeat:</span>
                  <span className="text-zinc-900">{c.last_heartbeat || "Активен"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Architecture & Setup Instructions Guide */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-xs text-zinc-900 flex items-center gap-2">
          <Zap size={14} className="text-teal-700" />
          <span>Как работает работа в одно окно без вебхуков на Windows:</span>
        </h3>

        <div className="grid grid-cols-3 gap-4 text-xs text-zinc-700">
          <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-1">
            <span className="font-semibold text-zinc-900 block">1. ВКонтакте (vk.py)</span>
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Работает через <code>groups.getLongPollServer</code>. Backend непрерывно слушает новые ЛС сообщества и сразу передает в единое окно.
            </p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-1">
            <span className="font-semibold text-zinc-900 block">2. Telegram (telegram.py)</span>
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Теперь снабжен <code>getUpdates</code> Long Polling циклом! Запускается автоматически в <code>main.py</code>, забирает сообщения бота и пересылает в Hub.
            </p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-1">
            <span className="font-semibold text-zinc-900 block">3. MAX соцсеть (max.py)</span>
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Создан пустой коннектор-шаблон. Когда разработчики MAX предоставят API методы, просто заполните <code>_max_api_call</code> и токены в <code>.env</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
