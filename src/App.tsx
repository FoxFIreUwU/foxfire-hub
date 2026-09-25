import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";
import WidgetCard from "./components/WidgetCard";
import WidgetModal from "./components/WidgetModal";
import Settings from "./components/Settings";
import WindowControls from "./components/WindowControls";
import UpdateBanner from "./components/UpdateBanner";
import { MOCK_WIDGETS } from "./data/mockWidgets";
import { getScreenshotsFor } from "./data/mockScreenshots";
import { getDefaultVersion } from "./utils/versions";
import { checkForAppUpdate } from "./utils/appUpdate";
import { REGISTRY_URL, APP_UPDATE_CHECK_INTERVAL_MS } from "./appConfig";
import {
  NavSection,
  WidgetManifest,
  WidgetVersion,
  WidgetWithState,
  WidgetConfigValues,
  FoxFireProfile,
  AppUpdateInfo
} from "./types/widget";

export default function App() {
  const [widgets, setWidgets] = useState<WidgetWithState[]>(MOCK_WIDGETS);
  const [activeSection, setActiveSection] = useState<NavSection>("mods");
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [configByWidget, setConfigByWidget] = useState<Record<string, WidgetConfigValues>>({});
  const [appUpdate, setAppUpdate] = useState<AppUpdateInfo | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  // Пытаемся подгрузить реальный список виджетов с GitHub.
  // Если ссылка ещё не настроена (или нет интернета) — тихо остаёмся на тестовых данных.
  useEffect(() => {
    async function loadRegistry() {
      try {
        const response = await fetch(REGISTRY_URL);
        if (!response.ok) return;
        const manifests: WidgetManifest[] = await response.json();
        if (!Array.isArray(manifests) || manifests.length === 0) return;
        setWidgets(manifests.map((m) => ({ ...m, status: "not-installed" as const })));
      } catch {
        // registry.json ещё не настроен — остаёмся на тестовых данных, это нормально.
      }
    }
    loadRegistry();
  }, []);

  // Автопроверка обновлений самого приложения (не виджетов): один раз сразу
  // при запуске и затем повторно каждые APP_UPDATE_CHECK_INTERVAL_MS, пока
  // приложение открыто. Формат ответа и как его выложить на GitHub — см.
  // src/utils/appUpdate.ts и app-version.example.json в корне проекта.
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

  // Держим выбранный виджет по id, а не по копии объекта — так модалка всегда
  // видит свежее состояние (например, когда установка завершается по таймеру).
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

  function toggleTag(tag: string) {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  // Устанавливает/запускает конкретную версию виджета.
  // Если версия недоступна ("unavailable") и она ещё не установлена — ничего не делаем,
  // кнопка в интерфейсе в этом случае и так задизейблена.
  function handleAction(widget: WidgetWithState, version: WidgetVersion) {
    const alreadyInstalledThisVersion = widget.status === "installed" && widget.installedVersion === version.version;

    if (alreadyInstalledThisVersion) {
      // Здесь в реальном приложении вызывается Tauri-команда запуска виджета.
      return;
    }

    if (version.status === "unavailable") return;

    setWidgets((prev) => prev.map((w) => (w.id === widget.id ? { ...w, status: "installing" } : w)));

    // Имитация процесса установки — через 1.2 секунды виджет становится установленным
    // на выбранной версии.
    setTimeout(() => {
      setWidgets((prev) =>
        prev.map((w) => (w.id === widget.id ? { ...w, status: "installed", installedVersion: version.version } : w))
      );
    }, 1200);
  }

  // Быстрая кнопка на карточке всегда работает с версией по умолчанию
  // (последняя stable) — выбор конкретной версии доступен в модалке.
  function handleCardAction(widget: WidgetWithState) {
    handleAction(widget, getDefaultVersion(widget.versions));
  }

  function handleConfigChange(widgetId: string, key: string, value: string | number | boolean) {
    setConfigByWidget((prev) => ({
      ...prev,
      [widgetId]: { ...prev[widgetId], [key]: value }
    }));
  }

  // Применяет импортированный профиль (Задание 5): для каждого виджета из файла,
  // который есть в текущем каталоге, помечает его установленным. Если сохранённая
  // версия не найдена или помечена "unavailable", по SYSTEM_WIDGET_STYLE.md (раздел 8,
  // пункт 3) ставим ближайшую доступную вместо неё — само предупреждение об этом
  // пользователь уже увидел в сводке перед подтверждением (см. Settings.tsx).
  // Реальная загрузка и установка бинарников виджетов пока заглушена — просто
  // обновляем состояние приложения, как и указано в задании.
  function handleApplyImport(profile: FoxFireProfile) {
    setWidgets((prev) =>
      prev.map((w) => {
        const entry = profile.widgets.find((e) => e.id === w.id);
        if (!entry) return w;
        const matchedVersion = w.versions.find((v) => v.version === entry.installedVersion);
        const versionToUse =
          matchedVersion && matchedVersion.status !== "unavailable" ? matchedVersion : getDefaultVersion(w.versions);
        return { ...w, status: "installed" as const, installedVersion: versionToUse.version };
      })
    );

    setConfigByWidget((prev) => {
      const next = { ...prev };
      profile.widgets.forEach((entry) => {
        next[entry.id] = entry.config;
      });
      return next;
    });
  }

  return (
    // .app-window — это и есть "корпус окна": скруглённые углы + обрезка контента
    // задаются тут (см. src/index.css), а не на html/body — окно Tauri теперь
    // прозрачное и без нативной рамки (decorations: false в tauri.conf.json),
    // поэтому именно этот div визуально выглядит как окно приложения.
    <div className="app-window flex h-screen w-screen flex-col text-warmwhite">
      {/* Фоновые слои новой стилистики: тонкая grid-сетка + размытые
          mesh-glow пятна (оранжевый акцент + декоративный фиолетовый) —
          именно они создают "Linear / Vercel dark SaaS" ощущение. */}
      <div className="app-mesh-layer" />
      <div className="app-grid-layer" />

      {/* Задний фон приложения — управляется из Настроек → Внешний вид */}
      <div className="app-bg-layer" />

      {/* Кнопки свернуть/закрыть вместо нативной рамки Windows */}
      <WindowControls />

      {/* Автопроверка обновлений приложения (Задание: авто проверка обновления) —
          баннер появляется сам, без действий пользователя, если на GitHub лежит
          более новая версия, чем APP_VERSION в src/appConfig.ts. */}
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
          {activeSection === "mods" && (
            <>
              {filteredWidgets.length === 0 ? (
                <p className="mt-10 text-center text-sm text-muted">Ничего не найдено. Попробуй другой запрос.</p>
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

          {activeSection === "settings" && (
            <Settings widgets={widgets} configByWidget={configByWidget} onApplyImport={handleApplyImport} />
          )}
        </main>
      </div>

      <BottomNav active={activeSection} onChange={setActiveSection} />

      {selectedWidget && (
        <WidgetModal
          widget={selectedWidget}
          screenshots={getScreenshotsFor(selectedWidget.id, selectedWidget.previewUrl)}
          configValues={configByWidget[selectedWidget.id] ?? {}}
          onConfigChange={(key, value) => handleConfigChange(selectedWidget.id, key, value)}
          onClose={() => setSelectedWidgetId(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
