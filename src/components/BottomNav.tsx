import { LayoutGrid, Compass, HardDrive, Sliders, Wrench } from "lucide-react";
import { NavSection } from "../types/widget";

interface BottomNavProps {
  active: NavSection;
  onChange: (section: NavSection) => void;
  // Кнопка «Редактор» — не раздел, а действие: открывает полноэкранное окно
  // Редактора поверх текущей вкладки, поэтому она никогда не бывает «выбранной».
  onOpenEditor: () => void;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Обзор", icon: Compass },
  { id: "mods", label: "Категории", icon: LayoutGrid },
  { id: "downloaded", label: "Загруженное", icon: HardDrive },
  { id: "settings", label: "Настройки", icon: Sliders }
];

// Разложены по половинам, чтобы кнопка «Редактор» оказалась ровно по центру
// панели, а не прижатой к краю после общего списка вкладок.
const HALF = Math.ceil(NAV_ITEMS.length / 2);
const LEFT_ITEMS = NAV_ITEMS.slice(0, HALF);
const RIGHT_ITEMS = NAV_ITEMS.slice(HALF);

export default function BottomNav({ active, onChange, onOpenEditor }: BottomNavProps) {
  const renderItem = ({ id, label, icon: Icon }: (typeof NAV_ITEMS)[number]) => {
    const isActive = active === id;
    return (
      <button
        key={id}
        onClick={() => onChange(id)}
        className="group flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition-colors"
      >
        {/* Без круга и рамки: активная вкладка просто подсвечивается —
            иконка и подпись становятся акцентными, вокруг иконки мягкое свечение. */}
        <span
          className={`flex h-9 w-9 items-center justify-center transition-all duration-200 ${
            isActive
              ? "text-accent-fire drop-shadow-[0_0_8px_var(--color-fire-glow)]"
              : "text-muted group-hover:text-warmwhite"
          }`}
        >
          <Icon size={21} />
        </span>
        <span
          className={`text-[11px] font-medium transition-colors duration-200 ${
            isActive ? "text-accent-fire" : "text-muted group-hover:text-warmwhite"
          }`}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-appbg2/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-2">
        <div className="flex flex-1 items-center justify-around">{LEFT_ITEMS.map(renderItem)}</div>

        <span className="h-8 w-px flex-shrink-0 bg-border" aria-hidden="true" />

        <button
          onClick={onOpenEditor}
          className="group flex flex-shrink-0 flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition-colors"
        >
          <span className="flex h-9 w-9 items-center justify-center text-muted transition-all duration-200 group-hover:text-accent-fire group-hover:drop-shadow-[0_0_8px_var(--color-fire-glow)]">
            <Wrench size={21} />
          </span>
          <span className="text-[11px] font-medium text-muted transition-colors duration-200 group-hover:text-accent-fire">
            Редактор
          </span>
        </button>

        <span className="h-8 w-px flex-shrink-0 bg-border" aria-hidden="true" />

        <div className="flex flex-1 items-center justify-around">{RIGHT_ITEMS.map(renderItem)}</div>
      </div>
    </nav>
  );
}
