// Вся логика раздела "Внешний вид" (позаимствован стиль настроек из референса) —
// в одном месте, чтобы AppearanceSettings.tsx оставался про UI, а не про то,
// как именно применяются CSS-переменные.

export type ThemeMode = "system" | "dark" | "light";
export type WindowRounding = "none" | "small" | "standard" | "large";
export type TextSize = "small" | "standard" | "large";

export interface AppearanceSettings {
  theme: ThemeMode;
  accentColor: string; // hex, например "#e2820a"
  rounding: WindowRounding;
  textSize: TextSize;
  backgroundImage: string | null; // CSS background-image значение ("url(...)" или "linear-gradient(...)") либо null
  backgroundMirrored: boolean;
  backgroundBlur: number; // px, 0–24
  grainEnabled: boolean;
  reduceMotion: boolean;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: "system",
  accentColor: "#ff7a1a",
  rounding: "standard",
  textSize: "standard",
  backgroundImage: null,
  backgroundMirrored: false,
  backgroundBlur: 0,
  grainEnabled: true,
  reduceMotion: false
};

const STORAGE_KEY = "foxfire-appearance";

const ROUNDING_PX: Record<WindowRounding, string> = {
  none: "0px",
  small: "8px",
  standard: "16px",
  large: "26px"
};

const TEXT_SCALE: Record<TextSize, string> = {
  small: "93.75%",
  standard: "100%",
  large: "112.5%"
};

// Немного затемняет hex-цвет — используется, чтобы вывести цвет hover-состояния
// кнопок (accent-firedark) из одного выбранного пользователем акцентного цвета.
export function darkenHex(hex: string, amount = 0.18): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.floor(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0xff) * (1 - amount)));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function loadAppearance(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_APPEARANCE, ...parsed };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearance(settings: AppearanceSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage недоступен — настройки просто не переживут перезапуск.
  }
}

// Применяет настройки к <html>: CSS-переменные + data-атрибуты.
// Вызывается один раз при старте и заново при каждом изменении в AppearanceSettings.tsx.
export function applyAppearance(settings: AppearanceSettings) {
  const root = document.documentElement;

  if (settings.theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", settings.theme);
  }

  root.style.setProperty("--color-fire", settings.accentColor);
  root.style.setProperty("--color-firedark", darkenHex(settings.accentColor));
  root.style.setProperty("--color-fire-glow", hexToRgba(settings.accentColor, 0.45));

  root.style.setProperty("--radius-window", ROUNDING_PX[settings.rounding]);
  root.style.setProperty("--text-scale", TEXT_SCALE[settings.textSize]);

  root.style.setProperty("--app-bg-image", settings.backgroundImage ?? "none");
  root.style.setProperty("--app-bg-transform", settings.backgroundMirrored ? "scaleX(-1)" : "none");
  root.style.setProperty("--app-bg-blur", `${settings.backgroundBlur}px`);

  root.setAttribute("data-reduce-motion", settings.reduceMotion ? "true" : "false");
  root.setAttribute("data-grain", settings.grainEnabled ? "true" : "false");
}

// Несколько готовых фонов, чтобы не тянуть их из интернета — просто CSS-градиенты
// в стиле бренда FoxFire. Пользователь также может выбрать свою картинку с диска
// (см. AppearanceSettings.tsx, кнопка "Добавить свой фон").
export const BACKGROUND_PRESETS: { id: string; label: string; css: string }[] = [
  { id: "none", label: "Без фона", css: "none" },
  {
    id: "mesh",
    label: "Mesh",
    css: "radial-gradient(circle at 15% 10%, rgba(139,92,246,0.28), transparent 55%), radial-gradient(circle at 85% 20%, rgba(255,122,26,0.32), transparent 55%), radial-gradient(circle at 50% 100%, rgba(139,92,246,0.18), transparent 60%)"
  },
  {
    id: "ember",
    label: "Угли",
    css: "radial-gradient(circle at 20% 20%, rgba(226,130,10,0.35), transparent 55%), radial-gradient(circle at 80% 80%, rgba(194,105,10,0.25), transparent 55%)"
  },
  {
    id: "campfire",
    label: "Костёр",
    css: "linear-gradient(160deg, rgba(226,130,10,0.28) 0%, rgba(13,12,15,0) 45%), linear-gradient(20deg, rgba(194,105,10,0.2) 0%, rgba(13,12,15,0) 60%)"
  },
  {
    id: "midnight",
    label: "Полночь",
    css: "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.18), transparent 60%)"
  }
];
