// DownloadedPanel.tsx — вкладка "Загруженное". Здесь только то, что реально
// стоит на компьютере: полки по категориям (Плагины / Приложения — как в
// "Обзоре", но с другим содержимым) и у каждой установленной утилиты своя
// широкая панель управления: сверху информация, снизу "пульт" из плиток —
// Запустить, Ссылка для OBS, Настроить, О виджете и отдельно справа Удалить.
// Установка, версии и обновление остаются в модалке "О виджете".
import { ReactNode, useState } from "react";
import {
  AppWindow,
  Check,
  Copy,
  Download,
  FolderOpen,
  Info,
  PackageOpen,
  Play,
  Puzzle,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2
} from "lucide-react";
import { InstalledWidgetEntry, WidgetWithState } from "../types/widget";

interface DownloadedPanelProps {
  widgets: WidgetWithState[];
  installedEntries: Record<string, InstalledWidgetEntry>;
  isFiltering: boolean;
  onConfigure: (id: string) => void;
  onLaunch: (widget: WidgetWithState) => void;
  onOpenInfo: (widget: WidgetWithState) => void;
  // Бросает ошибку, если файлов виджета нет на месте — карточка покажет её.
  onCopyObsLink: (widget: WidgetWithState) => Promise<void>;
  onUninstall: (widgetId: string, keepConfig: boolean) => void;
  // Для пустого состояния: "Открыть каталог" → вкладка "Категории".
  onBrowseCatalog: () => void;
}

export default function DownloadedPanel({
  widgets,
  installedEntries,
  isFiltering,
  onConfigure,
  onLaunch,
  onOpenInfo,
  onCopyObsLink,
  onUninstall,
  onBrowseCatalog
}: DownloadedPanelProps) {
  // Плагины — всё, что не помечено как приложение (как в "Обзоре").
  const plugins = widgets.filter((w) => w.kind !== "app");
  const apps = widgets.filter((w) => w.kind === "app");

  if (widgets.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-fire/30 bg-accent-fire/10 text-accent-fire shadow-glow-sm">
          <PackageOpen size={28} />
        </span>
        <p className="max-w-xs text-sm text-muted">
          {isFiltering
            ? "Среди установленного ничего не найдено. Попробуй другой запрос."
            : "Здесь появятся утилиты, которые ты скачал. Пока список пуст."}
        </p>
        {!isFiltering && (
          <button
            type="button"
            onClick={onBrowseCatalog}
            className="scanline glow-accent overflow-hidden rounded-xl bg-accent-firedark px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-fire"
          >
            Открыть каталог
          </button>
        )}
      </div>
    );
  }

  const renderShelf = (list: WidgetWithState[], emptyText: string) =>
    list.length > 0 ? (
      <div className="flex flex-col gap-4">
        {list.map((widget) => (
          <InstalledCard
            key={widget.id}
            widget={widget}
            installDir={installedEntries[widget.id]?.installDir}
            onConfigure={onConfigure}
            onLaunch={onLaunch}
            onOpenInfo={onOpenInfo}
            onCopyObsLink={onCopyObsLink}
            onUninstall={onUninstall}
          />
        ))}
      </div>
    ) : (
      <p className="rounded-xl border border-dashed border-border bg-card2/40 px-4 py-5 text-center text-xs text-muted">
        {emptyText}
      </p>
    );

  return (
    <div className="flex flex-col gap-9">
      <Shelf icon={<Puzzle size={16} />} title="Плагины" count={plugins.length}>
        {renderShelf(plugins, isFiltering ? "Среди плагинов ничего не найдено." : "Установленных плагинов пока нет.")}
      </Shelf>
      <Shelf icon={<AppWindow size={16} />} title="Приложения" count={apps.length}>
        {renderShelf(apps, isFiltering ? "Среди приложений ничего не найдено." : "Установленных приложений пока нет.")}
      </Shelf>
    </div>
  );
}

// Заголовок категории — не блок с описанием, как в "Обзоре", а компактная
// "полка": иконка, название, счётчик и тонкая линия до края.
function Shelf({ icon, title, count, children }: { icon: ReactNode; title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-accent-fire/30 bg-accent-fire/10 text-accent-fire">
          {icon}
        </span>
        <h2 className="font-mono-ui text-xs font-semibold uppercase tracking-wider text-accent-fire">{title}</h2>
        <span className="pill border-border bg-card2/70 text-muted">{count}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
      {children}
    </section>
  );
}

interface InstalledCardProps {
  widget: WidgetWithState;
  installDir?: string;
  onConfigure: (id: string) => void;
  onLaunch: (widget: WidgetWithState) => void;
  onOpenInfo: (widget: WidgetWithState) => void;
  onCopyObsLink: (widget: WidgetWithState) => Promise<void>;
  onUninstall: (widgetId: string, keepConfig: boolean) => void;
}

function InstalledCard({
  widget,
  installDir,
  onConfigure,
  onLaunch,
  onOpenInfo,
  onCopyObsLink,
  onUninstall
}: InstalledCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [obsState, setObsState] = useState<"idle" | "copied" | "error">("idle");
  const [obsError, setObsError] = useState<string | null>(null);

  const isInstalling = widget.status === "installing";
  const hasUpdate = widget.status === "update-available";
  // Ссылка для источника "Браузер" в OBS нужна только HTML-плагинам —
  // у приложений со своим .exe её нет.
  const canCopyLink = widget.kind !== "app";

  async function handleCopy() {
    try {
      await onCopyObsLink(widget);
      setObsError(null);
      setObsState("copied");
      setTimeout(() => setObsState("idle"), 2000);
    } catch (error) {
      setObsState("error");
      setObsError(String(error));
    }
  }

  return (
    <article className="surface overflow-hidden rounded-2xl">
      {/* Верх: обложка слева, информация справа */}
      <div className="flex gap-4 p-4">
        <div className="relative h-24 w-36 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-gradient-to-br from-accent-fire/15 via-accent-purple/10 to-card">
          {widget.previewUrl ? (
            <img src={widget.previewUrl} alt={widget.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-accent-fire/70">
              <Puzzle size={26} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="text-base font-bold text-warmwhite">{widget.name}</h3>
            {isInstalling ? (
              <span className="pill border-border bg-card2/70 text-muted">
                <Download size={11} />
                Установка…
              </span>
            ) : hasUpdate ? (
              <span className="pill border-accent-warning/30 bg-accent-warning/10 text-accent-warning">
                <RefreshCw size={11} />
                Доступно обновление
              </span>
            ) : (
              <span className="pill border-accent-green/30 bg-accent-green/10 text-accent-green">
                <ShieldCheck size={11} />v{widget.installedVersion}
              </span>
            )}
          </div>
          <p className="font-mono-ui text-[11px] text-muted">
            от {widget.author.name}
            {hasUpdate && widget.installedVersion && <span> · установлена v{widget.installedVersion}</span>}
          </p>

          {widget.shortDescription && (
            <p className="mt-1.5 line-clamp-2 text-xs text-warmwhite/75">{widget.shortDescription}</p>
          )}

          {installDir && (
            <p className="mt-2 flex items-center gap-1.5 font-mono-ui text-[10px] text-muted" title={installDir}>
              <FolderOpen size={11} className="flex-shrink-0" />
              <span className="truncate">{installDir}</span>
            </p>
          )}
        </div>
      </div>

      {/* Низ: "пульт" из плиток. Главная плитка — Запустить (залита цветом),
          рядом действия, а Удалить стоит отдельно справа за разделителем. */}
      {confirming ? (
        <div className="border-t border-accent-danger/30 bg-accent-danger/10 p-3">
          <p className="mb-2 text-xs text-warmwhite/85">
            Удалить «{widget.name}» с этого компьютера? Файлы будут стёрты в любом случае — выбери, сохранить ли
            настройки для следующей установки.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onUninstall(widget.id, true);
                setConfirming(false);
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
                setConfirming(false);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-accent-danger/40 px-3 py-1.5 text-xs font-semibold text-accent-danger hover:bg-accent-danger/10"
            >
              <Trash2 size={14} />
              Удалить полностью
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-warmwhite/80 hover:text-warmwhite"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-stretch gap-1.5 border-t border-border bg-black/20 p-1.5">
          <Tile primary disabled={isInstalling} onClick={() => onLaunch(widget)} icon={<Play size={17} />} label="Запустить" />
          {canCopyLink && (
            <Tile
              disabled={isInstalling}
              onClick={handleCopy}
              icon={obsState === "copied" ? <Check size={17} /> : <Copy size={17} />}
              label={obsState === "copied" ? "Скопировано!" : "Ссылка для OBS"}
              highlight={obsState === "copied"}
            />
          )}
          <Tile disabled={isInstalling} onClick={() => onConfigure(widget.id)} icon={<SlidersHorizontal size={17} />} label="Настроить" />
          <Tile
            onClick={() => onOpenInfo(widget)}
            icon={<Info size={17} />}
            label={hasUpdate ? "Обновить" : "О виджете"}
            highlight={hasUpdate}
          />

          <span className="mx-0.5 w-px flex-shrink-0 self-stretch bg-border" aria-hidden="true" />

          <Tile danger disabled={isInstalling} onClick={() => setConfirming(true)} icon={<Trash2 size={17} />} label="Удалить" narrow />
        </div>
      )}

      {obsState === "error" && obsError && (
        <p className="border-t border-border px-4 py-2 text-[11px] text-accent-danger">{obsError}</p>
      )}
    </article>
  );
}

function Tile({
  icon,
  label,
  onClick,
  primary = false,
  danger = false,
  highlight = false,
  narrow = false,
  disabled = false
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
  highlight?: boolean;
  narrow?: boolean;
  disabled?: boolean;
}) {
  let tone = "text-warmwhite/80 hover:bg-white/5 hover:text-accent-fire";
  if (primary) tone = "bg-accent-firedark text-white hover:bg-accent-fire glow-accent";
  else if (danger) tone = "text-accent-danger/80 hover:bg-accent-danger/10 hover:text-accent-danger";
  else if (highlight) tone = "bg-accent-warning/10 text-accent-warning hover:bg-accent-warning/15";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        narrow ? "w-20 flex-shrink-0" : primary ? "flex-[1.4]" : "flex-1"
      } ${tone}`}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
