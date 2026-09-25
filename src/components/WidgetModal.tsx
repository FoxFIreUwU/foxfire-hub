import { useState } from "react";
import { X, Star, Download, RefreshCw, Play, ChevronDown, ChevronUp, AlertTriangle, Ban, ImageOff, ShieldAlert } from "lucide-react";
import { open as openExternalLink } from "@tauri-apps/api/shell";
import { WidgetVersion, WidgetWithState, WidgetConfigValues } from "../types/widget";
import { sortVersionsDesc, getDefaultVersion } from "../utils/versions";
import { checkWidgetCompatibility } from "../utils/compatibility";
import { APP_VERSION } from "../appConfig";

interface WidgetModalProps {
  widget: WidgetWithState;
  screenshots: string[];
  configValues: WidgetConfigValues;
  onConfigChange: (key: string, value: string | number | boolean) => void;
  onClose: () => void;
  onAction: (widget: WidgetWithState, version: WidgetVersion) => void;
}

export default function WidgetModal({
  widget,
  screenshots,
  configValues,
  onConfigChange,
  onClose,
  onAction
}: WidgetModalProps) {
  const schema = widget.configSchema ?? {};
  const hasSettings = Object.keys(schema).length > 0;
  const sortedVersions = sortVersionsDesc(widget.versions);

  // Какая версия выбрана прямо сейчас в модалке — по умолчанию самая новая stable.
  const [selectedVersion, setSelectedVersion] = useState<WidgetVersion>(getDefaultVersion(widget.versions));
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const alreadyInstalledThisVersion =
    widget.status === "installed" && widget.installedVersion === selectedVersion.version;

  // Проверка совместимости выбранной версии виджета с текущей версией FoxFire Hub
  // (см. SYSTEM_WIDGET_STYLE.md, раздел 10). Уже установленную версию блокировать
  // не нужно — пользователь должен иметь возможность её запустить в любом случае.
  const compatibility = checkWidgetCompatibility(widget, selectedVersion, APP_VERSION);
  const isBlockedByAppVersion = !alreadyInstalledThisVersion && !compatibility.isCompatible;

  const isInstallDisabled =
    widget.status === "installing" ||
    isBlockedByAppVersion ||
    (selectedVersion.status === "unavailable" && !alreadyInstalledThisVersion);

  function actionButtonLabel(): string {
    if (widget.status === "installing") return "Установка...";
    if (alreadyInstalledThisVersion) return "Запустить";
    if (isBlockedByAppVersion) return "Обнови FoxFire Hub";
    return "Установить эту версию";
  }

  function renderActionIcon() {
    if (widget.status === "installing") return <Download size={16} />;
    if (alreadyInstalledThisVersion) return <Play size={16} />;
    if (isBlockedByAppVersion) return <ShieldAlert size={16} />;
    if (widget.status === "installed") return <RefreshCw size={16} />;
    return <Download size={16} />;
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="surface max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрытия поверх всей модалки */}
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-black/60 text-white backdrop-blur-md hover:bg-black/80"
          >
            <X size={16} />
          </button>

          {/* Галерея скриншотов (Задание 2). Источник — screenshots/ виджета на GitHub,
              пока это моковые ссылки, переданные пропом сверху. */}
          {screenshots.length > 0 ? (
            <div className="w-full">
              <button
                type="button"
                onClick={() => setLightboxImage(screenshots[0])}
                className="block h-44 w-full overflow-hidden bg-black/30"
              >
                <img src={screenshots[0]} alt={widget.name} className="h-full w-full object-cover" />
              </button>

              {screenshots.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto border-b border-border bg-black/20 p-2">
                  {screenshots.map((src, index) => (
                    <button
                      key={src + index}
                      type="button"
                      onClick={() => setLightboxImage(src)}
                      className="h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-border hover:border-accent-fire/60"
                    >
                      <img src={src} alt={`${widget.name} — скриншот ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-32 w-full items-center justify-center gap-2 bg-gradient-to-br from-accent-fire/20 via-accent-purple/10 to-card text-sm text-muted">
              <ImageOff size={18} />
              Нет скриншотов
            </div>
          )}

          <div className="pill absolute left-4 bottom-3 border-accent-green/30 bg-black/50 text-accent-green">
            <Star size={12} className="fill-accent-green text-accent-green" />
            {widget.rating}
          </div>
        </div>

        <div className="p-5">
          <h2 className="scanline-text text-xl font-extrabold tracking-tight text-warmwhite">{widget.name}</h2>
          <p className="mb-1 font-mono-ui text-xs text-muted">
            от{" "}
            {widget.author.url ? (
              <button
                type="button"
                onClick={() => openExternalLink(widget.author.url as string).catch(() => {})}
                className="text-accent-fire hover:underline"
              >
                {widget.author.name}
              </button>
            ) : (
              <span>{widget.author.name}</span>
            )}
          </p>

          <div className="my-3 flex flex-wrap gap-1.5">
            {widget.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-accent-blue/30 bg-accent-blue/15 px-2 py-0.5 text-[10px] font-medium text-accent-blue"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Короткое описание — всегда видно. Полное — по кнопке (Задание 2). */}
          <p className="mb-1 text-sm text-warmwhite/80">{widget.shortDescription}</p>
          {descriptionExpanded && (
            <p className="mb-1 whitespace-pre-line text-sm text-muted">{widget.fullDescription}</p>
          )}
          {widget.fullDescription && (
            <button
              type="button"
              onClick={() => setDescriptionExpanded((prev) => !prev)}
              className="mb-4 mt-1 flex items-center gap-1 text-xs font-semibold text-accent-fire hover:text-accent-firedark"
            >
              {descriptionExpanded ? (
                <>
                  Свернуть <ChevronUp size={14} />
                </>
              ) : (
                <>
                  Показать полностью <ChevronDown size={14} />
                </>
              )}
            </button>
          )}

          {/* Выбор версии + статус (Задание 3) */}
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-warmwhite">Версия</h3>
            <div className="flex flex-wrap gap-1.5">
              {sortedVersions.map((v) => {
                const isSelected = v.version === selectedVersion.version;
                const isInstalledHere = widget.status === "installed" && widget.installedVersion === v.version;
                return (
                  <button
                    key={v.version}
                    type="button"
                    onClick={() => setSelectedVersion(v)}
                    className={`font-mono-ui rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isSelected
                        ? "border-accent-fire bg-accent-fire/15 text-accent-fire shadow-glow-sm"
                        : "border-border bg-black/20 text-muted hover:text-warmwhite"
                    }`}
                  >
                    v{v.version}
                    {isInstalledHere && " · установлена"}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 font-mono-ui text-[11px] text-muted">Дата выхода: {selectedVersion.releaseDate}</p>

            {selectedVersion.status === "warning" && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-accent-warning/40 bg-accent-warning/10 p-3 text-xs text-accent-warning">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{selectedVersion.statusMessage || "Эта версия может работать нестабильно."}</span>
              </div>
            )}

            {selectedVersion.status === "unavailable" && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-accent-danger/40 bg-accent-danger/10 p-3 text-xs text-accent-danger">
                <Ban size={16} className="mt-0.5 flex-shrink-0" />
                <span>{selectedVersion.statusMessage || "Эта версия временно недоступна для установки."}</span>
              </div>
            )}

            {isBlockedByAppVersion && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-accent-warning/40 bg-accent-warning/10 p-3 text-xs text-accent-warning">
                <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
                <span>{compatibility.reason}</span>
              </div>
            )}
          </div>

          {hasSettings && (
            <div className="mb-4 rounded-xl border border-border bg-black/20 p-4">
              <h3 className="mb-3 text-sm font-semibold text-warmwhite">Настройки</h3>
              <div className="flex flex-col gap-3">
                {Object.entries(schema).map(([key, field]) => {
                  const value = configValues[key] ?? field.default;
                  return (
                    <label key={key} className="flex items-center justify-between gap-3 text-sm text-warmwhite/80">
                      <span>{field.label}</span>

                      {field.type === "color" && (
                        <input
                          type="color"
                          value={String(value)}
                          onChange={(e) => onConfigChange(key, e.target.value)}
                          className="h-8 w-12 cursor-pointer rounded-md border border-border bg-transparent"
                        />
                      )}

                      {field.type === "number" && (
                        <input
                          type="number"
                          value={Number(value)}
                          onChange={(e) => onConfigChange(key, Number(e.target.value))}
                          className="w-24 rounded-md border border-border bg-card px-2 py-1 text-right text-warmwhite outline-none focus:border-accent-fire/50"
                        />
                      )}

                      {field.type === "text" && (
                        <input
                          type="text"
                          value={String(value)}
                          onChange={(e) => onConfigChange(key, e.target.value)}
                          className="w-40 rounded-md border border-border bg-card px-2 py-1 text-warmwhite outline-none focus:border-accent-fire/50"
                        />
                      )}

                      {field.type === "boolean" && (
                        <button
                          onClick={() => onConfigChange(key, !value)}
                          className={`h-6 w-11 rounded-full transition-colors ${
                            value ? "bg-accent-fire" : "bg-white/10"
                          }`}
                        >
                          <span
                            className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${
                              value ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      )}

                      {field.type === "select" && field.options && (
                        <select
                          value={String(value)}
                          onChange={(e) => onConfigChange(key, e.target.value)}
                          className="rounded-md border border-border bg-card px-2 py-1 text-warmwhite outline-none focus:border-accent-fire/50"
                        >
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => onAction(widget, selectedVersion)}
            disabled={isInstallDisabled}
            className="scanline glow-accent flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-accent-firedark py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-fire disabled:cursor-not-allowed disabled:opacity-60"
          >
            {renderActionIcon()}
            {actionButtonLabel()}
          </button>
        </div>
      </div>

      {/* Увеличенный просмотр скриншота */}
      {lightboxImage && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 p-6"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxImage(null);
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxImage(null);
            }}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X size={18} />
          </button>
          <img src={lightboxImage} alt={widget.name} className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
