import { Download, RefreshCw, Play, Star, ShieldAlert } from "lucide-react";
import { open as openExternalLink } from "@tauri-apps/api/shell";
import { WidgetWithState } from "../types/widget";
import { getDefaultVersion } from "../utils/versions";
import { checkWidgetCompatibility } from "../utils/compatibility";
import { APP_VERSION } from "../appConfig";

interface WidgetCardProps {
  widget: WidgetWithState;
  onOpen: (widget: WidgetWithState) => void;
  onAction: (widget: WidgetWithState) => void;
}

// Цвет тега зависит от его текста: платформы — синие, остальное — нейтральное серое.
function tagColorClass(tag: string): string {
  const platformTags = ["windows", "obs", "streamlabs", "mac", "linux"];
  if (platformTags.includes(tag.toLowerCase())) {
    return "bg-accent-blue/15 text-accent-blue border border-accent-blue/30";
  }
  return "bg-white/5 text-muted border border-border";
}

function actionLabel(status: WidgetWithState["status"]): string {
  switch (status) {
    case "not-installed":
      return "Установить";
    case "installing":
      return "Установка...";
    case "installed":
      return "Запустить";
    case "update-available":
      return "Обновить";
  }
}

function ActionIcon({ status }: { status: WidgetWithState["status"] }) {
  if (status === "installed") return <Play size={16} />;
  if (status === "update-available") return <RefreshCw size={16} />;
  return <Download size={16} />;
}

export default function WidgetCard({ widget, onOpen, onAction }: WidgetCardProps) {
  // Версия, которая ставится по умолчанию с быстрой кнопки на карточке —
  // выбор конкретной версии доступен в модалке (см. Задание 3).
  const defaultVersion = getDefaultVersion(widget.versions);

  // Проверка совместимости версии приложения (см. SYSTEM_WIDGET_STYLE.md, раздел 10).
  // Уже установленный виджет всегда можно запустить — блокируем только новую установку.
  const alreadyInstalled = widget.status === "installed";
  const compatibility = checkWidgetCompatibility(widget, defaultVersion, APP_VERSION);
  const isBlockedByAppVersion = !alreadyInstalled && !compatibility.isCompatible;

  return (
    <div
      className="surface surface-hover group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl hover:-translate-y-1 hover:shadow-glow"
      onClick={() => onOpen(widget)}
    >
      {/* Превью виджета */}
      <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-accent-fire/15 via-accent-purple/10 to-card">
        {widget.previewUrl ? (
          <img
            src={widget.previewUrl}
            alt={widget.name}
            className="h-full w-full object-cover opacity-90 transition-opacity duration-200 group-hover:opacity-100"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white/10">
            {widget.name.slice(0, 1)}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />

        <div className="pill absolute right-2 top-2 border-accent-green/30 bg-black/50 text-accent-green">
          <Star size={11} className="fill-accent-green text-accent-green" />
          {widget.rating}
        </div>

        {widget.status === "installed" && (
          <div className="pill absolute left-2 top-2 border-accent-green/30 bg-black/50 text-accent-green">
            <span className="pill-dot bg-accent-green shadow-[0_0_8px_rgba(34,197,94,0.7)]" />
            Установлено
          </div>
        )}
      </div>

      {/* Информация о виджете */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="text-base font-bold text-warmwhite">{widget.name}</h3>
          <p className="font-mono-ui text-xs text-muted">
            от{" "}
            {widget.author.url ? (
              <button
                type="button"
                onClick={(e) => {
                  // Останавливаем всплытие, чтобы клик по автору не открывал модалку виджета —
                  // это отдельное действие, ссылка открывается в браузере через Tauri (shell.open).
                  e.stopPropagation();
                  openExternalLink(widget.author.url as string).catch(() => {});
                }}
                className="text-accent-fire hover:underline"
              >
                {widget.author.name}
              </button>
            ) : (
              <span>{widget.author.name}</span>
            )}{" "}
            · v{defaultVersion.version}
          </p>
        </div>

        <p className="line-clamp-2 text-xs text-muted">{widget.shortDescription}</p>

        <div className="mt-1 flex flex-wrap gap-1.5">
          {widget.tags.map((tag) => (
            <span key={tag} className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${tagColorClass(tag)}`}>
              {tag}
            </span>
          ))}
        </div>

        {isBlockedByAppVersion && (
          <p className="-mt-1 flex items-center gap-1.5 text-[11px] text-accent-warning" title={compatibility.reason}>
            <ShieldAlert size={12} className="flex-shrink-0" />
            Нужно обновить FoxFire Hub
          </p>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction(widget);
          }}
          disabled={widget.status === "installing" || isBlockedByAppVersion}
          className="scanline glow-accent mt-auto flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-accent-firedark px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-fire disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBlockedByAppVersion ? <ShieldAlert size={16} /> : <ActionIcon status={widget.status} />}
          {isBlockedByAppVersion ? "Недоступно" : actionLabel(widget.status)}
        </button>
      </div>
    </div>
  );
}
