import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Star, Download, RefreshCw, Play, ChevronDown, ChevronUp, AlertTriangle, Ban, ImageOff, ShieldAlert, Trash2, Check, Copy, Sliders } from "lucide-react";
import { open as openExternalLink } from "@tauri-apps/api/shell";
import { WidgetVersion, WidgetWithState } from "../types/widget";
import { sortVersionsDesc, getDefaultVersion } from "../utils/versions";
import { checkWidgetCompatibility } from "../utils/compatibility";
import { APP_VERSION } from "../appConfig";
import { useWidgetScreenshots } from "../utils/screenshots";

interface WidgetModalProps {
  widget: WidgetWithState;
  onClose: () => void;
  onAction: (widget: WidgetWithState, version: WidgetVersion) => void;
  onUninstall: (widgetId: string, keepConfig: boolean) => void;
  onCopyObsLink: (widget: WidgetWithState) => Promise<void>;
}

export default function WidgetModal({
  widget,
  onClose,
  onAction,
  onUninstall,
  onCopyObsLink
}: WidgetModalProps) {
  // Показываем выбор "удалить с сохранением настроек / полностью" только после
  // клика на "Удалить виджет" — так случайное нажатие ничего не сломает.
  const [confirmingUninstall, setConfirmingUninstall] = useState(false);
  // Обратная связь на кнопке "Скопировать ссылку для OBS" — временно меняем
  // подпись на "Скопировано!" или показываем ошибку, если файлов виджета нет на месте.
  const [obsLinkState, setObsLinkState] = useState<"idle" | "copied" | "error">("idle");
  const [obsLinkError, setObsLinkError] = useState<string | null>(null);

  async function handleCopyObsLink() {
    try {
      await onCopyObsLink(widget);
      setObsLinkError(null);
      setObsLinkState("copied");
      setTimeout(() => setObsLinkState("idle"), 2000);
    } catch (error) {
      setObsLinkState("error");
      setObsLinkError(String(error));
    }
  }
  const hasSettings = Object.keys(widget.configSchema ?? {}).length > 0;
  const sortedVersions = sortVersionsDesc(widget.versions);

  // Какая версия выбрана прямо сейчас в модалке — по умолчанию самая новая stable.
  const [selectedVersion, setSelectedVersion] = useState<WidgetVersion>(getDefaultVersion(widget.versions));
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  // Галерея: список скриншотов подгружается из screenshots/ виджета на GitHub
  // (см. utils/screenshots.ts). Обложка показывается сразу, остальное дозагружается.
  const { screenshots, loading: screenshotsLoading } = useWidgetScreenshots(
    widget.id,
    widget.previewUrl,
    widget.screenshots
  );
  const [activeShot, setActiveShot] = useState(0);
  // Индекс открытого в увеличенном просмотре скриншота (null — просмотр закрыт).
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const safeActive = Math.min(activeShot, Math.max(screenshots.length - 1, 0));

  // В просмотре: ← / → листают, Esc закрывает только просмотр, а не всю модалку.
  useEffect(() => {
    if (lightboxIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setLightboxIndex(null);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((i) => (i === null ? i : (i - 1 + screenshots.length) % screenshots.length));
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((i) => (i === null ? i : (i + 1) % screenshots.length));
      }
    }
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [lightboxIndex, screenshots.length]);

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

          {/* Галерея скриншотов. Большой кадр — выбранный скриншот (клик открывает
              его на весь экран), полоска снизу — все скриншоты, клик по миниатюре
              переключает большой кадр. */}
          {screenshots.length > 0 ? (
            <div className="w-full">
              <button
                type="button"
                onClick={() => setLightboxIndex(safeActive)}
                className="block h-44 w-full overflow-hidden bg-black/30"
              >
                <img
                  key={screenshots[safeActive]}
                  src={screenshots[safeActive]}
                  alt={widget.name}
                  className="h-full w-full object-cover"
                />
              </button>

              {(screenshots.length > 1 || screenshotsLoading) && (
                <div className="flex gap-1.5 overflow-x-auto border-b border-border bg-black/20 p-2">
                  {screenshots.map((src, index) => (
                    <button
                      key={src + index}
                      type="button"
                      onClick={() => setActiveShot(index)}
                      className={`h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg border transition-colors ${
                        index === safeActive
                          ? "border-accent-fire"
                          : "border-border opacity-70 hover:border-accent-fire/60 hover:opacity-100"
                      }`}
                    >
                      <img src={src} alt={`${widget.name} — скриншот ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                  {screenshotsLoading && (
                    <div className="h-14 w-20 flex-shrink-0 animate-pulse rounded-lg border border-border bg-white/5" />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-32 w-full items-center justify-center gap-2 bg-gradient-to-br from-accent-fire/20 via-accent-purple/10 to-card text-sm text-muted">
              <ImageOff size={18} />
              {screenshotsLoading ? "Загружаем скриншоты..." : "Нет скриншотов"}
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

          {/* Настройки виджета больше не здесь — здесь только установка/версии/удаление.
              Сами настройки теперь во вкладке "Загруженное": слева список установленных
              виджетов, справа — панель настроек выбранного (см. DownloadedPanel.tsx,
              WidgetSettingsPanel.tsx). Так раздел установки не путается с настройкой уже
              установленного виджета. */}
          {hasSettings && widget.status === "installed" && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-accent-fire/30 bg-accent-fire/10 p-3 text-xs text-warmwhite/80">
              <Sliders size={14} className="mt-0.5 flex-shrink-0 text-accent-fire" />
              <span>
                Настройки этого виджета — во вкладке <strong className="text-accent-fire">«Загруженное»</strong>:
                нажми «Настроить» на его карточке.
              </span>
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

          {/* Ссылка на index.html виджета для источника "Браузер" в OBS —
              доступна только для реально установленного виджета (Задание 1). */}
          {widget.status === "installed" && (
            <div className="mt-2">
              <button
                type="button"
                onClick={handleCopyObsLink}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-warmwhite/80 transition-colors hover:border-accent-fire/50 hover:text-accent-fire"
              >
                {obsLinkState === "copied" ? <Check size={14} /> : <Copy size={14} />}
                {obsLinkState === "copied" ? "Ссылка скопирована!" : "Скопировать ссылку для OBS"}
              </button>
              {obsLinkState === "error" && obsLinkError && (
                <p className="mt-1.5 text-[11px] text-accent-danger">{obsLinkError}</p>
              )}
            </div>
          )}

          {/* Удаление виджета (Задание: реальное удаление, с сохранением
              настроек или без) — доступно только для реально установленных виджетов. */}
          {(widget.status === "installed" || widget.status === "update-available") && (
            <div className="mt-3">
              {!confirmingUninstall ? (
                <button
                  type="button"
                  onClick={() => setConfirmingUninstall(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-accent-danger hover:underline"
                >
                  <Trash2 size={14} />
                  Удалить виджет
                </button>
              ) : (
                <div className="rounded-xl border border-accent-danger/30 bg-accent-danger/10 p-3">
                  <p className="mb-2 text-xs text-warmwhite/85">
                    Удалить «{widget.name}» с этого компьютера? Файлы будут стёрты в любом случае —
                    выбери, сохранить ли настройки виджета для следующей установки.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onUninstall(widget.id, true);
                        setConfirmingUninstall(false);
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-accent-fire px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-firedark"
                    >
                      <Check size={14} />
                      Удалить, сохранить настройки
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUninstall(widget.id, false);
                        setConfirmingUninstall(false);
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-accent-danger/40 px-3 py-1.5 text-xs font-semibold text-accent-danger hover:bg-accent-danger/10"
                    >
                      <Trash2 size={14} />
                      Удалить полностью
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingUninstall(false)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-warmwhite/80 hover:text-warmwhite"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Увеличенный просмотр скриншота со стрелками */}
      {lightboxIndex !== null && screenshots[lightboxIndex] && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 p-6"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxIndex(null);
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X size={18} />
          </button>

          {screenshots.length > 1 && (
            <>
              <button
                type="button"
                title="Предыдущий"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex - 1 + screenshots.length) % screenshots.length);
                }}
                className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                title="Следующий"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % screenshots.length);
                }}
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <ChevronRight size={20} />
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80">
                {lightboxIndex + 1} / {screenshots.length}
              </span>
            </>
          )}

          <img
            src={screenshots[lightboxIndex]}
            alt={widget.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
