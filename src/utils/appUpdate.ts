// appUpdate.ts — автопроверка обновлений САМОГО ПРИЛОЖЕНИЯ FoxFire Hub
// (не путать с обновлением виджетов — это отдельный механизм в App.tsx).
import { AppUpdateInfo, AppUpdateManifest } from "../types/widget";
import { APP_UPDATE_URL, APP_VERSION } from "../appConfig";
import { isNewerVersion, compareVersions } from "./semver";

// Скачивает app-version.json и решает, нужно ли показать пользователю баннер
// обновления. Возвращает null, если: обновлений нет, файл ещё не настроен
// (адрес-заглушка), нет интернета, или файл повреждён — во всех этих случаях
// приложение должно просто тихо продолжать работать со своей текущей версией.
export async function checkForAppUpdate(): Promise<AppUpdateInfo | null> {
  if (!APP_UPDATE_URL || APP_UPDATE_URL.includes("YOUR_USER")) {
    // Ссылка ещё не настроена владельцем приложения — это нормальное состояние
    // для только что созданного проекта, ничего не проверяем.
    return null;
  }

  try {
    const response = await fetch(APP_UPDATE_URL, { cache: "no-store" });
    if (!response.ok) return null;

    const manifest: AppUpdateManifest = await response.json();
    if (!manifest || typeof manifest.latestVersion !== "string" || typeof manifest.downloadUrl !== "string") {
      return null;
    }

    const hasNewerVersion = isNewerVersion(manifest.latestVersion, APP_VERSION);
    const isMandatory = Boolean(
      manifest.minSupportedVersion && compareVersions(APP_VERSION, manifest.minSupportedVersion) < 0
    );

    if (!hasNewerVersion && !isMandatory) return null;

    return {
      latestVersion: manifest.latestVersion,
      releaseNotes: manifest.releaseNotes,
      downloadUrl: manifest.downloadUrl,
      isMandatory
    };
  } catch {
    // Нет интернета, GitHub недоступен, JSON повреждён и т.д. — просто не мешаем
    // пользователю работать, попробуем ещё раз при следующей автопроверке.
    return null;
  }
}
