// compatibility.ts — проверка того, подходит ли текущая версия FoxFire Hub
// для установки конкретной версии виджета. Правила и формат полей описаны
// в SYSTEM_WIDGET_STYLE.md, раздел 10 ("Совместимость с версией приложения").
import { WidgetManifest, WidgetVersion } from "../types/widget";
import { satisfiesRange } from "./semver";

export interface CompatibilityResult {
  isCompatible: boolean;
  // Заполнено только когда isCompatible === false — готовый текст для красного
  // баннера в модалке виджета (по аналогии с status "unavailable").
  reason?: string;
}

// Версия внутри WidgetVersion может переопределить ограничения виджета целиком —
// если в конкретной версии поле не задано, используем общее из манифеста.
export function checkWidgetCompatibility(
  widget: Pick<WidgetManifest, "minAppVersion" | "maxAppVersion">,
  version: Pick<WidgetVersion, "minAppVersion" | "maxAppVersion">,
  currentAppVersion: string
): CompatibilityResult {
  const minAppVersion = version.minAppVersion ?? widget.minAppVersion;
  const maxAppVersion = version.maxAppVersion ?? widget.maxAppVersion;

  if (!minAppVersion && !maxAppVersion) {
    return { isCompatible: true };
  }

  const isCompatible = satisfiesRange(currentAppVersion, minAppVersion, maxAppVersion);
  if (isCompatible) {
    return { isCompatible: true };
  }

  if (minAppVersion && !maxAppVersion) {
    return {
      isCompatible: false,
      reason: `Нужна версия FoxFire Hub не ниже ${minAppVersion} (сейчас установлена ${currentAppVersion}). Обнови приложение, чтобы установить эту версию виджета.`
    };
  }

  if (maxAppVersion && !minAppVersion) {
    return {
      isCompatible: false,
      reason: `Виджет рассчитан на FoxFire Hub версии не выше ${maxAppVersion} (сейчас установлена ${currentAppVersion}). Автор ещё не обновил виджет под новую версию приложения.`
    };
  }

  return {
    isCompatible: false,
    reason: `Виджет требует версию FoxFire Hub от ${minAppVersion} до ${maxAppVersion} (сейчас установлена ${currentAppVersion}).`
  };
}
