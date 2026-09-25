import { Download, X, Sparkles } from "lucide-react";
import { open as openExternalLink } from "@tauri-apps/api/shell";
import { AppUpdateInfo } from "../types/widget";

interface UpdateBannerProps {
  update: AppUpdateInfo;
  onDismiss: () => void;
}

// Полоса-уведомление о новой версии FoxFire Hub. Показывается наверху, под
// кнопками свернуть/закрыть. Если update.isMandatory — крестик закрытия не
// показываем: это значит, что текущая версия ниже minSupportedVersion из
// app-version.json, и автор явно попросил не давать пользователю её игнорировать
// (например, старая версия больше не может читать новый формат registry.json).
export default function UpdateBanner({ update, onDismiss }: UpdateBannerProps) {
  return (
    <div className="relative z-20 flex items-center gap-3 border-b border-accent-fire/30 bg-accent-fire/10 px-4 py-2.5 text-sm">
      <Sparkles size={16} className="flex-shrink-0 text-accent-fire" />

      <div className="min-w-0 flex-1">
        <span className="font-semibold text-warmwhite">Доступна новая версия {update.latestVersion}.</span>{" "}
        <span className="text-warmwhite/80">
          {update.isMandatory
            ? "Текущая версия больше не поддерживается — обнови приложение, чтобы всё продолжало работать корректно."
            : update.releaseNotes || "Рекомендуем обновиться."}
        </span>
      </div>

      <button
        type="button"
        onClick={() => openExternalLink(update.downloadUrl).catch(() => {})}
        className="scanline glow-accent flex flex-shrink-0 items-center gap-1.5 overflow-hidden rounded-lg bg-accent-firedark px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-fire"
      >
        <Download size={14} />
        Скачать обновление
      </button>

      {!update.isMandatory && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 text-muted hover:text-warmwhite"
          aria-label="Скрыть уведомление"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
