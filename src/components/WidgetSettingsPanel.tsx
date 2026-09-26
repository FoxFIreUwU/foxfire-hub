// WidgetSettingsPanel.tsx — правая панель вкладки "Загруженное": настройки
// ОДНОГО выбранного установленного виджета, прямо внутри окна FoxFire Hub.
//
// Два варианта содержимого, в зависимости от того, что умеет установленная
// версия виджета (см. SYSTEM_WIDGET_STYLE.md, раздел 11):
// 1. Есть settingsEntry — показываем родную страницу настроек виджета во
//    встроенном <iframe>, никакого отдельного окна не открывается. Виджет
//    получает текущие настройки через query-параметры (как и index.html),
//    а сохраняет их обратно через window.parent.postMessage(...).
// 2. Нет settingsEntry — как и раньше, автоформа по configSchema.
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Info, Play, RefreshCw, SlidersHorizontal } from "lucide-react";
import { join } from "@tauri-apps/api/path";
import { exists } from "@tauri-apps/api/fs";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { WidgetConfigValues, WidgetWithState, InstalledWidgetEntry } from "../types/widget";
import { isEmbeddedSettingsMessage, resolveSettingsEntry } from "../utils/embeddedSettings";
import { buildWidgetQueryString } from "../utils/widgetLaunch";
import AutoSettingsForm from "./AutoSettingsForm";

interface WidgetSettingsPanelProps {
  widget: WidgetWithState;
  entry: InstalledWidgetEntry;
  configValues: WidgetConfigValues;
  onConfigChange: (key: string, value: string | number | boolean) => void;
  onLaunch: (widget: WidgetWithState) => void;
  onOpenInfo: (widget: WidgetWithState) => void;
}

export default function WidgetSettingsPanel({
  widget,
  entry,
  configValues,
  onConfigChange,
  onLaunch,
  onOpenInfo
}: WidgetSettingsPanelProps) {
  const settingsEntry = useMemo(
    () => resolveSettingsEntry(widget, widget.installedVersion),
    [widget]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="text-base font-bold text-warmwhite">{widget.name}</h2>
          <p className="font-mono-ui text-xs text-muted">
            версия {widget.installedVersion}
            {widget.status === "update-available" && (
              <span className="ml-2 text-accent-warning">доступно обновление</span>
            )}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onLaunch(widget)}
            className="scanline glow-accent flex items-center gap-1.5 rounded-lg bg-accent-firedark px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-fire"
          >
            <Play size={13} />
            Запустить
          </button>
          <button
            type="button"
            onClick={() => onOpenInfo(widget)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-warmwhite/80 hover:border-accent-fire/50 hover:text-accent-fire"
            title="Версии, обновление, удаление"
          >
            <Info size={13} />
            О виджете
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {settingsEntry ? (
          <EmbeddedSettingsFrame
            widget={widget}
            entry={entry}
            settingsFile={settingsEntry}
            configValues={configValues}
            onConfigChange={onConfigChange}
          />
        ) : Object.keys(widget.configSchema ?? {}).length > 0 ? (
          <div className="rounded-xl border border-border bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-warmwhite">
              <SlidersHorizontal size={15} className="text-accent-fire" />
              Настройки
            </div>
            <AutoSettingsForm
              schema={widget.configSchema ?? {}}
              configValues={configValues}
              onConfigChange={onConfigChange}
            />
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-muted">У этого виджета нет настроек.</p>
        )}
      </div>
    </div>
  );
}

// EmbeddedSettingsFrame — загружает html-файл настроек самого виджета в
// <iframe> (внутри окна Hub, не отдельным окном), передаёт ему текущий
// конфиг через query-параметры своего URL и слушает window "message" на
// изменения, которые виджет присылает через window.parent.postMessage(...)
// с type: "foxfirehub:settings-saved" (см. src/utils/embeddedSettings.ts).
function EmbeddedSettingsFrame({
  widget,
  entry,
  settingsFile,
  configValues,
  onConfigChange
}: {
  widget: WidgetWithState;
  entry: InstalledWidgetEntry;
  settingsFile: string;
  configValues: WidgetConfigValues;
  onConfigChange: (key: string, value: string | number | boolean) => void;
}) {
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [frameError, setFrameError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFrameSrc(null);
    setFrameError(null);

    async function resolveFrameSrc() {
      try {
        const settingsPath = await join(entry.installDir, settingsFile);
        if (!(await exists(settingsPath))) {
          if (!cancelled) {
            setFrameError(
              `Файл ${settingsFile} не найден в папке установки виджета. Попробуй переустановить виджет.`
            );
          }
          return;
        }

        const query = buildWidgetQueryString(widget.configSchema, configValues);
        const url = convertFileSrc(settingsPath) + (query ? `?${query}&embedded=1` : "?embedded=1");
        if (!cancelled) setFrameSrc(url);
      } catch (error) {
        if (!cancelled) setFrameError(`Не удалось открыть настройки: ${String(error)}`);
      }
    }

    resolveFrameSrc();
    return () => {
      cancelled = true;
    };
    // Пересобираем ссылку только при смене самого виджета/файла — текущие
    // значения настроек внутрь iframe передаются один раз при открытии,
    // дальше сама встроенная страница настроек — источник истины, а её
    // изменения прилетают обратно через postMessage (см. App.tsx).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.installDir, settingsFile, widget.id]);

  // Живое сохранение: любое сообщение foxfirehub:settings-saved от iframe
  // применяем целиком поверх текущего конфига, поле за полем.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!isEmbeddedSettingsMessage(event.data, widget.id)) return;
      Object.entries(event.data.config).forEach(([key, value]) => onConfigChange(key, value));
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [widget.id, onConfigChange]);

  if (frameError) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-accent-danger/40 bg-accent-danger/10 p-3 text-xs text-accent-danger">
        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
        {frameError}
      </div>
    );
  }

  if (!frameSrc) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted">
        <RefreshCw size={13} className="animate-spin" />
        Загрузка настроек виджета…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-black/30">
      <iframe
        key={frameSrc}
        src={frameSrc}
        title={`Настройки — ${widget.name}`}
        className="h-[520px] w-full border-0 bg-warmwhite"
      />
      <div className="flex items-center gap-1.5 border-t border-border bg-black/40 px-3 py-1.5 text-[11px] text-muted">
        <ExternalLink size={11} />
        Встроенная страница настроек виджета — сохраняется автоматически в FoxFire Hub.
      </div>
    </div>
  );
}
