// localState.ts — постоянное локальное состояние FoxFire Hub: какие виджеты
// реально скачаны на этот компьютер, куда именно, и какие у них (и у уже
// удалённых виджетов) сохранены настройки. Правила — SYSTEM_RULES.md, раздел 8.
//
// Хранится в файле foxfire-state.json в папке данных приложения (её выдаёт
// сам Tauri, отдельно для каждой ОС). Это НЕ тот же файл, что
// foxfirehub-profile.json из раздела Настройки — тот создаётся вручную одной
// кнопкой, чтобы перенести профиль на другой компьютер, а foxfire-state.json
// пишется автоматически при каждой установке, удалении и изменении настройки,
// чтобы список скачанного не терялся при обычном перезапуске приложения.
import { appDataDir, join } from "@tauri-apps/api/path";
import { createDir, readTextFile, writeTextFile, exists } from "@tauri-apps/api/fs";
import { LocalState } from "../types/widget";

const STATE_FILE_NAME = "foxfire-state.json";
const EMPTY_STATE: LocalState = { installPath: null, installed: [], configs: {} };

async function stateFilePath(): Promise<string> {
  return join(await appDataDir(), STATE_FILE_NAME);
}

// Читает сохранённое состояние. Если файла ещё нет (первый запуск) или
// приложение сейчас открыто не в Tauri (обычный браузер при разработке
// дизайна, `npm run dev`) — тихо возвращает пустое состояние, это нормально.
export async function loadLocalState(): Promise<LocalState> {
  try {
    const path = await stateFilePath();
    if (!(await exists(path))) return EMPTY_STATE;
    const parsed = JSON.parse(await readTextFile(path));
    if (!parsed || !Array.isArray(parsed.installed) || typeof parsed.configs !== "object") return EMPTY_STATE;
    return {
      installPath: parsed.installPath ?? null,
      installed: parsed.installed,
      configs: parsed.configs ?? {}
    };
  } catch {
    return EMPTY_STATE;
  }
}

// Записи идут строго по очереди и склеиваются: если пока пишется одна версия
// состояния пришла новая — пишется только самая свежая. Раньше десятки
// параллельных writeTextFile (по одному на поле настроек) могли завершиться
// в произвольном порядке, и на диске оставалась НЕ последняя версия.
let latestToSave: LocalState | null = null;
let saveRunning = false;

export async function saveLocalState(state: LocalState): Promise<void> {
  latestToSave = state;
  if (saveRunning) return;
  saveRunning = true;
  try {
    while (latestToSave) {
      const next = latestToSave;
      latestToSave = null;
      try {
        const dir = await appDataDir();
        await createDir(dir, { recursive: true });
        await writeTextFile(await stateFilePath(), JSON.stringify(next, null, 2));
      } catch {
        // Не в Tauri (браузерный dev-режим) — сохранять некуда, и это нормально.
      }
    }
  } finally {
    saveRunning = false;
  }
}

// Папка конкретного виджета внутри выбранного пользователем (или стандартного)
// пути установки. Используется и при скачивании, и при удалении — чтобы обе
// операции всегда указывали на одно и то же место на диске.
export async function resolveWidgetInstallDir(installPath: string | null, widgetId: string): Promise<string> {
  const root = installPath ?? (await join(await appDataDir(), "widgets"));
  return join(root, widgetId);
}
