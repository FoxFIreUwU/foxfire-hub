// PluginForgeWindow.tsx — «Редактор» (раньше назывался «Кузница FoxFire»):
// полноэкранное окно, которое открывается кнопкой "Настроить" во вкладке
// "Загруженное" (DownloadedPanel.tsx).
// Раньше настройки виджета были втиснуты в узкую правую панель прямо во
// вкладке "Загруженное" — на маленьких окнах это обрезало собственные страницы
// настроек виджетов. Теперь у настроек — всё окно, а слева живёт быстрый
// переключатель между установленными плагинами/играми и отдельным пунктом
// "Оформление Hub", чтобы кастомизацию самого Hub тоже не пришлось искать
// где-то ещё. Выход из режима Редактора — кнопка внизу левой панели (и Esc).
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, Flame, Gamepad2, LogOut, Search, Sparkles, SlidersHorizontal } from "lucide-react";
import { InstalledWidgetEntry, WidgetConfigValues, WidgetWithState } from "../types/widget";
import WidgetSettingsPanel from "./WidgetSettingsPanel";
import AppearanceSettings from "./AppearanceSettings";

// Длительность анимации выхода — должна совпадать с forge-out в index.css.
const FORGE_EXIT_MS = 180;

// Ширина левой панели в развёрнутом виде и в виде узкой полоски с иконками (px).
const SIDEBAR_OPEN_PX = 224;
const SIDEBAR_RAIL_PX = 64;

interface PluginForgeWindowProps {
  // Все установленные утилиты (тот же список, что и в DownloadedPanel) —
  // нужен для бокового переключателя внутри самого Редактора.
  widgets: WidgetWithState[];
  activeWidgetId: string;
  installedEntries: Record<string, InstalledWidgetEntry>;
  configByWidget: Record<string, WidgetConfigValues>;
  onSelectWidget: (id: string) => void;
  onConfigChange: (widget: WidgetWithState, key: string, value: string | number | boolean) => void;
  onLaunch: (widget: WidgetWithState) => void;
  onOpenInfo: (widget: WidgetWithState) => void;
  onClose: () => void;
}

type ForgeMode = "widget" | "appearance";

export default function PluginForgeWindow({
  widgets,
  activeWidgetId,
  installedEntries,
  configByWidget,
  onSelectWidget,
  onConfigChange,
  onLaunch,
  onOpenInfo,
  onClose
}: PluginForgeWindowProps) {
  const [mode, setMode] = useState<ForgeMode>("widget");
  const [query, setQuery] = useState("");
  // Боковой список можно свернуть — тогда он превращается в узкую полоску с
  // иконками (выход и оформление остаются под рукой), а вся остальная ширина
  // достаётся странице настроек плагина. Сворачивание плавное (см. ниже).
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Свёрнутый список делаем inert (нельзя попасть Tab-ом и кликнуть) через
  // атрибут напрямую — React 18 не знает про этот атрибут.
  const listWrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = listWrapRef.current;
    if (!el) return;
    if (sidebarOpen) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  }, [sidebarOpen]);

  // Плавное закрытие: сначала проигрываем анимацию "выхода" (~180 мс), и только
  // потом реально убираем окно из дерева через onClose родителя.
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(onClose, FORGE_EXIT_MS);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Esc выходит из Редактора — привычное поведение для полноэкранного окна.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [requestClose]);

  // Раньше при открытии окно принудительно переводилось в настоящий
  // полноэкранный режим ОС (appWindow.setFullscreen) — именно это давало резкое
  // мелькание при открытии и закрытии. Сам Редактор и так занимает всё окно
  // Hub (position: absolute; inset: 0), поэтому системное переключение убрано,
  // а вместо него — плавное появление (см. .forge-window в index.css).
  // Полноэкранный режим по-прежнему включается тумблером в "Оформление Hub".

  const activeWidget = widgets.find((w) => w.id === activeWidgetId) ?? widgets[0] ?? null;
  const activeEntry = activeWidget ? installedEntries[activeWidget.id] : undefined;

  const matchesQuery = (w: WidgetWithState) => w.name.toLowerCase().includes(query.trim().toLowerCase());
  const pluginList = widgets.filter((w) => w.kind !== "game" && matchesQuery(w));
  const gameList = widgets.filter((w) => w.kind === "game" && matchesQuery(w));

  function selectWidget(id: string) {
    onSelectWidget(id);
    setMode("widget");
  }

  return (
    <div
      className="forge-window absolute inset-0 z-30 flex flex-col bg-appbg"
      data-closing={closing ? "true" : "false"}
    >
      {/* Шапка в стилистике Header.tsx (та же янтарная полоса), но компактная.
          Правый отступ оставлен под кнопки окна (свернуть/закрыть из
          WindowControls). Кнопки "выйти" здесь больше нет — она внизу левой
          панели, рядом с "Оформление Hub". */}
      <header className="relative flex-shrink-0 border-b border-border bg-appbg/95 py-2 pl-3 pr-24 pt-3 backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-accent-fire to-transparent opacity-70" />
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-accent-fire/30 bg-accent-fire/10 text-accent-fire shadow-glow-sm">
            <Flame size={16} />
          </span>
          <div className="min-w-0">
            <h1 className="scanline-text text-lg font-extrabold leading-tight tracking-tight text-warmwhite">
              Редактор
            </h1>
            <p className="truncate font-mono-ui text-[11px] text-muted">
              {mode === "appearance"
                ? "Оформление Hub"
                : activeWidget
                  ? `Настройки «${activeWidget.name}»`
                  : "Выбери утилиту слева"}
            </p>
          </div>
        </div>
      </header>

      {/* Тело на весь экран: никакого max-width, центрирования и внешних
          отступов — боковой список и страница настроек упираются прямо в
          края окна. */}
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <div className="surface flex min-h-0 w-full overflow-hidden rounded-none border-0">
          {/* Обёртка боковой панели: ширина плавно меняется, а "язычок"
              сворачивания сидит на её правом краю по центру по высоте — там,
              где его логично искать, и он едет вместе с границей панели. */}
          <div
            className="relative flex-shrink-0 transition-[width] duration-300 ease-out"
            style={{ width: sidebarOpen ? SIDEBAR_OPEN_PX : SIDEBAR_RAIL_PX }}
          >
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? "Свернуть список" : "Показать список"}
              aria-label={sidebarOpen ? "Свернуть список" : "Показать список"}
              aria-expanded={sidebarOpen}
              className="absolute right-0 top-1/2 z-10 flex h-14 w-5 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-muted shadow-lg transition-colors hover:border-accent-fire/60 hover:bg-card2 hover:text-accent-fire"
            >
              <ChevronLeft
                size={14}
                className={`transition-transform duration-300 ${sidebarOpen ? "" : "rotate-180"}`}
              />
            </button>

            {/* Сама панель: overflow-hidden обрезает содержимое по ширине,
                пока она едет; список плавно гаснет, а внизу остаются только
                иконки. */}
            <div className="flex h-full min-h-0 flex-col overflow-hidden border-r border-border">
              {/* Поиск + список: при сворачивании гаснут и становятся
                  неактивными (inert — чтобы в них нельзя было попасть Tab-ом). */}
              <div
                className={`flex min-h-0 flex-1 flex-col transition-opacity duration-200 ${
                  sidebarOpen ? "opacity-100 delay-100" : "pointer-events-none opacity-0"
                }`}
                style={{ minWidth: SIDEBAR_OPEN_PX }}
                aria-hidden={!sidebarOpen}
                ref={listWrapRef}
              >
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
                      className="w-full rounded-lg border border-border bg-card2/70 py-1.5 pl-7 pr-2 text-xs text-warmwhite placeholder:text-muted outline-none transition-colors focus:border-accent-fire/50"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <SidebarGroupLabel icon={SlidersHorizontal} label="Плагины" />
                  {pluginList.length === 0 ? (
                    <p className="px-4 pb-3 text-[11px] text-muted">Ничего не найдено.</p>
                  ) : (
                    pluginList.map((widget) => (
                      <SidebarRow
                        key={widget.id}
                        label={widget.name}
                        isActive={mode === "widget" && widget.id === activeWidget?.id}
                        onClick={() => selectWidget(widget.id)}
                      />
                    ))
                  )}

                  <SidebarGroupLabel icon={Gamepad2} label="Игры" />
                  {gameList.length === 0 ? (
                    <p className="px-4 pb-3 text-[11px] italic text-muted">
                      Появятся здесь, когда заработает раздел «Игры».
                    </p>
                  ) : (
                    gameList.map((widget) => (
                      <SidebarRow
                        key={widget.id}
                        label={widget.name}
                        isActive={mode === "widget" && widget.id === activeWidget?.id}
                        onClick={() => selectWidget(widget.id)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Нижний блок: "Оформление Hub" и "Выйти из Редактора". В
                  свёрнутом виде остаются только иконки (подписи — в title). */}
              <div className="flex flex-col gap-1 border-t border-border p-2">
                <button
                  type="button"
                  onClick={() => setMode("appearance")}
                  title="Оформление Hub"
                  className={`flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                    mode === "appearance"
                      ? "bg-accent-purple/15 text-accent-purple shadow-glow-sm"
                      : "text-muted hover:bg-white/5 hover:text-warmwhite"
                  }`}
                >
                  <Sparkles size={16} className="flex-shrink-0" />
                  <SidebarLabel visible={sidebarOpen}>Оформление Hub</SidebarLabel>
                </button>

                <button
                  type="button"
                  onClick={requestClose}
                  title="Выйти из Редактора (Esc)"
                  className="flex w-full items-center rounded-xl border border-border px-4 py-2.5 text-left text-sm font-semibold text-warmwhite/80 transition-colors hover:border-accent-danger/50 hover:bg-accent-danger/10 hover:text-accent-danger"
                >
                  <LogOut size={16} className="flex-shrink-0" />
                  <SidebarLabel visible={sidebarOpen}>Выйти из Редактора</SidebarLabel>
                </button>
              </div>
            </div>
          </div>

          {/* Содержимое: либо полноразмерная панель настроек выбранного
              плагина (тот же компонент, что раньше жил в узкой панели
              "Загруженного" — тут ему просто больше не тесно), либо
              настройки внешнего вида самого Hub. */}
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            {mode === "appearance" ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="mx-auto max-w-3xl">
                  <AppearanceSettings />
                </div>
              </div>
            ) : activeWidget && activeEntry ? (
              <WidgetSettingsPanel
                widget={activeWidget}
                entry={activeEntry}
                configValues={configByWidget[activeWidget.id] ?? {}}
                onConfigChange={(key, value) => onConfigChange(activeWidget, key, value)}
                onLaunch={onLaunch}
                onOpenInfo={onOpenInfo}
              />
            ) : (
              <p className="mx-auto mt-10 max-w-sm px-4 text-center text-sm text-muted">
                {widgets.length === 0
                  ? "Пока нет установленных плагинов — установи первый во вкладке «Моды». Настройки самого Hub доступны слева в «Оформление Hub»."
                  : "Выбери плагин или игру слева."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Подпись кнопки в боковой панели: плавно исчезает при сворачивании панели в
// полоску с иконками (ширина схлопывается, чтобы иконка осталась по центру).
function SidebarLabel({ visible, children }: { visible: boolean; children: ReactNode }) {
  return (
    <span
      className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
        visible ? "ml-2 max-w-[160px] opacity-100" : "ml-0 max-w-0 opacity-0"
      }`}
    >
      {children}
    </span>
  );
}

function SidebarGroupLabel({ icon: Icon, label }: { icon: typeof SlidersHorizontal; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-4 pb-1.5 pt-3 font-mono-ui text-[10px] font-semibold uppercase tracking-wider text-accent-fire">
      <Icon size={11} />
      {label}
    </div>
  );
}

function SidebarRow({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
        isActive ? "bg-accent-fire/10 text-accent-fire" : "text-warmwhite hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );
}
