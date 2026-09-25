import { WidgetWithState } from "../types/widget";

// Тестовые данные — используются, пока не подключен реальный registry.json с GitHub.
// Как только появится свой репозиторий, замени REGISTRY_URL в src/App.tsx
// на реальную ссылку — и этот файл больше не понадобится.
//
// Схема соответствует SYSTEM_WIDGET_STYLE.md: у каждого виджета есть author-объект,
// shortDescription/fullDescription и массив versions[] с архивом версий и статусами.
export const MOCK_WIDGETS: WidgetWithState[] = [
  {
    id: "neon-chat-box",
    name: "Неоновый чат",
    author: { name: "PixelForge", url: "https://github.com/PixelForge" },
    rating: 94,
    tags: ["OBS", "Chat", "Windows"],
    shortDescription: "Оверлей чата с неоновой подсветкой ников и анимацией новых сообщений.",
    fullDescription:
      "Полноценный оверлей чата для OBS с неоновой подсветкой ников зрителей и плавной " +
      "анимацией появления новых сообщений. Поддерживает Twitch и YouTube чаты, умеет " +
      "скрывать команды ботов и фильтровать спам-сообщения. Цвет подсветки и размер шрифта " +
      "настраиваются в панели виджета. Известное ограничение: при очень длинных никнеймах " +
      "(более 24 символов) текст может обрезаться на узких оверлеях.",
    previewUrl: "https://picsum.photos/seed/neon-chat-box-1/640/400",
    status: "not-installed",
    configSchema: {
      textColor: { type: "color", label: "Цвет текста", default: "#e2820a" },
      fontSize: { type: "number", label: "Размер шрифта", default: 18 },
      showBadges: { type: "boolean", label: "Показывать бейджи", default: true }
    },
    versions: [
      {
        version: "1.2.0",
        releaseDate: "2026-09-01",
        downloadUrl: "https://github.com/PixelForge/neon-chat-box/releases/download/v1.2.0/neon-chat-box.zip",
        status: "stable",
        statusMessage: ""
      },
      {
        version: "1.1.0",
        releaseDate: "2026-06-14",
        downloadUrl: "https://github.com/PixelForge/neon-chat-box/releases/download/v1.1.0/neon-chat-box.zip",
        status: "warning",
        statusMessage: "Известна проблема с прозрачностью фона на Windows 11."
      },
      {
        version: "1.0.0",
        releaseDate: "2026-03-02",
        downloadUrl: "https://github.com/PixelForge/neon-chat-box/releases/download/v1.0.0/neon-chat-box.zip",
        status: "unavailable",
        statusMessage: "Несовместима с текущей версией FoxFire Hub, установка отключена."
      }
    ]
  },
  {
    id: "donation-alerts",
    name: "Алерты донатов",
    author: { name: "StreamCraft", url: "https://github.com/StreamCraft" },
    rating: 96,
    tags: ["OBS", "Streamlabs", "Windows"],
    shortDescription: "Яркие всплывающие уведомления о донатах со звуком и анимацией монет.",
    fullDescription:
      "Показывает яркое всплывающее уведомление при каждом донате — с именем зрителя, " +
      "суммой и опциональным звуком. Есть готовые пресеты анимации (монеты, конфетти, огонь) " +
      "и порог минимальной суммы, ниже которого алерт не показывается, чтобы не спамить " +
      "мелкими донатами. Интегрируется со Streamlabs и DonationAlerts.",
    previewUrl: "https://picsum.photos/seed/donation-alerts-1/640/400",
    status: "installed",
    installedVersion: "3.0.1",
    configSchema: {
      sound: { type: "select", label: "Звук", default: "coins", options: ["coins", "bell", "none"] },
      minAmount: { type: "number", label: "Минимальная сумма", default: 50 }
    },
    versions: [
      {
        version: "3.0.1",
        releaseDate: "2026-08-20",
        downloadUrl: "https://github.com/StreamCraft/donation-alerts/releases/download/v3.0.1/donation-alerts.zip",
        status: "stable",
        statusMessage: ""
      },
      {
        version: "2.4.0",
        releaseDate: "2026-04-11",
        downloadUrl: "https://github.com/StreamCraft/donation-alerts/releases/download/v2.4.0/donation-alerts.zip",
        status: "stable",
        statusMessage: ""
      }
    ]
  },
  {
    id: "goal-bar",
    name: "Полоса цели",
    author: { name: "TvoyNik", url: "https://github.com/TvoyNik" },
    rating: 88,
    tags: ["OBS", "Windows"],
    shortDescription: "Прогресс-бар подписчиков или донатов с плавной анимацией заполнения.",
    fullDescription:
      "Прогресс-бар для отслеживания цели по подписчикам, донатам или подпискам с плавной " +
      "анимацией заполнения при каждом новом событии. Название цели, текущее и целевое " +
      "значение задаются в настройках виджета, цвет полосы можно подобрать под дизайн стрима.",
    previewUrl: "https://picsum.photos/seed/goal-bar-1/640/400",
    status: "not-installed",
    configSchema: {
      goalLabel: { type: "text", label: "Название цели", default: "До 1000 подписчиков" },
      barColor: { type: "color", label: "Цвет полосы", default: "#22c55e" }
    },
    versions: [
      {
        version: "1.0.4",
        releaseDate: "2026-07-05",
        downloadUrl: "https://github.com/TvoyNik/goal-bar/releases/download/v1.0.4/goal-bar.zip",
        status: "stable",
        statusMessage: ""
      },
      {
        version: "1.0.3",
        releaseDate: "2026-05-19",
        downloadUrl: "https://github.com/TvoyNik/goal-bar/releases/download/v1.0.3/goal-bar.zip",
        status: "warning",
        statusMessage: "Иногда неверно округляет проценты при значениях выше 1000."
      }
    ]
  },
  {
    id: "spotify-now-playing",
    name: "Spotify Now Playing",
    author: { name: "AudioLab", url: "https://github.com/AudioLab" },
    rating: 91,
    tags: ["Windows", "Spotify"],
    shortDescription: "Показывает текущий трек и обложку альбома в нижнем углу экрана.",
    fullDescription:
      "Подключается к Spotify через официальный API и показывает на оверлее текущий трек, " +
      "исполнителя и обложку альбома с мягкой анимацией смены трека. Можно отключить показ " +
      "обложки, оставив только текст, для более минималистичного оверлея.",
    previewUrl: "https://picsum.photos/seed/spotify-now-playing-1/640/400",
    status: "update-available",
    installedVersion: "2.0.0",
    configSchema: {
      showAlbumArt: { type: "boolean", label: "Показывать обложку", default: true }
    },
    versions: [
      {
        version: "2.1.0",
        releaseDate: "2026-09-10",
        downloadUrl: "https://github.com/AudioLab/spotify-now-playing/releases/download/v2.1.0/spotify-now-playing.zip",
        status: "stable",
        statusMessage: ""
      },
      {
        version: "2.0.0",
        releaseDate: "2026-02-27",
        downloadUrl: "https://github.com/AudioLab/spotify-now-playing/releases/download/v2.0.0/spotify-now-playing.zip",
        status: "stable",
        statusMessage: ""
      }
    ]
  },
  {
    id: "chat-poll",
    name: "Голосование в чате",
    author: { name: "PixelForge", url: "https://github.com/PixelForge" },
    rating: 85,
    tags: ["Chat", "OBS"],
    shortDescription: "Запускай опросы прямо в чате и показывай живые результаты на стриме.",
    fullDescription:
      "Позволяет запускать опросы прямо через команды в чате и показывает живые результаты " +
      "в виде графика на оверлее. Длительность опроса и цвет графика настраиваются. Хорошо " +
      "подходит для стримов, где зрители выбирают, что делать дальше.",
    previewUrl: "https://picsum.photos/seed/chat-poll-1/640/400",
    status: "not-installed",
    configSchema: {
      pollColor: { type: "color", label: "Цвет графика", default: "#3b82f6" },
      duration: { type: "number", label: "Длительность (сек)", default: 60 }
    },
    versions: [
      {
        version: "1.5.2",
        releaseDate: "2026-08-02",
        downloadUrl: "https://github.com/PixelForge/chat-poll/releases/download/v1.5.2/chat-poll.zip",
        status: "stable",
        statusMessage: "",
        // Пример поля из Задания про проверку версии приложения (SYSTEM_WIDGET_STYLE.md,
        // раздел 10): эта версия виджета написана под ещё не вышедший FoxFire Hub 0.2.0,
        // поэтому на текущей альфе (0.1.0-alpha.1) кнопка установки будет заблокирована
        // с жёлтым предупреждением — можно проверить это прямо в тестовых данных.
        minAppVersion: "0.2.0"
      },
      {
        version: "1.4.0",
        releaseDate: "2026-05-30",
        downloadUrl: "https://github.com/PixelForge/chat-poll/releases/download/v1.4.0/chat-poll.zip",
        status: "unavailable",
        statusMessage: "Критический баг с подсчётом голосов, установка отключена."
      }
    ]
  },
  {
    id: "webcam-frame",
    name: "Рамка для веб-камеры",
    author: { name: "StreamCraft", url: "https://github.com/StreamCraft" },
    rating: 79,
    tags: ["OBS"],
    shortDescription: "Стильная анимированная рамка вокруг веб-камеры с неоновым контуром.",
    fullDescription:
      "Добавляет стильную анимированную рамку вокруг источника веб-камеры в OBS с неоновым " +
      "светящимся контуром. Цвет рамки настраивается под фирменные цвета канала. Работает как " +
      "отдельный источник — просто перетащи поверх камеры в сцене OBS.",
    previewUrl: "https://picsum.photos/seed/webcam-frame-1/640/400",
    status: "not-installed",
    configSchema: {
      frameColor: { type: "color", label: "Цвет рамки", default: "#e2820a" }
    },
    versions: [
      {
        version: "1.0.0",
        releaseDate: "2026-03-15",
        downloadUrl: "https://github.com/StreamCraft/webcam-frame/releases/download/v1.0.0/webcam-frame.zip",
        status: "stable",
        statusMessage: ""
      }
    ]
  }
];
