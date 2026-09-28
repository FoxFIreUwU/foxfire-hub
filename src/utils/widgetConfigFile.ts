// widgetConfigFile.ts — отдельный файл настроек виджета на диске.
//
// Hub сам пишет <папка установки виджета>/config.js при КАЖДОМ изменении
// настроек (а также после установки/переустановки). Виджет читает этот файл
// (обычным <script>, поэтому работает и из file:// в OBS без сервера) и
// подхватывает изменения на лету. Благодаря этому ссылка в OBS постоянная —
// её не нужно копировать заново после каждой правки настроек.
import { exists, writeTextFile } from "@tauri-apps/api/fs";
import { join } from "@tauri-apps/api/path";
import { ConfigSchema, WidgetConfigValues } from "../types/widget";

export const WIDGET_CONFIG_FILE_NAME = "config.js";

// Что уже записано на диск (id -> installDir + содержимое): чтобы не писать
// файл заново, если ничего не изменилось.
const lastWritten = new Map<string, string>();

// Вызывать после (пере)установки: папка виджета стирается целиком, файл
// настроек надо записать заново, даже если содержимое то же самое.
export function invalidateWidgetConfigFile(widgetId: string): void {
  lastWritten.delete(widgetId);
}

export function buildConfigFileContent(schema: ConfigSchema | undefined, config: WidgetConfigValues): string {
  const merged: WidgetConfigValues = {};
  Object.entries(schema ?? {}).forEach(([key, field]) => {
    if (field.default !== undefined && field.default !== null) merged[key] = field.default;
  });
  Object.entries(config ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) merged[key] = value;
  });
  return (
    "// Файл настроек виджета. Создаётся FoxFire Hub автоматически при каждом\n" +
    "// изменении настроек — вручную не редактируй, правки будут перезаписаны.\n" +
    "window.__FOXFIRE_WIDGET_CONFIG__ = " +
    JSON.stringify(merged, null, 2) +
    ";\n"
  );
}

export async function syncWidgetConfigFile(
  widgetId: string,
  installDir: string,
  schema: ConfigSchema | undefined,
  config: WidgetConfigValues
): Promise<void> {
  try {
    const content = buildConfigFileContent(schema, config);
    const key = `${installDir}\n${content}`;
    if (lastWritten.get(widgetId) === key) return;
    if (!(await exists(installDir))) return;
    await writeTextFile(await join(installDir, WIDGET_CONFIG_FILE_NAME), content);
    lastWritten.set(widgetId, key);
  } catch (error) {
    console.warn("FoxFire Hub: не удалось записать файл настроек виджета", widgetId, error);
  }
}
