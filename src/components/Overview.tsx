import { ReactNode } from "react";
import { Puzzle, AppWindow, ArrowRight, Clock } from "lucide-react";
import WidgetCard from "./WidgetCard";
import { WidgetWithState } from "../types/widget";
import type { CategoryId } from "./Categories";

interface OverviewProps {
  // Уже отфильтрованные поиском и тегами виджеты (см. App.tsx → filteredWidgets).
  widgets: WidgetWithState[];
  // true, если пользователь сейчас что-то ищет или выбрал теги — тогда
  // показываем ВСЕ найденное, а не только несколько первых карточек.
  isFiltering: boolean;
  onOpen: (widget: WidgetWithState) => void;
  onAction: (widget: WidgetWithState) => void;
  onGoTo: (category: CategoryId) => void;
}

// Сколько карточек показывать в каждом разделе, пока поиск не включён.
const PREVIEW_LIMIT = 3;

interface SectionProps {
  icon: ReactNode;
  title: string;
  description: string;
  count: number;
  // Ссылка справа в заголовке ("Все плагины →"). Необязательна.
  linkLabel?: string;
  onLinkClick?: () => void;
  children: ReactNode;
}

function Section({ icon, title, description, count, linkLabel, onLinkClick, children }: SectionProps) {
  return (
    <section>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-accent-fire/30 bg-accent-fire/10 text-accent-fire shadow-glow-sm">
            {icon}
          </span>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-warmwhite">
              {title}
              <span className="pill border-border bg-card2/70 text-muted">{count}</span>
            </h2>
            <p className="text-xs text-muted">{description}</p>
          </div>
        </div>

        {linkLabel && onLinkClick && (
          <button
            onClick={onLinkClick}
            className="group flex flex-shrink-0 items-center gap-1 pt-1 text-xs font-semibold text-accent-fire transition-colors hover:text-warmwhite"
          >
            {linkLabel}
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

// Заглушка для раздела, в котором пока ничего нет.
function EmptyBlock({ text, soon = false }: { text: string; soon?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card2/40 px-4 py-8 text-center text-sm text-muted">
      {soon && (
        <span className="pill border-accent-warning/30 bg-accent-warning/10 text-accent-warning">
          <Clock size={11} />
          Скоро
        </span>
      )}
      <span>{text}</span>
    </div>
  );
}

export default function Overview({ widgets, isFiltering, onOpen, onAction, onGoTo }: OverviewProps) {
  // Плагины — всё, что не помечено как приложение (kind не указан или "plugin"):
  // HTML-дополнения, которые встраиваются в OBS по ссылке.
  const plugins = widgets.filter((w) => w.kind !== "app");
  // Приложения — полноценные программы со своим .exe (kind: "app").
  const apps = widgets.filter((w) => w.kind === "app");

  const visiblePlugins = isFiltering ? plugins : plugins.slice(0, PREVIEW_LIMIT);
  const visibleApps = isFiltering ? apps : apps.slice(0, PREVIEW_LIMIT);

  const renderGrid = (list: WidgetWithState[]) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((widget) => (
        <WidgetCard key={widget.id} widget={widget} onOpen={onOpen} onAction={onAction} />
      ))}
    </div>
  );

  const nothingFound = isFiltering && plugins.length + apps.length === 0;

  if (nothingFound) {
    return <p className="mt-10 text-center text-sm text-muted">Ничего не найдено. Попробуй другой запрос.</p>;
  }

  return (
    <div className="flex flex-col gap-10">
      <Section
        icon={<Puzzle size={18} />}
        title="Плагины"
        description="Дополнения на HTML — добавляются в OBS и похожие программы через ссылку (источник «Браузер»)."
        count={plugins.length}
        linkLabel={plugins.length > PREVIEW_LIMIT && !isFiltering ? "Все плагины" : undefined}
        onLinkClick={() => onGoTo("plugins")}
      >
        {visiblePlugins.length > 0 ? (
          renderGrid(visiblePlugins)
        ) : (
          <EmptyBlock text={isFiltering ? "Среди плагинов ничего не найдено." : "Плагинов пока нет."} />
        )}
      </Section>

      <Section
        icon={<AppWindow size={18} />}
        title="Приложения"
        description="Полноценные программы со своим .exe — работают сами по себе, без FoxFire Hub."
        count={apps.length}
        linkLabel={apps.length > PREVIEW_LIMIT && !isFiltering ? "Все приложения" : undefined}
        onLinkClick={() => onGoTo("apps")}
      >
        {visibleApps.length > 0 ? (
          renderGrid(visibleApps)
        ) : (
          <EmptyBlock
            soon={!isFiltering}
            text={isFiltering ? "Среди приложений ничего не найдено." : "Первые приложения появятся здесь."}
          />
        )}
      </Section>
    </div>
  );
}
