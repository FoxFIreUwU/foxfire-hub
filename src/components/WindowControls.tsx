import { Minus, X } from "lucide-react";
import { appWindow } from "@tauri-apps/api/window";

// Заменяет собой нативную рамку Windows (см. tauri.conf.json → decorations: false).
// Вместо неё — тонкая невидимая область для перетаскивания окна мышью и пара
// минималистичных кнопок свернуть/закрыть, лежащих прямо поверх интерфейса,
// без отдельной закрашенной полосы ("подбородка") сверху.
export default function WindowControls() {
  async function handleMinimize() {
    try {
      await appWindow.minimize();
    } catch {
      // Не в Tauri (например, открыто в обычном браузере при разработке) — игнорируем.
    }
  }

  async function handleClose() {
    try {
      await appWindow.close();
    } catch {
      // Не в Tauri — игнорируем.
    }
  }

  return (
    <>
      {/* Невидимая полоса для перетаскивания окна. Специально не содержит внутри
          себя других элементов, чтобы Tauri не перехватывал клики по кнопкам ниже. */}
      {/* position: absolute (а не fixed) — так полоса перетаскивания и кнопки
          остаются внутри .app-window и подрезаются вместе со скруглёнными углами,
          а не торчат поверх них поверх всего экрана. */}
      <div data-tauri-drag-region className="absolute inset-x-0 top-0 z-40 h-7" />

      <div className="absolute right-2.5 top-2 z-50 flex items-center gap-1">
        <button
          type="button"
          onClick={handleMinimize}
          aria-label="Свернуть"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/10 hover:text-warmwhite"
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Закрыть"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-accent-danger hover:text-white"
        >
          <X size={15} />
        </button>
      </div>
    </>
  );
}
