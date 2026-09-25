import { useState } from "react";
import { Image as ImageIcon, AlertTriangle } from "lucide-react";
import { open as openDialog } from "@tauri-apps/api/dialog";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { appWindow } from "@tauri-apps/api/window";
import {
  AppearanceSettings as AppearanceSettingsType,
  BACKGROUND_PRESETS,
  DEFAULT_APPEARANCE,
  TextSize,
  ThemeMode,
  WindowRounding,
  applyAppearance,
  loadAppearance,
  saveAppearance
} from "../utils/appearance";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "Как в системе" },
  { value: "dark", label: "Тёмная" },
  { value: "light", label: "Светлая" }
];

const ROUNDING_OPTIONS: { value: WindowRounding; label: string }[] = [
  { value: "none", label: "Отсутствует" },
  { value: "small", label: "Небольшое" },
  { value: "standard", label: "Стандартное" },
  { value: "large", label: "Крупное" }
];

const TEXT_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: "small", label: "Маленький" },
  { value: "standard", label: "Стандартный" },
  { value: "large", label: "Крупный" }
];

const ACCENT_PRESETS = ["#ff7a1a", "#8b5cf6", "#3b82f6", "#22c55e", "#ef4444", "#ec4899"];

// Небольшая обёртка вида "иконка + подпись + значение + шеврон", как в референсе.
function SettingRow({
  icon,
  label,
  value,
  children,
  hint
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-black/20 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-muted">{icon}</span>
          <div>
            <p className="text-sm text-warmwhite/85">{label}</p>
            {value && <p className="font-mono-ui text-xs font-semibold text-warmwhite">{value}</p>}
          </div>
        </div>
        {children}
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export default function AppearanceSettings() {
  const [settings, setSettings] = useState<AppearanceSettingsType>(() => loadAppearance());
  const [bgError, setBgError] = useState<string | null>(null);
  const [windowSizeError, setWindowSizeError] = useState<string | null>(null);

  // Применяет изменение сразу (видно без перезапуска) и сохраняет в localStorage,
  // чтобы пережило перезапуск приложения.
  function update(patch: Partial<AppearanceSettingsType>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      applyAppearance(next);
      saveAppearance(next);
      return next;
    });
  }

  function resetToDefaults() {
    update(DEFAULT_APPEARANCE);
  }

  async function handleFullscreenToggle(next: boolean) {
    setWindowSizeError(null);
    try {
      await appWindow.setFullscreen(next);
    } catch {
      setWindowSizeError("Полноэкранный режим работает только в самом приложении, не в браузере.");
    }
  }

  async function handlePickBackground() {
    setBgError(null);
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "Изображения", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
      });
      if (typeof selected !== "string") return;
      const assetUrl = convertFileSrc(selected);
      update({ backgroundImage: `url("${assetUrl}")` });
    } catch {
      setBgError("Диалог выбора файла доступен только в самом приложении, не в браузере.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Тема + акцентный цвет */}
      <section className="surface rounded-2xl p-5">
        <h2 className="mb-3 font-mono-ui text-xs font-semibold uppercase tracking-wider text-accent-fire">Внешний вид</h2>

        <div className="flex flex-col gap-2.5">
          <SettingRow icon={<span className="text-lg">🌗</span>} label="Тема приложения" value={themeLabel(settings.theme)}>
            <select
              value={settings.theme}
              onChange={(e) => update({ theme: e.target.value as ThemeMode })}
              className="rounded-lg border border-border bg-card px-2 py-1 text-sm text-warmwhite outline-none focus:border-accent-fire/50"
            >
              {THEME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </SettingRow>

          <div className="rounded-xl border border-border bg-black/20 px-3 py-2.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-warmwhite/85">Основной цвет</p>
              <div className="flex items-center gap-2">
                <span className="font-mono-ui text-xs font-semibold text-warmwhite">{settings.accentColor.toUpperCase()}</span>
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => update({ accentColor: e.target.value })}
                  className="h-7 w-9 cursor-pointer rounded-md border border-border bg-transparent"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ACCENT_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  onClick={() => update({ accentColor: color })}
                  className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 hover:shadow-glow-sm ${
                    settings.accentColor.toLowerCase() === color ? "border-warmwhite" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <SettingRow icon={<span className="text-lg">◻︎</span>} label="Скругление углов окна" value={roundingLabel(settings.rounding)}>
            <select
              value={settings.rounding}
              onChange={(e) => update({ rounding: e.target.value as WindowRounding })}
              className="rounded-lg border border-border bg-card px-2 py-1 text-sm text-warmwhite outline-none focus:border-accent-fire/50"
            >
              {ROUNDING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </SettingRow>

          <SettingRow icon={<span className="text-lg">Аа</span>} label="Размер текста" value={textSizeLabel(settings.textSize)}>
            <select
              value={settings.textSize}
              onChange={(e) => update({ textSize: e.target.value as TextSize })}
              className="rounded-lg border border-border bg-card px-2 py-1 text-sm text-warmwhite outline-none focus:border-accent-fire/50"
            >
              {TEXT_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </SettingRow>
        </div>
      </section>

      {/* Окно приложения */}
      <section className="surface rounded-2xl p-5">
        <h2 className="mb-3 font-mono-ui text-xs font-semibold uppercase tracking-wider text-accent-fire">Окно приложения</h2>

        <div className="flex flex-col gap-2.5">
          <label className="flex items-center justify-between rounded-xl border border-border bg-black/20 px-3 py-2.5">
            <span className="text-sm text-warmwhite/85">Полноэкранный режим</span>
            <Toggle onChange={handleFullscreenToggle} />
          </label>

          {windowSizeError && (
            <p className="flex items-center gap-1.5 text-[11px] text-accent-warning">
              <AlertTriangle size={12} /> {windowSizeError}
            </p>
          )}
        </div>
      </section>

      {/* Задний фон и прозрачность */}
      <section className="surface rounded-2xl p-5">
        <h2 className="mb-1 font-mono-ui text-xs font-semibold uppercase tracking-wider text-accent-fire">Задний фон и прозрачность</h2>
        <p className="mb-3 text-xs text-muted">Готовые фоны в стиле FoxFire или своя картинка с диска.</p>

        <div className="mb-3 flex flex-wrap gap-2">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => update({ backgroundImage: preset.css === "none" ? null : preset.css })}
              className={`h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-appbg text-[10px] text-muted transition-colors ${
                (settings.backgroundImage ?? "none") === preset.css || (!settings.backgroundImage && preset.id === "none")
                  ? "border-accent-fire shadow-glow-sm"
                  : "border-border hover:border-borderstrong"
              }`}
              style={{ backgroundImage: preset.css !== "none" ? preset.css : undefined }}
            >
              <span className="flex h-full items-end justify-center bg-black/30 pb-1">{preset.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handlePickBackground}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-black/20 py-2 text-sm font-semibold text-warmwhite transition-colors hover:border-accent-fire/50"
        >
          <ImageIcon size={16} />
          Добавить свой фон
        </button>
        {bgError && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-accent-warning">
            <AlertTriangle size={12} /> {bgError}
          </p>
        )}

        <div className="mt-3 flex flex-col gap-2.5">
          <label className="flex items-center justify-between rounded-xl border border-border bg-black/20 px-3 py-2.5">
            <span className="text-sm text-warmwhite/85">Отзеркалить картинку фона</span>
            <Toggle checked={settings.backgroundMirrored} onChange={(v) => update({ backgroundMirrored: v })} />
          </label>

          <div className="rounded-xl border border-border bg-black/20 px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm text-warmwhite/85">Акриловый эффект (размытие)</span>
              <span className="font-mono-ui text-xs font-semibold text-warmwhite">{settings.backgroundBlur}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={24}
              value={settings.backgroundBlur}
              onChange={(e) => update({ backgroundBlur: Number(e.target.value) })}
              className="w-full accent-accent-fire"
            />
          </div>

          <label className="flex items-center justify-between rounded-xl border border-border bg-black/20 px-3 py-2.5">
            <span className="text-sm text-warmwhite/85">Эффект шероховатости (зерно)</span>
            <Toggle checked={settings.grainEnabled} onChange={(v) => update({ grainEnabled: v })} />
          </label>
        </div>
      </section>

      {/* Прочее */}
      <section className="surface rounded-2xl p-5">
        <h2 className="mb-3 font-mono-ui text-xs font-semibold uppercase tracking-wider text-accent-fire">Прочее</h2>

        <label className="flex items-center justify-between rounded-xl border border-border bg-black/20 px-3 py-2.5">
          <div>
            <p className="text-sm text-warmwhite/85">Отключить анимации</p>
            <p className="text-[11px] text-muted">Почти все переходы и анимации будут выключены.</p>
          </div>
          <Toggle checked={settings.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
        </label>

        <button
          type="button"
          onClick={resetToDefaults}
          className="mt-3 text-xs font-semibold text-muted underline decoration-dotted hover:text-warmwhite"
        >
          Сбросить внешний вид к значениям по умолчанию
        </button>
      </section>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked?: boolean; onChange: (value: boolean) => void }) {
  const [internal, setInternal] = useState(checked ?? false);
  const isOn = checked ?? internal;

  function handleClick() {
    const next = !isOn;
    setInternal(next);
    onChange(next);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`h-6 w-11 flex-shrink-0 rounded-full transition-colors ${isOn ? "bg-accent-fire" : "bg-white/10"}`}
    >
      <span
        className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${
          isOn ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function themeLabel(theme: ThemeMode): string {
  return THEME_OPTIONS.find((opt) => opt.value === theme)?.label ?? "";
}

function roundingLabel(rounding: WindowRounding): string {
  return ROUNDING_OPTIONS.find((opt) => opt.value === rounding)?.label ?? "";
}

function textSizeLabel(size: TextSize): string {
  return TEXT_SIZE_OPTIONS.find((opt) => opt.value === size)?.label ?? "";
}
