// Тип одной настройки виджета (например "цвет текста" или "размер шрифта")
export type ConfigFieldType = "color" | "number" | "text" | "boolean" | "select";

export interface ConfigField {
  type: ConfigFieldType;
  label: string;
  default: string | number | boolean;
  options?: string[]; // используется только когда type === "select"
}

// Схема всех настроек виджета: ключ — имя настройки, значение — её описание
export type ConfigSchema = Record<string, ConfigField>;

// Статус установки виджета на компьютере пользователя (локальное состояние, не из манифеста)
export type InstallStatus = "not-installed" | "installing" | "installed" | "update-available";

// Автор виджета. url — необязателен, если он есть, имя становится ссылкой (см. Задание 6).
export interface Author {
  name: string;
  url?: string;
}

// Статус конкретной версии виджета — управляется автором через registry.json на GitHub,
// позволяет временно отключать или помечать нестабильные версии без пересборки приложения.
export type VersionStatus = "stable" | "warning" | "unavailable";

// Одна версия виджета в архиве версий (versions[] в манифесте)
export interface WidgetVersion {
  version: string;
  releaseDate: string; // формат "YYYY-MM-DD", используется для сортировки от новых к старым
  downloadUrl: string;
  status: VersionStatus;
  statusMessage?: string; // текст жёлтого/красного баннера, обязателен для warning/unavailable
  // Необязательное переопределение совместимости конкретно для этой версии виджета
  // (например, версия 2.0.0 виджета требует более новый FoxFire Hub, чем версия 1.x).
  // Если не указано — используется minAppVersion/maxAppVersion из WidgetManifest.
  minAppVersion?: string;
  maxAppVersion?: string;
}

// Манифест одного виджета — то, что лежит в widget.manifest.json / registry.json на GitHub.
// Полная схема описана в SYSTEM_WIDGET_STYLE.md, раздел 2.
export interface WidgetManifest {
  id: string;
  name: string;
  author: Author;
  rating: number; // 0–100, показывается зелёным бейджем
  tags: string[]; // например ["Windows", "OBS", "Chat"]
  shortDescription: string; // короткая строка, всегда видна на карточке и в модалке
  fullDescription: string; // полный текст, скрыт за кнопкой "Показать полностью" в модалке
  previewUrl?: string; // явная обложка карточки; если не указана — берётся первый скриншот
  configSchema?: ConfigSchema;
  versions: WidgetVersion[]; // архив версий, минимум одна запись
  // Совместимость с версией самого FoxFire Hub (см. SYSTEM_WIDGET_STYLE.md, раздел 10).
  // Необязательные поля: если не указаны — считаем, что виджет совместим с любой версией
  // приложения. Формат — такой же, как APP_VERSION в src/appConfig.ts ("1.2.0" или
  // "0.1.0-alpha.1"). Можно задать на уровне всего виджета (общее ограничение) и/или
  // переопределить для конкретной версии внутри WidgetVersion — если задано и там, и там,
  // побеждает ограничение конкретной версии.
  minAppVersion?: string; // минимальная версия FoxFire Hub, начиная с которой виджет работает
  maxAppVersion?: string; // максимальная поддерживаемая версия FoxFire Hub (редко нужно)
}

// Виджет вместе с его текущим состоянием в магазине (локальным для пользователя,
// не хранится в манифесте на GitHub)
export interface WidgetWithState extends WidgetManifest {
  status: InstallStatus;
  installedVersion?: string; // номер версии, которая сейчас установлена (если status === "installed")
}

// Текущие значения настроек конкретного установленного виджета
export type WidgetConfigValues = Record<string, string | number | boolean>;

// Категории нижней навигации
export type NavSection = "mods" | "overview" | "games" | "downloaded" | "settings";

// Статус загрузки каталога виджетов (registry.json) — используется, чтобы
// показать анимацию загрузки или ошибку вместо старых тестовых виджетов-заглушек.
// См. SYSTEM_RULES.md, раздел 8.
export type RegistryStatus = "loading" | "ready" | "error";

// Один реально установленный на компьютере виджет — какая версия стоит и куда
// физически распакованы его файлы (см. SYSTEM_RULES.md, раздел 8).
export interface InstalledWidgetEntry {
  id: string;
  installedVersion: string;
  installDir: string;
}

// Сохранённые настройки виджета вместе со снимком его манифеста на момент
// установки — манифест нужен, чтобы карточку виджета можно было показать во
// вкладке "Загруженное" и в самом файле локального состояния, даже если
// registry.json прямо сейчас недоступен или виджет из него убрали.
export interface SavedWidgetConfig {
  manifest: WidgetManifest;
  config: WidgetConfigValues;
}

// Файл foxfire-state.json (папка данных приложения) — постоянное локальное
// состояние: что реально скачано, куда, и какие у виджетов настройки.
// НЕ путать с foxfirehub-profile.json (Задание 5) — тот пользователь создаёт
// вручную для переноса на другой компьютер, а этот пишется автоматически при
// каждой установке/удалении/изменении настроек. Подробности — SYSTEM_RULES.md, раздел 8.
export interface LocalState {
  installPath: string | null; // null = стандартная папка приложения
  installed: InstalledWidgetEntry[];
  configs: Record<string, SavedWidgetConfig>;
}

// Один установленный виджет внутри файла экспорта настроек (Задание 5).
// Формат описан в SYSTEM_WIDGET_STYLE.md, раздел 8.
export interface ExportedWidgetEntry {
  id: string;
  installedVersion: string;
  config: WidgetConfigValues;
}

// Формат файла foxfirehub-profile.json — им пользователь переносит список
// установленных утилит, их версии, настройки и путь установки на новый компьютер.
export interface FoxFireProfile {
  appVersion: string;
  exportedAt: string; // ISO-дата, например "2026-09-24T12:00:00Z"
  installPath: string;
  widgets: ExportedWidgetEntry[];
}

// Формат файла app-version.json (см. app-version.example.json в корне проекта) —
// приложение периодически скачивает его по ссылке APP_UPDATE_URL (src/appConfig.ts),
// чтобы понять, вышла ли новая версия самого FoxFire Hub (не виджетов).
export interface AppUpdateManifest {
  latestVersion: string; // например "0.2.0" или "0.1.0-beta.1"
  minSupportedVersion?: string; // если указана — версии старше неё считаются "устаревшими" (см. AppUpdateInfo.isMandatory)
  releaseNotes?: string; // короткий текст "что нового", показывается в баннере обновления
  downloadUrl: string; // куда вести пользователя — обычно страница релизов на GitHub
}

// Результат проверки обновлений, который App.tsx кладёт в состояние.
export interface AppUpdateInfo {
  latestVersion: string;
  releaseNotes?: string;
  downloadUrl: string;
  isMandatory: boolean; // true, если текущая версия ниже minSupportedVersion — тогда баннер нельзя скрыть
}
