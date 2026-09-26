# HOW_TO_PUBLISH_REGISTRY.md — как опубликовать каталог виджетов

Каталог виджетов (`registry.json` + папка `widgets/`) живёт в ОТДЕЛЬНОМ репозитории
на GitHub — не в том же самом, где лежит код приложения FoxFire Hub. Так задумано
специально (см. `SYSTEM_RULES.md`, раздел 3): чтобы добавлять новые виджеты, не
нужно пересобирать и заново раздавать всё приложение.

Готовый пример такого репозитория, с двумя рабочими пробными виджетами, лежит
рядом с приложением в папке **`example-widgets-repo/`**. Ниже — как превратить
её в настоящий репозиторий на GitHub.

## Шаг 1. Создай новый пустой репозиторий на GitHub

Так же, как в `GITHUB_SETUP.md`, шаг 2 — но с другим именем, например
`foxfire-hub-widgets`. Тоже сделай его **Public** и без готового README/.gitignore
от самого GitHub (они уже есть в папке).

## Шаг 2. Загрузи содержимое папки `example-widgets-repo`

Открой терминал ВНУТРИ папки `example-widgets-repo` (не внутри `streamer-launcher` —
это разные проекты) и выполни:

```bash
git init
git add .
git commit -m "Первые два пробных виджета"
git branch -M main
git remote add origin https://github.com/ТВОЙ_НИК/foxfire-hub-widgets.git
git push -u origin main
```

## Шаг 3. Замени плейсхолдеры `YOUR_USER` / `YOUR_REGISTRY_REPO`

В файлах `registry.json`, `widgets/stream-timer/widget.manifest.json` и
`widgets/stream-clock/widget.manifest.json` замени:
- `YOUR_USER` — на свой ник на GitHub;
- `YOUR_REGISTRY_REPO` — на имя репозитория (например `foxfire-hub-widgets`).

Это ссылки на автора и на будущие файлы релизов — сейчас они не обязаны никуда
вести по-настоящему (виджет всё равно ещё не скачивается по-настоящему, см.
README.md приложения, раздел "Что уже работает, а что пока заглушка"), но лучше
сразу привести их в порядок, чтобы не путаться позже.

## Шаг 4. Получи raw-ссылку на registry.json

1. Открой `registry.json` на странице репозитория в браузере на GitHub.
2. Нажми кнопку **Raw** в правом верхнем углу.
3. Скопируй адрес из адресной строки — он выглядит примерно так:
   `https://raw.githubusercontent.com/ТВОЙ_НИК/foxfire-hub-widgets/main/registry.json`

## Шаг 5. Подключи ссылку к приложению

Открой `src/appConfig.ts` в репозитории приложения (`streamer-launcher` /
`foxfire-hub`) и вставь скопированную ссылку в `REGISTRY_URL`. Сохрани,
закоммить и запушь этот репозиторий тоже (см. `GITHUB_SETUP.md`, шаг 4).

Перезапусти FoxFire Hub (`npm run tauri dev`) — вместо шести тестовых виджетов
из `mockWidgets.ts` в каталоге должны появиться два твоих: "Таймер стрима" и
"Часы для стрима". Если этого не произошло — проверь консоль разработчика
(в окне Tauri: правая кнопка мыши → "Inspect Element" → вкладка Console) на
ошибки загрузки `registry.json` (опечатка в ссылке — самая частая причина).

## Шаг 6. Добавь скриншоты (по желанию, но рекомендуется)

Положи картинки `01.png`, `02.png` и т.д. в папки
`widgets/stream-timer/screenshots/` и `widgets/stream-clock/screenshots/`,
удали из них файлы-заглушки `README.md`, и добавь ссылку на первый скриншот в
поле `previewUrl` каждого виджета в `registry.json` — например:

```json
"previewUrl": "https://raw.githubusercontent.com/ТВОЙ_НИК/foxfire-hub-widgets/main/widgets/stream-timer/screenshots/01.png"
```

Без этого поля карточка виджета в приложении просто покажет крупную первую
букву названия вместо картинки — это нормально и не ломает приложение.

## Как публиковать реальные версии виджетов дальше

1. Заархивируй папку с готовым виджетом (например `widgets/stream-timer`) в
   `.zip`.
2. На странице репозитория `foxfire-hub-widgets` открой вкладку **Releases** →
   "Create a new release", прикрепи zip-архив.
3. Скопируй прямую ссылку на прикреплённый файл — GitHub покажет её при наведении
   на файл в разделе "Assets" уже опубликованного релиза.
4. Впиши эту ссылку в поле `downloadUrl` соответствующей версии в
   `widget.manifest.json` и в `registry.json`, закоммить и запушь.

Обновлять/отзывать версии, помечать их `warning`/`unavailable` и проверять
совместимость с версией приложения — всё описано в `SYSTEM_WIDGET_STYLE.md`
(разделы 4 и 10) внутри репозитория приложения.
