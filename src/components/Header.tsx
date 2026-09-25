import { Flame, Search, X } from "lucide-react";
import { APP_STAGE_LABEL } from "../appConfig";

interface HeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  allTags: string[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
}

export default function Header({ search, onSearchChange, allTags, activeTags, onToggleTag }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-appbg/85 px-6 pb-4 pt-9 backdrop-blur-xl">
      {/* Фирменная янтарная полоса под шапкой — как в Telegram Mini App FoxFire */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-accent-fire to-transparent opacity-70" />

      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent-fire/30 bg-accent-fire/10 text-accent-fire shadow-glow-sm">
              <Flame size={16} />
            </span>
            <h1 className="scanline-text text-2xl font-extrabold tracking-tight text-warmwhite">FoxFire Hub</h1>
            {/* Бейдж стадии разработки — виден пока приложение в альфе, чтобы никто не принял
                тестовую сборку за финальный релиз. Уберётся сам, если сменить APP_STAGE_LABEL
                на пустую строку в src/appConfig.ts. */}
            {APP_STAGE_LABEL && (
              <span className="rounded-md border border-accent-warning/40 bg-accent-warning/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-accent-warning">
                {APP_STAGE_LABEL}
              </span>
            )}
          </div>

          <span className="pill border-border bg-card2/70 text-muted">
            <span className="pill-dot bg-accent-green shadow-[0_0_8px_rgba(34,197,94,0.7)]" />
            Онлайн-каталог виджетов
          </span>
        </div>

        <div className="relative mb-3">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск виджетов..."
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="foxfire-widget-search"
            className="w-full rounded-xl border border-border bg-card2/80 py-2.5 pl-10 pr-10 text-sm text-warmwhite placeholder:text-muted outline-none transition-colors focus:border-accent-fire/50 focus:shadow-glow-sm"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-warmwhite"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => {
            const isActive = activeTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => onToggleTag(tag)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-accent-fire/50 bg-accent-fire/15 text-accent-fire shadow-glow-sm"
                    : "border-border bg-card2/60 text-muted hover:border-borderstrong hover:text-warmwhite"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
