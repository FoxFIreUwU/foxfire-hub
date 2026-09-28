import { ReactNode } from "react";
import { Puzzle, AppWindow, ArrowRight, ArrowLeft, Clock } from "lucide-react";
import WidgetCard from "./WidgetCard";
import { WidgetWithState } from "../types/widget";

// Вкладка "Категории" — больше не дублирует "Обзор". Это меню из крупных
// блоков-кнопок: нажал на "Плагины" или "Приложения" — открылась страница
// этой категории со всем её списком (и кнопкой "Назад" к блокам).
export type CategoryId = "plugins" | "apps";

interface CategoriesProps {
  // Все виджеты каталога без фильтров — по ним считаются счётчики на блоках.
  allWidgets: WidgetWithState[];
  // Виджеты после поиска/тегов — их показываем внутри открытой категории.
  filteredWidgets: WidgetWithState[];
  isFiltering: boolean;
  // null — показываем блоки-кнопки; иначе — страницу выбранной категории.
  category: CategoryId | null;
  onSelectCategory: (category: CategoryId | null) => void;
  onOpen: (widget: WidgetWithState) => void;
  onAction: (widget: WidgetWithState) => void;
}

interface CategoryMeta {
  id: CategoryId;
  title: string;
  description: string;
  icon: ReactNode;
  emptyText: string;
  emptySoon: boolean;
  filter: (w: WidgetWithState) => boolean;
}

// Плагины — всё, что не помечено как приложение (kind не указан или "plugin").
// Приложения — полноценные программы со своим .exe (kind: "app").
export const CATEGORIES: CategoryMeta[] = [
  {
    id: "plugins",
    title: "Плагины",
    description: "Дополнения на HTML — добавляются в OBS и похожие программы через ссылку (источник «Браузер»).",
    icon: <Puzzle size={26} />,
    emptyText: "Плагинов пока нет.",
    emptySoon: false,
    filter: (w) => w.kind !== "app"
  },
  {
    id: "apps",
    title: "Приложения",
    description: "Полноценные программы со своим .exe — работают сами по себе, без FoxFire Hub.",
    icon: <AppWindow size={26} />,
    emptyText: "Первые приложения появятся здесь.",
    emptySoon: true,
    filter: (w) => w.kind === "app"
  }
];

function isInstalled(w: WidgetWithState) {
  return w.status === "installed" || w.status === "update-available";
}

export default function Categories({
  allWidgets,
  filteredWidgets,
  isFiltering,
  category,
  onSelectCategory,
  onOpen,
  onAction
}: CategoriesProps) {
  const active = CATEGORIES.find((c) => c.id === category) ?? null;

  // ===== Страница выбранной категории =====
  if (active) {
    const list = filteredWidgets.filter(active.filter);
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onSelectCategory(null)}
            className="group mt-0.5 flex h-9 flex-shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card2/70 px-3 text-xs font-semibold text-muted transition-colors hover:border-accent-fire/40 hover:text-warmwhite"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            Категории
          </button>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-warmwhite">
              {active.title}
              <span className="pill border-border bg-card2/70 text-muted">{list.length}</span>
            </h2>
            <p className="text-xs text-muted">{active.description}</p>
          </div>
        </div>

        {list.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((widget) => (
              <WidgetCard key={widget.id} widget={widget} onOpen={onOpen} onAction={onAction} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card2/40 px-4 py-10 text-center text-sm text-muted">
            {active.emptySoon && !isFiltering && (
              <span className="pill border-accent-warning/30 bg-accent-warning/10 text-accent-warning">
                <Clock size={11} />
                Скоро
              </span>
            )}
            <span>{isFiltering ? "Ничего не найдено. Попробуй другой запрос." : active.emptyText}</span>
          </div>
        )}
      </div>
    );
  }

  // ===== Блоки-кнопки =====
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {CATEGORIES.map((cat) => {
        const items = allWidgets.filter(cat.filter);
        const installed = items.filter(isInstalled).length;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className="surface surface-hover group relative flex min-h-[210px] flex-col items-start gap-4 overflow-hidden rounded-2xl p-6 text-left hover:-translate-y-0.5 hover:border-accent-fire/40 hover:shadow-glow-sm"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-fire/30 bg-accent-fire/10 text-accent-fire shadow-glow-sm">
              {cat.icon}
            </span>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-warmwhite">{cat.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">{cat.description}</p>
            </div>

            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill border-border bg-card2/70 text-muted">{items.length} шт.</span>
                {installed > 0 && (
                  <span className="pill border-accent-green/30 bg-accent-green/10 text-accent-green">
                    <span className="pill-dot bg-accent-green" />
                    Установлено: {installed}
                  </span>
                )}
                {items.length === 0 && (
                  <span className="pill border-accent-warning/30 bg-accent-warning/10 text-accent-warning">
                    <Clock size={11} />
                    Скоро
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-accent-fire transition-colors group-hover:text-warmwhite">
                Открыть
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
