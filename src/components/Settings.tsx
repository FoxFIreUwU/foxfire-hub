import { useState } from "react";
import { FolderOpen, Download, Upload, Check, AlertTriangle, SlidersHorizontal, Sparkles } from "lucide-react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/api/dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/api/fs";
import { WidgetWithState, WidgetConfigValues, FoxFireProfile } from "../types/widget";
import AppearanceSettings from "./AppearanceSettings";
import { APP_VERSION, APP_STAGE_LABEL } from "../appConfig";

// Путь установки, экспорт/импорт профиля и список установленных виджетов теперь
// хранятся не здесь, а в общем локальном состоянии приложения (foxfire-state.json,
// см. src/utils/localState.ts и SYSTEM_RULES.md, раздел 8) — этот компонент только
// показывает их и просит App.tsx изменить состояние.
const DEFAULT_INSTALL_PATH_LABEL = "Стандартная папка приложения";

type SettingsTab = "general" | "appearance";

const TABS: { id: SettingsTab; label: string; icon: typeof SlidersHorizontal }[] = [
  { id: "general", label: "Основное", icon: SlidersHorizontal },
  { id: "appearance", label: "Внешний вид", icon: Sparkles }
];

interface SettingsProps {
  widgets: WidgetWithState[];
  configByWidget: Record<string, WidgetConfigValues>;
  installPath: string | null;
  onInstallPathChange: (path: string | null) => void;
  onApplyImport: (profile: FoxFireProfile) => void;
}

// Обёртка с боковым меню в стиле референса ("Основное" / "Внешний вид" слева,
// содержимое раздела справа). Сама логика пути установки и экспорта/импорта —
// в GeneralSettings ниже, логика внешнего вида — в AppearanceSettings.tsx.
export default function Settings({ widgets, configByWidget, installPath, onInstallPathChange, onApplyImport }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  return (
    <div className="mx-auto flex max-w-3xl gap-6">
      <nav className="w-44 flex-shrink-0">
        <h1 className="scanline-text mb-3 px-1 text-lg font-extrabold tracking-tight text-warmwhite">Настройки</h1>
        <div className="flex flex-col gap-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                  isActive ? "bg-accent-fire/15 text-accent-fire shadow-glow-sm" : "text-muted hover:bg-white/5 hover:text-warmwhite"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        {activeTab === "general" && (
          <GeneralSettings
            widgets={widgets}
            configByWidget={configByWidget}
            installPath={installPath}
            onInstallPathChange={onInstallPathChange}
            onApplyImport={onApplyImport}
          />
        )}
        {activeTab === "appearance" && <AppearanceSettings />}
      </div>
    </div>
  );
}

function GeneralSettings({ widgets, configByWidget, installPath, onInstallPathChange, onApplyImport }: SettingsProps) {
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  // Профиль, который прочитан из файла, но ещё не применён — ждёт подтверждения пользователя.
  const [pendingProfile, setPendingProfile] = useState<FoxFireProfile | null>(null);

  // Открывает системный диалог выбора папки (Tauri dialog plugin).
  async function handleChoosePath() {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (typeof selected === "string") {
        onInstallPathChange(selected);
      }
    } catch {
      // Пользователь закрыл диалог, либо приложение сейчас открыто не в Tauri
      // (например, в обычном браузере при разработке) — тогда диалог недоступен.
    }
  }

  // Собирает foxfirehub-profile.json из текущего состояния приложения и сохраняет его
  // через системный диалог сохранения файла.
  async function handleExport() {
    setExportMessage(null);
    const installedWidgets = widgets.filter((w) => w.status === "installed" && w.installedVersion);

    const profile: FoxFireProfile = {
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      installPath: installPath ?? DEFAULT_INSTALL_PATH_LABEL,
      widgets: installedWidgets.map((w) => ({
        id: w.id,
        installedVersion: w.installedVersion as string,
        config: configByWidget[w.id] ?? {}
      }))
    };

    try {
      const targetPath = await saveDialog({
        defaultPath: "foxfirehub-profile.json",
        filters: [{ name: "FoxFire Hub Profile", extensions: ["json"] }]
      });
      if (!targetPath) return;
      await writeTextFile(targetPath, JSON.stringify(profile, null, 2));
      setExportMessage("Готово: настройки сохранены в файл.");
    } catch {
      setExportMessage("Не удалось сохранить файл. Попробуй ещё раз.");
    }
  }

  // Открывает диалог выбора файла, читает и парсит его, но НЕ применяет сразу —
  // сначала показывает пользователю сводку и ждёт подтверждения.
  async function handleImportPick() {
    setImportError(null);
    setPendingProfile(null);
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "FoxFire Hub Profile", extensions: ["json"] }]
      });
      if (typeof selected !== "string") return;

      const raw = await readTextFile(selected);
      const parsed = JSON.parse(raw) as FoxFireProfile;

      if (!parsed || !Array.isArray(parsed.widgets) || typeof parsed.installPath !== "string") {
        setImportError("Файл повреждён или это не профиль FoxFire Hub.");
        return;
      }

      setPendingProfile(parsed);
    } catch {
      setImportError("Не удалось прочитать файл. Проверь, что он не повреждён.");
    }
  }

  // Сверяет профиль с текущим каталогом виджетов и готовит список предупреждений
  // для сводки перед подтверждением (SYSTEM_WIDGET_STYLE.md, раздел 8, пункт 3):
  // если сохранённая версия недоступна ("unavailable") или её вообще нет в каталоге,
  // пользователь должен узнать об этом до импорта, а не после.
  function describeImportIssues(profile: FoxFireProfile): string[] {
    return profile.widgets
      .map((entry) => {
        const widget = widgets.find((w) => w.id === entry.id);
        if (!widget) {
          return `«${entry.id}» — такого виджета нет в текущем каталоге, будет пропущен.`;
        }
        const version = widget.versions.find((v) => v.version === entry.installedVersion);
        if (!version) {
          return `«${widget.name}»: версии ${entry.installedVersion} больше нет, будет установлена ближайшая доступная.`;
        }
        if (version.status === "unavailable") {
          return `«${widget.name}»: версия ${entry.installedVersion} сейчас недоступна, будет установлена ближайшая доступная — настройки могут не полностью совпасть.`;
        }
        return null;
      })
      .filter((issue): issue is string => Boolean(issue));
  }

  // Применяет ранее прочитанный профиль: меняет путь установки и передаёт список
  // виджетов наверх, в App.tsx — там реальная загрузка и установка виджетов пока
  // заглушена и просто обновляет состояние приложения (полноценная установка появится позже).
  function confirmImport() {
    if (!pendingProfile) return;
    onInstallPathChange(pendingProfile.installPath);
    onApplyImport(pendingProfile);
    setPendingProfile(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="surface rounded-2xl p-5">
        <h2 className="mb-1 font-mono-ui text-xs font-semibold uppercase tracking-wider text-accent-fire">Путь установки</h2>
        <p className="mb-4 text-xs text-muted">Сюда будут устанавливаться утилиты (виджеты).</p>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-black/20 px-3 py-2.5">
          <FolderOpen size={16} className="flex-shrink-0 text-muted" />
          <span className="flex-1 truncate text-sm text-warmwhite/85">
            {installPath ?? DEFAULT_INSTALL_PATH_LABEL}
          </span>
        </div>

        <button
          onClick={handleChoosePath}
          className="scanline glow-accent mt-3 overflow-hidden rounded-xl bg-accent-firedark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-fire"
        >
          Выбрать папку
        </button>
      </section>

      <section className="surface rounded-2xl p-5">
        <h2 className="mb-1 font-mono-ui text-xs font-semibold uppercase tracking-wider text-accent-fire">Перенос между ПК</h2>
        <p className="mb-4 text-xs text-muted">
          Сохрани список установленных утилит и их настроек в файл — на новом компьютере
          загрузи этот файл, чтобы не настраивать всё заново.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            className="scanline glow-accent flex items-center gap-2 overflow-hidden rounded-xl bg-accent-firedark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-fire"
          >
            <Download size={16} />
            Экспортировать настройки
          </button>

          <button
            onClick={handleImportPick}
            className="flex items-center gap-2 rounded-xl border border-border bg-black/20 px-4 py-2 text-sm font-semibold text-warmwhite transition-colors hover:border-accent-fire/50"
          >
            <Upload size={16} />
            Импортировать настройки
          </button>
        </div>

        {exportMessage && <p className="mt-3 text-xs text-accent-green">{exportMessage}</p>}

        {importError && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-accent-danger">
            <AlertTriangle size={14} />
            {importError}
          </p>
        )}

        {pendingProfile && (
          <div className="mt-4 rounded-xl border border-accent-fire/30 bg-accent-fire/10 p-4">
            <p className="mb-1 text-sm font-semibold text-warmwhite">Импортировать этот профиль?</p>
            <p className="text-xs text-warmwhite/80">
              Будет установлено {pendingProfile.widgets.length} утилит(ы), путь установки будет
              изменён на «{pendingProfile.installPath}».
            </p>

            {describeImportIssues(pendingProfile).length > 0 && (
              <ul className="mt-2 flex flex-col gap-1 rounded-lg border border-accent-warning/30 bg-accent-warning/10 p-2.5">
                {describeImportIssues(pendingProfile).map((issue) => (
                  <li key={issue} className="flex items-start gap-1.5 text-[11px] text-accent-warning">
                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={confirmImport}
                className="flex items-center gap-1.5 rounded-lg bg-accent-fire px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-firedark"
              >
                <Check size={14} />
                Подтвердить
              </button>
              <button
                onClick={() => setPendingProfile(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-warmwhite/80 hover:text-warmwhite"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="surface rounded-2xl p-5">
        <h2 className="mb-1 font-mono-ui text-xs font-semibold uppercase tracking-wider text-accent-fire">
          О приложении
        </h2>
        <p className="text-sm text-warmwhite/85">
          FoxFire Hub · версия {APP_VERSION}{" "}
          <span className="rounded-md border border-accent-warning/40 bg-accent-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-accent-warning">
            {APP_STAGE_LABEL}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted">
          Это ранняя альфа-версия: часть функций — заглушки для проверки интерфейса (см.
          README.md, раздел «Что уже работает, а что пока заглушка»). Проверка обновлений
          приложения выполняется автоматически при запуске.
        </p>
      </section>
    </div>
  );
}
