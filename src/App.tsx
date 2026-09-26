import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";
import WidgetCard from "./components/WidgetCard";
import WidgetModal from "./components/WidgetModal";
import Settings from "./components/Settings";
import WindowControls from "./components/WindowControls";
import UpdateBanner from "./components/UpdateBanner";
import { getScreenshotsFor } from "./data/mockScreenshots";
import { getDefaultVersion } from "./utils/versions";
import { checkForAppUpdate } from "./utils/appUpdate";
import { checkWidgetCompatibility } from "./utils/compatibility";
import { loadLocalState, saveLocalState, resolveWidgetInstallDir } from "./utils/localState";
import { downloadAndExtractWidget, removeWidgetDir } from "./utils/widgetInstall";
import { launchInstalledWidget, copyWidgetObsLink } from "./utils/widgetLaunch";
import { REGISTRY_URL, APP_UPDATE_CHECK_INTERVAL_MS, APP_VERSION } from "./appConfig";
import {
  NavSection,
  WidgetManifest,
  WidgetVersion,
  WidgetWithState,
  WidgetConfigValues,
  FoxFireProfile,
  AppUpdateInfo,
  LocalState,
  RegistryStatus
} from "./types/widget";

export default function App() {
  // Каталог виджетов с GitHub (registry.json) — отдельно от того, что реально
  // установлено на компьютере (см. SYSTEM_RULES.md, раздел 8).
  const [registryWidgets, setRegistryWidgets] = useState<WidgetManifest[]>([]);
  const [registryStatus, setRegistryStatus] = useState<RegistryStatus>("loading");

  // Постоянное локальное состояние: что скачано и какие настройки сохранены.
  // Загружается один раз при старте из foxfire-state.json.
  const [localState, setLocalState] = useState<LocalState>({ installPath: null, installed: [], configs: {} });
  const [localStateLoaded, setLocalStateLoaded] = useState(false);
  // Виджеты, которые прямо сейчас скачиваются (кнопка "Установка...").
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<NavSection>("mods");
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [appUpdate, setAppUpdate] = useState<AppUpdateInfo | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  useEffect(() => {
    loadLocalState().then((state) => {
      setLocalState(state);
      setLocalStateLoaded(true);
    });
  }, []);

  // Загружаем каталог виджетов с GitHub. Пока идёт запрос — показываем
  // анимацию загрузки (см. рендер ниже); если запрос не удался — показываем
  // ошибку и остаёмся только с уже скачанными виджетами (см. список widgets).
  useEffect(() => {
    async function loadRegistry() {
      setRegistryStatus("loading");
      try {
        const response = await fetch(REGISTRY_URL, { cache: "no-store" });
        if (!response.ok) throw new Error(`Сервер ответил ошибкой ${response.status}`);
        const manifests: WidgetManifest[] = await response.json();
        if (!Array.isArray(manifests)) throw new Error("Неверный формат registry.json");
        setRegistryWidgets(manifests);
        setRegistryStatus("ready");
      } catch {
        setRegistryWidgets([]);
        setRegistryStatus("error");
      }
    }
    loadRegistry();
  }, []);

  // Автопроверка обновлений самого приложения — без изменений.
  useEffect(() => {
    let cancelled = false;
    async function runCheck() {
      const result = await checkForAppUpdate();
      if (!cancelled) setAppUpdate(result);
    }
    runCheck();
    const intervalId = setInterval(runCheck, APP_UPDATE_CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  function persist(next: LocalState) {
    setLocalState(next);
    saveLocalState(next);
  }

  // Собирает единый список виджетов для интерфейса: манифесты из registry.json
  // плюс сверху накладывается реальный статус установки из localState. Виджеты,
  // которые скачаны, но их уже нет в registry.json (или сам registry.json сейчас
  // недоступен), тоже попадают в список — по их сохранённому манифесту-снимку,
  // это и даёт правило "если каталог не загрузился — видно только скачанное".
  const widgets: WidgetWithState[] = useMemo(() => {
    const installedById = new Map(localState.installed.map((e) => [e.id, e]));
    const seen = new Set<string>();
    const list: WidgetWithState[] = [];

    registryWidgets.forEach((manifest) => {
      seen.add(manifest.id);
      const installedEntry = installedById.get(manifest.id);
      let status: WidgetWithState["status"] = "not-installed";
      if (installingIds.has(manifest.id)) status = "installing";
      else if (installedEntry) {
        const latest = getDefaultVersion(manifest.versions);
        status = latest.version !== installedEntry.installedVersion ? "update-available" : "installed";
      }
      list.push({ ...manifest, status, installedVersion: installedEntry?.installedVersion });
    });

    localState.installed.forEach((entry) => {
      if (seen.has(entry.id)) return;
      const cachedManifest = localState.configs[entry.id]?.manifest;
      if (!cachedManifest) return;
      list.push({
        ...cachedManifest,
        status: installingIds.has(entry.id) ? "installing" : "installed",
        installedVersion: entry.installedVersion
      });
    });

    return list;
  }, [registryWidgets, localState, installingIds]);

  const configByWidget: Record<string, WidgetConfigValues> = useMemo(() => {
    const result: Record<string, WidgetConfigValues> = {};
    Object.entries(localState.configs).forEach(([id, saved]) => {
      result[id] = saved.config;
    });
    return result;
  }, [localState.configs]);

  const selectedWidget = useMemo(
    () => widgets.find((w) => w.id === selectedWidgetId) ?? null,
    [widgets, selectedWidgetId]
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    widgets.forEach((w) => w.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [widgets]);

  const filteredWidgets = useMemo(() => {
    return widgets.filter((w) => {
      const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase());
      const matchesTags = activeTags.length === 0 || activeTags.every((tag) => w.tags.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [widgets, search, activeTags]);

  const downloadedWidgets = useMemo(
    () => widgets.filter((w) => w.status === "installed" || w.status === "update-available" || w.status === "installing"),
    [widgets]
  );

  function toggleTag(tag: string) {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  // Реально открывает установленный виджет в отдельном окне FoxFire Hub
  // (кнопка "Запустить"). Настройки виджета берутся из foxfire-state.json и
  // передаются через query-параметры URL — см. src/utils/widgetLaunch.ts.
  async function handleLaunch(widget: WidgetWithState) {
    const entry = localState.installed.find((e) => e.id === widget.id);
    if (!entry) return;

    setActionError(null);
    try {
      const config = configByWidget[widget.id] ?? {};
      await launchInstalledWidget(entry, widget, config);
    } catch (error) {
      setActionError(`Не удалось запустить «${widget.name}»: ${String(error)}`);
    }
  }

  // Копирует в буфер обмена file:// ссылку на index.html установленного
  // виджета — вставляется прямо в OBS, в источник "Браузер". Ошибку бросает
  // наружу, чтобы модалка виджета могла показать её рядом с кнопкой.
  async function handleCopyObsLink(widget: WidgetWithState): Promise<void> {
    const entry = localState.installed.find((e) => e.id === widget.id);
    if (!entry) throw new Error("Виджет сейчас не установлен.");
    const config = configByWidget[widget.id] ?? {};
    await copyWidgetObsLink(entry, widget, config);
  }

  // Реально скачивает и распаковывает выбранную версию виджета (Задание:
  // реальная загрузка виджетов). Если у виджета уже есть сохранённые настройки
  // от предыдущей установки (пользователь удалял его с опцией "сохранить
  // настройки") — они не трогаются и снова применяются к виджету автоматически.
  async function handleInstall(widget: WidgetWithState, version: WidgetVersion) {
    const alreadyThisVersion =
      widget.status === "installed" && widget.installedVersion === version.version;
    if (alreadyThisVersion) {
      await handleLaunch(widget); // "Запустить" уже установленный виджет — реальный запуск
      return;
    }
    if (version.status === "unavailable") return;

    const compatibility = checkWidgetCompatibility(widget, version, APP_VERSION);
    if (!compatibility.isCompatible) return;

    setActionError(null);
    setInstallingIds((prev) => new Set(prev).add(widget.id));

    try {
      const dir = await resolveWidgetInstallDir(localState.installPath, widget.id);
      await downloadAndExtractWidget(version.downloadUrl, dir);

      const manifest: WidgetManifest = {
        id: widget.id,
        name: widget.name,
        author: widget.author,
        rating: widget.rating,
        tags: widget.tags,
        shortDescription: widget.shortDescription,
        fullDescription: widget.fullDescription,
        previewUrl: widget.previewUrl,
        configSchema: widget.configSchema,
        versions: widget.versions,
        minAppVersion: widget.minAppVersion,
        maxAppVersion: widget.maxAppVersion
      };

      const nextInstalled = localState.installed.filter((e) => e.id !== widget.id);
      nextInstalled.push({ id: widget.id, installedVersion: version.version, installDir: dir });

      const existingConfig = localState.configs[widget.id]?.config ?? {};
      const nextConfigs = { ...localState.configs, [widget.id]: { manifest, config: existingConfig } };

      persist({ ...localState, installed: nextInstalled, configs: nextConfigs });
    } catch (error) {
      setActionError(`Не удалось установить «${widget.name}»: ${String(error)}`);
    } finally {
      setInstallingIds((prev) => {
        const next = new Set(prev);
        next.delete(widget.id);
        return next;
      });
    }
  }

  function handleCardAction(widget: WidgetWithState) {
    handleInstall(widget, getDefaultVersion(widget.versions));
  }

  // Реально удаляет файлы виджета с диска (Задание: реальное удаление).
  // keepConfig=true — файлы стираются, но настройки виджета остаются
  // сохранёнными и будут применены автоматически при повторной установке.
  // keepConfig=false — стираются и файлы, и сохранённые настройки.
  async function handleUninstall(widgetId: string, keepConfig: boolean) {
    const entry = localState.installed.find((e) => e.id === widgetId);
    if (!entry) return;

    setActionError(null);
    try {
      await removeWidgetDir(entry.installDir);
    } catch (error) {
      setActionError(`Не удалось удалить файлы: ${String(error)}`);
      return;
    }

    const nextInstalled = localState.installed.filter((e) => e.id !== widgetId);
    const nextConfigs = { ...localState.configs };
    if (!keepConfig) delete nextConfigs[widgetId];

    persist({ ...localState, installed: nextInstalled, configs: nextConfigs });
    if (selectedWidgetId === widgetId) setSelectedWidgetId(null);
  }

  // Изменение настройки виджета сразу пишется в foxfire-state.json — так
  // настройки переживают перезапуск приложения (SYSTEM_RULES.md, раздел 8).
  function handleConfigChange(widget: WidgetWithState, key: string, value: string | number | boolean) {
    const manifest: WidgetManifest = localState.configs[widget.id]?.manifest ?? {
      id: widget.id,
      name: widget.name,
      author: widget.author,
      rating: widget.rating,
      tags: widget.tags,
      shortDescription: widget.shortDescription,
      fullDescription: widget.fullDescription,
      previewUrl: widget.previewUrl,
      configSchema: widget.configSchema,
      versions: widget.versions,
      minAppVersion: widget.minAppVersion,
      maxAppVersion: widget.maxAppVersion
    };
    const prevConfig = localState.configs[widget.id]?.config ?? {};
    const nextConfigs = {
      ...localState.configs,
      [widget.id]: { manifest, config: { ...prevConfig, [key]: value } }
    };
    persist({ ...localState, configs: nextConfigs });
  }

  function handleInstallPathChange(path: string | null) {
    persist({ ...localState, installPath: path });
  }

  // Применяет импортированный профиль (Задание 5): для каждого виджета из файла
  // реально скачивает сохранённую версию (если она есть в текущем каталоге и не
  // "unavailable" — иначе ближайшую доступную) и восстанавливает его настройки.
  async function handleApplyImport(profile: FoxFireProfile) {
    handleInstallPathChange(profile.installPath);
    for (const entry of profile.widgets) {
      const widget = widgets.find((w) => w.id === entry.id);
      if (!widget) continue;
      const matchedVersion = widget.versions.find((v) => v.version === entry.installedVersion);
      const versionToUse =
        matchedVersion && matchedVersion.status !== "unavailable" ? matchedVersion : getDefaultVersion(widget.versions);
      await handleInstall(widget, versionToUse);
      Object.entries(entry.config).forEach(([key, value]) => handleConfigChange(widget, key, value));
    }
  }

  const isRegistryLoading = registryStatus === "loading";

  return (
    <div className="app-window flex h-screen w-screen flex-col text-warmwhite">
      <div className="app-mesh-layer" />
      <div className="app-grid-layer" />
      <div className="app-bg-layer" />
      <WindowControls />

      {appUpdate && !updateDismissed && (
        <UpdateBanner update={appUpdate} onDismiss={() => setUpdateDismissed(true)} />
      )}

      <div className="relative z-10 flex-1 overflow-y-auto pb-24">
        <Header
          search={search}
          onSearchChange={setSearch}
          allTags={allTags}
          activeTags={activeTags}
          onToggleTag={toggleTag}
        />

        <main className="mx-auto max-w-5xl px-6 py-6">
          {actionError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-accent-danger/40 bg-accent-danger/10 p-3 text-xs text-accent-danger">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">{actionError}</span>
              <button onClick={() => setActionError(null)} className="font-semibold hover:underline">
                Скрыть
              </button>
            </div>
          )}

          {activeSection === "mods" && (
            <>
              {registryStatus === "error" && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-accent-warning/40 bg-accent-warning/10 p-3 text-xs text-accent-warning">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  Не удалось загрузить каталог виджетов с GitHub (нет интернета, или ещё не настроен
                  REGISTRY_URL в src/appConfig.ts). Показаны только уже скачанные виджеты.
                </div>
              )}

              {isRegistryLoading ? (
                <WidgetGridSkeleton />
              ) : filteredWidgets.length === 0 ? (
                <p className="mt-10 text-center text-sm text-muted">
                  {registryStatus === "error"
                    ? "Скачанных виджетов пока нет."
                    : "Ничего не найдено. Попробуй другой запрос."}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredWidgets.map((widget) => (
                    <WidgetCard
                      key={widget.id}
                      widget={widget}
                      onOpen={(w) => setSelectedWidgetId(w.id)}
                      onAction={handleCardAction}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeSection === "overview" && (
            <p className="mt-10 text-center text-sm text-muted">Раздел "Обзор" пока в разработке.</p>
          )}

          {activeSection === "games" && (
            <p className="mt-10 text-center text-sm text-muted">Раздел "Игры" пока в разработке.</p>
          )}

          {activeSection === "downloaded" && (
            <>
              {!localStateLoaded ? (
                <WidgetGridSkeleton />
              ) : downloadedWidgets.length === 0 ? (
                <p className="mt-10 text-center text-sm text-muted">
                  Здесь появятся виджеты, которые ты скачал. Пока список пуст.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {downloadedWidgets.map((widget) => (
                    <WidgetCard
                      key={widget.id}
                      widget={widget}
                      onOpen={(w) => setSelectedWidgetId(w.id)}
                      onAction={handleCardAction}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeSection === "settings" && (
            <Settings
              widgets={widgets}
              configByWidget={configByWidget}
              installPath={localState.installPath}
              onInstallPathChange={handleInstallPathChange}
              onApplyImport={handleApplyImport}
            />
          )}
        </main>
      </div>

      <BottomNav active={activeSection} onChange={setActiveSection} />

      {selectedWidget && (
        <WidgetModal
          widget={selectedWidget}
          screenshots={getScreenshotsFor(selectedWidget.id, selectedWidget.previewUrl)}
          configValues={configByWidget[selectedWidget.id] ?? {}}
          onConfigChange={(key, value) => handleConfigChange(selectedWidget, key, value)}
          onClose={() => setSelectedWidgetId(null)}
          onAction={handleInstall}
          onUninstall={handleUninstall}
          onCopyObsLink={handleCopyObsLink}
        />
      )}
    </div>
  );
}

// Анимация загрузки каталога — несколько пульсирующих карточек-заглушек вместо
// старых тестовых виджетов из mockWidgets.ts (тот файл больше не используется).
function WidgetGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="surface flex animate-pulse flex-col gap-3 overflow-hidden rounded-2xl p-4">
          <div className="-mx-4 -mt-4 h-36 bg-white/5" />
          <div className="h-4 w-2/3 rounded bg-white/5" />
          <div className="h-3 w-1/3 rounded bg-white/5" />
          <div className="h-3 w-full rounded bg-white/5" />
          <div className="mt-auto flex items-center gap-2 pt-2 text-muted">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-[11px]">Загрузка каталога…</span>
          </div>
        </div>
      ))}
    </div>
  );
}
