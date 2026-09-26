// DownloadedPanel.tsx — вкладка "Загруженное": слева список реально
// установленных виджетов, справа — настройки того, что выбрано слева. Это и
// есть новое место для настроек виджетов (раньше жили в модалке установки,
// см. WidgetModal.tsx и SYSTEM_WIDGET_STYLE.md, раздел 11).
import { useState } from "react";
import { Download, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { InstalledWidgetEntry, WidgetConfigValues, WidgetWithState } from "../types/widget";
import WidgetSettingsPanel from "./WidgetSettingsPanel";

interface DownloadedPanelProps {
  widgets: WidgetWithState[];
  installedEntries: Record<string, InstalledWidgetEntry>;
  configByWidget: Record<string, WidgetConfigValues>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConfigChange: (widget: WidgetWithState, key: string, value: string | number | boolean) => void;
  onLaunch: (widget: WidgetWithState) => void;
  onOpenInfo: (widget: WidgetWithState) => void;
  // Раньше высота была жёстко зашита (h-[560px]) — теперь панель растягивается
  // на всё место, которое ей выделяет App.tsx (там вкладка "Загруженное" не
  // скроллится целиком, скроллятся только список слева и настройки справа).
  className?: string;
}

export default function DownloadedPanel({
  widgets,
  installedEntries,
  configByWidget,
  selectedId,
  onSelect,
  onConfigChange,
  onLaunch,
  onOpenInfo,
  className
}: DownloadedPanelProps) {
  // Локальный поиск по списку установленных виджетов слева — только фильтрует
  // видимые кнопки в списке, на выбор справа и на настройки не влияет (искать
  // и одновременно настраивать что-то ещё — обычный сценарий, не должны мешать
  // друг другу).
  const [query, setQuery] = useState("");

  if (widgets.length === 0) {
    return (
      <p className="mt-10 text-center text-sm text-muted">
        Здесь появятся виджеты, которые ты скачал. Пока список пуст.
      </p>
    );
  }

  const selectedWidget = widgets.find((w) => w.id === selectedId) ?? widgets[0];
  const selectedEntry = selectedWidget ? installedEntries[selectedWidget.id] : undefined;
  const visibleWidgets = widgets.filter((w) => w.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className={`surface flex overflow-hidden rounded-2xl ${className ?? "h-[560px]"}`}>
      {/* Список установленных виджетов слева: сверху — маленький поиск по
          названию (не скроллится вместе со списком), снизу — сам список со
          своей прокруткой. */}
      <div className="flex w-64 flex-shrink-0 flex-col border-r border-border">
        <div className="border-b border-border p-2.5">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск среди установленных..."
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full rounded-lg border border-border bg-card2/70 py-1.5 pl-7 pr-6 text-xs text-warmwhite placeholder:text-muted outline-none transition-colors focus:border-accent-fire/50"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-warmwhite"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {visibleWidgets.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted">Ничего не найдено.</p>
          ) : (
            visibleWidgets.map((widget) => {
              const isActive = widget.id === selectedWidget?.id;
              return (
                <button
                  key={widget.id}
                  type="button"
                  onClick={() => onSelect(widget.id)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-border/60 px-4 py-3 text-left transition-colors ${
                    isActive ? "bg-accent-fire/10" : "hover:bg-white/5"
                  }`}
                >
                  <span className={`text-sm font-semibold ${isActive ? "text-accent-fire" : "text-warmwhite"}`}>
                    {widget.name}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono-ui text-[11px] text-muted">
                    {widget.status === "installing" ? (
                      <>
                        <Download size={11} />
                        Установка…
                      </>
                    ) : widget.status === "update-available" ? (
                      <>
                        <RefreshCw size={11} className="text-accent-warning" />
                        <span className="text-accent-warning">обновление доступно</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={11} className="text-accent-green" />v{widget.installedVersion}
                      </>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Настройки выбранного виджета справа */}
      <div className="flex-1 overflow-hidden">
        {selectedWidget && selectedEntry ? (
          <WidgetSettingsPanel
            widget={selectedWidget}
            entry={selectedEntry}
            configValues={configByWidget[selectedWidget.id] ?? {}}
            onConfigChange={(key, value) => onConfigChange(selectedWidget, key, value)}
            onLaunch={onLaunch}
            onOpenInfo={onOpenInfo}
          />
        ) : (
          <p className="mt-10 text-center text-sm text-muted">Выбери виджет слева.</p>
        )}
      </div>
    </div>
  );
}
