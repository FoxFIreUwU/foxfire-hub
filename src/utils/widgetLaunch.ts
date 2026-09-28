// widgetLaunch.ts — реальный запуск уже установленного виджета (Задание 1,
// см. NEXT_AGENT_TASK.md). Два способа получить рабочий виджет:
//
// 1. launchInstalledWidget — открывает index.html виджета в отдельном окне
//    самого FoxFire Hub (WebviewWindow). Настройки передаются через
//    query-параметры URL — так же, как их уже читают примеры виджетов
//    (widgets/stream-timer/index.html, widgets/stream-clock/index.html
//    в репозитории foxfire-hub-widgets, через URLSearchParams).
// 2. copyWidgetObsLink — копирует в буфер обмена НАСТОЯЩУЮ file:// ссылку на
//    тот же index.html с теми же query-параметрами. Она нужна отдельно,
//    потому что OBS — отдельная программа со своим источником "Браузер",
//    ей нужен обычный file:// путь на диске, а не внутренняя ссылка
//    приложения (asset://...), которую OBS не понимает.
//
// Подробности архитектурного решения — SYSTEM_RULES.md, раздел 8,
// SYSTEM_WIDGET_STYLE.md, раздел 8а.
import { WebviewWindow } from "@tauri-apps/api/window";
import { join } from "@tauri-apps/api/path";
import { exists } from "@tauri-apps/api/fs";
import { convertFileSrc, invoke } from "@tauri-apps/api/tauri";
import { writeText } from "@tauri-apps/api/clipboard";
import { ConfigSchema, InstalledWidgetEntry, WidgetConfigValues, WidgetManifest } from "../types/widget";
import { loadAppearance, themeBridgeSnapshot } from "./appearance";
import { syncWidgetConfigFile } from "./widgetConfigFile";

// Собирает query-строку из настроек виджета: берёт значения по умолчанию из
// configSchema и поверх накладывает реально сохранённые значения из
// foxfire-state.json. Ключи и формат — ровно то, что читает
// `new URLSearchParams(window.location.search)` внутри самого виджета.
export function buildWidgetQueryString(schema: ConfigSchema | undefined, config: WidgetConfigValues): string {
  const params = new URLSearchParams();
  const keys = new Set<string>([...Object.keys(schema ?? {}), ...Object.keys(config ?? {})]);

  keys.forEach((key) => {
    const value = config?.[key] ?? schema?.[key]?.default;
    if (value === undefined || value === null) return;
    params.set(key, String(value));
  });

  return params.toString();
}

// Собирает query-параметр __hubTheme (см. utils/appearance.ts →
// themeBridgeSnapshot, SYSTEM_WIDGET_STYLE.md раздел 11а) — необязательный
// снимок текущей темы Hub, который свой index.html/settings.html виджета
// может прочитать через foxfirehub-bridge.js и подстроить свои цвета под
// выбранный пользователем акцент. Используется и при запуске окна виджета
// (launchInstalledWidget), и при открытии встроенной страницы настроек
// (WidgetSettingsPanel.tsx) — специально НЕ используется в copyWidgetObsLink:
// ссылка для OBS уходит зрителям/в чужой источник "Браузер", тема личного
// Hub-профиля стримера там ни при чём.
export function buildHubThemeQueryParam(): string {
  const snapshot = themeBridgeSnapshot(loadAppearance());
  return `__hubTheme=${encodeURIComponent(JSON.stringify(snapshot))}`;
}


// === Локальный сервер Hub (src-tauri/src/local_server.rs) ===
// Раздаёт папки виджетов по http://127.0.0.1:ПОРТ/w/<id>/… — эту ссылку понимают
// и OBS, и обычный браузер (в отличие от asset.localhost, который живёт только
// внутри окон Hub). Ниже — регистрация папки виджета на сервере и получение адреса.
export async function registerWidgetDir(entry: InstalledWidgetEntry): Promise<void> {
  try {
    await invoke("register_widget_dir", { id: entry.id, dir: entry.installDir });
  } catch (error) {
    console.warn("FoxFire Hub: не удалось зарегистрировать папку виджета на локальном сервере", error);
  }
}

async function localServerBase(): Promise<string | null> {
  try {
    const port = await invoke<number | null>("local_server_port");
    return port ? `http://127.0.0.1:${port}` : null;
  } catch {
    return null;
  }
}

// Метка окна Tauri для каждого виджета — только буквы/цифры/дефис/подчёркивание.
// id виджета и так должен быть латиницей без пробелов (SYSTEM_WIDGET_STYLE.md,
// раздел 2), но на всякий случай подчищаем, чтобы не сломать создание окна.
function windowLabelFor(widgetId: string): string {
  return `widget-${widgetId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

// Проверяет, что у установленного виджета на месте index.html, и возвращает
// полный путь к нему. Если файлов на месте нет (например, кто-то стёр их
// руками мимо кнопки "Удалить виджет") — понятная ошибка вместо пустого окна.
async function resolveIndexHtmlPath(entry: InstalledWidgetEntry): Promise<string> {
  const indexPath = await join(entry.installDir, "index.html");
  if (!(await exists(indexPath))) {
    throw new Error(
      "Файл index.html не найден в папке установки виджета. Возможно, файлы были удалены вручную — попробуй удалить виджет и установить заново."
    );
  }
  return indexPath;
}

// Открывает установленный виджет в отдельном окне FoxFire Hub. Если окно
// этого виджета уже открыто — просто показывает и фокусирует его вместо
// повторного открытия нового.
export async function launchInstalledWidget(
  entry: InstalledWidgetEntry,
  manifest: WidgetManifest,
  config: WidgetConfigValues
): Promise<void> {
  const indexPath = await resolveIndexHtmlPath(entry);
  const label = windowLabelFor(entry.id);

  const existingWindow = WebviewWindow.getByLabel(label);
  if (existingWindow) {
    await existingWindow.show();
    await existingWindow.setFocus();
    return;
  }

  const query = buildWidgetQueryString(manifest.configSchema, config);
  const themeParam = buildHubThemeQueryParam();
  // Если локальный сервер запущен — открываем виджет по http://127.0.0.1 (так же,
  // как в OBS): тогда окно стримера и OBS работают одинаково, включая чтение чата
  // YouTube без ключа. view=hub говорит виджету, что это окно Hub («Авто» → стример).
  // Иначе — как раньше, через asset.localhost.
  await registerWidgetDir(entry);
  const base = await localServerBase();
  const widgetUrl = base
    ? `${base}/w/${encodeURIComponent(entry.id)}/index.html?` + [query, "view=hub", themeParam].filter(Boolean).join("&")
    : convertFileSrc(indexPath) + "?" + [query, themeParam].filter(Boolean).join("&");

  const widgetWindow = new WebviewWindow(label, {
    url: widgetUrl,
    title: manifest.name,
    width: 640,
    height: 360,
    resizable: true,
    decorations: true,
    transparent: false,
    center: true
  });

  await new Promise<void>((resolve, reject) => {
    widgetWindow.once("tauri://created", () => resolve());
    widgetWindow.once("tauri://error", (event) => {
      reject(new Error(`Не удалось открыть окно виджета: ${String(event.payload)}`));
    });
  });
}

// Превращает путь на диске в правильную file:// ссылку для поля "URL" в
// источнике "Браузер" в OBS.
function toFileUrl(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const withLeadingSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `file://${encodeURI(withLeadingSlash)}`;
}

// Постоянная file:// ссылка на index.html установленного виджета — БЕЗ
// query-параметров. Настройки виджет читает из config.js рядом с собой
// (его пишет сам Hub при каждом изменении, см. widgetConfigFile.ts), поэтому
// ссылку в OBS достаточно вставить один раз. Тот же адрес отдаётся встроенной
// странице настроек (параметр __obsUrl) для её кнопки "Скопировать ссылку".
export async function getWidgetObsUrl(entry: InstalledWidgetEntry): Promise<string> {
  const indexPath = await resolveIndexHtmlPath(entry);
  await registerWidgetDir(entry);
  const base = await localServerBase();
  // Постоянная http-ссылка (работает в OBS и в браузере); ?view=obs — всегда прозрачный оверлей.
  if (base) return `${base}/w/${encodeURIComponent(entry.id)}/index.html?view=obs`;
  return toFileUrl(indexPath);
}

// Копирует эту ссылку в буфер обмена (Источник → Браузер → URL).
export async function copyWidgetObsLink(
  entry: InstalledWidgetEntry,
  manifest: WidgetManifest,
  config: WidgetConfigValues
): Promise<void> {
  // На случай, если config.js ещё не создан (только что установили виджет).
  await syncWidgetConfigFile(entry.id, entry.installDir, manifest.configSchema, config);
  await writeText(await getWidgetObsUrl(entry));
}
