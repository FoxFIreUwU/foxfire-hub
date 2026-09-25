// Мок-данные для галереи скриншотов (Задание 2).
//
// В реальном приложении этот список будет строиться так: приложение обращается
// к GitHub Contents API по адресу вида
//   https://api.github.com/repos/USER/REPO/contents/widgets/<id>/screenshots
// получает список файлов в папке screenshots/ виджета и превращает каждый файл в
// прямую ссылку на raw.githubusercontent.com — так и получается массив URL картинок.
//
// Пока своего репозитория нет, здесь просто лежат готовые массивы ссылок по id
// виджета, чтобы можно было проверить, как выглядит галерея в модалке.
export const MOCK_SCREENSHOTS: Record<string, string[]> = {
  "neon-chat-box": [
    "https://picsum.photos/seed/neon-chat-box-1/640/400",
    "https://picsum.photos/seed/neon-chat-box-2/640/400",
    "https://picsum.photos/seed/neon-chat-box-3/640/400"
  ],
  "donation-alerts": [
    "https://picsum.photos/seed/donation-alerts-1/640/400",
    "https://picsum.photos/seed/donation-alerts-2/640/400"
  ],
  "goal-bar": [
    "https://picsum.photos/seed/goal-bar-1/640/400",
    "https://picsum.photos/seed/goal-bar-2/640/400",
    "https://picsum.photos/seed/goal-bar-3/640/400"
  ],
  "spotify-now-playing": [
    "https://picsum.photos/seed/spotify-now-playing-1/640/400",
    "https://picsum.photos/seed/spotify-now-playing-2/640/400"
  ],
  "chat-poll": [
    "https://picsum.photos/seed/chat-poll-1/640/400",
    "https://picsum.photos/seed/chat-poll-2/640/400"
  ],
  "webcam-frame": [
    "https://picsum.photos/seed/webcam-frame-1/640/400"
  ]
};

// Возвращает галерею для виджета: сначала previewUrl из манифеста (если указан
// и его ещё нет среди скриншотов), затем моковые скриншоты. Если вообще ничего
// нет — возвращает пустой массив, и модалка покажет заглушку.
export function getScreenshotsFor(widgetId: string, previewUrl?: string): string[] {
  const gallery = MOCK_SCREENSHOTS[widgetId] ?? [];
  if (previewUrl && !gallery.includes(previewUrl)) {
    return [previewUrl, ...gallery];
  }
  return gallery;
}
