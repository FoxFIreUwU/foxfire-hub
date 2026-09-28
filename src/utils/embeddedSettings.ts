// embeddedSettings.ts — общая логика "встроенных настроек" виджета: когда у
// виджета есть собственная страница настроек (settingsEntry), Hub показывает
// её ПРЯМО в разделе "Загруженное" (во вложенном <iframe>), а не в отдельном
// окне и не в разделе установки. Подробный контракт для авторов виджетов —
// SYSTEM_WIDGET_STYLE.md, раздел 11.
import { WidgetManifest } from "../types/widget";

// Тип сообщения, которое встроенная страница настроек шлёт обратно в Hub.
export const EMBEDDED_SETTINGS_MESSAGE_TYPE = "foxfirehub:settings-saved" as const;

// Имя Tauri-события, которым Hub рассылает ЖИВЫЕ изменения настроек всем
// открытым окнам (см. App.tsx → handleConfigChange). Нужно для случая, когда
// у виджета уже открыто отдельное окно (кнопка "Запустить", widgetLaunch.ts)
// и пользователь параллельно правит его настройки — без этого события окно
// подхватило бы новые значения только при следующем перезапуске (query-
// параметры читаются один раз, при создании окна). Событие глобальное для
// всего приложения (не привязано к конкретному окну-получателю), поэтому
// слушатель на стороне виджета обязан сверять payload.widgetId сам —
// см. foxfirehub-bridge.js → onLiveConfigUpdate, это ровно та же проверка,
// что уже делает isEmbeddedSettingsMessage ниже для postMessage-канала.
// Этот канал НЕ заменяет postMessage у settingsEntry (тот остаётся способом
// СОХРАНИТЬ настройки в Hub) — это обратный, дополнительный канал: Hub →
// уже запущенное окно виджета, о том, что настройки поменялись где-то ещё.
export const LIVE_CONFIG_UPDATE_EVENT = "foxfirehub:config-updated" as const;

export interface LiveConfigUpdatePayload {
  widgetId: string;
  key: string;
  value: string | number | boolean;
}

// Какой html-файл настроек использовать для КОНКРЕТНО УСТАНОВЛЕННОЙ версии
// виджета. Версия внутри versions[] может переопределить settingsEntry
// верхнего уровня манифеста — ровно та же логика, что уже используется для
// minAppVersion/maxAppVersion в src/utils/compatibility.ts. Если ни там, ни
// там ничего не указано — встроенных настроек нет, и вызывающий код должен
// показать автоформу по configSchema вместо этого.
//
// Именно эта функция и даёт "разделение между версиями и их настройками":
// у виджета может быть, например, versions = [{version: "2.0.0", settingsEntry:
// "settings.html"}, {version: "1.0.0"}] — тогда для 2.0.0 откроется встроенная
// страница настроек, а для всё ещё установленной у кого-то 1.0.0 — обычная
// автоформа, потому что та версия ничего про settingsEntry не знает.
export function resolveSettingsEntry(manifest: WidgetManifest, installedVersion?: string): string | undefined {
  const versionEntry = manifest.versions.find((v) => v.version === installedVersion);
  return versionEntry?.settingsEntry ?? manifest.settingsEntry;
}

// Идентификатор окна предпросмотра/настроек — используется, чтобы игнорировать
// случайные postMessage от чего-то постороннего (например, от других
// iframe-ов внутри самой страницы настроек виджета, если он их использует
// для живого предпросмотра, как unified-chat).
export function isEmbeddedSettingsMessage(
  data: unknown,
  widgetId: string
): data is { type: typeof EMBEDDED_SETTINGS_MESSAGE_TYPE; widgetId: string; config: Record<string, string | number | boolean> } {
  if (!data || typeof data !== "object") return false;
  const payload = data as Record<string, unknown>;
  return (
    payload.type === EMBEDDED_SETTINGS_MESSAGE_TYPE &&
    payload.widgetId === widgetId &&
    typeof payload.config === "object" &&
    payload.config !== null
  );
}
